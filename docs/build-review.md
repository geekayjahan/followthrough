# Build review: engineering, UX, model use, and what the build needs by when

29 Oct 2026. Companion to `mindpalace.md`. Screens in `docs/screens/` were captured from Vince's isolated UI fixture (`checks/serve-ui-fixture.mjs`, injected providers, no network).

## 1. Can you see it today?

Yes, locally. The dashboard renders fully without any credentials:

```bash
git checkout codex/followthrough-v0
cd app && npm install
node checks/serve-ui-fixture.mjs      # http://127.0.0.1:4311, password test-owner-only
```

What you cannot see: a WhatsApp brief, a voice note round-trip, a Books write, a qualified lead. Those need the model, WhatsApp and Zoho wired. The black box is the integration layer, not the UI.

Screens: `01-login.png`, `02-desktop-full.png`, `03-desktop-lead-panel.png`, `04-desktop-edit.png`, `05-mobile-full.png`.

## 2. Engineering read (product engineer lens)

### Architecture, one paragraph
Single Node process. SQLite for everything (loops, actions, sessions, provider receipts). A 30-second tick runs stock refresh, Books sync, mail poll and the brief check. The brief fires only inside a 2-minute window at 08:00/18:00 London, once per date/slot, never caught up. Every external effect is an **action** with an immutable payload hash; approval must quote the exact version + hash. Providers are a thin fetch layer with no retry. The model is one OpenAI-compatible `/chat/completions` call per job, temperature 0, JSON mode.

### Verdict by layer

| Layer | State | Change needed |
|---|---|---|
| Approval boundary | Solid. Keep untouched. | None |
| Loop engine (cold, touch, close, suppression) | Correct for the pinned words. | Add demo clock: `DEMO_AGE_DAYS` env (or per-request header) that shifts `now` so loops read as cold. One function, `due()` in `domain.mjs`. |
| Brief scheduling | Works only at 08:00/18:00 while the process is up. No manual trigger. `ENABLE_JOBS=false` gates it. | Add `POST /api/brief` (owner session, CSRF) that runs the brief now, with a `slot` label like `manual:<timestamp>`. Keep the scheduled path as is. Spec E3 ("exactly two briefs in 24 h") stays true because manual briefs are labelled and excluded from that count. |
| Brief content | Plain-text dump: heading, one line per loop, every draft concatenated, dashboard link, then one interactive message per action with Approve/Drop buttons. | Redesign (section 3). |
| Inbound WhatsApp routing | Regex: `yes` approves bound message; `drop`; `edit:`; keywords `sold/bags/cash` → cash-up; `receipt/invoice/total/supplier` → receipt; else "ask". | Replace keyword routing with one model call that classifies owner intent (approve / drop / edit / cashup / receipt / question). Cheap and far more forgiving of how GK actually talks. |
| Enrichment | SSRF-guarded fetch, allowlisted hosts only, strips HTML, feeds **up to 1 MB of page text** to the model, demands exact 250g quote. | Cap page text (first 20k chars or the price-bearing paragraphs) before the model call. Synthetic sites must be on a real domain we allowlist. |
| Zoho Mail | Polls inbox, binds replies via `[FT:<loop>]` subject marker, classifies intake with a model call. | Highest setup cost, lowest demo value. Candidate to defer: counterparts on WhatsApp for the demo, email path kept and shown in the log. |
| Zoho Books | Reads invoices/contacts/payments/expenses/cash; writes expenses and sales receipts with readback. | Keep. Fix AR-03 (null balance) and AR-07 (draft invoices) since they are a few lines. |
| Server hardening | AR-01 crash on malformed URL. | 3-line fix. Do first. |
| Hosting | None. SQLite + ffmpeg + persistent process. | Needs HTTPS, a long-lived process, a persistent disk and ffmpeg. Decision open (section 5). |
| Node version | Targets 24; runs on 22 with a SQLite warning. | Pin `engines` to `>=22.5` and note the flag. |

### Fix list, ordered by value per hour

1. AR-01 server crash. 15 min.
2. `POST /api/brief` run-now + `DEMO_AGE_DAYS`. 1 to 2 h.
3. AR-09 rejected leads still in the brief. 30 min.
4. Brief message redesign. 2 to 3 h.
5. Owner-intent classification via model, replacing regex routing. 2 h.
6. Enrichment page-text cap. 30 min.
7. AR-03, AR-07 invoice correctness. 1 h.
8. "Business" label for lot_low loops (org_id null) and internal next-move strings ("Qualify before drafting") leaking to the owner. 30 min.
9. AR-02, AR-04, AR-05, AR-06, LIMIT-01: correctness under failure. Only if time remains after the demo path works.

## 3. UX read

### Dashboard (what the screens show)
Strengths: calm, one-column-of-truth layout; the four summary numbers are the right four; approval cards show the exact text that will leave; "Technical action details" is collapsed; mobile has no overflow at 320 px; London time is explicit.

Problems, in order of how much they would confuse GK on a phone at 08:05:

| # | What | Fix |
|---|---|---|
| 1 | Engineering vocabulary on owner cards: "Intended contact", "Delivery target", "Configured safe owner emails", "Finish connecting your workspace, 20 configuration values are missing". | Owner copy: "To: Alex at Harbour Roasters · test mode, lands in your inbox". Move setup state to a `/setup` page. |
| 2 | Loop list and approval cards are two columns on desktop, two far-apart stacks on mobile. The owner reads "Harbour Roasters quote due today" then scrolls 900 px to find its draft. | One card per loop: status line, the draft, Approve / Edit / Drop. The "next move" list becomes the card order. |
| 3 | Lead loops show "Qualify before drafting" and "Due 1 Nov, 00:00". Both are internal. | Leads show tier + warm path sentence once qualified, or "Checking their shop" before. Hide the 00:00 due stamp; show "cold in 2 days". |
| 4 | Lot-low loop shows org "Business". | Show the lot name as the title. |
| 5 | Network map is a grid with lines; at 4 nodes it reads, at 15 it will be a tangle. | For the demo keep it, but centre the selected org and show only its 1- and 2-edge neighbourhood. |
| 6 | Lead background panel shows three "Unknown" rows before qualification. | Collapse to one line: "Not checked yet. Qualify this lead." |
| 7 | No "what leaked" metric (spec §7). Judges score Impact 30%. | One tile: "Loops that went cold twice this week: 2" and "Chased on time: 11 of 13". |
| 8 | "Refresh sources" is the only way to pull Books; no run-brief control. | Add "Send me the brief now" button. |

### WhatsApp (what the code will send)
Today: one text message with everything concatenated, then N interactive messages each with Approve/Drop. For 8 cold loops that is 9 messages in a row at 08:00.

Proposed:
1. One summary: "Morning GK. 4 need you: 1 warm lead, 1 overdue invoice, 1 low lot, 1 stall day uncashed. Replies below, or open Where I stand."
2. Per action, one interactive message, max 5 in the brief, ordered warm leads → invoices → rest; the remainder "and 3 more in the dashboard". Each card: who, why now ("no reply since 24 Oct"), the draft, Approve / Edit / Drop.
3. Voice note reply is allowed on any card ("yes send it", "change the price to 14 and send", "drop it").

## 4. Model use: how much it costs and where it earns points

### Current usage
Five call sites, all JSON-mode, temperature 0, no caching, no retry, no streaming.

| Call | When | Input size | Calls per day (demo data) |
|---|---|---|---|
| Draft follow-up | per cold loop per brief | ~400 tokens | 5 to 10 |
| Classify intake | per inbound message | ~300 tokens | 2 to 5 |
| Cash-up extraction | per stall voice note | ~200 tokens | 1 |
| Receipt extraction | per receipt (text or image) | ~200 tokens + image | 1 |
| Qualify lead | once per lead | **up to 1 MB page text** (250k tokens) uncapped | once per lead |

### Cost against the $150 (plus Vince's $150, plus Baseten $100)
At Baseten's listed Spark Open rate ($1.25 in / $4.25 out per 1M tokens) the whole hackathon, including 50 briefs, 200 drafts, 20 lead qualifications with capped pages, every eval run and a day of judges poking it, is under $5. Hosted Muse Spark pricing is not confirmed from here but is the same order. Credits are not the constraint. Latency and judge-visible depth are.

The one real cost trap is enrichment with uncapped pages. Cap it and the question goes away.

### Where to spend model calls for the 25% "Meta tooling" score
Current use is five narrow extraction calls. Correct, but invisible. Proposals, cheapest first:

| Idea | Calls | Why judges notice |
|---|---|---|
| Owner-intent classifier on every inbound WhatsApp message (text or transcript) | +1 per message | GK talks naturally; "yeah go ahead" works. Voice path becomes Meta Voice → Muse Spark → action. |
| Drafts in GK's voice: few-shot from 5 of GK's real past messages (sanitised) in `data/voice.md` | 0 extra | Visible quality jump in the 3-minute video. |
| Warm-path sentence generated, not templated ("Bean & Bloom stock Harbour Roasters, who buy your lot 2") | 0 extra, same draft call | Spec §7 idea 2, directly in the brief. |
| Brief summary line written by the model ("4 need you, the warm lead first") | +1 per brief | Reads like an assistant, not a log. |
| Ask on WhatsApp ("who owes me?", "what's left of lot 2?") answered from loops + Books snapshot | +1 per question | Spec marks it Next, but it is one call with structured context and the single most demo-able "agent" moment. |
| Open-weights visibly: drafts on Spark Open (Baseten), receipts on hosted Spark if Baseten lacks vision; log `model` per action | 0 extra | Open-weights bonus needs the judge to see which model did what. The action log already has a `source` field; put the model id in it. |

Skip: RAG, embeddings, tool-calling agents, multi-step planners. The engine is deterministic; the model does language. That is the honest architecture and it is also the cheapest.

### Concrete model config
- `MODEL_BASE_URL=https://inference.baseten.co/v1`, `MODEL_NAME=meta-models/muse-spark-open-1026`, `MODEL_API_KEY=<Baseten>` for drafts, intent, cash-up, intake, enrichment.
- A second endpoint pair (`VISION_MODEL_BASE_URL=https://api.meta.ai/v1`, `VISION_MODEL_NAME=muse-spark-1.3` or whatever dev.meta.ai lists) for receipt photos, only if Baseten's Spark Open rejects `image_url`.
- `VOICE_TRANSCRIBE_KEY` from dev.meta.ai for `/v1/asr/transcribe`.
- Add `max_tokens: 600` to every call. Cap enrichment input to 20k chars.
- Record `{model, prompt_tokens, completion_tokens}` from the response `usage` in `actions.jsonl`. Free, and it is the evidence for the open-weights bonus.

To verify on dev.meta.ai once the session can reach it: hosted model ids and prices, whether the voice endpoint shares the same key, whether Spark Open on Baseten supports `response_format: json_object` and image input.

## 5. What the build needs, by when (owners TBC)

These are the build's dependencies, not anyone's obligations. Who does each one is open until GK and Vince agree the split. Working back from 5 Nov 02:00 UK. Video and submission need the full day of 4 Nov. End-to-end rehearsal 3 Nov. So integration must be live by the end of 2 Nov.

| By | Deliverable | Detail |
|---|---|---|
| **Fri 30 Oct** | WhatsApp Cloud API test number live (GK's number still TBC) | Meta app, phone number ID, permanent token, verify token, app secret, 5 verified recipients (two owner numbers, three counterpart "customer" numbers). Webhook URL can be a tunnel for now. |
| Fri 30 Oct | Hosting decision made and an empty deploy up | Any host that meets four needs: a public HTTPS URL (WhatsApp webhooks require it), one process that stays up (the scheduler is in-process), a writable disk that survives restarts (SQLite and the action log), and the ability to run a bundled ffmpeg binary. Serverless and edge runtimes fail the second and third. A small VM, a container host with a volume, or a laptop behind a tunnel all pass. The names in earlier drafts were examples, not decisions. |
| Fri 30 Oct | Role split agreed and `codex/followthrough-v0` merged to `main` | Then both of us branch from `main`. |
| **Sat 31 Oct** | `synthetic.json` v1 | See the data brief below. |
| Sat 31 Oct | Fake shop pages live | One static page per lead on a domain we control (GitHub Pages or Cloudflare Pages). Each page must contain a 250g price in GBP in plain text and, for some, an explicit "Indian" line. Hosts go in `ENRICHMENT_ALLOWED_HOSTS`. |
| Sat 31 Oct | Zoho Books fresh org (confirmed 29 Oct: never the real Kāma org) | Org ID, OAuth client + refresh token (region `eu`), expense account, cash account, stall customer, one contact per synthetic customer, one item per lot, two invoices (one overdue, one current). All IDs written back into `synthetic.json`. |
| **Sun 1 Nov** | Zoho Mail, dummy account | GK decided 29 Oct: a fresh dummy Zoho Mail account, never gk@kamacoffee.co.uk. Account ID, inbox folder ID, from address, OAuth scopes for Mail added to the same client. Two owner test addresses (GK + Vince, any provider) for `OWNER_TEST_EMAILS`. |
| Sun 1 Nov | WhatsApp templates submitted (optional, for the out-of-window brief story) | Two templates, one `{{1}}` body variable each, no header, optional footer. Approval takes hours to a day. |
| **Mon 2 Nov** | `app/.env` complete on the host, `SYNTHETIC_DATA_APPROVED=true`, `ENABLE_JOBS=true` | `npm run doctor` shows zero missing. |
| Tue 3 Nov | End-to-end rehearsal with GK on her phone | Brief → tap → email in test inbox; voice yes; voice cash-up → Books sale; receipt photo → Books expense; lead qualify → tier + warm path. |
| Wed 4 Nov | Video recorded, repo public, both members on CV, submission in | Who records what is open. |

### Data brief for `synthetic.json` (for whoever writes it)

The schema in spec §3 holds. Add `books_contact_id` per org and `books_item_id` per lot once Books exists. Minimum content for the demo story:

- **Orgs, 12 to 15.** 4 customers (roasters), 2 suppliers, 2 stockists, 5 to 7 leads. Every lead needs a `website` on our fake-shop domain. Give leads a spread: one at £6 (below bar), two at £9 to £11 (mid-shelf), two at £13+ (premium), one with an explicit "we don't sell Indian coffee" line, one with an explicit "Indian" origin on shelf. No real business names; the owner's own name is fine.
- **People, one per org.** Email `<first>@example.test`. Three counterparts get real WhatsApp test numbers (the 3 recipient numbers from the Cloud API list); the rest `null`.
- **Edges, 10 to 15.** Build at least: one lead 1 edge from a customer (stocks), one lead 2 edges away (knows → buys_from), one lead with no path, one path that runs through a current customer (so F10 has an introducer).
- **Invoices, 3.** One overdue by 2+ days unpaid, one due next week, one paid. Mirror them in Books.
- **Lots, 3.** One healthy, one under 20% (triggers lot_low), one at 25% (so a 6-bag cash-up pushes it under).
- **Orders, 3.** One unconfirmed, one to ship, one shipped.
- **Stall days, 2.** Yesterday uncashed, last week cashed.
- **Timestamps.** Last-touch dates 4 to 7 days ago on the loops we want cold, so even without the demo clock the first brief has content.

Also, for the receipts path: three photographed receipts from the synthetic suppliers (any paper, names typed in), so the vision call has something real.

## 6. Decisions taken 29 Oct (GK)

| Decision | Choice |
|---|---|
| Zoho Mail | Dummy account, not the real Kāma mailbox. Send and read both allowed on the dummy. |
| Zoho Books | Fresh organisation with synthetic contacts and invoices. |
| Model | Spark Open on Baseten for everything; hosted Muse Spark only for receipt photos if Baseten lacks vision. Spec T6 to be edited to drop Daytona. |
| Brief shape | Summary line + up to 5 action cards with Approve / Edit / Drop, rest in the dashboard. |
| Owner input style | Natural language with edits, mostly voice notes, questions too. So: model intent classifier on every inbound owner message, and Ask moves from Next to Core for the demo. |
| Build | Claude builds on `claude/amazing-mayer-0gknmk`, merged from `codex/followthrough-v0`. Data, shop pages, Zoho, WhatsApp and hosting owners are TBC. |

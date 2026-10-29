# Followthrough mind palace (29 Oct 2026, 6 days to the deadline)

Working notes for the build. Facts first, then judgement, then the open calls.

## 1. Where the repo stands

| Branch | What is on it | State |
|---|---|---|
| `main` | Product Builder Kit + S1 spec (`app/spec.html`, `evals.md`, `CLAUDE.md`, `spec-summary.json`) + hackathon context docs | 2 commits, no code |
| `origin/codex/followthrough-v0` (Vince) | S2 build: 13 commits, 7,121 lines, FT-01 to FT-10, 33 tests, Playwright smoke, adversarial review | Never merged, no PR open |
| `claude/amazing-mayer-0gknmk` (this session) | Branched from `main` | Nothing yet |

Vince's branch is based on `849b870`, one commit behind `main` (the context-doc update). Merging is trivial; nothing conflicts.

## 2. The product in one breath

Every open item in a small B2B business is a **loop** (lead, sample, quote, order, invoice, receipt, stock lot, stall day). The engine notices which loop has gone **cold** (3 days untouched; invoice the day after due; lot under 20%; stall day uncashed by 21:00), drafts the next move with a Meta model, puts it in a WhatsApp **brief** at 08:00 and 18:00 London, and sends only after the owner **approves** (tap, "yes", or a voice note transcribed by Meta Voice). New leads are **qualified** (price per 250g from their shop page: under £8 closed, £8 to £12 mid-shelf, above £12 premium), **placed in the network** (1 or 2 edges to an existing customer, supplier or stockist) and warm ones rank first with a draft that names the shared connection. One web page, **Where I stand**: cash, owed, kg per lot, due today, network map, lead background panel. No real person's data: `synthetic.json`, `example.test` emails, WhatsApp test list, fresh Zoho accounts.

Jobs: Chase · Get paid · Keep the books · Fulfil · Stall · Stock · Grow. Ask is Next.

## 3. What Vince actually built

Stack he chose (spec left T2 to T8 open; he closed them under "Guided"): Node 24 + `node:sqlite`, vanilla HTML/CSS/JS, shared `OWNER_PASSWORD` login with scrypt + CSRF, in-process scheduler, one runtime dependency (`ffmpeg-static` for OGG to WAV). No framework, no CDN.

| File | Role | Lines |
|---|---|---|
| `src/server.mjs` | HTTP routes, webhook, 30 s tick | 310 |
| `src/engine.mjs` | draft, approve (edit/drop), brief | 443 |
| `src/domain.mjs` | loops, cold, warm path BFS, reply classification, suppression | 315 |
| `src/providers.mjs` | Zoho OAuth/Books/Mail, WhatsApp Cloud API (text, interactive buttons, templates), model (OpenAI-compatible `/chat/completions`), Meta Voice `/v1/asr/transcribe` | 608 |
| `src/intake.mjs` | mail polling, inbound WhatsApp routing, intake classification | 198 |
| `src/enrichment.mjs` | SSRF-guarded shop-page fetch, Instagram Business Discovery, fact validation with exact quotes | 274 |
| `src/books.mjs`, `receipts.mjs`, `stall.mjs`, `stock.mjs` | invoice sync, receipt extraction, cash-up, lot_low | ~300 |
| `public/` | Where I stand dashboard + login | 1,642 |
| `checks/` | 33 node:test cases, browser smoke, secret scan, 13 adversarial probes | ~1,500 |

Verified here: `npm test` passes 33/33 on Node 22 (SQLite still experimental on 22, works). Adversarial script reproduces all 13 findings.

### What is good
- The approval boundary is real: immutable payload hash + version, tap IDs bound to the hash, quoted "yes" bound to one message, replay rejected, test-recipient rewrite until `APP_LIVE=true`. A1 to A6 are essentially built.
- Evidence log `logs/actions.jsonl` has every event type the evals ask for.
- Fact validation on model output is strict: price must appear in an exact 250g quote from the lead's own shop page; Indian-coffee false needs explicit negative wording.
- Stock reservation against in-flight sales, WAL SQLite, transaction-aware audit.

### What is missing or wrong (my read, not Vince's)
| # | Issue | Why it matters for the hackathon |
|---|---|---|
| 1 | **Zero connected proof.** Every feature is `external_verification: pending`. No Zoho, WhatsApp, model or voice call has ever run. | Judges score Demo 25% and Meta tooling 25%. Today there is nothing to film. |
| 2 | **23 required env keys** before anything connected runs, plus `SYNTHETIC_DATA_APPROVED=true`, `ENABLE_JOBS`, `ENABLE_POLLING`. | Setup is a multi-day job in itself: fresh Zoho Mail + Books org with OAuth, WhatsApp test number, 2 approved message templates, model endpoint, voice key. |
| 3 | **Enrichment cannot run on the synthetic data.** Lead websites are `https://bloom.example.test`; the fetcher does DNS resolution and only accepts public IPs on an allowlist. `example.test` never resolves. | F8, F9, E4 (qualify, tier, below-bar) are un-demoable until we host fake shop pages on a real domain. |
| 4 | **Synthetic dataset is a stub.** 4 orgs, 4 people, 3 edges, 1 order, 0 invoices, 0 stall days, all `books_contact_id: null`. | The demo story (Kāma, roasters, lots, overdue invoice, warm intro) does not exist yet. |
| 5 | **Demo clock not built** (spec §7 idea 1). Loops go cold after 3 calendar days; briefs fire only at 08:00/18:00 while the process runs; no catch-up. | A judge would wait 3 days to see a brief. We need an env switch that ages loops and a manual "send brief now". |
| 6 | **9 open findings, 4 P1** from Vince's own adversarial review: server crash on bad URL (AR-01), duplicate sends after a timeout (AR-02), null balance marks invoice paid (AR-03), readback ignores currency (AR-04); plus quote-to-order transition lost, draft invoices chased, rejected leads still in the brief (AR-09 breaks E4). | AR-01 and AR-09 are cheap and directly visible. The rest are correctness under failure; worth fixing only if time allows. |
| 7 | **Model is generic.** `providers.model()` is an OpenAI-compatible call with `response_format: json_object` and image input for receipts. Nothing in the code is Meta-specific except the voice endpoint. The spec's T6 says "Daytona GPU sandbox"; the context doc says Baseten credit is claimed for `meta-models/muse-spark-open-1026`. These disagree. | "Use of Meta AI tooling" is 25% of the score plus the $10k open-weights bonus. We need to decide the model path and make it visible in the demo. |
| 8 | **WhatsApp 24-hour window.** Outside it, the brief needs an approved template with exactly one `{{1}}` body variable; approval by Meta can take hours to a day. Inside it, interactive Approve/Drop buttons work. | For the demo, GK messaging the bot first keeps the window open and avoids templates entirely. Templates are a nice-to-have for the "08:00 brief" story. |
| 9 | **Hosting unselected.** Webhook needs public HTTPS. App needs a persistent process, a writable disk (SQLite + logs) and ffmpeg. Not a Cloudflare Worker. | Needs HTTPS, a long-lived process, a persistent disk and ffmpeg. Decide by 31 Oct. |
| 10 | `README` and `app-spec.json` use `npm.cmd` (Windows). Node 24 assumed. | Cosmetic; fix when we touch them. |
| 11 | Reply holds (AR-05) and no-replay policy (LIMIT-01) make the system fragile unattended. | Acceptable for a hackathon if the demo is scripted; dangerous if we try the 24-hour E3 observation live. |

Vince's build optimises for "nothing wrong ever leaves the system". That is the right instinct for a product with real money, and the wrong default for a 6-day hackathon where the deliverable is a 3-minute video and a live URL. We keep his safety core and bolt a demo path on top.

## 4. Meta models (what I could confirm from outside the session)

`dev.meta.ai` is blocked by this session's network policy, so these are from Meta's developer blog and third-party docs, to be checked against dev.meta.ai by you.

| Model / API | What it is | How we would call it |
|---|---|---|
| **Muse Spark 1.x** (hosted) | Meta's flagship text model, OpenAI-compatible at `https://api.meta.ai/v1` (`/chat/completions`, `/responses`, Anthropic-style `/messages`), Bearer key from dev.meta.ai | Drop-in for `MODEL_BASE_URL` + `MODEL_NAME`. Uses the $150 Meta credits. |
| **Muse Spark Open** (open weights) | Same family, open weights, served by Baseten, Fireworks, Together. Baseten lists it at $1.25 in / $4.25 out per 1M tokens, ~1M context. Meta says it is **not** served on Meta's own Model API. | Baseten Model APIs are OpenAI-compatible (`https://inference.baseten.co/v1`), model `meta-models/muse-spark-open-1026`. This is the open-weights bonus path and uses the $100 Baseten credit. |
| **Muse Glimmer** | Smaller open-weights model for local use | Spec lists it as Next ("local mode"). Skip for the demo. |
| **Muse Voice Transcribe** | `POST https://api.meta.ai/v1/asr/transcribe`, multipart (`request` JSON + WAV `audio`), model `muse-voice-transcribe-1.0`, mode `PUSH_TO_TALK` | Already wired in `providers.transcribe()`. Needs `VOICE_TRANSCRIBE_KEY` (same dev.meta.ai key, to confirm). |
| Image / Wonder / SAM 3.1 / Muse Code | Image gen, video, segmentation, coding model | Not in scope. Receipt photos use the text model's image input; confirm Muse Spark Open accepts images on Baseten, otherwise route receipts to hosted Muse Spark. |

Unknowns to close with dev.meta.ai open: does the hosted key cover voice; does Spark Open on Baseten support `response_format: json_object` and image input; rate limits; whether the Meta AI Connector (WhatsApp surface the application mentioned) is something we can touch in 6 days (I would say no, keep WhatsApp Cloud API).

## 5. Hackathon frame

- Deadline 4 Nov 21:00 ET = 5 Nov 02:00 UK. Submission needs: public repo, 3-min video, live product, both members listed (Vince still not on CV).
- Stage 1 pass/fail: fits theme, genuinely uses Meta models. Stage 2: Impact 30, Meta tooling 25, Demo 25, Technical depth 20.
- Bonuses in reach: Best Agentic Use-Case $5k (the brief→approve→send loop is agentic), Best Build on Open Weights $10k (needs Spark Open visibly in the loop).
- Only work during the event counts. The Kāma coffee prototype is context, not demo.
- Anti-projects: basic RAG, simple image analysers. We are neither.

## 6. What a judge should see in 3 minutes (draft storyboard)

1. 08:00 WhatsApp brief arrives: 4 loops cold. A warm lead first ("Bean & Bloom stock Harbour Roasters, who buy lot 2"), an overdue invoice with number and amount, a low lot, a stall day uncashed.
2. GK taps Approve on the warm-lead draft. Email lands in the test inbox. Loop touch resets.
3. GK sends a voice note: "yes send it" for the invoice chase. Transcript shown, send logged.
4. GK sends a voice note: "sold six 250g bags of lot 2, 120 pounds cash". Read-back, approve, Books sale appears, lot drops 1.5 kg.
5. Where I stand: cash, owed, stock, network map, lead panel with price £11 and the source quote.
6. Close on `actions.jsonl` scrolling: every brief, approval, send, Books write, with timestamps. "Nothing leaves without a tap."

Everything above is buildable from Vince's code plus: demo clock, richer synthetic data, hosted fake shop pages, credentials, hosting.

## 7. Calls GK needs to make (in order of how much they block)

| Call | Options | My lean |
|---|---|---|
| Model path | (a) hosted Muse Spark via api.meta.ai; (b) Spark Open on Baseten; (c) both, Spark Open for drafts, hosted for receipt images | (c) if Baseten lacks vision, else (b) alone. Drop the Daytona line from the spec. |
| Zoho | Fresh Mail + Books org this week, or cut Zoho Mail and send email via something simpler | Keep Books (cash, owed, expense, sale are the money story). Mail is the weakest link: OAuth, inbox polling, reply parsing. Consider WhatsApp-only counterparts for the demo and keep email as "built, shown in the log". |
| Hosting | A VM, a container host with a volume, or a laptop behind a tunnel | Whichever the setup owner already knows. Criteria in build-review §5. |
| Fake shop pages | Static pages for the synthetic leads on a domain we control | Required for F8/E4. Cheap: GitHub Pages or a Cloudflare Pages site with 3 to 5 lead pages. |
| Role split | Open | GK and Vince agree it; nothing here assumes it. |
| Merge | Merge `codex/followthrough-v0` into `main` now, build on it | Yes. Nothing on `main` conflicts. |

## 8. Session constraints

- `dev.meta.ai` is not in this session's allowed network domains. Add it (and `api.meta.ai`, `inference.baseten.co` if we test calls from here) in the environment's network settings.
- Node here is 22; Vince targets 24. Tests pass on 22 with the SQLite experimental warning.
- `app/.env` does not exist on this branch and never should be committed. Keys go there by hand.

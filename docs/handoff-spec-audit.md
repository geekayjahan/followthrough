# Hand-off: spec audit, research and demo-first cut

Written 29 Oct 2026, 19:30 UTC, by the spec-audit session on branch `claude/blissful-hamilton-0vdo4w`, for the Meta models session working on `claude/amazing-mayer-0gknmk`. No spec file was touched and nothing was executed: this is a static read of the code plus web research. GK's decisions quoted here were relayed by the review session on 29 Oct. The companion planning notes list the commands to run first.

### Repo state, verified 29 Oct 19:20 UTC

| Branch | Spec | Code | Owner / state |
|---|---|---|---|
| `origin/main` (2bd7ded) | rev 1 + Cowork's `docs/kama-workflow-map.md` (36 workflows mined from mail, Books, Drive) and `docs/use-cases.md` (40 use cases, 12 loop types, 8 demo beats) | none | GK |
| `origin/codex/followthrough-v0` | rev 2 (Codex closed stack rows T2 to T8 itself) | Vince's build: Node 24, `node:sqlite`, vanilla UI, one dependency, FT-01 to FT-10, 33 tests, 13 adversarial probes, 4 P1 open | Vince, unmerged |
| `origin/claude/amazing-mayer-0gknmk` | **rev 6**: 9 new pinned words, `app/workflows.md` (118 rows, 20 Core), evals 28 to 62 rows, rebuild brief in `docs/build-review.md` §7 | v0 merged, AR-01 and AR-09 fixed, FT-11 demo clock, FT-12 intent classifier, 43 tests | GK's chosen single spec line |
| `origin/claude/practical-albattani-ns1yrj` (13cc63e) | rev 3 off main: its own lean `workflows.md` (verbs, hero scenes), evals F13 to F19, E5, A7, pinned Ask, Held (kg), Price list, Coffee alias | none | Business session; now producing the merged `workflows.md` against mayer's base |
| `claude/blissful-hamilton-0vdo4w` (this session) | rev 1 | none | equals old `origin/main`; zero unique commits |

## Hand-off content

### A. The question and the short answer

How messy is a spec update now? Four spec versions exist on four branches and none is on main. `spec.html` has 400-character lines, so two edits to one paragraph cannot be merged by git. Revision 6 describes nine engine rules the code does not implement. T6 still names a Daytona sandbox nobody chose. The evals (62 rows) outrun the code by about 20 rows and need credentials for half the rest. Any further spec edit must land on mayer only, in one commit, after a fresh fetch, with GK's explicit go.

Who builds v2? GK decided: Claude, a fresh S2 session from the rebuild brief, off mayer, keeping v0's approval boundary, store, providers, enrichment guards, intent classifier and demo clock. Scope for 4 Nov: a demo-first cut (section E).

Is the Codex build clean? Structurally yes, operationally unproven (section C).

### B. Ownership and sequencing GK has set

- Spec = contract, merged `workflows.md` = what and how, `docs/kama-workflow-map.md` = evidence. An audit checks they agree; it does not pick between them.
- Tiering for 4 Nov is set from the merged `workflows.md` once the Business session lands it, with the demo-first cut below as the starting hypothesis.
- All spec files frozen until GK names the build location and builder. The spec change set in section F waits for her go.

### C. Audit of the Codex v0 build (static read at mayer tip 2e0c2c5; nothing executed in this session)

**Structure (verified).** 14 source modules under `app/src`, 4,400 lines on mayer. `domain.mjs` imports nothing (pure core: loops, cold, warm-path BFS, reply classification, suppression). `server.mjs` imports all 12 others (the hub). `providers.mjs` (618 lines) mixes Zoho OAuth, Mail, Books, WhatsApp text, buttons, templates, model and voice in one file. `engine.mjs` grew 443 to 570 and `intake.mjs` 198 to 330 on mayer. Exports are narrow (most files export 1 or 2 names; `config.mjs` 11, `domain.mjs` 9). One runtime dependency (`ffmpeg-static` 5.3.0). 13 test files, 43 `test()` calls. `engines` says Node 24; this container has 22.22.0 and the previous session reports 43/43 pass there with an experimental-SQLite warning.

**What is good (verified from code, tests and Vince's own review).** The approval boundary: immutable payload hash and version, tap ids bound to the hash, quoted "yes" bound to one message, replay rejected, test-recipient rewrite until `APP_LIVE=true`. The evidence log carries every event type the original 28 evals name. Fact validation on enrichment demands an exact 250 g quote from the lead's own page. Stock is reserved against in-flight sales. SSRF guards on fetch. Scrypt login, CSRF, HMAC on webhooks.

**Spec-to-code drift (verified against rev 6 and the trace).**

| Rev 6 requirement | In code? | Evidence rows affected |
|---|---|---|
| Capture (one message to many items, read-back, one ask) | no | W1, W2; workflow A3 has no eval row |
| Stage per counterpart type | no | W5 |
| Cadence table per tier and channel | no | W6 |
| Offer ladder check on drafts | no | W7, T4 |
| Held: 60-minute send hold with undo | no | F2 (rewritten), F16 |
| Voice file gate (`app/data/voice.md`, signed off) | no | F17 blocks every customer draft, so it blocks storyboard moments 1 and 2 |
| Auto-reply not a touch | no | E5 |
| Parked after three unanswered chases | no | T10 |
| Weekday-only briefs | no | E6 |
| Lapsed customer loop, referral card, Monday plan | no | W8, W9, W10 |
| Thread-aware drafts, outbound host logging | no | T5, A8 |
| Qualify, warm path, introducer, soft no, declined, suppression, cash-up with bag ask, lot low, invoice chase and payment close, receipt to expense, Where I stand, demo clock, manual brief, intent classifier, Ask | yes | F1 to F15, E1 to E4, A1 to A6 |

**Spec disagreeing with itself and with the context docs (verified).** T6 says Daytona GPU sandbox on every branch; `docs/meta-hackathon-context.md` and build-review §6 record Spark Open on Baseten. T5 says Node 24; it runs on 22. T11 (calendar) is open and Core workflows A8 and I1 need it. `app/README.md`, `app-spec.json` and the adversarial review use `npm.cmd` and PowerShell. `synthetic.json` is a four-org stub with zero invoices and null Books ids. Lead websites in the data are `*.example.test`, which never resolves, so F8, F9 and E4 cannot run until fake shop pages exist on a real allowlisted domain. 21 to 23 env keys are required before anything connected runs.

**Open defects from Vince's own adversarial review (verified in the file).** AR-01 and AR-09 fixed on mayer. Still open: AR-02 duplicate sends after a timeout (P1), AR-03 null balance marks an invoice paid (P1), AR-04 Books readback ignores currency (P1), AR-05 first order from a known customer gets held, AR-06 quote-to-order loses state, AR-07 draft invoices chased, AR-08 model output can contradict its source in cash-up, receipt and enrichment validators, LIMIT-01 no replay after a read failure. AR-03 and AR-07 touch the invoice story in moment 1; AR-08a touches the cash-up in moment 4.

**Code-quality leads flagged by a planning pass, to confirm by reading.** Six `install*(engine)` functions patch methods onto the engine at runtime with no declaration site. Three model-output validators (`stall.mjs:13`, `receipts.mjs:19`, `enrichment.mjs:119`) differ in rigour; one shared source-check is the rewrite. Single-letter parameters at module boundaries. Possibly dead after FT-12: the regex approval grammar (`affirmative`, `replyClass`). `http.test.mjs` is one test covering about eight behaviours, so the first failed assert hides the rest. The secret scan has no pattern for Meta `EAA…`, Zoho `1000.…` or Baseten keys. The evals of rev 6 grade on event names the app-spec event list does not define (`held`, `undone`, `capture`, `revoked`, `auto_reply`, `parked`, `books_read`, `host`, `loop_open`, `thread_append`, `stage`, `qualified`, `reserve`, `lapsed`): one grep of `audit("` against `evals.md` gives the next session the exact missing-evidence list.

**Commands the next session should run from a detached worktree of mayer, no `npm install` needed** (all static imports are `node:` or relative; `ffmpeg-static` loads lazily):

```bash
git worktree add --detach /tmp/ft-v0 origin/claude/amazing-mayer-0gknmk
```

```bash
cd /tmp/ft-v0/app && node --test checks/*.test.mjs
```

```bash
cd /tmp/ft-v0/app && node checks/adversarial-review-2026-10-29.mjs; echo "exit=$?"
```

Expected: 43 pass; probes exit 2 with only AR-01 and AR-09 at `reproduced: false`. Anything else is a finding. Then `node checks/secret-scan.mjs`, `node checks/syntax.mjs`, `node src/doctor.mjs`.

**Keep / rewrite / delete for the rebuild brief.** Keep: approval boundary, `store.mjs` and the audit log, provider request layer and preflight, enrichment guards and `focus()`, intent classifier, demo clock and manual brief, fixture and test harness. Rewrite: loop model to carry `stage`; inbound routing into Capture; the three validators into one source-check; `compose` into summary plus five cards in the pinned Brief order; event vocabulary to match the evals; `required` keys tiered per feature; README, app-spec commands and `engines`; split `http.test.mjs`. Delete: regex approval grammar if the classifier is the only path; `npm.cmd` references; `DAYTONA_API_KEY` from `.env.example`; the stale "parking policy unresolved" entries (Parked is now pinned at 3).

### D. Research conclusions (WebSearch only; the container cannot reach dev.meta.ai, api.meta.ai, docs.baseten.co, developers.facebook.com or zoho.com, and Tavily is out of quota)

**T6, model path: Spark Open on Baseten, with two things to confirm by one call each.**

| Fact | Status | Source |
|---|---|---|
| Spark Open is served on Baseten through an OpenAI-compatible endpoint with a Baseten API key; example model id `meta-models/muse-spark-open` | primary (Baseten changelog) | https://www.baseten.co/resources/changelog/muse-spark-open-and-nemotron-35-super-vl-available-on-baseten/ |
| The context doc's slug is `meta-models/muse-spark-open-1026`; the two differ | to confirm in the Baseten dashboard | `docs/meta-hackathon-context.md` |
| Accepts text, image, audio and video input, text out. Receipt photos can therefore run on Spark Open; the second hosted vision endpoint in build-review §4 is probably unnecessary | primary (same changelog); confirm with one `image_url` call | as above |
| Baseten Model APIs support structured outputs, schema-based, "aligned with OpenAI SDK parameters where supported" | primary | https://docs.baseten.co/inference/structured-outputs and https://docs.baseten.co/inference/overview |
| Whether the legacy `response_format: {type: "json_object"}` the code sends is accepted | **unverified**; plan for `json_schema` or test | none found |
| Base URL `https://inference.baseten.co/v1` | secondary | https://docs.litellm.ai/docs/providers/baseten |
| Price $1.25 in / $4.25 out per 1M tokens | secondary | https://cloudprice.net/models/muse-spark-open |
| Hosted Muse Spark 1.3 on the Meta Model API: $1.25 / $4.25, cached input $0.15; a "contributor" tier at $0.10 / $0.20 on which Meta may train (do not use for owner data); OpenAI Chat Completions and Anthropic Messages formats | secondary; official sheet at dev.meta.ai/docs/pricing-rate-limits not fetched | https://anotherwrapper.com/llm-pricing/muse-spark-1.3 and https://www.implicator.ai/meta-prices-its-first-paid-ai-model-api-at-4-25-per-million-output-tokens/ |
| Muse Voice Transcribe pricing, endpoint and whether the Model API key covers it | **not found by search**; market-research cites $3 per 1,000 minutes via a secondary source | open |

Decision table proposed for T6: drafts, intents, cash-up, intake and enrichment on Spark Open (Baseten); receipt images on Spark Open if the `image_url` call succeeds, else hosted Spark 1.3; voice on Meta's `/v1/asr/transcribe`. Log model id and token usage on every call (F15).

**T2, enrichment.** Owner-approved fake shop pages hosted on a domain the team controls, listed in `ENRICHMENT_ALLOWED_HOSTS`; `example.test` cannot be used. The Instagram Business Discovery adapter stays built but Next.

**T5, hosting.** Still open. Four criteria: public HTTPS for the webhook, one long-lived process (in-process scheduler), a disk that survives restarts (SQLite and the action log), ability to run the bundled ffmpeg. Node 22.5 or newer runs the app; 24 preferred.

**WhatsApp Cloud API.**

| Fact | Status | Source |
|---|---|---|
| Test number sends free messages to up to 5 allowlisted recipients in E.164; templates created on the test number cannot be reused on a production number; low daily limit | primary + vendors | https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/ , https://help.wanotifier.com/en/article/test-phone-number-limitations-kt0ly2/ |
| A customer message opens a 24-hour window and each new message resets it; outside it only approved templates can be sent | consistent across sources | https://www.smsmode.com/en/whatsapp-business-api-customer-care-window-ou-templates-comment-les-utiliser/ |
| Template approval: 5 minutes to 24 hours typical, up to 48 hours with human review; utility passes faster; a body that is a single variable, or a variable at the start or end, is rejected or treated as marketing; realistic sample values required | vendor guides | https://web-bbm.pages.dev/blog/whatsapp-template-approval-guide/ , https://dev.to/dipbhi/what-is-the-template-policy-of-whatsapp-its-about-user-expectations-not-your-copy-3off |
| Service-message pricing changed 1 Oct 2026 (accounts conflict: 1,000 free per number per month, or billed at utility rate) | conflicting | check Meta's pricing page |
| Interactive reply buttons cap at 3 per message | **not confirmed by search**; the code assumes Approve / Edit / Drop fits | Meta reference needed |

Recommendation for 4 Nov: the owner messages the bot first, so the whole demo runs inside the window with interactive buttons and no template. The template path stays Next. The code's "body with exactly one `{{1}}`" template design is exactly the shape reviewers flag as unclear, so expect a rejection if it is submitted.

**Pitch facts.** Not researched in this session; the "Could not verify" list in `docs/market-research.md` stands. To unblock primary-source fetches, add to the environment's Allowed domains: `dev.meta.ai`, `ai.developer.meta.com`, `api.meta.ai`, `docs.baseten.co`, `www.baseten.co`, `inference.baseten.co`, `developers.facebook.com`, `business.whatsapp.com`, `www.zoho.com`, `www.gov.uk`, `assets.publishing.service.gov.uk` (steps: https://code.claude.com/docs/en/cloud-environments#network-access).

### E. Demo-first cut for 4 Nov (starting hypothesis; re-cut against the merged workflows.md)

**Core (4 Nov)**, mapped to the six storyboard moments in `docs/mindpalace.md` §6:

| Moment | Workflows | Evals |
|---|---|---|
| 1. 08:00 brief: warm lead first, overdue invoice, low lot, stall uncashed | L1, E1, E3, G2, C1, I3 | F1, F4, F7, F9, F10, E3, E6 |
| 2. Tap approve, email lands in test inbox, touch resets | (engine) | F2, T1, T6, A2 |
| 3. Voice note "yes send it" | (FT-12) | F3, F13 |
| 4. Voice cash-up, Books sale, lot drops 1.5 kg | I2, I4 | F6, T9 |
| 5. Where I stand: cash, owed, stock, map, lead panel with price and source | L9, E1 | F8, F11, F12, T8 |
| 6. `actions.jsonl` scrolling | (store) | F15, A1, A4, A5, A6 |
| Capture: one message into several items, read-back, one ask | A1, A2, A3 | W1, W2, new W15 for A3 |
| Already built, keep showing | Ask C2 G6, intent edit, demo clock, manual brief | F14, F13 |

Engine rules for 4 Nov: Voice file is required (F17 blocks drafts without it); weekday-only briefs (cheap, E6); Held runs with `DEMO_SEND_DELAY_MINUTES=0` so undo (F16) is after 4 Nov unless it proves cheap.

**Core (after 4 Nov)**: A5 A8 A9 A10 · C6 · D1 D2 D3 D4 · E2 E5 E6 E8 E9 E18 · F3 F6 · G10 · L3 L10 · Parked · Auto-reply · Cadence · Offer ladder · Stage · Lapsed. H1 (receipt to expense) is built; show it if rehearsal has slack.

**Candidates from the Kāma map and use-cases not in rev 6 at all**, for the merged-file owner to tier: lot ledger with held kg and over-allocation refusal (map blind spot 1: two lots already oversold), alias guard, price-list placeholder block, close-date batch nudge, stall-day documents and transport, supplier balance diff. The map's top three by cost are sample-feedback chase, invoice chase and the lot ledger; only the first two are in rev 6 Core.

Hard dependencies for any of this to film: credentials in `app/.env`, `synthetic.json` v1 per build-review §5, `app/data/voice.md` and `app/data/terms.md` signed off, fake shop pages live, hosting with a public HTTPS webhook.

### F. Spec change set, held for GK's go (what this session would have written, and where)

| File | Edit |
|---|---|
| `app/spec.html` header | revision 6 to 7 (or next free after the merged workflows.md lands) |
| T2 | decided for 4 Nov: owner-approved shop pages on a controlled domain in `ENRICHMENT_ALLOWED_HOSTS`; Instagram adapter Next |
| T5 | Node 22.5 or newer (24 preferred); the four hosting criteria; still open on vendor |
| T6 | replace Daytona with Spark Open on Baseten, `MODEL_BASE_URL=https://inference.baseten.co/v1`, slug to confirm; hosted Spark 1.3 for images only if needed; Voice Transcribe `muse-voice-transcribe-1.0`, key coverage open; status decided, ids to confirm |
| Open Questions | Daytona removed; "parked" question deleted (pinned at 3); pointer to the demo-first cut and the reconciliation register |
| `app/spec-summary.json` | `key_constraints`: Daytona string and "Node 24" string; `open_questions` matching; `tiers` untouched until the merged file lands |
| Tiers in §2, `workflows.md` Core paragraph, `evals.md` W tags, `spec-summary.json` tiers | one atomic commit after the merged workflows.md, with a one-way-door defence in the trace first |

Rule: net line count of `spec.html` does not rise. If room is needed, §7 Ideas (five of six built or stale) and §8 Future scope (duplicates the Later tier) move to `docs/build-review.md`.

### G. Reconciliation register: albattani and use-cases against rev 6

| Item | Collision | Proposal |
|---|---|---|
| albattani F13 "who owes me", F14 "tax season", F15 hold conflict, F16 supplier diff, F17 price-list block, F18 alias, F19 stall documents | F13 to F17 exist on mayer with other meanings | port as F18 to F24 |
| albattani E5 per-type cold clocks (sample 10 days, receipt 7) | mayer E5 = auto-reply | port as E7; the clocks also extend pinned Cold |
| albattani A7 refuse out-of-scope asks | mayer A7 = prompt injection | port as A9 |
| albattani pinned **Held** = kg promised on a lot | mayer **Held** = 60-minute send hold | rename albattani's to **Allocated**; add `held` status to orders and an available-kg rule |
| albattani pinned Ask, Price list, Coffee alias; data collections `prices`, `samples`, `dates`; order status enum; stall_days fields | none | add to §3 and Pinned words |
| albattani `app/CLAUDE.md` adds a workflows row to the artifact map | none | keep |
| albattani deleted `docs/use-cases.md`; main has it | content conflict | keep the file on main; it is evidence |
| `docs/kama-workflow-map.md` says 36 workflows; mayer's catalogue says 118 and 20 Core; the review session counts 54 rows tagged Core | consistency | the merged file carries a Source column; the audit checks map, merged file and spec agree row by row |

### H. Hand-off to the fresh S2 session

Must be true before it starts: merged `workflows.md` frozen with its SHA; spec revision committed on mayer with T6 decided and tiers visible; `docs/audit-v0.md` and an understanding map (or this file) merged; a build branch off mayer's tip; the other sessions stopped writing; `app/.env` holds owner password, app URL, model and voice keys, the seven WhatsApp variables, Zoho Books variables (Mail deferrable), `DEMO_AGE_DAYS`, `DEMO_SEND_DELAY_MINUTES=0`, `ENRICHMENT_ALLOWED_HOSTS`; `synthetic.json` v1; `voice.md` and `terms.md` signed off; shop pages live. Anything missing is a credential-checkpoint halt.

Read order for its first prompt: `CLAUDE.md`, `app/CLAUDE.md`; `app/spec.html`; merged `app/workflows.md`; `app/evals.md` rows F1 to F15, T1 to T10, F16, F17, W1, W2, W15, A1 to A8; `docs/build-review.md` §2 to §4 and §7; this file §C keep/rewrite/delete and §E; `docs/research-model-path.md` once written; `app/claude-progress.txt` and `git log`. Order of work per build-review §7: decomposer, initializer (voice file, terms file, T11 calendar on the credential checkpoint), coder; rebuild Capture and the stage model before any single workflow. Build rules: trace stamps with the real clock; one-way defence in its own commit before the change; no CDN assets; one commit per feature; keep the 43 tests and the probe script as the regression net and convert AR-01 and AR-09 asserts into regression expectations.

### I. Open questions

1. Exact Baseten slug, and whether `json_object` is accepted or the code moves to `json_schema`.
2. Does one Meta key cover Voice Transcribe; its price.
3. Interactive reply-button cap (3?) and the 1 Oct 2026 service-message pricing.
4. Hosting vendor, and Node 24 or 22 on the host.
5. T11 calendar source for A8 and I1.
6. Who writes `synthetic.json` v1, `voice.md`, `terms.md`, and the fake shop pages, by 31 Oct.
7. Whether Ask stays in the 4 Nov cut (built, free to show).
8. Whether `docs/use-cases.md` survives albattani's deletion.
9. Who applies the reconciliation register.


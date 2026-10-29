# Hand-off to the build session

For a fresh Claude Code session on `claude/amazing-mayer-0gknmk`, started by GK. Written 29 Oct 2026 at `6a0e2fa`. Everything below is on this branch; the session needs nothing from any other branch and must not merge one.

## Paste this as the first message

> Read `docs/handoff.md` first, then the files it lists in that order. You are the S2 coder for Followthrough, patching the existing app under `app/` to spec revision 8, one feature per commit, on branch `claude/amazing-mayer-0gknmk`. Do not merge or rebase any branch. Before the first feature, run the credential checkpoint in `docs/handoff.md` §3 and stop if anything is missing. Keep every test green and the data boundary intact.

## 1. Read in this order (about 25 minutes)

1. `CLAUDE.md`, `app/CLAUDE.md`, `modules/shared-rules.md`, `modules/s2-build/build-blueprint.md`, `.claude/skills/build/memory.md` (the kit's rules: trace lines only through `node scripts/trace.mjs`, one-way defences in their own commit first, no CDN assets, one commit per feature).
2. `app/spec.html` revision 8: §2 (jobs and tiers), Pinned words, §3, §6, Open Questions.
3. `app/workflows.md` revision 4: the "How the agent resolves a request" section, then the section "One Core list", then the 19 Core (4 Nov) rows by id.
4. `app/demo-scenes.md`: the six moments the build must make true.
5. `app/evals.md`: the rows cited in §4 below. Every feature names the rows it satisfies.
6. `app/data/voice.md`, `app/data/terms.md`, `app/data/calendar.json`: owner data the drafts and the stall loop read. Check their `signed-off:` first lines.
7. `docs/build-review.md` §2 to §4 and §7; `docs/handoff-spec-audit.md` §C (keep, rewrite, delete) and §E.
8. `app/port-from-albattani.md` for the reasoning behind F18 to F23, E7, A9.
9. `app/claude-progress.txt` and `git log --oneline -40`.

Skip `docs/kama-workflow-map.md` (evidence, not a build input) and `docs/market-research.md` (pitch material).

## 2. What exists

Vince's v0 (Node, `node:sqlite`, vanilla UI, one dependency) plus this branch's additions: manual brief and demo clock, brief as summary plus five cards, intent classifier with natural approve, edit and ask, enrichment input cap, model usage logging, process-env override. 43 tests pass with `node --test checks/*.test.mjs`; the adversarial probes run with `node checks/adversarial-review-2026-10-29.mjs` and must show AR-01 and AR-09 as `reproduced: false`, the rest still true. Run both before touching anything and record the result in the trace.

Not built (spec rev 8 names them): Capture, Stage, Cadence, Offer ladder, Price list guard, Coffee alias, Held with undo, Voice file gate, thread-aware drafts, Auto-reply, Parked, weekday-only briefs, reservations and supplier shortfall, own clocks for receipts and compliance dates, stall documents and transport, outbound host logging, Lapsed and referral, Monday plan, "what leaked" tile, the dashboard copy fixes.

## 3. Credential checkpoint (halt if any is missing)

Names only, never values; `npm --prefix app run doctor` prints what is missing. Required for the 4 Nov cut:

| Group | Keys |
|---|---|
| App | `OWNER_PASSWORD`, `APP_URL` (public HTTPS once hosted), `SYNTHETIC_DATA_APPROVED=true`, `DEMO_AGE_DAYS`, `DEMO_SEND_DELAY_MINUTES=0`, `ENABLE_JOBS`, `ENABLE_POLLING=false` |
| Model | `MODEL_BASE_URL=https://inference.baseten.co/v1`, `MODEL_NAME`, `MODEL_API_KEY`; `VISION_MODEL_*` only if an `image_url` test call fails; `VOICE_TRANSCRIBE_KEY` |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `GRAPH_API_VERSION`, `WHATSAPP_TEST_NUMBERS`, `WHATSAPP_OWNER_NUMBERS` |
| Zoho Books | `ZOHO_REGION`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_BOOKS_ORG_ID`, `EXPENSE_ACCOUNT_ID`, `CASH_ACCOUNT_ID`, `STALL_CUSTOMER_ID` |
| Zoho Mail (dummy account) | `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_MAIL_FROM`, `MAIL_FROM_COFFEE`, `OWNER_TEST_EMAILS`; `ZOHO_MAIL_INBOX_ID` only if polling |
| Enrichment | `ENRICHMENT_ALLOWED_HOSTS` (the hosted fake shop pages) |

Also required: `app/data/synthetic.json` v1 per `docs/build-review.md` §5 (every email `@example.test`, WhatsApp numbers on the test list, Books ids mapped, lead websites on the allowlisted hosts), and `signed-off:` lines in `voice.md` and `terms.md`. Missing data is a halt like a missing key. Ask GK; never type a value into any file but `app/.env`.

Three one-call checks before feature 1, logged in the trace: a `/chat/completions` call with `response_format: {type: "json_object"}` (if rejected, switch `providers.model()` to `json_schema`); the same with an `image_url`; a `/v1/asr/transcribe` call with a short WAV.

## 4. Build order, one commit each

Each row: what to change, where, which eval rows it satisfies. Rebuild the inbound path and the loop model first; every later row depends on them.

| # | Feature | Where | Satisfies |
|---|---|---|---|
| 1 | Event vocabulary: add the audit events the evals grade (`capture`, `thread_append`, `stage`, `reserve`, `allocation_conflict`, `supplier_diff`, `draft_blocked`, `alias_fixed`, `held`, `undone`, `revoked`, `auto_reply`, `parked`, `lapsed`, `books_read`, `host`, `refused`) to `app-spec.json` and emit `host` from `providers.jsonRequest` and `revoked` from `domain.revoke` | `src/providers.mjs`, `src/domain.mjs`, `app-spec.json` | A8, T7b |
| 2 | Loop model: `stage`, `chases`, `reserved_kg` on loops; sequences per counterpart type from spec Pinned: Stage; `domain.touch` resets `chases` on a counterpart touch | `src/domain.mjs` | W5 |
| 3 | Capture: a new intent `capture` returning `items[]`; each item routes to its workflow; one read-back; dedup by counterpart and reference; forwarded messages attach as `thread_append` | `src/intake.mjs` (extend `e.intent`, add `e.capture`) | W1, W2, W15 |
| 4 | Voice file gate and thread-aware drafts: `draft()` refuses without a signed-off `app/data/voice.md`, carries the file and the loop's last three inbound messages (store them on `receive`) in the prompt; brief says so when blocked | `src/engine.mjs`, `src/domain.mjs` | F17, T5, T3 |
| 5 | Price list guard and offer ladder: parse `app/data/terms.md` price rows and ladder rules; a draft with `[placeholder]` or an off-row price or a forbidden offer is `draft_blocked` and asks the owner | `src/engine.mjs`, new `src/terms.mjs` | F20, W7, T4 |
| 6 | Coffee alias: `MAIL_FROM_COFFEE` replaces `ZOHO_MAIL_FROM` for coffee counterparts; log `alias_fixed` | `src/providers.mjs`, `src/engine.mjs` | F21 |
| 7 | Held sends with undo: approve on a message sets `held` with `send_at`; the tick sends due ones; `undo` reply or page button cancels; `DEMO_SEND_DELAY_MINUTES` | `src/engine.mjs`, `src/server.mjs`, `public/app.js` | F2, F16 |
| 8 | Weekday-only scheduled briefs; `missedSlots` skips weekends | `src/engine.mjs`, `src/server.mjs` | E3, E6 |
| 9 | Cadence from `terms.md` (7 days after email, 5 after sample; closing date named near a shipment) | `src/domain.mjs` `due()`, `src/engine.mjs` | W6 |
| 10 | Auto-reply detection in `replyClass` (OOO, bounce, read receipt): no touch, no close, `auto_reply` logged | `src/domain.mjs` | E5 |
| 11 | Parked after three unanswered chases; one brief line; counterpart touch reopens | `src/domain.mjs`, `src/engine.mjs` | T10 |
| 12 | Reservations and supplier shortfall: `reserve` never beyond free kg, `allocation_conflict`; parse a supplier balance email into `supplier_diff` and one draft per affected counterpart | `src/domain.mjs`, `src/intake.mjs`, `src/engine.mjs` | F18, F19, W11 |
| 13 | Own clocks: receipts cold at 7 days unbooked; compliance dates from `calendar.json` cold 30 days before; stall days cold 3 days before with a document unsent, 2 days before with transport unconfirmed | `src/domain.mjs` `due()` | E7, F22, W4 |
| 14 | Ask extensions: tax-season answer, plain refusal with `refused` for out-of-scope asks | `src/intake.mjs` `e.answer` | F23, A9 |
| 15 | Dashboard: owner copy on cards, one card per loop with its draft, lead panel collapsed before qualification, lot name on lot-low loops, "what leaked" tile, Undo button on held cards | `public/` | W14, F16 |
| 16 | Fixes from Vince's probes that touch the demo: AR-03 (null balance), AR-07 (draft invoices), AR-08a (cash-up without bag size) | `src/books.mjs`, `src/stall.mjs` | F4, F6, E2 |

Rows 1 to 8 and 15 are the 4 Nov cut; 9 to 14 and 16 follow in the same order if time allows. Each commit: tests for the row (extend the matching `checks/*.test.mjs`), `node checks/syntax.mjs`, the full suite green, `node scripts/trace.mjs S2.CODER "<feature> landed" "<why>"`, then commit.

## 5. Rules that do not bend

- No real person's data in any checked-in file: synthetic counterparts only, `@example.test`, test numbers. The owner's own signature is the one exception.
- Nothing sends, writes to Books or reaches a non-test recipient without `SYNTHETIC_DATA_APPROVED=true` and an owner approval; `APP_LIVE` stays `false`.
- Keys only in `app/.env`. Never ask for a value in chat.
- Tech stack as in `app/app-spec.json`: no new runtime package, no CDN asset, without a one-way defence in the trace first.
- A feature that serves no spec line or eval row is an invention; stop and ask.
- Don't merge `main`, `codex/followthrough-v0`, albattani or blissful-hamilton. Files from them are already copied here.

## 6. When the owner is in the room

Ask these at the start, in this order, and record the answers in `docs/decisions.md`: the two sign-off lines; lapsed days; deposit 30 or 50%; cold-send cap; retention; hosting vendor; whether Zoho Mail is wired for the demo or email is shown in the log only. `docs/setup-interview.md` has the full interview if the setup owner is present too.

## 7. Demo rehearsal (3 Nov)

With the demo clock on and `DEMO_SEND_DELAY_MINUTES=0`: compose the brief from the page, tap approve on the warm-lead card and watch the test inbox, send "yeah go ahead" on the invoice card, send the cash-up voice note and watch Books and the lot, open Where I stand, scroll `logs/actions.jsonl`. Each step maps to a row in `app/demo-scenes.md` and an eval row; anything that fails goes to `/surgical-fix`, one change at a time.

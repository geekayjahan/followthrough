# Hand-off to the next session

For a fresh Claude Code session on `main`. Written 30 Oct 2026 after the S2 build patched the app to spec revision 8 (build commits `0f070ac` to `ab53483`, merged into main on 30 Oct). Main is the only branch; the session creates none and merges none. The previous hand-off (29 Oct, `893f654`) is in git history.

## Paste this as the first message

> Read `docs/handoff.md` first, then the files it lists in that order. The S2 build is complete on `main`. Your job is §4: run the credential checkpoint, then the three one-call checks, then S3 with `/eval`, then the rehearsal. Work on main; do not create or merge branches. Stop at any halt in §3 and ask.

## 1. Read in this order (about 20 minutes)

1. `CLAUDE.md`, `app/CLAUDE.md`, `modules/shared-rules.md` (trace lines only through `node scripts/trace.mjs`, one-way doors defended first, no CDN assets).
2. `app/spec.html` revision 8: §2, Pinned words, §3, Open Questions.
3. `app/evals.md`: every row. S3 grades these.
4. `app/feature-list.json` rows FT-13 to FT-28: what the build added, the evals each row serves, and its tests.
5. `app/claude-progress.txt` from the line "baseline recorded before any change" to the end, and `git log --oneline 893f654..HEAD`.
6. `app/data/voice.md`, `app/data/terms.md`, `app/data/calendar.json`, `app/data/synthetic.json`: check the state in §3.
7. `app/demo-scenes.md` and §7 of this file for the rehearsal.

Skip `docs/kama-workflow-map.md`, `docs/market-research.md`, `docs/build-review.md` and `docs/handoff-spec-audit.md`: they fed the build and are not inputs to S3.

## 2. What exists at `ab53483`

Sixteen features, one commit each, on top of Vince's v0 and the 29 Oct additions. `node --test checks/*.test.mjs` passes 81 tests; `node checks/syntax.mjs` and `node checks/secret-scan.mjs` are clean. `node checks/adversarial-review-2026-10-29.mjs` reads AR-01, AR-03, AR-07, AR-08a, AR-09 and LIMIT-01a as `reproduced: false` (LIMIT-01a because a brief now survives a Books read failure with a warning); the rest still reproduce and are not demo-path. Run all four before touching anything and record the result in the trace.

| Commit | Feature | Evals | Tests |
|---|---|---|---|
| `72f25ff` | Event vocabulary: `host` on every outbound request, `revoked` on every revoked card; `loop_open` lines carry `loop_type` | A8, T7b | provider-contracts, domain |
| `22d74e1` | Loop model: `stage` from the roaster, café or stockist sequence, `chases`, `reserved_kg`; `domain.complete` logs `stage` | W5 | domain |
| `a1373c1` | Capture: `capture` intent splits one owner message into items, one read-back, one ask; dedup by counterpart and reference; forwarded messages `thread_append` | W1, W2, W15 | capture |
| `06092a8` | Voice file gate: no customer draft without `signed-off:` on `voice.md`; drafts carry the file, the thread and the last question; `model_call` has `voice_file` | F17, T5, T3 | voice |
| `30357b8` | Price list guard and offer ladder from `terms.md` (`src/terms.mjs`); `draft_blocked` plus an ask | F20, W7, T4 | terms |
| `b7211f7` | Coffee alias: `MAIL_FROM_COFFEE` at draft and again at send, `alias_fixed`; the key is now required | F21 | alias |
| `5ee4dbb` | Held sends: approve holds a message for `DEMO_SEND_DELAY_MINUTES` (60 when unset); the tick releases; `undo` by reply or page; a touch during the hold revokes | F2, F16, T1b | held |
| `6d456a5` | Weekday-only scheduled briefs | E3, E6 | brief |
| `b2fdf7f` | Where I stand: one card per loop with its draft, owner copy, lot names, collapsed lead panel, what-leaked tile, Undo button | W14, F16 | dashboard, browser fixture |
| `991106b` | Cadence from `terms.md`: 5 days after a sample, 7 after an outreach send with no reply, else 3; chases within 10 days of a calendar shipment closing date name it | W6 | cadence |
| `cc23b62` | Auto-replies (out of office, bounce, read receipt) logged `auto_reply`, never a touch | E5 | domain |
| `5ea39ef` | Parked after three unanswered chases, one brief line, a touch reopens | T10 | parked |
| `017de7f` | Reservations never beyond free kg (`allocation_conflict`); supplier balance email gives `supplier_diff` and one draft per affected counterpart; an accepted quote reserves and asks for delivery details | F18, F19, W11 | stock.reservations |
| `c3adfc2` | Own clocks: receipt 7 days, compliance 30 days before, stall 3 days before with a document unsent and 2 days with transport unconfirmed; `engine.syncCalendar` reads `calendar.json` | E7, F22, W4 | clocks |
| `47e17db` | Ask: tax-season answer from the store with a source per line; plain refusals with a `refused` line | F23, A9 | ask |
| `ab53483` | AR-03 null balance rejected, AR-07 draft invoices never chased, AR-08a bag size must be spoken | F4, F6, E2 | books, stall |

Judgement calls the build made where the spec left room, each in the trace:

- The 7-day cadence applies only after an outreach send; a never-contacted lead is still cold at 3 days, so F1 holds.
- A parked loop has status `parked` (the eval's word) and still receives replies, intake and capture.
- A counterpart the owner names but the data does not hold becomes a stub lead org (`source: "capture"`) so the loop exists; it gets no draft until a person is added.
- Sending the organiser message for a stall day marks its documents sent, since the app cannot attach files.
- `DEMO_SEND_DELAY_MINUTES` unset means a 60-minute hold. Every test that expects an immediate send sets it to 0.
- Tests read `checks/fixtures/` (a signed voice file, an unsigned one, an empty calendar) through `VOICE_FILE`, `TERMS_FILE` and `CALENDAR_FILE` overrides, so the real owner files never shape a test.
- A stale "yes" on an undone, edited or revoked card logs `blocked` and replies, instead of failing the inbound event.

## 3. Checkpoint (halt if anything is missing)

Run `npm --prefix app run doctor`. On 30 Oct it listed 24 missing keys and `synthetic_approved: false`, and GK chose to build offline. Nothing below can run until these exist. Names only, never values; values go in `app/.env` or the cloud environment's variables, never in chat or any other file.

| Group | Keys |
|---|---|
| App | `OWNER_PASSWORD`, `APP_URL`, `SYNTHETIC_DATA_APPROVED=true`, `DEMO_AGE_DAYS`, `DEMO_SEND_DELAY_MINUTES=0` for the demo, `ENABLE_JOBS`, `ENABLE_POLLING=false` |
| Model | `MODEL_BASE_URL=https://inference.baseten.co/v1`, `MODEL_NAME`, `MODEL_API_KEY`; `VISION_MODEL_*` only if an `image_url` call fails; `VOICE_TRANSCRIBE_KEY` |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `GRAPH_API_VERSION`, `WHATSAPP_TEST_NUMBERS`, `WHATSAPP_OWNER_NUMBERS` |
| Zoho Books | `ZOHO_REGION`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_BOOKS_ORG_ID`, `EXPENSE_ACCOUNT_ID`, `CASH_ACCOUNT_ID`, `STALL_CUSTOMER_ID` |
| Zoho Mail | `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_MAIL_FROM`, `MAIL_FROM_COFFEE`, `OWNER_TEST_EMAILS`; `ZOHO_MAIL_INBOX_ID` only if polling |
| Enrichment | `ENRICHMENT_ALLOWED_HOSTS` |

Owner data, all still outstanding on 30 Oct:

| File | State now | Needed |
|---|---|---|
| `app/data/voice.md` | first line still "(not yet ...)" | `signed-off: <date> GK`. Until then every customer draft is refused by design and the brief says so. |
| `app/data/terms.md` | same | same line; the guard parses the file regardless |
| `app/data/synthetic.json` | four-org starter, no Books ids, no invoices, no orders of note | v1 per `docs/build-review.md` §5: every org with a `type` (roaster, cafe, stockist, supplier, market), people on `@example.test` and the test numbers, `books_contact_id` and lot `books_item_id` mapped, lead websites on the allowlisted hosts, a few invoices and orders so the invoice and reservation scenes have content. Supply it before the first real run: the app refuses a changed dataset once the database exists. |
| `app/data/calendar.json` | stall days only | re-export with `documents: [{name, sent}]` and `transport_confirmed` per stall day, a `compliance: [{id, what, due, done}]` list, and `shipments: [{name, closing_date}]` if a closing date should be named |

Who supplies what: the sign-off lines and voice samples are GK's own words and figures; the ids and keys come from whoever holds the Zoho and Meta accounts.

## 4. What the next session does, in order

1. Baseline: the four checks in §2, then one trace line.
2. Checkpoint §3. Halt and ask on anything missing.
3. Three one-call checks, each traced: `/chat/completions` with `response_format: {type: "json_object"}` (if rejected, switch `providers.model()` to `json_schema` in `src/providers.mjs`); the same call with an `image_url`; `/v1/asr/transcribe` with a short WAV.
4. Start the app and compose a brief from the page with `DEMO_AGE_DAYS=3`. Expect cards only once `voice.md` is signed.
5. `/eval` (S3). The judge grades `app/evals.md` from `app/logs/actions.jsonl`, Books, the test inbox and the page. Expect `app/eval-results.html` and `app/eval-runs.json`.
6. Failures go to S4, one surgical fix at a time, each committed and traced.
7. Rehearsal, §7.

Not built, by decision: Lapsed and referral (W8, W9), Monday plan (W10), delivery-note photos (W3), shipped-without-invoice (W12). They are Core (after 4 Nov) rows and need either Books order history or the vision path; add them after S3 if time allows, one commit each.

## 5. Rules that do not bend

- No real person's data in any checked-in file: synthetic counterparts only, `@example.test`, test numbers. GK's own signature is the one exception.
- Nothing sends, writes to Books or reaches a non-test recipient without `SYNTHETIC_DATA_APPROVED=true` and an owner approval; `APP_LIVE` stays `false`.
- Keys only in `app/.env` or the environment. Never ask for a value in chat.
- No new runtime package or CDN asset without a one-way defence committed first, on its own.
- A change that serves no spec line or eval row is an invention; stop and ask.
- Main is the only branch. The old build branches are deleted; their useful files were copied in on 29 Oct.
- Trace lines only through `node scripts/trace.mjs <session> "<event>" "<why>"`.

## 6. Open decisions for GK

Record answers in `docs/decisions.md`: lapsed days (45 café, 90 roaster until set); deposit 30% or 50%; cold-send cap 20 or 30; retention 12, 24 or 36 months; hosting vendor and the public HTTPS webhook URL; whether Zoho Mail is wired for the demo or email is shown in the log only; which price column a quote uses by default (list or suggested in `terms.md`).

## 7. Demo rehearsal (3 Nov)

With `DEMO_AGE_DAYS=3` and `DEMO_SEND_DELAY_MINUTES=0`:

1. Compose the brief from the page: warm lead first, each loop with its draft, the what-leaked tile.
2. Tap approve on the warm-lead card; watch `approve`, `held` with `demo_delay: 0`, then `send` in the log and the message in the test inbox from the coffee alias.
3. Reply "yeah go ahead" on the invoice card by voice note; then "undo" on another card and confirm nothing sends.
4. Send the cash-up voice note; confirm the ask for the bag size, then the Books sale and the lot dropping by 1.5 kg.
5. Send a supplier balance email to the test inbox and compose again: the shortfall line and one draft per roaster.
6. Voice note "it's tax season, what am I missing?", then "file my VAT return": the sourced list, then the plain no with a `refused` line.
7. Open Where I stand and scroll `logs/actions.jsonl`.

Each step maps to a row in `app/demo-scenes.md` and an eval row. Anything that fails goes to `/surgical-fix`, one change at a time.

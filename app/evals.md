# Evals — Followthrough (S1 Verification, run at S3)

Each row is a pass/fail two strangers grade the same from the output alone. Evidence comes from one of four outputs the spec names: the action log `app/logs/actions.jsonl` (one line per brief, approval, send, Books write, with ISO timestamp), the fresh Zoho Books records, the WhatsApp test-list inbox, or the web page "Where I stand". All data is from `app/data/synthetic.json`; if the build adopts the demo-clock idea (spec §7), the grader may use it to age loops.

| id | scenario | check | source |
|---|---|---|---|
| F1 | A lead loop has no touch for 3 calendar days | The next 08:00 or 18:00 brief lists that lead with a drafted message; `actions.jsonl` has a `brief` line naming the loop id and a `draft` line with the text. | spec §2 Chase · Pinned: Cold, Brief |
| F2 | Owner taps approve on a draft whose counterpart has an email | `actions.jsonl` has `approve` then `send` lines for the loop within 60 s; the message arrives in the owner's test mailbox (pre-live) with the drafted text; the loop's last touch resets. | spec §2.2 · Pinned: Approve, Touch, Live |
| F3 | Owner replies with a voice note saying "yes send it" (or "yeah go ahead") | `actions.jsonl` has a `transcript` line containing "yes" and a `send` line for the same loop; a voice note saying "no, hold it" produces no `send`. | spec §2.2 · Pinned: Approve |
| F4 | A Books invoice is 1 day past due and unpaid | The next brief carries an invoice-chase draft naming the invoice number and amount; `actions.jsonl` shows `brief` for loop type `invoice`. | spec §2 Get paid · Pinned: Cold |
| F5 | Owner sends a receipt photo on WhatsApp and approves | A Zoho Books expense exists with the amount and supplier read from the photo; `actions.jsonl` has a `books_write` line of kind `expense` with the Books id. | spec §2 Keep the books |
| F6 | Owner sends a voice note "sold six 250g bags of lot 2, 120 pounds cash" and approves | Books holds a sale of £120; lot 2's `left_kg` drops by exactly 1.5; a voice note with no bag size produces an `ask` line and no `books_write` until the size is given; `actions.jsonl` has `books_write` kind `sale` and a `stock_move` line. | spec §2 Stall · Pinned: Bag |
| F7 | A lot's `left_kg` falls below 20% of `start_kg` | A loop of type `lot_low` exists for that lot and appears in the next brief. | spec §2 Stock · Pinned: Cold |
| F8 | A new lead's website shows coffee at £11 per 250g | The lead's record carries tier `mid-shelf`, price 11, and `sells_indian` true/false with a source URL; the background panel on the web page shows the same. | spec §2.1 · Pinned: Specialty bar |
| F9 | Two cold leads: one 2 edges from a customer, one with no path | The warm lead is listed above the stranger in the brief, and its draft names the connecting organisation; the stranger's draft does not invent one. | spec §2.1 · Pinned: Warm path |
| F10 | A warm lead's path runs through a current customer | The brief proposes that customer as introducer and includes a draft message to them; no message to the introducer is sent without its own approval. | spec §2.1 |
| F11 | Owner opens the web page | The map shows every org and edge in `synthetic.json`; a lead's background panel expands to show tier, price, Indian-on-shelf, path to the network, and a source for each fact. | spec §2.1, §2.2 |
| F12 | Owner opens the web page at any moment | Cash, total owed, kg left per lot and loops due today equal the same figures read directly from Zoho Books and the loop store at that time. | spec §2.2 · Pinned: Right |
| E1 | A counterpart replies "not now, maybe next quarter" | The loop closes as a human reply with no decline recorded; the org is not on the suppression list; no `draft` line for that loop id exists after the reply's timestamp. | Pinned: Declined, Loop |
| E2 | A customer payment is recorded in Books against an open invoice loop | The invoice loop closes within the next brief cycle; no chase draft is produced after the payment timestamp. | spec §2 Get paid |
| E3 | 24 hours pass with cold loops present | `actions.jsonl` shows exactly two scheduled `brief` lines (`manual: false`), stamped 08:00 and 18:00 Europe/London (±2 min), and no unprompted outbound owner message between them. Lines with `manual: true` are owner-requested and do not count. | Pinned: Brief · spec §2.2 |
| E4 | A new lead's website shows coffee at £6 per 250g | The lead is closed with reason "below bar" recorded; it never appears in a brief; no draft exists for it. | spec §2.1 · Pinned: Specialty bar |
| A1 | A draft exists and the owner never responds | No `send` line and no message in any test inbox for that loop; the draft reappears in the next brief. | spec §2 · Pinned: Approve |
| A2 | `APP_LIVE` is unset and a loop's counterpart has a non-test address or number | The `send` line records the rewritten test recipient; no message reaches the original address; a non-test WhatsApp number is refused with a logged `blocked` line. | Pinned: Live · spec §2.3 |
| A3 | An org is marked declined and a new lead shares its domain | No draft is ever produced for either; `actions.jsonl` has a `suppressed` line naming the domain. | Pinned: Declined · spec §2.3 |
| A4 | The code base is searched for payment, transfer or bank-write calls | None exist; Books writes are limited to expenses, customer payments, sales and items (grep of the Books client). | spec §4 · key constraint "never move money" |
| A5 | The public repo is scanned for secrets | Zero findings; `app/.env` is gitignored and `app/.env.example` holds only placeholder values. | spec §6 T10 |
| A6 | `synthetic.json` is validated at start | Every email ends in `@example.test`; every WhatsApp number is on the test list or null; a file breaking either rule stops the app with a logged `data_rejected` line. | spec §2.3, §3 |
| F13 | Owner replies to a card with "yeah but say 14 not 12" | `actions.jsonl` has an `intent` line with `edit`, an `edit` line raising the action to version 2, no `send`; a new card arrives bound to version 2; a later "yes" on the old card is refused and logged `blocked`. | spec Pinned: Approve |
| F14 | Owner asks "what's left of lot 2?" on WhatsApp | `actions.jsonl` has an `intent` line with `ask` and an `answer` line; the reply states the lot's `left_kg`; no `send` or `books_write` follows. | spec §2 Ask |
| F15 | Any model call | `actions.jsonl` has a `model_call` line with the model id and token counts. | spec §6 T6, T9 |

## Owner trust checks (interview 29 Oct, GK)

Each row names its reviewer and its grading tag per the eval blueprint: code (a value decides), judge (two worked examples decide).

| id | reviewer | scenario | check | tag · source |
|---|---|---|---|---|
| T1 | customer sense | A counterpart reply is received at least 1 minute before a brief slot | That loop does not appear in the `brief` line's `loop_ids`; its pending card is `revoked` with reason "new touch"; no `send` for it follows without a fresh `draft` and `approve`. | code · Pinned: Touch |
| T1b | customer sense | A counterpart reply is processed between compose and send of a brief | The card for that loop is revoked before delivery; no `send` for that action ever appears. | code · Pinned: Touch |
| T2 | data | A customer payment is recorded in Books at time t | The next `books_read` after t closes the loop ("paid"); any pending chase is `revoked`; no `send` for that invoice after t. | code · spec §2 Get paid |
| T3 | data | Any `draft` line for a message | Every £ figure and date in the text exists in the loop, invoice, lot or thread; every organisation named is the counterpart or on its warm path. | code · Pinned: In the owner's voice |
| T4 | data | Any `draft` line for a message | The text asserts no commitment absent from the loop or thread (delivery date, discount, availability, price change). Pass example: "The sample went out on 20 Oct; happy to talk through the lot when you have tried it." Fail example: "I can do you 10% off if you order this week." | judge · Pinned: In the owner's voice |
| T5 | customer sense | Any `draft` replying to a counterpart message | It answers what the counterpart last asked and reads in a British register, no longer than the moment needs. Pass example: counterpart asked for bag sizes, draft names the sizes and stops. Fail example: counterpart asked for bag sizes, draft re-pitches the origin story and omits sizes. | judge · Pinned: In the owner's voice |
| T6 | security | Any `send` line | An `approve` line with the same `action_id` and `hash` precedes it; the sent text equals the payload at that hash. | code · Pinned: Approve |
| T7 | security | A "yes" (text or transcript) on a card whose action has since been edited | A `blocked` line, no `send`. | code · Pinned: Approve |
| T8 | QA | Owner presses "Refresh sources" after any `books_write` | Cash, owed and kg shown equal Books and the store at the stamped read time; a mismatch at the stamp is a fail. | code · Pinned: Right |
| T9 | QA | Any lot | Σ `stock_move` kg for the lot equals `start_kg` minus `left_kg`. | code · spec §2 Stock |
| T10 | customer sense | A loop has three approved sends with no counterpart touch between them | The loop's status is `parked`; no `draft` for it after the third send; exactly one brief line says "parked, 3 chases unanswered"; a later counterpart touch sets it back to `open`. | code · Pinned: Parked |

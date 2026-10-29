# Followthrough workflow catalogue

Revision 2, 29 Oct 2026 (revision 1 reconciled against GK's own "Kāma ops app: notes for spec", 16 Oct, her sent mail, the Stall Tracker and the Sales Tracker). Companion to `spec.html`, which stays the contract; this file is the catalogue §2 points at. It lists what a one-person Indian green-coffee importer with a roasted retail line, wholesale café and roaster customers and a market stall actually battles in a week, and what the app does about each. Written from GK's own business notes (lot catalogue, positioning, wholesale model, sourcing sheets); lines marked **assumed** were not in those notes and need her yes or no (collected in the last section).

## How to read a row

Every workflow runs through the same engine, so each row only states what differs:

- **Trigger**: what happens or what the owner says, in her words.
- **App**: what it notices, captures, asks, drafts or computes. A draft never leaves without approval; a Books write never happens without approval; an answer never sends or writes.
- **Needs**: which source or input the row depends on (WhatsApp, voice, photo, Books, calendar, website, network, estate sheet).
- **Evidence**: the `actions.jsonl` lines or page state that prove it ran.
- **Tier**: Core (in the 4 Nov demo build), Next (first weeks after), Later (presentation future scope).

Engine rules every row inherits (pinned in `spec.html`): capture splits one message into as many loops and facts as it carries and asks once for what is missing; every loop has a type, a counterpart, a stage, a last touch and a next move; cold is 3 calendar days (invoice: day after due; lot: under 20%; stall: uncashed by 21:00); the brief is weekdays 08:00 and 18:00 plus on request; approvals bind to one immutable card; customer messages are held 60 minutes with undo; three unanswered chases park a loop; auto-replies are not touches; drafts come from the signed-off voice file and the thread; nothing is asserted that is not in the loop, the thread, the records or the network.

## A. Capture: the owner talks, the app sorts (Core)

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| A1 | One voice note at 22:40: "Loaf wants two more kilos Friday, the stall was dead, I paid the courier 38 quid cash, and remind me to chase the Society sample" | Splits into four items: an order loop, a stall day record, a receipt, a sample chase; reads back the four in one message; asks only for what is missing (which lot for the order) | voice, WhatsApp | `transcript`, `capture` with 4 items, `ask` naming the missing field | Core |
| A2 | A text with one problem, incomplete ("someone from a café in Bath asked about samples") | Opens a lead loop with counterpart "unknown café, Bath"; asks for a name or handle when it next matters, not immediately | WhatsApp | `loop_open` type lead, `ask` deferred to next brief | Core |
| A3 | Forwarded customer WhatsApp message | Attaches it as the thread on the matching loop (by counterpart and reference); opens a loop if none; no reply is drafted to a forwarded third party | WhatsApp | `thread_append` with loop id | Core |
| A4 | Screenshot of an email or chat | Vision reads sender, date, gist; same as A3; asks the owner to confirm who it is from if unsure | photo | `capture` source screenshot, `ask` if counterpart unclear | Next |
| A5 | Photo of a delivery note or packing slip | Reads customer, lots, kg, date; marks the order shipped after approval | photo | `capture`, `approve`, `loop_close` shipped | Core |
| A6 | Photo of a stock shelf or bag count ("that's what's left of the Pichia") | Reads a count; proposes a stock correction; approval moves the lot's kg | photo | `ask` with readback, `stock_move` reason "count" | Next |
| A7 | Photo of a label or lot card | Records lot facts (name, process, notes, score) on the lot | photo | `fact` on lot | Next |
| A8 | Calendar event "Stall, Harbourside, Sat" | Opens a stall day loop for that date; cash-up due 21:00 | calendar | `loop_open` stall | Core |
| A9 | "Forget that" or "that's done" with no card quoted | Asks which item; closes it on confirmation | WhatsApp | `ask`, `loop_close` owner |  Core |
| A10 | Owner says the same thing twice in two messages | Deduplicates by counterpart and reference; says "already have that" | WhatsApp | `capture` dedup | Core |

## B. Sourcing and inbound green (the estate side)

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| B1 | Estate sends the new crop list (PDF or sheet) | Parses lots, process, notes, score, kg held; diffs against the last list; shows what is new, gone, or changed | estate sheet | `fact` per lot, `diff` | Next |
| B2 | "Ask the estate for 60 kg of Yeast Maceration and 100 of Plantation A" | Opens a purchase loop; drafts the request to the estate contact in the owner's voice; tracks reply | WhatsApp, network | `loop_open` purchase, `draft`, `send` | Next |
| B3 | Estate confirms price and availability | Records the pro-forma on the purchase loop; computes landed cost per kg from freight, duty and fees the owner gives (**assumed**: she lands via a freight forwarder, not the estate) | thread | `fact` landed cost | Next |
| B4 | Shipment booked, ETA given | Opens an inbound loop with ETA; brief flags it 3 days before and on the day | thread, calendar | `loop_open` inbound | Next |
| B5 | Customs entry or duty invoice arrives (forwarded) | Receipt path: expense in Books, cost added to the lot's landed cost | photo, Books | `books_write` expense | Next |
| B6 | Green arrives at the warehouse or the roaster | Owner says "the 400 kg landed"; lots created with start kg; sample bags set aside (**assumed** 250 g per lot) | WhatsApp | `lot_open` | Next |
| B7 | Moisture or quality issue on arrival | Opens a claim loop against the estate with photos; drafts the message | photo | `loop_open` claim, `draft` | Later |
| B8 | Between-harvest gap approaching (stock will run out before next crop) | Computes run-out date from sell-through; brief says "Plantation A runs out around 12 Jan; next crop ETA March; pre-orders?" | lots, orders | `brief` line, `forecast` | Next |
| B9 | Pre-order campaign decision | Drafts a pre-order note to past retail buyers and cafés on the warm list; one approval per recipient batch | network, voice file | `draft` batch | Later |
| B10 | Supplier payment due (estate pro-forma terms) | Payable loop; brief flags the due date; never pays | Books | `loop_open` payable | Next |
| B11 | FX rate question ("what's the rupee doing") | Answers from a configured rate source or says it has none | Ask | `answer` | Later |
| B12 | Estate asks for feedback on a lot | Drafts the reply from cupping notes on file | thread | `draft` | Later |

## C. Stock and lots

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| C1 | A lot's kg falls under 20% of start | Opens a lot_low loop; brief says "Reorder or let it run out" | lots | `loop_open` lot_low | Core |
| C2 | "What's left of lot 2?" | Answers kg left, kg committed to open orders, free kg | lots, orders | `answer` | Core |
| C3 | Roasted stock: bags on hand per lot (**assumed** she holds roasted bags for stall and retail) | Tracks roasted bags separately from green kg; stall sales draw from bags | lots | `stock_move` kind roasted | Next |
| C4 | Roast batch sent to the roaster ("sent 30 kg of Pichia to Triple Co") | Moves green kg to "at roaster"; expects bags back at a yield the owner sets | WhatsApp | `stock_move` reason roast | Next |
| C5 | Bags return from the roaster | Adds roasted bags; closes the roast loop | WhatsApp | `stock_move` | Next |
| C6 | Order confirmed for X kg | Reserves X kg on the lot; free kg shown separately | orders | `reserve` | Core |
| C7 | Sample bags running low (**assumed** separate sample stock) | Flags when under 3 per lot | lots | `loop_open` sample_low | Later |
| C8 | Stock count disagrees with the store (from A6) | Proposes the correction with the reason recorded | photo | `stock_move` reason count | Next |
| C9 | A lot sells out | Marks it sold out; drafts a note to anyone with a pending quote on it | lots | `loop_close`, `draft` | Next |
| C10 | Weekly sell-through | Page shows kg per week per lot and weeks of cover | lots | page | Next |
| C11 | Old stock meets new stock (ops notes §12) | Flags lots older than a set age when a new crop is due; suggests a clearance price above floor | lots | `brief` line | Next |
| C12 | Sample stock | Deducted per sample sent (300 g or 1 kg green, roasted bags for cafés); flags when a lot's samples are gone | lots | `stock_move` kind sample | Core |

## D. Samples and cupping

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| D1 | A lead asks for samples | Opens sample loop; asks which lots and where to send if missing; proposes the sample set by the lead's tier (**assumed**: premium gets scored lots, mid-shelf gets Plantation A plus one honey) | WhatsApp, network | `loop_open` sample, `ask` | Core |
| D2 | Samples sent | Owner says "sent"; loop moves to "sample out"; feedback chase due at day 7 (Roaster Pipeline rhythm) | WhatsApp | `touch` stage sample_out | Core |
| D3 | No feedback by day 7 | Chase draft asks for the cupping result, naming the lots sent | voice file | `draft` | Core |
| D4 | Feedback arrives ("loved the Pichia, Plantation A a bit flat") | Records per-lot verdicts on the lead; next move becomes a quote on the liked lot | thread | `fact` cupping, `stage` quote | Core |
| D5 | Feedback is negative on all lots | Closes the sample loop as a soft no; lead stays, re-approach when a new crop lands | thread | `loop_close`, `remind` next crop | Next |
| D6 | Owner's own cupping notes by voice | Stores notes on the lot; used in drafts and the offer list | voice | `fact` | Next |
| D7 | Sample cost tracking | Each sample set costs a known amount; shown per lead | lots | `fact` cost | Later |
| D8 | A roaster asks for a second sample of the same lot | Allowed once; flags a third request | thread | `ask` | Later |

## E. Leads and outbound strategy (Grow)

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| E1 | New lead captured | Qualifies. Roaster (GK's rubric): sells Indian coffee +3, blends or Italian range +2, small owner-run +2, market town +1, owner named +1, container importer −3; Companies House entity check (a sole trader is phoned, never cold emailed, under PECR). Café or stockist: shop price per 250 g (bar £8; mid-shelf to £12; premium above), Indian on shelf. Places in the network | website, Companies House, network | `qualified` with sources and score | Core |
| E2 | Lead qualified | Picks the **sequence** by type. Roaster (GK's own stage list, ops notes §4): Researched → Queued → Sent → Replied → Price aligned → Sample sent → Sample delivered → Feedback → Booked → Deposit paid → Delivered → Paid → Repeat, with a lost reason on exit. Café: intro → sample → guest slot offer → first order → second slot. Stockist: intro → retail samples → wholesale list → first case. The next step is always the stage after the last completed one | network | `stage` | Core |
| E3 | Lead has a warm path (1 or 2 edges to a customer, supplier or stockist) | Ranks first; the first draft names the connection as a sentence; proposes an introducer ask (separate card) | network | `draft` with path, intro card | Core |
| E4 | Lead is a stranger | Cold intro in the voice file's register, no claims beyond the lot facts; sent on the counterpart's channel | voice file | `draft` | Core |
| E5 | **Cadence and channel** | GK's rules (ops notes): chase 7 days after an outreach email with no reply, 5 days after a sample is sent; after a reply the thread sets the next move; every chase near a shipment names the closing date. Channel follows the counterpart's last channel; café contacts on WhatsApp where the number is known. Cold sends capped at 20 to 30 a day, bounce rate above 3% pauses a batch | `app/data/terms.md` | `draft` with cadence reason | Core |
| E6 | **Offer ladder** at each stage | Only offers from the owner's rules: free sample set; guest slot at list price, 4 to 6 weeks, 5 to 10 kg a week, defined start and end; no first-order discount, no machines, no exclusivity; loyalty terms only after the third order. A draft that offers anything else fails the check | config | `draft` checked against ladder | Core |
| E7 | Lead goes quiet after 3 chases | Parked; one brief line; re-approach trigger set (new crop, new lot, seasonal) | engine | `parked` | Core |
| E8 | **Lapsed customer**: no order in N days (ops notes name a reorder cadence for roasted customers but no number; defaults 45 for cafés, 90 for roasters until GK sets them) | Opens a re-engagement loop; draft references their last lot and what is new | Books, orders | `loop_open` lapsed, `draft` | Core |
| E9 | **Referral ask**: a customer has had 3 or more orders and a lead sits 2 edges from them | Drafts the intro ask to the customer, separate approval | network | intro card | Core |
| E10 | A lead replies with a question (price per kg, minimums, delivery) | Answer drafted from the price list and terms on file; nothing invented | config, thread | `draft` | Core |
| E11 | Lead says "not now, next quarter" | Soft no: loop closes, a re-approach loop opens for the date given | thread | `loop_close`, `loop_open` reapproach | Core |
| E12 | Lead says stop | Declined; domain suppressed; never drafted again | thread | `suppressed` | Core |
| E13 | Out-of-office or bounce | Not a touch; next chase on schedule; a hard bounce flags the address | thread | `auto_reply` | Core |
| E14 | A new lot lands or scores arrive | Drafts a "new on the list" note to warm leads and lapsed customers, one card per recipient, max 5 per brief | lots, network | `draft` batch | Next |
| E15 | Instagram: a café tags or mentions Kāma | Captured as a touch on that org's loop if known, else a new lead with the handle; Business Discovery enriches named accounts only | Instagram API | `touch` source instagram | Next |
| E16 | Event or market coming up (**assumed**: trade shows, coffee festivals) | Drafts invites to leads in that city | calendar, network | `draft` batch | Later |
| E17 | Lead asks for a visit or a call | Proposes two slots from the calendar; books on approval | calendar | `draft`, `calendar_write` | Next |
| E18 | Outbound plan for the week | Monday brief lists this week's sequence steps per lead, so the owner sees the strategy, not just today's chase | engine | `brief` plan section | Core |

## F. Quotes, orders and fulfilment

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| F1 | Lead ready for a quote | Drafts the quote from the price list: per kg green by lot, or wholesale per bag; terms from config | config | `draft` quote | Core |
| F2 | Quote unanswered 3 days | Chase | engine | `draft` | Core |
| F3 | Quote accepted ("go ahead with 20 kg") | Stage to order unconfirmed; asks for delivery date and address if missing; reserves stock | thread | `stage`, `reserve`, `ask` | Core |
| F4 | Order confirmed | Order to ship loop; brief shows it until shipped; delivery date on the page | engine | `loop_open` order_to_ship | Core |
| F5 | Order needs roasting first (café bags) | Opens a roast loop to the roaster for the kg; order waits on it | config | `loop_open` roast | Next |
| F6 | Shipped (owner says, or A5 delivery note photo) | Closes the order; invoice loop expected in Books within 2 days, flagged if absent | Books | `loop_close` shipped, `expect` invoice | Core |
| F7 | Guest slot ends (date agreed at the start) | Brief on the last week: "slot ends Friday; ask for the second slot or a signature placement" | calendar | `draft` | Next |
| F8 | Customer changes an order | Thread updates the order; stock reservation adjusts; a confirmation draft | thread | `fact`, `reserve` | Next |
| F9 | Courier booking | Later; the app only records the tracking number the owner pastes | WhatsApp | `fact` tracking | Later |
| F10 | Delivery problem reported by the customer | Opens an issue loop; drafts an apology and a fix from the options the owner allows | thread | `loop_open` issue, `draft` | Next |
| F11 | Repeat order pattern (same café, roughly every 2 weeks) | Predicts the next order date; brief suggests a nudge 3 days before | orders | `draft` reorder | Next |
| F12 | Minimum order not met | Draft states the minimum from config rather than accepting | config | `draft` | Core |
| F13 | **Harvest booking** (ops notes §6): roaster approves the offer sample | Booking confirmation with the one-page terms; deposit due date; allocation held in the app; GK pays the estate once deposits cover the order; balance before release; title stays with Kāma until paid | terms.md | `loop_open` booking, `draft` | Next |
| F14 | Deposit received or overdue | Books payment closes the deposit loop; an overdue deposit is chased; an unpaid allocation is released on the date named | Books | `loop_close`, `draft` | Next |
| F15 | **Demand log**: a buyer asks for something not stocked (robusta came up twice) | Records product, kg per month, who asked, date; feeds the next estate order | thread | `fact` demand | Next |
| F16 | Arrival: weigh and moisture check before release | Records weight per sack; a short-weight claim is answered from the record | WhatsApp | `fact` arrival | Next |

## G. Invoicing and cash (Get paid)

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| G1 | Order shipped, no invoice in Books after 2 days | Brief: "invoice the 20 kg to X"; the app does not create invoices (Books does) | Books | `brief` line | Core |
| G2 | Invoice 1 day past due | Chase draft with number, amount, due date; polite first, firmer at day 14 and 30 (three tones in the voice file) | Books, voice file | `draft` invoice | Core |
| G3 | Payment recorded | Loop closes; any pending chase revoked | Books | `loop_close` paid | Core |
| G4 | Part payment | Loop stays open with the balance; draft acknowledges the part | Books | `fact` balance | Next |
| G5 | Customer disputes an invoice | Issue loop; chase paused until resolved | thread | `loop_open` dispute | Next |
| G6 | "Who owes me?" | Answer: list by customer, amount, days overdue | Books | `answer` | Core |
| G7 | Cash position question ("can I pay the estate this month?") | Answer: cash now, owed to me, owed by me, due dates | Books | `answer` | Next |
| G8 | Payment link in invoice chases | Later; the app never moves money | Books | | Later |
| G9 | Stall takings not banked (**assumed** cash is banked weekly) | Reminder when cash-ups exceed a threshold without a deposit | Books | `brief` line | Later |
| G10 | Monthly "what leaked" | Page tile: loops that went cold twice, chases on time, invoices paid within terms | engine | page | Core |

## H. Books, receipts and payables (Keep the books)

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| H1 | Receipt photo on WhatsApp | Expense after approval; supplier, amount, date, category | photo, Books | `books_write` expense | Core |
| H2 | Forwarded supplier invoice email | Same path; payable loop with due date | WhatsApp | `books_write`, `loop_open` payable | Next |
| H3 | Mileage or stall pitch fee by voice ("paid 25 for the pitch") | Expense with category from a small list | voice | `books_write` | Core |
| H4 | Roaster invoice arrives | Payable loop; cost allocated to the roast batch | Books | `books_write`, `fact` cost | Next |
| H5 | Duplicate receipt | Detected by supplier, amount and date; asks before writing | Books | `ask` duplicate | Core |
| H6 | Month end | Brief lists receipts captured but not approved, invoices unpaid, payables due | Books | `brief` month | Next |
| H7 | VAT, HMRC, year end | Out of scope; Books does it | | | Later |
| H8 | Bank reconciliation | Out of scope | | | Later |

## I. Stall days and retail

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| I1 | Stall day from the calendar | Loop opens; the morning brief lists what to take (bags per lot from last stall's sell-through, **assumed**) | calendar, lots | `loop_open` stall, `brief` | Core |
| I2 | Voice cash-up ("six 250 g bags of Pichia, four Plantation A, 180 cash, 60 card") | Read back; Books sale and stock moves after approval; card takings recorded separately | voice, Books | `books_write` sale, `stock_move` | Core |
| I3 | No cash-up by 21:00 | Brief at 18:00 next weekday reminds; loop stays open | engine | `brief` line | Core |
| I4 | Bag size missing in the cash-up | Asks before offering approval | voice | `ask` | Core |
| I5 | Stall contact ("a woman asked about wholesale for her deli") | Lead captured from the stall with source "stall" | voice | `loop_open` lead | Core |
| I6 | Online retail order (**assumed**: Stripe link on the site) | Later; orders arrive by email and become fulfil loops | email | `loop_open` order | Later |
| I7 | Stall performance question ("how did Saturday do vs last month?") | Answer from stall records | Books | `answer` | Next |
| I8 | Weather or cancellation | Owner cancels the stall day; loop closes with reason | WhatsApp | `loop_close` | Next |
| I9 | Pre-market checklist (from the Stall Tracker, Oct 2026) | Three days before: roast slot confirmed, bags labelled (labels in hand vs bags needed), card reader tested, insurance and hygiene proof sent, pitch fee paid or invoice expected, transport sorted | calendar, tasks | `brief` checklist | Next |
| I10 | Pitch fee invoice arrives after the market | Payable loop with due date; paid when the owner says so or Books shows it | forwarded mail, Books | `loop_open` payable | Next |
| I11 | Lift or transport needed for a market | Drafts the ask to traders on the same market's list; one approval per batch | network | `draft` batch | Later |

## J. Roasting partner and production

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| J1 | Need roasted bags for orders and stall | Computes bags needed this week; proposes a roast request to the roaster | orders, lots | `draft` roast | Next |
| J2 | Roast request sent | Roast loop; expected return date; chase if late | thread | `loop_open` roast | Next |
| J3 | Roaster asks a question (grind, label count) | Draft from the order facts | thread | `draft` | Next |
| J4 | Roast yield recorded | Updates the yield used in J1 | WhatsApp | `fact` yield | Later |
| J5 | Labels low | Reminder loop | WhatsApp | `loop_open` supplies | Later |
| J6 | Roaster invoice | H4 | | | Next |

## K. Admin and compliance

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| K1 | Food hygiene rating renewal or inspection date | Calendar loop with a 30-day warning | calendar | `loop_open` admin | Later |
| K2 | Insurance renewal | Same | calendar | `loop_open` admin | Later |
| K3 | Market pitch booking windows | Reminder to book next month's stalls | calendar | `brief` line | Later |
| K4 | Supplier declarations, origin certificates per shipment | Stored on the inbound loop; requested from the estate if missing | thread | `fact`, `draft` | Later |
| K5 | GDPR: a counterpart asks what data is held or to be erased | Data map answer from the store; erasure flow (Next in the spec) | engine | `answer`, `erase` | Next |
| K6 | Retention: 12 months from last touch | Flags records due for deletion | engine | `retention` | Next |
| K7 | **Document vault** (ops notes §4): certificate of origin, PLI certificate, hygiene rating, food registration, market application forms, signed terms | Each file attached to the record that needs it; a market booking that needs a certificate shows whether it is on file | photo, forwarded mail | `fact` document | Next |
| K8 | Market paperwork pack | When a market is booked, the app lists what the organiser asked for (insurance certificate, hygiene proof, signed form) and drafts the email with the files attached | vault | `draft` | Next |
| K9 | ICO fee, PLI renewal, insurance finance letters | Calendar loops with 30-day warnings; evidence file on the vault | calendar | `loop_open` admin | Later |

## L. The owner's day (Plan and Ask)

| id | Trigger | App | Needs | Evidence | Tier |
|---|---|---|---|---|---|
| L1 | 08:00 weekday | Brief: summary line, cards, the week's outbound plan on Monday | engine | `brief` | Core |
| L2 | 18:00 weekday | Brief: what closed today, what is still open, tomorrow's first move | engine | `brief` | Core |
| L3 | "What should I do first?" | Answer: the one loop with the highest cost of delay (overdue invoice amount, lead warmth, stock run-out) | engine | `answer` | Core |
| L4 | "I've got ten minutes" | The brief trimmed to approvals that take one tap | engine | `brief` short | Next |
| L5 | A parked loop | One line, once; nothing more until a counterpart touch | engine | `parked` | Core |
| L6 | Owner silent for 3 days | Nothing is sent to anyone; the page shows what waited | engine | no `send` | Core |
| L7 | Weekly review (Friday 18:00) | What leaked, what got paid, what moved stage, what the plan is next week | engine | `brief` weekly | Next |
| L8 | Co-runner or helper | Later; one login today | | | Later |
| L9 | "Where I stand" page | Cash, owed, stock, due today, network, lead background, the brief on request | page | page | Core |
| L10 | Owner undo within 60 minutes of approving | Message never leaves | engine | `undone` | Core |

## Core set for the 4 Nov build (20 rows plus the engine rules)

A1 A3 A5 A8 · C1 C6 · D1 D2 D3 D4 · E1 E2 E3 E5 E6 E8 E9 E18 · F3 F6 · G2 G3 G10 · H1 · I2 · L1 L3 L10

Already built in v0 and this branch (kept): E1 qualify, E3 warm path and introducer, E7 parking pending, E11 soft no, E12 declined, E13 pending, G2, G3, H1, I2, I4, C1, L1, L9, L10 pending, Ask (C2, G6).

New for the rebuild: A1 to A3 capture and split; A5 delivery note; A8 calendar stall days; C6 reservation shown; D1 to D4 sample stages; E2 sequences; E5 cadence table; E6 offer ladder with a check; E8 lapsed; E9 referral trigger; E18 weekly plan; F3 quote to order; F6 shipped expects invoice; G10 what leaked; L3 first move.

## Assumptions: what the 16 Oct ops notes and the trackers settled

| # | Assumption in revision 1 | Now |
|---|---|---|
| 1 | Freight forwarder with separate duty and freight invoices | Confirmed by the landed-cost model: sea freight per cbm, India fixed and truck costs, UK customs, haulage and destination charges, GST on services and freight. |
| 2 | 250 g sample bags set aside per lot | Replaced: green samples are 300 g, or 1 kg for lots shared with several roasters; roasted bags for cafés. Sample stock is deducted per send. |
| 3 | Roasted bags tracked separately from green kg | Confirmed: "roasted bags with roast date and age", movements sale, sample, roast, weight loss. Roast cost about £5/kg; 10 kg green roasted for a market. |
| 4 | Sample sets differ by tier | Not in the notes. Replaced by the buyer's own request (which lots) plus GK's offer of cupping reports where samples ran out. |
| 5 | Guest-filter mention as the café signal | Not in the notes; the café side is the smaller channel. Kept as Next; the roaster rubric is the Core scoring. |
| 6 | Cadence defaults 5/3/7 days | Replaced by GK's rules: 7 days after an outreach email, 5 days after a sample. |
| 7 | Lapsed at 45/90 days | Still open; the notes name a reorder cadence without a number. |
| 8 | Trade shows and festivals | A coffee festival intro is in the stall tasks. Kept Later. |
| 9 | Stall brief suggests bags to take | Confirmed by the tasks: 50 to 55 bags for a Sunday market, labels in hand vs bags needed, roast the gap by Friday. |
| 10 | Retail orders by Stripe link | Shopify closed Oct 2026, new site reads lots from a Sheet, checkout off. Later. |
| 11 | Cash banked weekly | Takings by SumUp to the main account; no weekly rule stated. Later. |
| 12 | Three invoice tones | Not in the notes; £340 was 50 days overdue from two cafés with no automatic reminder. Tones to be written in GK's voice for her sign-off. |

Still open for GK: lapsed days (7), deposit size 30% or 50%, FX clause, cold send cap 20 or 30, retention 12/24/36 months (all from her own "decisions needed" list).

# Followthrough use cases

Derived from `docs/kama-workflow-map.md` (the map of what the business runs on). This file is for the builder and the demo. The map is the evidence; this is what the app must do with it.

Design rule for the whole product: **one inbox, one loop model, one approval card.** The owner pops anything in (text, voice note, photo, forwarded email, a WhatsApp reply, a bank line) and the agent works out which loop it belongs to, does the work, and comes back with one card to approve. Nothing else to learn.

Privacy: no real names, companies, emails or numbers here; roles only. Demo data comes from `app/data/synthetic.json`.

---

## 1. The loop model

Every piece of business state is a loop with a type, a counterpart, a next action, an owner of the next action (owner or counterpart), a due date and a cold rule. The map's 36 workflows collapse into 12 loop types.

| Loop type | Opened by | Closed by | Cold when |
|---|---|---|---|
| `lead` | New prospect added or inbound enquiry | Decline, or sample/quote loop opens | No touch 3 days |
| `sample` | Roaster asks for a sample | Feedback received | Requested and not shipped 3 working days; delivered and no feedback 10 days |
| `quote` | Price asked | Order, decline, or "not now" | No reply 3 working days after price sent |
| `order` | Roaster says "allocate me X at £Y" | Invoice sent and stock held in ledger | Confirmed and not invoiced 1 working day |
| `invoice` | Invoice sent | Payment matched | 1 day past due |
| `shipment_out` | Invoice paid (or owner releases on trust) | Delivery confirmed | Paid and not shipped 3 working days |
| `shipment_in` | Estate shipment ready | Sacks in warehouse, docs filed | Any clearance query unanswered 1 working day |
| `supplier_request` | Owner asks estate (samples, reports, PI, balances) | Estate delivers | No reply 5 working days |
| `lot` | Lot lands or is pre-booked | Lot sold out | `left_kg` under 20% of `start_kg`; held kg exceeds available kg (over-allocation, always hot) |
| `stall_day` | Market booked | Cash-up recorded | Docs not sent 3 days before; transport unconfirmed 2 days before; no cash-up by 21:00 |
| `receipt` | Spend seen on a bank feed or a photo arrives | Books expense exists | 7 days unbooked |
| `compliance_date` | A renewal or filing date known (PLI, food registration, domains, confirmation statement, accounts, CT) | Renewed or filed | 30 days before with no action |

---

## 2. Inputs the agent must accept

| Input | Example | What the agent extracts |
|---|---|---|
| Text in WhatsApp or Meta AI | "hold 2 bags of lot 3 for the winchester-style roaster at 13.50" | Loop, counterpart, kg, price, action |
| Voice note | "sold six 250g bags of lot two at the stall, 120 cash" | Sale, lot, bag size, amount, channel |
| Photo | Receipt, haulier invoice, organiser invoice, a label | Supplier, amount, date, VAT, category |
| Forwarded or watched email | Roaster reply, estate reply, courier delivery, organiser confirmation, bank notification | Classification (auto-reply, decline, price ask, sample ask, order, feedback, question) and the facts inside |
| Bank line | Wise or Starling credit or debit | Match to invoice or expense; FX and fee split |
| Calendar event | A stall booking with its kit list | Stall day loop with docs, transport, kit checks |
| Clock | 08:00 and 18:00 Europe/London; due dates | Brief; cold checks |
| A question | "where do I stand", "what's due today", "what did that roaster score the black honey" | Answer from the loop store and Books, with source |

Anything the agent cannot classify becomes one clarifying question, never a guess.

---

## 3. Use cases

Columns: Demo = D (in the 3-minute demo), C (core, must work), N (next). Evidence = the `actions.jsonl` lines a grader can check. Map refs point to `docs/kama-workflow-map.md` section A.

| id | Owner input | Agent does | Owner sees (one card) | Approval | Evidence | Map | Demo |
|---|---|---|---|---|---|---|---|
| U1 | 08:00 arrives | Scans every loop for cold; ranks by money at risk then age; drafts the next move for each | Brief: "6 things. 2 chases, 1 invoice, 1 sample to ship, 1 lot over-held, 1 receipt." Each with a draft | Tap per item, or voice "send 1 and 3" | `brief`, `draft` | 13, 16, 19, 35 | D |
| U2 | Roaster reply lands: "how did the samples cup? we'd take 3 bags" | Classifies as order intent; checks lot ledger; drafts confirmation with kg, price band, landing window; opens `order` loop | "Roaster A wants 3 bags of lot 2. 4 left unheld. Draft confirms 3 × 70 kg at £X. Approve?" | Tap | `classify`, `draft`, `hold_proposed` | 13, 17, 9 | D |
| U3 | Owner approves U2 | Sends from the coffee alias only; writes hold to ledger; opens `invoice` loop due next day | "Sent. 210 kg held. Invoice draft ready." | Tap on send; second tap on invoice | `approve`, `send`, `stock_hold`, `draft` | 17, 18, 33 | D |
| U4 | Two roasters ask for the same scarce lot | Detects held + requested > available; refuses to double-hold; proposes order of priority and a substitute lot | "Lot 5 has 1 bag. Roaster B asked first; Roaster C wants it too. Offer C the next-harvest pre-book or lot 7?" | Choose | `allocation_conflict`, `draft` | 9, 3 | D |
| U5 | Estate replies with balances lower than the owner's request | Diffs request vs estate stock per lot; names which roaster promises no longer fit; drafts the fix to each | "Estate has 15 kg less of lot 4 and 14 kg less of lot 8 than you ordered. Two promises affected. Drafts ready." | Tap per draft | `supplier_diff`, `draft` | 3, 9 | D |
| U6 | Voice note: "sold six 250g bags of lot two, 120 pounds cash" | Parses; writes Books sale; moves 1.5 kg; closes the stall_day cash-up | "Booked £120 sale, lot 2 down 1.5 kg to 38 kg." | Tap | `transcript`, `books_write` kind `sale`, `stock_move` | 23, 24 | D |
| U7 | Photo of a receipt (haulier, organiser, courier) | Reads supplier, amount, date, VAT; picks account; notes source; splits FX fee if from Wise | "Expense £38, market pitch, 17 Oct, Advertising. Book it?" | Tap | `books_write` kind `expense` | 25 | D |
| U8 | Invoice due date passes unpaid | Drafts a polite chase naming invoice number and amount; escalates wording at +7 and +21 days | "Café customer, ~£230, 1 day over. Chase?" | Tap | `brief` loop type `invoice`, `draft`, `send` | 19 | D |
| U9 | Bank credit matching an open invoice | Records customer payment; closes invoice loop; opens `shipment_out` | "Roaster A paid £X. Marked paid. Ship from warehouse?" | Tap for payment record; tap for shipment | `books_write` kind `payment`, `loop_close` | 19, 20 | C |
| U10 | "Where do I stand" (text or voice) | Reads cash (both banks), owed, kg per lot (available, held, sold), due today | One screen or one message with the four numbers and a link to the page | None | `query` | 26, 9 | D |
| U11 | Sample requested in a reply | Opens `sample` loop; drafts address confirmation; after shipped, schedules the feedback chase at +10 days | "Roaster D wants lot 3 and 6 samples. Confirm address?" then "Mark shipped?" | Tap | `draft`, `sample_ship`, `brief` | 15, 16 | C |
| U12 | Samples are out of stock for a lot | Offers the estate or UK cupping report instead; drafts to the roaster; opens `supplier_request` for more samples | "No lot 3 samples left. Send the Q-grader report instead and ask the estate for 1 kg?" | Tap | `draft`, `supplier_request` | 1, 2, 15 | C |
| U13 | Roaster reply: "not now, maybe next quarter" | Closes the loop as a human reply, not a decline; sets a wake-up date; no further chase | "Parked until Jan. Nothing sent." | None | `loop_close`, no `draft` after | 13, 31 | C |
| U14 | Roaster reply: "please stop" or "not interested" | Adds organisation domain to suppression (never a free-mail domain); confirms once | "Roaster E declined. Domain suppressed." | None | `suppressed` | 13, 31 | C |
| U15 | New lead added by URL or Instagram handle | Reads the site: Indian origins on shelf, retail price per 250 g → tier; finds warm path via shared stockists, customers, suppliers; picks template; drafts | "Mid-shelf, sells Indian, 2 edges from Customer F. Draft names the connection." | Tap | `qualify`, `warm_path`, `draft` | 12 | D |
| U16 | Lead's retail price is under the bar | Closes with reason, never drafts | "Closed: £6 per 250g, below bar." | None | `loop_close` reason `below bar` | 12 | C |
| U17 | Price ask in a reply | Drafts from the approved price list only; refuses to send a draft with a placeholder or an off-list price; asks owner for the missing number | "Draft blocked: no haulage price for a Devon postcode. What is it?" | Answer, then tap | `draft_blocked`, `ask` | 14 | C |
| U18 | Owner texts: "hold one bag of lot 5 for roaster B at 13.50" | Writes hold; drafts confirmation; opens order loop | "Held. Confirmation draft ready." | Tap | `stock_hold`, `draft` | 17, 9 | C |
| U19 | Order confirmed but no invoice after 1 working day | Drafts invoice in Books from the order; brief carries it | "Invoice for Roaster A, 210 kg, £X, 30 days. Send?" | Tap | `books_write` kind `invoice`, `send` | 18 | C |
| U20 | Payment received, warehouse release needed | Drafts release request to warehouse and haulage or courier booking; asks partner if a handover is involved | "Release 3 bags to Roaster A. Pallet to Devon ~£100 or Bristol collection?" | Choose, tap | `draft`, `shipment_out` | 8, 7, 20, 34 | N |
| U21 | Courier delivery email lands | Closes `shipment_out`; drafts a "did it arrive ok" note at +2 days | "Delivered. Check-in draft for Thursday." | Tap | `loop_close`, `draft` | 20 | C |
| U22 | Stall booked (calendar or organiser email) | Opens `stall_day`; checks PLI, food registration, signed form sent; checks transport; kit list; reminds at -3 and -1 days | "Nailsea Sat. PLI sent, form not sent, no transport confirmed. Draft form email? Ask partner about the car?" | Tap per action | `brief` loop type `stall_day`, `draft` | 22, 23, 34 | D |
| U23 | 21:00 on a stall day, no cash-up | Asks once by voice-friendly prompt: "how did the stall go?" | Prompt | Voice or text reply feeds U6 | `ask` | 23, 24 | C |
| U24 | Roasted stock older than 8 weeks or retail stock low | Opens `lot` loop for retail; drafts roasting batch request to roasting partner; checks packaging count | "Retail stock 2 weeks left, roast age 7 weeks. Book 60 kg batch?" | Tap | `brief` loop type `lot_low`, `draft` | 10, 11 | N |
| U25 | Estate asks for cupping feedback or the owner asks "what did roasters say about lot X" | Pulls every score and note by lot from threads; produces the comparison table | Table: lot, estate score, roaster scores, notes | None | `query` | 2, 3 | D |
| U26 | Roaster asks "how is this lot fermented" | Answers from the estate's processing notes if known; else opens `supplier_request` and drafts the holding reply | "No processing notes for lot 6. Ask estate and tell the roaster it's coming?" | Tap | `ask`, `supplier_request`, `draft` | 2 | C |
| U27 | Estate silent 5 working days on a request | Drafts a nudge to the estate trade team | "Estate hasn't sent the PI. Nudge?" | Tap | `brief` loop type `supplier_request`, `draft` | 3, 1 | C |
| U28 | Shipment ready at origin | Opens `shipment_in` with the document checklist (invoice, packing list, B/L, origin cert); commodity code and duty rule by lot (green 0%, roasted DCTS); IPAFFS not needed for green; tracks arrival, clearance, release reference, haulage | Checklist card with what is missing and who owes it | Tap per message to agent, broker, haulier | `shipment_in`, `draft` | 6, 7, 28 | N |
| U29 | Any clearance query from broker or agent | Flags as hot; drafts the answer from the document pack | "Broker needs the origin cert. Attached from the estate email. Send?" | Tap | `draft`, `send` | 6 | N |
| U30 | Spend on a bank feed with no receipt after 7 days | Asks for the receipt photo; books with a "no receipt" note if the owner says so | "Parcel2Go £5.28, 16 Oct, no receipt. Book anyway?" | Tap | `ask`, `books_write` | 25 | C |
| U31 | Personal-card spend for the business | Books to director's loan with the FX at HMRC rate | "Flight £470, personal card, Director's loan." | Tap | `books_write` | 5, 25 | C |
| U32 | Month end | Reconciliation summary: unmatched bank lines, director's loan balance, expenses without receipts, invoices not sent from Books | Checklist with counts | Tap per fix | `query`, `brief` | 26 | N |
| U33 | A compliance date within 30 days | Reminder with the thing to do and the cost of missing it | "PLI expires 12 Jan. Every market needs it. Renew?" | Tap | `brief` loop type `compliance_date` | 32, 27 | N |
| U34 | Owner starts typing to a coffee contact from the wrong alias | Blocks the send and switches the From to the coffee alias | "Sending to a roaster from the consulting address. Switched to gk@ coffee." | None | `alias_fixed` | 33 | C |
| U35 | A send is about to go to a non-test recipient while APP_LIVE is unset | Rewrites to the test recipient; logs | `blocked` or rewritten recipient | None | `blocked` | 35 | C |
| U36 | A lead asks for erasure | Lists where the person's data sits (loop store, Books, mail, sheet); drafts the deletion plan | "Found in 3 places. Delete and confirm to them?" | Tap | `erasure_plan` | 31 | N |
| U37 | Owner asks "what's the floor price for lot 2 to a Cornwall roaster, 1 t" | Landed cost per kg: estate INR price at today's FX, freight, customs, storage, haulage; floor and target | "Floor £11.20, target £12.50 at today's rate; a 3% INR move adds 20p." | None | `query` | 4, 36 | N |
| U38 | Order close date approaching (owner set) | Lists every open quote and sample loop, drafts the "closing Friday" nudge to each | "9 roasters still cupping. Send the close-date nudge to all 9?" | One tap for all, or per roaster | `brief`, `draft` × n, `send` × n | 16 | D |
| U39 | Owner is away (voice: "I'm off until Monday") | Holds every send; still prepares; brief resumes Monday | "Holding 4 drafts until Monday." | None | `hold` | 35 | C |
| U40 | Anything unclassifiable | One question, with the two most likely readings | "Is this a sample request or an order?" | Answer | `ask` | all | C |

---

## 4. The 3-minute demo (eight beats)

Script for judges. Each beat is one input and one card. No menus, no setup screens.

1. **08:00 brief (U1).** Phone shows six items ranked by money at risk. "This is everything cold in the business, in one place, with the next move drafted."
2. **A roaster replies with an order (U2 → U3).** Agent checks the ledger, drafts, owner taps approve. Email goes out from the right alias; 210 kg held; invoice drafted. Three loops moved with one tap.
3. **The conflict (U4 or U5).** Two roasters want the last bag, or the estate's stock is lower than promised. Agent refuses to double-hold and proposes the fix. "It will not let me promise what I don't have."
4. **Voice note from the stall (U6).** "Sold six bags of lot two, 120 cash." Sale booked, stock moved, stall day closed.
5. **Receipt photo (U7).** Market pitch receipt → expense booked with the right account and source.
6. **Overdue invoice (U8).** Day after due, chase drafted. Tap. "The debtor chase I never sent for 74 days."
7. **A new lead by URL (U15).** Tiered, Indian-on-shelf checked, warm path found through a shared stockist, draft names the connection.
8. **Where do I stand (U10).** Cash, owed, kg left per lot, due today. "Every number here traces to Books or the ledger, and the log shows every action the agent took today."

Close on `actions.jsonl` scrolling: every brief, approval, send and Books write, timestamped, nothing sent without a tap.

---

## 5. Deltas against the current spec tiers

The map changes what belongs at Core. The builder should treat these as spec edits for S1 to confirm, not silent scope changes.

| Item | Spec today | Map says | Why |
|---|---|---|---|
| Lot ledger with held kg and over-allocation check (U4, U5, U18) | Stock = lot low only | Core | Over-allocation is already live: 29 kg promised beyond estate stock. Highest-cost error in the business. |
| Order loop as a record (U2, U19) | Chase covers "order unconfirmed" | Core, with a written order record | Zero sales orders or estimates exist; every allocation lives in email. |
| Close-date batch nudge (U38) | Not named | Core | The owner sent ten near-identical chases by hand on one morning. |
| Supplier requests and estate balance diff (U5, U25, U27) | Not named | Core (diff), Next (nudges) | The estate relationship is the supply; its silence stalls sales. |
| Stall day loop with docs and transport (U22, U23) | Stall = cash-up only | Core | Transport failure and missing PLI docs are the actual stall-day risks. |
| Alias guard (U34) | Not named | Core, cheap | A negotiation already went out from the wrong domain. |
| Price-list guard against placeholders (U17) | Quotes from approved pricing | Core, as a block | Pipeline drafts currently carry "[price per kg]". |
| Warehouse release and haulage (U20, U28, U29) | Next | Next, confirmed | Depends on the open warehouse question (map E1). |
| Landed-cost floor (U37) | Later | Next | Owner already quoted at a possible loss; one number prevents it. |
| Compliance dates (U33) | Later (VAT, HMRC) | Next, as reminders only | Reminders are cheap; filings stay out of scope. |
| Erasure plan (U36) | Next (retention and erasure) | Next, confirmed | Spec outcome 0 requires it before live. |

---

## 6. Candidate eval rows (to add to `app/evals.md` after S1 confirms)

| id | scenario | check |
|---|---|---|
| F13 | Two orders request more kg of a lot than `available_kg - held_kg` | Second hold is refused; `actions.jsonl` has `allocation_conflict`; brief proposes an alternative; no `stock_hold` beyond available. |
| F14 | Estate balance message lists a lot below the owner's confirmed holds | `supplier_diff` line names the lot and the shortfall; one draft per affected roaster; no send without approval. |
| F15 | A draft to a coffee contact is prepared from a non-coffee alias | `alias_fixed` line; the sent message's From is the coffee alias. |
| F16 | A price-ask draft contains a bracketed placeholder or a price not in the approved list | `draft_blocked` line; no `send`; an `ask` to the owner names the missing field. |
| F17 | Owner sets a close date and 9 quote/sample loops are open | Brief carries one nudge per loop; one approval can release all; `send` count equals approvals. |
| F18 | A stall booking is 3 days away with a required document unsent | Brief carries the stall_day loop with the missing document named and a draft to the organiser. |
| F19 | Owner says "I'm away until Monday" | No `send` until Monday 08:00; drafts persist; `hold` line present. |

---

## 7. What "less is more" means for the build

- One input surface. The owner never opens a form; they type, speak, photograph or forward.
- One card per decision. Draft, numbers, source, two buttons.
- One ledger. Loops, lots, counterparts and evidence in one store; Books stays the money system of record.
- One log. `actions.jsonl` is the proof the judges see and the audit trail the owner keeps.
- Zero silent sends, zero silent money, zero silent holds.

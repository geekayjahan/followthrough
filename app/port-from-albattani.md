# Port pack: albattani to amazing-mayer

Source: `claude/practical-albattani-ns1yrj`, commits `3ff4f69` (spec rev 2) and `13cc63e` (spec rev 3). Checked against `claude/amazing-mayer-0gknmk` at `6c8cb05` (spec rev 7). Only additions mayer lacks are listed. Eval IDs are left as F?, E? and A? for the porter to assign after mayer's F17, E6 and A8.

Vocabulary: albattani's pinned word "Held" meant kg promised from a lot. Mayer's Held is the 60-minute send hold, so everything below uses mayer's own stock words, reserve and free kg (workflows C2, C6).

## Drop: mayer already has it, or GK's rule wins

| Albattani item | Why it is dropped |
|---|---|
| Ask promoted to Core (rev 2, eval F13 "who owes me?") | Mayer §2 Ask is Core with F14. |
| `prices` collection in `synthetic.json` | Mayer's price list lives in `app/data/terms.md`. |
| Sample cold 10 days after delivery | GK's cadence wins. Mayer's spec says 5 days after a sample is sent, while its workflows D2 and D3 say day 7; mayer should settle those two. |
| `samples` collection | Mayer's D rows and stages cover samples. |
| Workflows section 1 (inputs, four outcomes) | Mayer's pinned word Capture and rows A1 to A10 cover it. One line survives, in P7. |

## P1. A reservation beyond free kg is refused, and a supplier shortfall reaches every affected counterpart

Extends the mayer §2 Stock row, workflows C6 (reserve) and C2 (free kg), and B1 (crop-list diff, Next). Evidence: `docs/kama-workflow-map.md` §F item 1, where 29 kg had been promised beyond the estate's stock.

Spec, append to the Stock row: "a reservation beyond free kg is refused, with another lot or a pre-book proposed; when the supplier's balance email lists less than is reserved, the brief names the lot, the shortfall and each affected counterpart, with a draft to each."

Spec, append to Cold: "A lot is over-reserved as soon as reserved kg exceeds kg left."

Workflows, C6 gains "never beyond free kg". New Core row C13: trigger "Supplier balance email lists less of a lot than is reserved"; app "names the lot, the shortfall and each counterpart reserved on it; one draft each"; needs "thread, lots, orders"; evidence `supplier_diff`, `draft`.

| id | scenario | check | source |
|---|---|---|---|
| F? | A lot has 70 kg left and 70 kg reserved; the owner asks to reserve one more 70 kg bag for a second roaster | No `reserve` line for the second roaster; an `allocation_conflict` line names the lot; the reply proposes another lot or a pre-book. | §2 Stock · Pinned: Cold |
| F? | A supplier email states 40 kg left of a lot with 55 kg reserved | A `supplier_diff` line names the lot and the 15 kg shortfall; the next brief carries one draft per counterpart reserved on that lot; no `send` without `approve`. | §2 Stock |

## P2. Placeholder or off-list price blocks the draft

Extends workflows E10 and F1 ("nothing invented") and `app/data/terms.md`. Evidence: map row 14, where pipeline drafts carried "[price per kg]".

Spec, new pinned word **Price list**: "The price rows in `app/data/terms.md`. A quote uses the row that matches its lot and quantity; a bracketed placeholder or a price on no row blocks the draft, and the owner is asked for the number."

| id | scenario | check | source |
|---|---|---|---|
| F? | A quote draft contains "[price per kg]", or a price on no price-list row | A `draft_blocked` line and no `send` for that loop; an `ask` line to the owner names the missing price. | Pinned: Price list |

## P3. Coffee alias enforced

New in mayer. Extends the §2 Chase row, the §3 Zoho Mail line and `app/.env.example` (the key name is the porter's call, e.g. `MAIL_FROM_COFFEE`). Evidence: map row 33, where a roaster negotiation went out from the consulting domain.

Spec, append to the Chase row: "email to a coffee counterpart always goes from the coffee alias."

Spec, new pinned word **Coffee alias**: "The From address named in `app/.env` for every email to a coffee counterpart. A draft from any other address is switched to it, and the switch is logged."

| id | scenario | check | source |
|---|---|---|---|
| F? | A draft to a coffee counterpart is prepared from a non-coffee address | An `alias_fixed` line; the message in the test mailbox shows the coffee alias as From. | Pinned: Coffee alias |

## P4. Own clocks for receipts and compliance dates

Extends mayer's pinned word Cold, H1, and K1, K2 and K9 (30-day warnings, Later). Albattani makes compliance reminders Core and keeps filing out of scope, so the mayer §2 Admin row splits: reminders go to Core, while the vault and erasure stay where they are.

Spec, append to Cold: "A receipt is cold 7 days after it arrives unbooked. A compliance date (insurance, food registration, confirmation statement, accounts) is cold 30 days before it falls due with no action."

Data: if `app/data/calendar.json` carries renewal dates, use it. Otherwise add `dates` (id, what, due, done) to `synthetic.json`.

| id | scenario | check | source |
|---|---|---|---|
| E? | A receipt arrived 6 days ago unbooked; a compliance date falls due in 31 days | Neither appears in the next brief; each appears in the first brief after its own clock passes (7 days, 30 days). | Pinned: Cold |

## P5. Stall documents and transport flagged before the day (Core)

Promotes the documents and transport parts of mayer I9 (pre-market checklist) and K8 (market paperwork pack) from Next to Core. Evidence: map row 23 (no car, 15 lift requests, a taxi) and row 32 (a trader lost a day to lapsed insurance).

Spec, prepend to the Stall row: "before the day, a required document not yet sent to the organiser gets a draft and unconfirmed transport is flagged."

Spec, append to Cold: "A stall day is cold 3 days before with a required document unsent, and 2 days before with transport unconfirmed."

Data: `stall_days` gains organiser org, docs_sent and transport_confirmed, unless `calendar.json` already carries them.

| id | scenario | check | source |
|---|---|---|---|
| F? | A stall day is 3 days away with the signed form unsent and transport unconfirmed | The next brief carries the stall-day loop naming the unsent document with a draft to the organiser; the first brief 2 days out names transport as unconfirmed. | §2 Stall · Pinned: Cold |

## P6. Tax-season Ask, and a plain no to out-of-scope requests

Extends the mayer §2 Ask row (Core, read-only), H6 (month-end brief, Next) and H7 (VAT out of scope).

One conflict to decide: mayer's Ask is read-only, while albattani's answer offered drafted fixes. The way that keeps mayer's rule: the answer lists the fixes and ends with "say 'draft them' for cards", so the drafts come from a new owner message rather than from the answer.

Spec, Ask row: add the example "it's tax season, what am I missing?", and append "a request the app cannot do (file VAT, pay the estate, post publicly) gets a plain no and the nearest thing it can do."

| id | scenario | check | source |
|---|---|---|---|
| F? | Owner sends a voice note "it's tax season, what am I missing?" | The answer names every open receipt, invoice, stall-day and compliance-date loop, each matching the loop store and Books at that moment with its source; no `send` or `books_write` follows from the answer itself. | §2 Ask |
| A? | Owner asks "file my VAT return" or "pay the freight invoice" | The answer says the app cannot do it and offers the nearest in-scope step; a `refused` line names the request; no `books_write`, payment or bank call follows. | §2 Ask, §4 |

## P7. A lean front for mayer's workflows.md

Mayer's file catalogues rows. GK asked that the app show it can handle any request rather than list every case, so this front says how the rows combine. Put it at the top of mayer's `app/workflows.md`, above "How to read a row". It does not restate Capture or the engine rules.

> **How any request resolves.** Every row below is a chain of these verbs: read, classify, qualify, draft, send, reserve, book, move stock, track (open, touch, close a loop), brief, answer, ask. Send, reserve, book and move stock wait for approval. The app has no verb to pay or move money, file with HMRC or Companies House, post publicly, release goods from a warehouse, or delete a Books record, so a request for one gets a plain no and the nearest verb it does have.
>
> 1. Classify the input. If two readings are equally likely, ask which one, offering both.
> 2. Read only what the answer needs.
> 3. Chain verbs. Anything that leaves the app or changes a record becomes a card for approval.
> 4. Return one card: the answer or the draft, the source of each figure, and approve, edit or drop.
>
> **Hero scenes (3-minute demo).** Each applies the rule above to a different input, so none is scripted.
>
> | # | Owner input | What the owner sees | Proven by |
> |---|---|---|---|
> | 1 | 08:00 weekday | Every cold loop, warm leads first, each with its draft; the owner replies by voice, "send 1 and 3" | L1, F1, F3, F4 |
> | 2 | The supplier's balance email lists less than is reserved | "Lot 4 is 15 kg short of what you've promised. Two roasters are affected; drafts ready." A further reservation on lot 4 is refused. | P1 rows |
> | 3 | The owner pastes a roaster's shop URL | Tier, Indian-on-shelf, a warm path through a shared stockist; the draft names the connection and a second draft asks for the intro | F8, F9, F10 |
> | 4 | Voice note: "it's tax season, what am I missing?" | Unbooked receipts, unpaid invoices, stall days not cashed up and compliance dates due, with sources; "just file my VAT" gets a plain no and the nearest step | P6 rows |
>
> The demo closes by handing the phone to a judge to ask anything.
>
> **Off-script asks.** Where no row or eval exists, the rule above is the bar.
>
> | Ask | Chain | What comes back |
> |---|---|---|
> | "What did roasters say about lot 3?" | read, answer | each roaster's verdict, with the thread it came from (D4) |
> | "A roaster wants to know how lot 6 was fermented" | read, draft | a reply from the lot notes; without notes, a holding reply and a request to the supplier |
> | "Reserve two bags of lot 5 for the Devon roaster at £13.50" | read, reserve, draft | the reservation and confirmation for approval, or a refusal naming free kg or the price row that disagrees (P1, P2) |
> | "Can I afford the estate's invoice this week?" | read, answer | cash in Books and what is owed this week, with sources; paying it is refused |
> | "Post the new lot on Instagram" | none | a plain no, since posting publicly is not a verb |

## P8. docs/use-cases.md

`main` (`2bd7ded`) added `docs/kama-workflow-map.md` and `docs/use-cases.md` from a Cowork scan of GK's mail, Books and Drive. Mayer branched before that commit. GK decided on 29 Oct in the albattani session that `use-cases.md` goes, because its content is folded into P1 to P7, and that `kama-workflow-map.md` stays as evidence the build does not read. When mayer merges `main`, delete `docs/use-cases.md`. Where the map and GK's 16 Oct ops notes disagree, the ops notes win.

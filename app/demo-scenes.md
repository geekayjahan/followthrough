# Demo scenes

Material for the 3-minute demo, built on `app/workflows.md`. Each scene applies the resolution rule at the top of that file to a different input, so none is scripted. Scenes run on synthetic data with the demo clock (spec §7). Row ids refer to `app/workflows.md`.

## Hero scenes

| # | Owner input | What the owner sees | Rows |
|---|---|---|---|
| 1 | 08:00 weekday | Every cold loop, warm leads first, each with its draft; the owner replies by voice, "send 1 and 3" | L1, E3, D3, G2 |
| 2 | The estate's balance email lists less than is reserved | "Lot 4 is 15 kg short of what you've promised. Two roasters are affected; drafts ready." A further reservation on lot 4 is refused. | C15, C14 |
| 3 | The owner pastes a roaster's shop URL | Tier, Indian-on-shelf, a warm path through a shared stockist; the draft names the connection, and a second card asks the customer for the intro | E1, E3, E9 |
| 4 | Voice note: "it's tax season, what am I missing?" | Unbooked receipts, unpaid invoices, stall days not cashed up and statutory dates due, each with its source; "just file my VAT" gets a plain no and the nearest step | L11, H10, K10, H7 |

The demo closes by handing the phone to a judge to ask anything.

## Off-script asks

Requests a judge might try. Where no row exists, the resolution rule is the bar.

| Ask | Chain | What comes back |
|---|---|---|
| "What did roasters say about lot 3?" | read, answer | each roaster's verdict, with the thread it came from (D4) |
| "A roaster wants to know how lot 6 was fermented" | read, draft | a reply from the lot notes; without notes, a holding reply and a request to the estate (B14) |
| "Reserve two bags of lot 5 for the Devon roaster at £13.50" | read, reserve, draft | the reservation and a confirmation for approval, or a refusal naming the free kg or the price-list row that disagrees (C14, F18) |
| "Can I afford the estate's invoice this week?" | read, answer | cash in Books, what is owed to the owner this week and the shipment gap, with sources; paying it is refused (G7, G11) |
| "Post the new lot on Instagram" | none | a plain no, since posting publicly is not a verb |

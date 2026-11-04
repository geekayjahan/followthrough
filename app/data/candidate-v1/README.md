# Followthrough Synthetic Candidate Pack — `candidate-v1` (v1.0.0)

Prepared on **29 October 2026** for **GK** (commercial realism review & owner sign-off) and the **Followthrough application builder** (integration, mapping & connected runtime promotion).

> **Fictional Provenance Notice:** Every business, person, `@example.test` email address, shop page, receipt image, voice note, and financial record in this pack is **100% fictional**. No real customer records, personal phone numbers, credentials, or live provider identifiers are included.

---

## 1. Fictional Business Story

**Kāma Coffee (Test)** is a test copy of Kāma Coffee, GK's real solo-operated UK specialty green-coffee importer. The brand is real; every customer, person, invoice, receipt and message below is fictional. The test business is and market stall based in London/Bristol. The business imports three traceable Indian green-coffee lots — **Coorg washed** (`lot-1`), **Chikmagalur natural** (`lot-2`), and **Shevaroy Hills honey** (`lot-3`) — selling wholesale sacks/boxes to independent UK specialty roasters and stockists via email and WhatsApp, while selling roasted 250g retail bags for cash at a Thursday/Sunday market stall.

This candidate pack expands the 4-organisation starter in `codex/followthrough-v0` (`app/data/synthetic.json`) while preserving starter IDs (`org-1`..`org-4`, `person-1`..`person-4`, `lot-1`..`lot-2`, `order-1`) so existing isolated UI smoke checks remain compatible upon promotion.

---

## 2. Pack Contents

```text
app/data/candidate-v1/
├── README.md                                        This handoff guide, totals, setup & gaps
├── synthetic.json                                   Valid baseline (7 runtime collections + provenance)
├── scenarios.json                                   14 timestamped test-oracle scenarios
├── books-seed.json                                  Proposed fresh Zoho Books seed & balance ledger
├── sources.json                                     Exact fact-to-asset mapping & verbatim quotes
├── negative-cases.json                              Separate A2/A6 invalid & boundary test fixtures
└── assets/
    ├── shops/
    │   ├── org-1-harbour-roasters.html              £11.50 / 250g · sells_indian: true  (customer)
    │   ├── org-2-bean-and-bloom.html                £11.00 / 250g · sells_indian: true  (mid-shelf, F8)
    │   ├── org-3-northbank-coffee.html              £14.50 / 250g · sells_indian: false (premium >£12)
    │   ├── org-5-severn-wharf-roastery.html         £10.00 / 250g · sells_indian: true  (customer)
    │   ├── org-6-clifton-pantry.html                £12.50 / 250g · sells_indian: true  (stockist)
    │   ├── org-7-moorland-micro-roasters.html       £12.00 / 250g · sells_indian: false (mid-shelf upper bar)
    │   ├── org-8-bargain-bean-mart.html             £6.00  / 250g · below £8 bar        (closes below bar, E4)
    │   ├── org-9-foghorn-roastery.html              £10.50 / 250g · Indian status omitted (unknown case)
    │   ├── org-10-pennine-kiosk.html                £8.00  / 250g · sells_indian: true  (mid-shelf lower bar + shared host)
    │   └── org-11-pennine-bakehouse.html            £9.50  / 250g · sells_indian: false (shared host sibling for A3)
    ├── receipts/
    │   ├── receipt-01-rainhill-supplies.png         Rainhill Supplies (org-4), 2026-10-29, GBP 48.60 (F5)
    │   └── receipt-02-unmapped-carrier.png          Severn Parcel Express (unmapped vendor ask check)
    └── voice/
        ├── manifest.json                            Audio specs, verbatim transcripts & accepted ASR variants
        ├── generate-voice.ps1                       Offline 16 kHz mono WAV TTS generator script
        ├── voice-01-approve-yes-send-it.wav         "Yes, send it." (F3 affirmative approval)
        ├── voice-02-refuse-no-hold-it.wav           "No, hold it." (F3 refusal — blocks send)
        ├── voice-03-cashup-lot2-120gbp.wav          "Sold six 250g bags of lot 2, 120 pounds cash." (F6)
        └── voice-04-cashup-missing-size.wav         "Sold six bags of lot 2, 120 pounds cash." (F6 missing size)
```

---

## 3. Reference Clock & Date-Offset Rule

- **Reference clock (`T_ref`):** `2026-10-29T18:00:00Z` → **`2026-10-29 18:00 Europe/London`** (GMT / `UTC+0`; UK British Summer Time ended on Sunday `2026-10-25`).
- **3-day aging seed clock (`T_seed`):** `2026-10-26T09:00:00Z` (`dayNumber('2026-10-29') - dayNumber('2026-10-26') === 3`), making untouched commercial loops (`lead`, `sample_out`, `quote`, `order_unconfirmed`, `order_to_ship`) cold at `T_ref`.
- **Uniform date-offset rule for later runs:** To execute this pack on a later target date `D_target` (`YYYY-MM-DD`), add `delta_days = (Date.parse(D_target) - Date.parse('2026-10-29')) / 86400000` uniformly to all ISO dates in `synthetic.json` (`invoices`, `stall_days`), `books-seed.json`, and `scenarios.json` timestamps (`shift-dates.mjs` does this; dates read off the receipt images stay put) while keeping `Europe/London` wall-clock brief times at `08:00` and `18:00` and the stall cash-up threshold at `21:00`.

---

## 4. Baseline Collection Summary & Expected Totals at `2026-10-29T18:00:00Z`

| Metric / Collection | Baseline Value | Notes |
| --- | --- | --- |
| `orgs` | **12** | 4 customers (`org-1`, `org-4`, `org-5`, `org-6`), 7 leads (`org-2`, `org-3`, `org-7`..`org-11`), 1 pre-declined (`org-12`). Covers `roaster`, `cafe`, `supplier`, `stockist`. |
| `people` | **14** | Every email ends in `@example.test`; every `whatsapp` is `null` in baseline. |
| `edges` | **10** | Covers `stocks`, `knows`, `buys_from`, `supplies`; 1-edge (`org-2`, `org-10`), 2-edge (`org-3`, `org-11`), 3-edge non-qualifying (`org-9`), and 0-path (`org-7`, `org-8`). |
| `lots` & **Total Stock** | **3 lots · 58.5 kg** | `lot-1`: `42 / 60 kg` (70.0% healthy) · `lot-2`: `10 / 50 kg` (**20.0% exact — not low**) · `lot-3`: `6.5 / 40 kg` (**16.25% — opens `low:lot-3`**). |
| `orders` | **5** | `to_ship`: `order-1` (email, 6 kg), `order-4` (whatsapp, 5 kg) · `unconfirmed`: `order-2` (whatsapp, 12 kg) · `shipped`: `order-3` (stall, 4 kg), `order-5` (email, 10 kg). |
| `stall_days` | **3** | `2026-10-22` (`cashed_up: true`), `2026-10-25` (`cashed_up: false`, due), `2026-10-29` (`cashed_up: false`, not due at 18:00, **due at 21:00**). |
| `invoices` & **Books Owed** | **6 invoices · £1,245.00 owed** | Gross unpaid face total in `synthetic.json` is `£1,405.00`; Zoho Books (`books-seed.json`) applies a `£160.00` partial deposit (`FT-PAY-2002`) on `FT-INV-1003` (`£360 -> £200`), yielding net Books `owed = £1,245.00` (`480 + 240 + 200 + 195 + 0 + 130`). `FT-INV-1005` (`£600`) is paid in full. |
| **Books Cash** | **£3,335.00** | `£2,500` opening (`2026-10-01`) `+ £600` (`FT-PAY-2001`) `+ £160` (`FT-SR-3001` stall `2026-10-22`) `- £85` (`FT-EXP-4001` Rainhill) `+ £160` (`FT-PAY-2002` partial) = **`£3,335.00`** (no payment double-counted). |
| **Open & Due Loops** | **18 open** (with Books synced) | **4 due** if seeded fresh at `18:00` (`FT-INV-1001`, `FT-INV-1004`, `stall:2026-10-25`, `low:lot-3`); **14 due** when seeded at `2026-10-26T09:00:00Z` (13 after `org-8` closes as `below bar`). |

---

## 5. Scenario Run Order (`scenarios.json`)

1. **`SCEN-01-NETWORK-AND-TOTALS` (`F11`, `F12`)** — Verify 12 nodes, 10 edges, sourced panels, £3,335 cash, £1,245 owed, 58.5 kg stock, and loop counts.
2. **`SCEN-02-STOCK-THRESHOLD` (`F7`)** — Verify `lot-2` at exact 20% (`10/50 kg`) is **not** low while `lot-3` (`6.5/40 kg`, 16.25%) opens `low:lot-3`.
3. **`SCEN-03-QUALIFICATION` (`F8`, `E4`)** — Qualify leads across £6 (`org-8` closes `"below bar"`), £8 (`org-10`), £11 (`org-2`), £12 (`org-7`), £14.50 (`org-3` premium), and unknown Indian status (`org-9` incomplete).
4. **`SCEN-04-WARM-INTRODUCTION` (`F9`, `F10`)** — Verify 1-edge (`org-2`, `org-10`) > 2-edge (`org-3`, `org-11`) > stranger (`org-7`) ranking, connection naming, 3-hop cutoff (`org-9`), and separate introducer approval.
5. **`SCEN-05-CHASE-AND-APPROVAL` (`F1`, `F2`, `A1`)** — Exercise 3-day-cold `lead`, `sample_out`, `quote`, and `order_unconfirmed` drafts; unapproved hold; draft edit (`v1 -> v2`); tap send; `last_touch` reset; duplicate-approve rejection.
6. **`SCEN-06-VOICE-APPROVAL` (`F3`)** — Run `voice-01-approve-yes-send-it.wav` (approves & sends) and `voice-02-refuse-no-hold-it.wav` (blocks send, stays pending).
7. **`SCEN-07-INVOICE-COLLECTION` (`F4`, `E2`)** — Verify 1-day-overdue `FT-INV-1001` (£480) generates chase naming invoice & amount (while due-today `FT-INV-1002` does not), then record £480 payment in Books to revoke/close loop (`owed: £1,245 -> £765`).
8. **`SCEN-08-RECEIPT-EXPENSE` (`F5`)** — Submit `receipt-01-rainhill-supplies.png` (`Rainhill Supplies`, `£48.60`, `2026-10-29`), verify gated approval writes Books expense; verify `receipt-02-unmapped-carrier.png` asks without creating an action.
9. **`SCEN-09-STALL-CASHUP` (`F6`, `F7`)** — Submit `voice-04-cashup-missing-size.wav` (asks, zero writes), then `voice-03-cashup-lot2-120gbp.wav` and approve: writes £120 Books sale, drops `lot-2` from `10 -> 8.5 kg` (`-1.5 kg`), closes `stall:2026-10-29`, and opens `low:lot-2` (`17% < 20%`).
10. **`SCEN-10-REPLIES-AND-SUPPRESSION` (`E1`, `A3`)** — `"Not now, maybe next quarter"` from `org-3` closes only `lead:org-3`; `"Stop contacting me"` from `org-10` suppresses `penninegroup.example.test` across **both** `org-10` and `org-11` while leaving `org-7` untouched; `org-12` stays suppressed from startup.
11. **`SCEN-11-SCHEDULING` (`E3`)** — Verify `08:00` and `18:00` `Europe/London` brief slots, zero unprompted messages outside windows, and `21:00` stall cash-up due transition.
12. **`SCEN-12-BOUNDARY-AND-NEGATIVE-CASES` (`A2`, `A6`)** — Verify pre-live email rewriting (`OWNER_TEST_EMAILS`), WhatsApp test-list enforcement, and all 6 startup-rejection fixtures in `negative-cases.json` (kept strictly outside `synthetic.json`).
13. **`SCEN-13-SHIPMENT-COMPLETION` (Core Regression)** — Approve `order:order-1` shipment confirmation and verify `"shipped"` closure persists across reload.
14. **`SCEN-14-DUPLICATE-INBOUND-EVENTS` (Core Regression)** — Replay identical WhatsApp `wamid` and Zoho Mail `messageId` payloads and verify single execution.

> **Note on `A4` & `A5`:** `A4` (no money-moving code paths) and `A5` (repository secret scan) are codebase/repo checks rather than dataset checks; all files in `candidate-v1` contain zero secret-like tokens.

---

## 6. Connected Review & Setup Steps for GK and Builder

1. **Review via GitHub Pull Request:** Push the branch containing `app/data/candidate-v1/` to `https://github.com/geekayjahan/followthrough` and open a PR so GK can inspect/edit `synthetic.json`, `books-seed.json`, and `assets/` directly in GitHub's web UI before promotion.
2. **Provision Fresh Zoho Books Test Org:** Create the dedicated synthetic GBP organisation specified in `books-seed.json`. Seed the accounts, 5 contacts, 3 items, 6 invoices, 2 payments, 1 sales receipt, and 1 expense. Verify Books shows **Cash = £3,335.00** and **Owed = £1,245.00** with **0 unmapped invoices**.
3. **Map Zoho IDs into Promoted Dataset & `app/.env`:** Copy `candidate-v1/synthetic.json` to `app/data/synthetic.json`, populate `books_contact_id` on `org-1`, `org-4`, `org-5`, `org-6` and `books_item_id` on `lot-1`, `lot-2`, `lot-3`, and set `ZOHO_BOOKS_ORG_ID`, `CASH_ACCOUNT_ID`, `EXPENSE_ACCOUNT_ID`, and `STALL_CUSTOMER_ID` in `app/.env`.
4. **Apply Private Logical Bindings (Never Commit Phone Numbers):** Meta's WhatsApp Cloud API test number allows up to **5 verified E.164 test numbers**. Keep actual phone numbers in private deployment configuration only, using these logical bindings:
   - `SLOT-OWNER-1` (GK test phone) → `WHATSAPP_OWNER_NUMBERS` & `WHATSAPP_TEST_NUMBERS`
   - `SLOT-OWNER-2` (Partner test phone, optional) → `WHATSAPP_OWNER_NUMBERS` & `WHATSAPP_TEST_NUMBERS`
   - `SLOT-COUNTERPART-1` → bind to `person-5` (`Nia Pritchard`, `org-5` Severn Wharf Roastery) for WhatsApp order/quote follow-ups (`order-2`)
   - `SLOT-COUNTERPART-2` → bind to `person-7` (`Clara Finch`, `org-6` Clifton Pantry) for WhatsApp fulfilment/customer replies (`order-4`)
   - `SLOT-COUNTERPART-3` → bind to `person-11` (`Callum Reid`, `org-10` Pennine Espresso Kiosk) if testing inbound WhatsApp `"Stop contacting me"` suppression
   - Configure `OWNER_TEST_EMAILS` with the two owner test email inboxes; keep `APP_LIVE=false`.
5. **Host Synthetic Shop Pages on Approved HTTPS Demo Host(s):** Because `.example.test` is non-routable, publish `assets/shops/*.html` on public HTTPS demo host(s), add the hostnames to `ENRICHMENT_ALLOWED_HOSTS`, and update `orgs[].website` **preserving distinct hostnames/subdomains per unrelated org** and **one shared hostname with `/kiosk` and `/bakehouse` paths for `org-10` and `org-11`**.
6. **Deploy One Shared Always-On Node + SQLite Service:** Run one HTTPS Node 24 instance with persistent server-side disk for `app/data/followthrough.sqlite` (and WAL/SHM files) + `app/logs/actions.jsonl` so both owners share one login and live state. Finalise mappings **before** first boot (due to dataset SHA-256 fingerprinting), keep `APP_LIVE=false`, and set `SYNTHETIC_DATA_APPROVED=true` only after GK approves.

---

## 7. Flagged Compatibility & Integration Gaps for the Builder

- **Loop aging / demo clock (resolved on `main`, 30 Oct):** `Domain.loop` still stamps `last_touch` with the real boot time, but `DEMO_AGE_DAYS=3` in `app/.env` moves the clock that cold and due checks read by three days, so seeded loops are cold at once. Because that clock starts from today, the pack's fixed dates must move with it: run `node data/candidate-v1/shift-dates.mjs <day you run the scenarios or record + DEMO_AGE_DAYS>` from `app/` (loops seeded on an earlier boot are only colder by then) and promote from the `data/candidate-run/` it writes. Receipt-image dates stay at `2026-10-29` because the PNGs cannot move. `app/checks/candidate-shift.test.mjs` proves the shifted pack gives the cold, stall-day and 21:00 outcomes above.
- **`invoices` in `synthetic.json` vs Zoho Books:** `validateData` validates `synthetic.json.invoices`, but `books.mjs` derives runtime `invoice` loops exclusively from Zoho Books (`booksSnapshot()`). Connected invoice tests require seeding the fresh Zoho Books account per `books-seed.json`.
- **Books cash-account write fields:** `providers.mjs` currently posts `/books/v3/expenses` without `paid_through_account_id` and `/books/v3/salesreceipts` without `deposit_to_account_id`. Confirm Zoho Books default deposit/payment account behaviour if `CASH_ACCOUNT_ID` balance is expected to move immediately upon expense/sale approval.
- **Instagram Business Discovery:** All baseline `instagram` fields are `null`. Hosted HTML shop pages verify web enrichment only and do not prove official Meta Instagram Business Discovery permissions.
- **Open v0 adversarial findings (`adversarial-review-2026-10-29.md`):** Builder should resolve `AR-01`..`AR-09` prior to connected S3 evaluation — notably `AR-07` (ensure seeded Books invoices are marked Sent/Overdue, not Draft), `AR-09` (exclude newly below-bar `org-8` from the same brief's loop list), and `AR-03`/`AR-04` (Books balance/currency readback guards).

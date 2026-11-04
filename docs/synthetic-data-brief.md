# Followthrough synthetic dataset brief for Gemini and Argon

Prepared for Vince and GK on 29 October 2026.

Create a coherent, entirely fictional coffee-import business dataset that exercises Followthrough's connected v0. Gemini can use this brief to direct and review Argon's dataset generation. Argon owns the candidate data and supporting assets; the application builder owns integration, deployment, and any required importer changes. GK reviews commercial realism and approves the dataset before connected use.

The shared source should be versioned in https://github.com/geekayjahan/followthrough. Both owners also need access to one hosted test application if they are to see the same approvals, messages, invoices, and stock movements. A local file alone does not provide that shared running state.

**Source of truth:** read `app/spec.html`, `app/evals.md`, `app/README.md`, and `app/src/config.mjs` from the build branch available to you. These may be newer than GitHub's default branch. This brief specifies the dataset handoff; it does not replace the product spec or authorize provider writes, messages, account creation, or deployment.

**Current starting point:** the inspected worktree contains an illustrative starter with four organisations, four people, three relationships, two lots, and one order. Invoices and stall days are empty. Provider IDs are null. Expand this into a candidate pack; do not overwrite the active dataset or running database.

**What to deliver**

Return a folder or ZIP with these contents, suitable for review and later inclusion under `app/data/candidate-v1/`:

```text
synthetic.json          Seven runtime collections, using the contract below
scenarios.json         Timestamped inputs, referenced records, expected outcomes
books-seed.json        Proposed matching records for the fresh Zoho test organisation
sources.json           Fact-to-source mapping and exact supporting excerpts
README.md              Dataset version, fictional business story, scenario order, setup gaps
assets/shops/          Clearly labelled synthetic shop pages
assets/receipts/       Actual synthetic receipt images
assets/voice/          Audio samples, when available, with expected transcripts
```

The runtime ultimately reads `app/data/synthetic.json`. The other files are proposed handoff assets, not existing automatic import interfaces. The application builder must review and promote the candidate, connect any missing import steps, and preserve existing runtime evidence. Keep the pack small and understandable; record counts below are targets, not quotas.

**Required runtime collections**

Use stable string IDs, valid cross-references, GBP amounts as JSON numbers, kg as JSON numbers, ISO dates, and explicit nulls for unknown values. Do not put currency symbols or units inside numeric fields. Preserve the seven top-level arrays:

| Collection | Target | Fields and coverage |
| --- | --- | --- |
| `orgs` | 10–12 | `id`, `name`, `type` (`roaster`, `cafe`, `supplier`, `stockist`), `website`, `instagram`, `city`, `price_per_250g`, `sells_indian`, `status` (`lead`, `customer`, `declined`), `books_contact_id`. Include existing customers, warm prospects, strangers, and a declined organisation. |
| `people` | 12–15 | `id`, `org`, `name`, `email`, `whatsapp`, `role`. Every email must end exactly in `@example.test`. Use `whatsapp: null` in the shareable baseline. |
| `edges` | 8–12 | `from`, `to`, `kind` (`buys_from`, `supplies`, `stocks`, `knows`), `since`, `note`. Include one-edge and two-edge paths to existing customers/suppliers/stockists, plus a prospect with no qualifying path. |
| `invoices` | 5–6 | `id`, `org`, `amount`, `issued`, `due`, `paid_on`. Include future-due, due-today, overdue, and paid cases. Put partial-payment details in the Books seed plan rather than assuming the current JSON contract supports a payment ledger. |
| `lots` | 3 | `id`, `name`, `start_kg`, `left_kg`, `books_item_id`. Include healthy stock, exactly 20% remaining, and less than 20%. Keep `0 <= left_kg <= start_kg` and `start_kg > 0`. |
| `orders` | 4–5 | `id`, `org`, `lot`, `kg`, `taken_via`, `status`. Use `unconfirmed`, `to_ship`, and `shipped`; represent email, WhatsApp, and stall intake. Quantities must be positive and commercially plausible. |
| `stall_days` | 2–3 | `date`, `cashed_up`. Include completed cash-up and an outstanding day before/after the 21:00 London threshold. Dates must be unique. |

Add a top-level `provenance` string clearly stating that the dataset is fictional. Keep generated provider IDs null. Do not invent Zoho IDs, model responses, message delivery receipts, or evidence of an actual transaction.

**Scenarios and expected results**

For each scenario, provide a stable scenario ID, relevant eval IDs, starting records, event time, input text or asset path, expected state changes, expected outbound behaviour, and expected totals. Define one reference clock in `Europe/London` and document any date offsets used to generate a later run. Expected outcomes are test oracles, not claims that the app passed.

| Scenario | Required example and expected behaviour | Spec checks |
| --- | --- | --- |
| Chase and approval | Lead/sample/quote/unconfirmed-order loops untouched for three calendar days. Drafts wait for approval, remain pending without it, and reset last touch after confirmed send. Include edited drafts and duplicate approvals. | F1, F2, A1 |
| Voice approval | Actual audio saying “yes send it” and “no, hold it,” each tied to one pending action. Only affirmative, unambiguous approval permits a send. | F3 |
| Invoice collection | An invoice one day overdue produces a chase naming its number and amount. Recording a matching payment closes the loop and prevents later chases. | F4, E2 |
| Receipt | A readable fictional supplier receipt with line items, GBP total, and date. Expected extraction must match the image; Books expense creation waits for approval. | F5 |
| Stall cash-up | “Sold six 250g bags of lot 2, 60 pounds cash” means a GBP 60 sale and exactly 1.5 kg stock reduction. Include a version missing bag size; it must ask and must not write. | F6 |
| Stock threshold | Exactly 20% remaining is not low; below 20% opens a low-stock loop. | F7 |
| Qualification | Shop evidence for GBP 6, 8, 11, 12, and above 12 per 250g. Below 8 closes as “below bar”; 8–12 is mid-shelf; above 12 is premium. Include explicit yes/no evidence about Indian coffee and one unknown case. | F8, E4 |
| Warm introduction | One-edge, two-edge, and no-path prospects. Warm prospects rank first; drafts name the actual fictional connection. Introducer outreach needs its own approval. | F9, F10 |
| Network and totals | Every organisation/edge appears; background facts have sources. Document expected stock, owed, cash, and due loops at the reference time. | F11, F12 |
| Replies and suppression | “Not now, maybe next quarter” closes only that loop. “Stop contacting me” suppresses the organisation's domain, including another lead sharing it. Include an unrelated organisation that must remain unaffected. | E1, A3 |
| Scheduling | A full London day with cold loops: briefs only at 08:00 and 18:00. Include time-boundary expectations without claiming a synthetic clock proves live scheduling. | E3 |
| Recipient and data boundary | Valid synthetic addresses in the main dataset. Separate negative cases for malformed IDs/references, invalid email domain, non-allowlisted WhatsApp recipient, and invalid stock. They must be rejected or blocked, never seeded into the normal run. | A2, A6 |

A4 (no money-moving operations) and A5 (repository secret scan) remain application/repository checks. A generated dataset cannot prove them. Include shipment completion and duplicate inbound events as additional Core regression scenarios.

**Evidence and media requirements**

- Shop pages must be fictional and visibly labelled synthetic. Provide plain HTML containing the exact price, product weight, and Indian-coffee statements needed for extraction. `sources.json` should connect each expected fact to a local asset and exact supporting excerpt.
- `.example.test` URLs are fictional identities, not reachable evidence. Connected enrichment needs approved public HTTPS demo pages and an allowlist configured by the application owner. Keep unrelated organisations on distinct hostnames: current suppression uses the website hostname. Two different paths on one hostname would be treated as the same domain. Include a deliberately shared hostname only for the suppression case.
- Use `instagram: null` unless an owner supplies an approved test setup. Do not fabricate scraped profiles, account access, or follower relationships.
- Receipt images must contain the values specified in their expected extraction, use fictional suppliers, and have no real financial or contact details.
- Voice samples should be short, clearly synthetic or owner-approved, and accompanied by verbatim expected transcripts. If Argon cannot generate audio, supply scripts and mark audio as pending; a transcript alone is not a voice integration test.

**Connected setup and access for GK**

1. **Shared source:** put the reviewed pack on a pushed branch in the shared GitHub repository and provide GK the branch/file links. A local worktree or an unpushed commit is not a shared handoff. Dataset changes should be reviewed through a pull request. GitHub supports editing files in its web interface: https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files.
2. **Matching Zoho records:** `books-seed.json` should describe the synthetic contacts, items, invoices, payments, expenses, sales, and opening cash needed for each case. Specify expected balances and avoid counting payments twice. The owner/builder separately provisions a fresh test organisation and maps returned contact/item IDs into the reviewed runtime dataset. The existing app does not create those initial records merely by reading JSON.
3. **Private bindings:** keep credentials and actual owner/test phone numbers outside the committed pack. Document the required logical bindings by synthetic person ID. The builder must apply the private bindings to the deployment's reviewed runtime data and configuration; an overlay/import mechanism must not be assumed to exist already.
4. **Shared running state:** deploy one always-on Node service with HTTPS and persistent storage. Both owners use the same app URL and login; SQLite lives on the server and is accessed through the app. This is a supported SQLite usage pattern: https://www.sqlite.org/whentouse.html. Do not use Git or a synced Drive folder to share the changing database.
5. **Controlled changes:** the app fingerprints its dataset. Finalise mappings before initialising a connected run. Later dataset changes require a reviewed migration or an explicitly approved fresh store, preserving unresolved actions and audit evidence. Keep `APP_LIVE=false`; owner review is required before setting `SYNTHETIC_DATA_APPROVED=true`.

**Compatibility gaps to flag rather than conceal**

The current app creates new loop timestamps at initialisation. Merely adding historical dates or an unsupported `loops` array to JSON will not make those loops cold. Deliver timestamped event scenarios and identify the importer/test-clock work the builder needs to perform. Similarly, JSON invoice examples do not substitute for fresh Books records, and hosted synthetic shop pages do not prove real Instagram access.

**Acceptance of Argon's handoff**

- All seven collections parse; IDs are unique within each collection; every reference resolves; dates and arithmetic are consistent.
- There are no real customer records, secrets, personal phone numbers, or fabricated provider identifiers. All baseline WhatsApp fields are null and every person email ends in `@example.test`.
- Every data-driven scenario above is mapped to records, inputs, and explicit expected results. Invalid cases are separate from the valid baseline.
- Referenced images, shop pages, and audio actually exist; missing assets and unresolved integration work are listed plainly.
- `README.md` states the dataset version, reference time, scenario order, expected totals, and the steps needed for GK to review and use it.
- Report generated files, validation actually performed, and remaining gaps. Do not claim the dataset was pushed, deployed, connected, or tested against live providers unless that action was separately performed and verified.

Deliver the candidate pack for review. Leave the application source, active runtime data, account configuration, and running workflows unchanged.

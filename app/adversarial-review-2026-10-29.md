# Followthrough v0 adversarial review

Date: 29 October 2026

Reviewed revision: `19bd69af9a514ab162af617951754b968e940ed3`

Branch: `codex/followthrough-v0`

Status: **Four P1 issues should be fixed before enabling connected operation. All findings below remain open.**

The review examined the implementation against `app/spec.html` and `app/evals.md`, including approvals, provider writes, HTTP handling, inbound messages, commercial lifecycle transitions, financial accuracy and model-output validation. An independent reviewer covered Books, provider adapters and receipts.

All 33 existing tests passed at the reviewed revision. Targeted adversarial probes nevertheless reproduced nine findings and a documented recovery limitation. The review itself changed no runtime code and made no live provider calls. Publishing this report adds documentation and a reproduction script; it does not fix the defects or establish live integration acceptance.

## Evidence and reproduction

From the repository root, using Node.js 24 or later with the app dependencies installed:

```powershell
npm.cmd --prefix app test
node app/checks/adversarial-review-2026-10-29.mjs
```

The [reproduction script](checks/adversarial-review-2026-10-29.mjs) contains 13 probes: AR-01 through AR-09, with three AR-08 cases, plus two LIMIT-01 cases. All 13 reproduced the reported behavior when this report was published.

The script deliberately characterizes broken behavior. `reproduced: true` confirms a finding, **not correctness**. Exit code **1** means the reviewed defects and limitation reproduced; exit code **2** means at least one probe changed or errored and needs inspection. It is separate from the normal `*.test.mjs` suite. After fixes, replace the relevant characterization assertions with regression expectations for the corrected behavior.

The probes use synthetic fixtures, in-memory SQLite, injected provider/model responses and one disposable loopback-only HTTP child process. They do not load `app/.env`, modify the application database or contact live providers. Assertions about model or provider mismatch handling demonstrate what validation accepts; they do not establish how frequently a live model or provider would return those values.

P1 denotes a defect that should block connected operation because it can terminate the service, permit duplicate external effects or misrepresent financial state. P2 denotes a functional or evidence-validation defect requiring correction. LIMIT-01 is documented product behavior with an operational cost, not an undocumented implementation surprise.

## AR-01 — P1: An unauthenticated request can crash the server

**Trigger and evidence.** An isolated HTTP server received a malformed request target. Its process exited with status 1 and `ERR_INVALID_URL`. The catch handler parses the same invalid URL again, throwing outside the handler's protection.

**Impact.** A request that reaches the Node server can terminate it without authentication, interrupting scheduled briefs and inbound processing. Any filtering by a future proxy was not tested.

**Fix direction.** Parse once, handle invalid request targets safely, and ensure the error-reporting path cannot throw an unhandled rejection.

[Source: server.mjs:254](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/server.mjs#L254)

## AR-02 — P1: Uncertain sends can be sent again before reconciliation

**Trigger and evidence.** A simulated send timeout left the original action in `needs_reconciliation`. Drafting its still-open loop created a different pending action. Approving that replacement made a second send attempt and completed it while the original remained unresolved.

**Impact.** If the first provider operation succeeded before its response was lost, the replacement can duplicate it. The second attempt still requires owner approval; this is a failure to enforce the reconciliation boundary across actions, not an approval bypass.

**Fix direction.** Block replacement actions and approvals for a loop or business operation while an executing or unresolved action exists. Reconcile the existing provider outcome first.

[Source: engine.mjs:10](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/engine.mjs#L10) and [engine.mjs:284](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/engine.mjs#L284)

## AR-03 — P1: A null invoice balance falsely marks an unpaid invoice as paid

**Trigger and evidence.** A sent invoice initially had a balance of 25 and a pending chase. A subsequent snapshot supplied `balance: null`. `Number(null)` became zero: the loop closed with reason `paid`, its chase was revoked, and the available Books snapshot displayed owed 0. Restoring balance 25 did not reopen the loop.

**Impact.** Invalid financial input can hide a debt and permanently stop its chase. The probe does not claim that live Zoho routinely returns null balances.

**Fix direction.** Validate raw balances before numeric conversion or lifecycle mutation. Define recovery for corrected balances and payment reversals instead of reusing a closed loop unchanged.

[Source: books.mjs:20](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/books.mjs#L20)

## AR-04 — P1: Books verification can accept the wrong currency

**Trigger and evidence.** An approved GBP 120 sale accepted a mocked USD 120 readback containing a different customer, date, item and quantity. Verification compared only the numeric total. The action completed and local stock fell from 10kg to 8.5kg. Expense verification similarly accepted USD 24 for a GBP 24 payload.

**Impact.** A matching number is insufficient proof that Books recorded the approved transaction. Account or customer currency mismatches can pass undetected, and local stock can advance despite contradictory provider evidence.

**Fix direction.** Validate account/customer currency before writing, then compare currency and all material approved fields during readback. Keep contradictory outcomes unresolved.

[Source: providers.mjs:236](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/providers.mjs#L236) and [providers.mjs:200](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/providers.mjs#L200). The [official Zoho sales-receipt contract](https://www.zoho.com/books/api/v3/sales-receipt/) exposes currency, customer, date and line-item fields for verification.

## AR-05 — P2: A customer's first order can become blocked immediately

**Trigger and evidence.** A known customer with zero open loops sent a confirmed order. Reply processing created an `ambiguous_reply_loop` hold. Classification then created an `order_to_ship` loop and marked the inbound event completed, but the hold remained. Shipment approval failed with `Action held until ambiguous inbound reply is linked`.

**Impact.** A normal new order is created in an unusable state, without a hold-resolution control in the dashboard.

**Fix direction.** Distinguish new intake with no matching open loop from a reply ambiguous between multiple existing loops. Clear or explicitly resolve the hold when intake establishes the correct business item.

[Source: domain.mjs:241](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/domain.mjs#L241)

## AR-06 — P2: Quote-to-order progression loses the new state

**Trigger and evidence.** A quote followed by a confirmed order using the same business reference remained a `quote`, retaining `Confirm quote` as its next move. Only `order_unconfirmed` to `order_to_ship` is implemented as an existing-loop transition.

**Impact.** The owner can be prompted to chase a quote instead of shipping the confirmed order.

**Fix direction.** Define and implement supported commercial lifecycle transitions, preserving reference identity and updating the next move when a stage advances.

[Source: domain.mjs:278](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/domain.mjs#L278)

## AR-07 — P2: Draft invoices generate payment chases

**Trigger and evidence.** A mapped, past-due invoice with `status: draft` and balance 25 became a cold invoice loop and contributed 25 to owed. The implementation treats positive-balance invoices other than `paid` as collectible.

**Impact.** The app can propose chasing an invoice that has not been sent or submitted for approval, which is how [Zoho defines draft status](https://www.zoho.com/in/books/kb/invoices/quotes-invoices-status.html).

**Fix direction.** Filter collectible invoice statuses during sync, revoke stale chases when status changes, and enforce the same rule immediately before sending.

[Source: books.mjs:31](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/books.mjs#L31)

## AR-08 — P2: Model outputs can contradict their source and still pass validation

Three injected model responses demonstrated incomplete source validation:

| Probe | Source | Accepted result | Code |
| --- | --- | --- | --- |
| AR-08a | Six bags, lot 2, GBP 120; no bag size | An approvable sale using 250g bags, with no clarification | [stall.mjs:13](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/stall.mjs#L13) |
| AR-08b | Receipt for USD 24 dated 2026-10-29 | A pending GBP 24 expense dated 2030-01-01 | [receipts.mjs:19](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/receipts.mjs#L19) |
| AR-08c | 250g costs GBP 6; 1kg costs GBP 11; "We do not sell Indian coffee" | GBP 11 per 250g, mid-shelf tier and `sells_indian: true` | [enrichment.mjs:119](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/enrichment.mjs#L119) |

**Impact.** Schema-valid facts can be materially false. Owner approval remains required for writes, but the owner is offered invented financial facts, and qualification can admit a below-bar lead. These are validation weaknesses, not observations of live-model behavior.

**Fix direction.** Require source support for every material extracted field, preserve the relationship between price and package size, reject explicit contradictions, and ask for missing information before offering approval. Prompt instructions alone do not enforce these invariants.

## AR-09 — P2: Rejected leads still appear in the brief

**Trigger and evidence.** A GBP 6-per-250g lead was correctly closed as `below bar`, yet the same brief still named it and logged its loop ID. The brief's loop list was captured before qualification closed the lead.

**Impact.** The owner receives an attention item that qualification has already rejected, violating the exclusion in E4.

**Fix direction.** Rebuild or filter the eligible loop list after qualification and use that same list for the message, count and audit record.

[Source: engine.mjs:330](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/engine.mjs#L330)

## LIMIT-01 — Documented manual recovery is operationally fragile

Two probes confirmed the documented no-replay policy:

- A temporary Books read failure before any brief send consumed the 08:00 slot. Calling the scheduler again at 08:01 made no second read and sent no brief; the slot remained `failed_no_retry`.
- A temporary mail-content read failure marked the message failed. A later poll skipped it without another content read, leaving its new order uncreated.

The failures remain visible, but recovery requires operator inspection and direct repair; there is no recovery UI. This materially weakens unattended follow-through even when an external write never began. A future recovery design should distinguish safely retryable read/classification failures from uncertain external writes, preserving the reconciliation protection for the latter.

[Source: engine.mjs:319](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/engine.mjs#L319), [intake.mjs:34](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/src/intake.mjs#L34) and [documented operating policy](https://github.com/geekayjahan/followthrough/blob/19bd69af9a514ab162af617951754b968e940ed3/app/README.md#L31).

## Remaining acceptance boundary

The report is a code and isolated-behavior review, not a complete live S3 acceptance run. It does not establish successful real WhatsApp delivery, Zoho writes, model quality, deployment behavior or owner adoption. Provider credentials and live acceptance remain separate work. The normal test suite's green result must not be read as resolution of these findings.

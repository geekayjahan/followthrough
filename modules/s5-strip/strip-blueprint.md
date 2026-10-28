---
name: strip-blueprint
description: When a new model ships, re-inspect every scaffold in the harness and strip the dead weight — only with proof from the traces, never without the user's sign-off.
reads:
  - the new model's name + date
  - the harness (app/)
  - the trace, the eval scorecard, the debug log
produces:
  - app/recall-notice.html (what to inspect)
  - app/strip-plan.html (proposed cuts)
  - app/strip-page.html (confirmed cuts)
---

# Strip

A better model makes some scaffolds (pre-baked lookups, extra validation passes, prompt workarounds) dead weight — but strip only with proof from the traces, never on a hunch.

## Steps

1. **Write the recall notice.** A new-model launch triggers a review of every scaffold. Start from the tooling: run `/doctor prompt-audit` (prompt text written for older models) and `/skill-doctor` (per-skill context cost, never-invoked skills) on `app/`, and read their output as the first draft. They flag; they don't gather trace evidence or decide — steps 2 and 3 do. Then list every scaffold — pre-baked lookups · sentiment/signal passes · cross-validation · UI scaffolding · prompt kludges — and for each ask: *can the new model do this directly now?*

   | Answer | Proposed call |
   |---|---|
   | yes | strip candidate |
   | no | keep |
   | partly | modify |

   Write it up as `app/recall-notice.html`.
   Done when: every scaffold has a proposed call.

2. **Gather evidence per scaffold.** Answer four questions from the record:
   1. Does the trace show it ever firing? When?
   2. Did it ever catch a failed check in the eval?
   3. Did any past fix touch it?
   4. Run the build **without** it on the new model — did any check go red?

   **Commit nothing yet.** Write it up as `app/strip-plan.html`: one card per scaffold — the evidence · the proposed call (strip / keep / modify) · one-line why.
   Done when: every card has evidence behind its call.

3. **Take the plan through the user review checkpoint** (below). Then write the confirmed calls into `app/strip-page.html`: for each — why cut · why kept · why someone with a different product might keep it · the trace link.
   Done when: every card carries the user's call.

## Checkpoints

- HALT at `strip-plan.html`: the user goes card by card and confirms or overturns each call. **Never strip on your own** — stripping is destructive.
- Cap it at ~4 strips a session — depth per scaffold beats a long list.

## Outputs

- `app/recall-notice.html` — every scaffold + its proposed call
- `app/strip-plan.html` — one card per scaffold: evidence · call · why (pre-review)
- `app/strip-page.html` — the confirmed calls (post-review)

## Hand-off

Hand over a leaner harness. Send any surviving rule to `CLAUDE.md` (the CLAUDE.md rule). Close out per the **trace rule** (see [`../shared-rules.md`](../shared-rules.md)).

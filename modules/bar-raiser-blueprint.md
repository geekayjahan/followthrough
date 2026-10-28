---
name: bar-raiser-blueprint
description: Run any PM doc (spec, brief, PRD) past the four reviewers who'd otherwise reject it — Customer, Data, Bet, Owner — before it gets sent.
reads:
  - the artifact
produces:
  - a short verdict block — the four checks · the fixes · the call
---

# Bar Raiser

All four reviewers must pass or the doc is not ready — the same idea as the eval, pointed at a *document* instead of an app's output.

## The four checks

| Reviewer | Passes only if… |
|---|---|
| **Customer** | a named segment + a named problem; the behaviour change is plausible |
| **Data** | a specific number / metric / volume signal (TAM or ROI if it's a spec) |
| **Bet** | it's clear which way this wins (better / cheaper / faster), what's *not* being built, and the trade-off |
| **Owner** | a named person (not "the team"); the real constraints are on the page |

## Steps

1. Read the artifact; name the doc type and who it's for.
2. Run the four checks — each ✓ or ✗ with a one-line reason.
3. All ✓ → say "send it" and stop.
4. For each ✗: write the sharp bullet (name the exact line), then the fix (that line → its replacement).
5. Re-run the four checks on the fixed text.

Done when: all four checks are ✓, or the checkpoint below fires.

## Checkpoints

- HALT IF any check is still ✗ after the one fix-and-recheck pass → output "not ready, revise and re-run." **One fix pass, no more.**

## The reviewer's register

Ask these:

- "So what?"
- "Where's the data?"
- "What's the bet?"
- "Single-threaded owner?"
- "What changes Monday?"

Flag on sight:

- vague verbs ("explore / consider")
- bullets where a conclusion belongs
- a segment named but no problem
- a claim with no number

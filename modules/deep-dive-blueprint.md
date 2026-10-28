---
name: deep-dive-blueprint
description: Drill past a fuzzy incident's symptom with 5 Whys — evidence-backed answers, one question per turn — then write it up with parallel workers. Use whenever a bug's layer is unclear, in Build or Debug.
reads:
  - a fuzzy incident (no structure needed)
produces:
  - deep-dive-report.md (or a line appended to the trace)
---

# Deep Dive

Keep asking Why — up to five times — until the answer names a cause you can actually *fix*, not an excuse.

## Steps

1. Restate the incident in one sentence. Ask **Why 1**. Stop.
2. Take the user's answer — it must come *with evidence*.
3. Too shallow? Refuse it (see the refusal checkpoint) and re-ask the same Why one level down.
4. Otherwise ask **Why 2** about the thing their answer named. Stop. …and so on.
5. After Why 3, also ask: *"what evidence would prove this chain wrong?"*
6. Stop at Why 5, or earlier once the answer names a fixable cause (below).

A fixable cause names one of:

- a missing guardrail / validation
- missing monitoring
- a broken handoff between teams
- unclear ownership
- a process gap that repeats
- a missing test / review checkpoint / runbook

## Checkpoints

- HALT after every Why — one question per turn; ask, then stop and wait for the answer.
- Refuse on sight: "we forgot," "human error," "they should have known," "communication gap" — with no named mechanism. Re-ask one level down.

## Write it up

Launch 5 workers in parallel with the whole transcript; each fills only its part and writes `[NEEDS_INPUT]` for anything the conversation didn't cover — they invent nothing:

| Worker | Section |
|---|---|
| **W1** | summary + impact |
| **W2** | timeline |
| **W3** | the 5-Whys chain + named root cause |
| **W4** | guardrails + fixes |
| **W5** | open questions + lessons |

Write the header yourself and assemble the report.

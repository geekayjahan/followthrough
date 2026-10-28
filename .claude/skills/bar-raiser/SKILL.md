---
name: bar-raiser
description: Apply the Amazon Bar Raiser discipline to any PM artifact (spec, PRD, brief, CoE) — four parallel sub-evaluators (Customer, Data, Bet, Owner) score the artifact, then one fix-and-re-evaluate pass. Use when the user invokes /bar-raiser, says "raise the bar", "press-send check", "evaluator-optimizer", "bar raiser this", or wants a hard critique before sending an artifact upstream. Produces a CONDITION CHECK / BAR RAISER / FIXED / POST-FIX block.
argument-hint: <artifact path>
---

# Bar Raiser

Evaluator-optimizer composed with parallelization (sectioning). 4 parallel sub-evaluators · aggregator · one-shot fix-and-re-evaluate loop.

Read `@modules/bar-raiser-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

---

## Input

`ARTIFACT` — path to any PM artifact (spec, PRD, brief, CoE, mailer, etc.). If missing, halt and ask.

---

## Procedure

Follow the blueprint's 7-step flow:

1. Read artifact; identify doc-type + persona.
2. **Dispatch 4 evaluators in parallel** (Customer · Data · Bet · Owner). Each returns ✓/✗ + ≤2-line cite.
3. Aggregate → `CONDITION CHECK //`. All ✓ → verdict press-send · stop. Any ✗ → continue.
4. `BAR RAISER //` — 5–7 surgical bullets on failing conditions only.
5. `FIXED //` — per failing condition: source line/section → replacement text.
6. Re-dispatch the 4 evaluators against the patched text.
7. `POST-FIX CONDITION CHECK //` + verdict (press send / not ready).

Loop discipline: one fix-and-re-evaluate pass. If POST-FIX still has any ✗, print `Verdict: not ready · PM revises and re-invokes` and stop.

---

## Output

Up to 4 blocks printed in order. Omit later blocks if all 4 conditions pass on the first check.

The 4 conditions: **Customer** (named segment + named problem · behavior change plausible) · **Data** (specific number / metric / volume signal · TAM/ROI if spec) · **Bet** (better/cheaper/faster dimension · what's NOT being built · trade-off stated) · **Owner** (named role or person · key constraints surfaced).

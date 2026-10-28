---
name: eval
description: Run the two-pass eval — the bar-raiser panel grades the spec's checks binary, then a human-led error analysis reads the traces for what the spec never imagined. Use when the user invokes /eval, says "evaluate the app", "run S3", "grade the output", "error analysis", or wants a pass/fail verdict per check. Produces app/eval-results.html (scorecard · traces · patterns · actions) + app/eval-runs.json history.
effort: high
---

# Eval

Self-evaluation fails structurally — the builder biases toward favourable scoring. The fix is a fresh, independent pass, not a better prompt. And the checks alone aren't enough: the traces show what the spec never imagined. Two passes — top-down checks, bottom-up discovery.

Read `@modules/s3-eval/eval-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

Read `memory.md` in this skill's folder before running. After the session, grade the eval outputs against this skill's `evals.md` with a fresh-context agent, dispatched in the foreground, then append what you learned to `memory.md`.

---

## Inputs

- `app/evals.md` — the spec's Verification checks (S1 wrote them; this skill runs them)
- App output — entry point + run command located via `app/claude-progress.txt`. If multiple plausible entry points exist, ask the user before choosing.
- `app/spec.html` — for context only; the checks come from `evals.md`.
- `app/comments.json` (when present) — process any `status:"new"` comments scoped to the eval before starting.

---

## Step 1 — Encode the checks, one reviewer each

Walk every `evals.md` row and encode it as a binary check, tagged:

- **code** — a count, regex, substring, status code or date can decide it. If code *can* decide it, code *does* — always.
- **screen** *(optional; needs `TYPESAFE_API_KEY` in `.env`)* — meaning, but phrasable as a yes/no statement per item. A decision model (Jev) scores every item; the judge writes evidence only on the items it flags. Set the threshold from a spot-checked sample.
- **judge** — meaning has to be interpreted. Give the judge two worked pass/fail examples so it grades the way you would. With no decision-model key, every screen check runs as a judge check.

Assign every check to a reviewer dimension: **QA · architect · security · customer sense · data**. **A dimension with zero checks is a blind spot, not a pass** — flag it and ask the user for that reviewer's missing question (AskUserQuestion; customer sense goes silent most often). Accept either answer: a new `evals.md` row written in before the judge runs, or **"not relevant here" + a one-line reason**, which you record on the scorecard as an *accepted blind spot*. Don't push for an invented check — an empty security check on an app with no users teaches box-ticking. Only a silently skipped dimension is a fail.

Rules: **binary** (never "7/10") · **a rule, not one answer** · **shape checks mean exactly these fields** (an extra field is a fail too).

---

## Step 2 — The independent judge

Dispatch the `judge` agent (`.claude/agents/judge.md` — read-only tools, so it cannot soften a check) in the foreground with the encoded checks and the output path. Steps 1 and the spot-check stay in this session: a subagent cannot ask the user anything. Screen checks are scored here first, and the per-item probabilities and threshold go to the judge with the check. The judge runs every check against every output item:

- Verdicts: **pass / fail / can't-tell**.
- **Broken-row rule:** a row that fails a hard check (dead link, leaked data) doesn't count toward any other check's pass.
- On a fail, the evidence names **every failing item** — which row, which value.
- **can't-tell** has two triggers: the spec never pinned it down, **or this run never exercised the check's case** (green on a scenario that never happened is coverage you don't have, not a pass). Both are a spec edit + re-run — pin the number, or pin an input that forces the case — never an invented threshold.

Then, before handing over the scorecard: ask the user to **spot-check three verdicts, at least one of them a pass** (AskUserQuestion; for a screen check, the threshold is what they spot-check). A fresh judge is more trustworthy than the builder, not infallible — and its wrong *fails* get caught downstream when someone tries to fix them, while its wrong *passes* never do. If a verdict is wrong, fix the check's wording or its worked examples and re-run; don't edit the item. Log the spot-check as one trace line — which three verdicts, and what it found.

---

## Step 3 — Error analysis (human-led)

The judge found *that* it failed; the human names *why*. Follow the blueprint's five steps:

1. Point the user at the dashboard's TRACES tab — **one annotator**, open-code notes per item (first thing that went wrong · observations not explanations). Never hand them a pre-defined failure list. They read every failure **plus five rows that passed every check** — the checks were written before the app existed, so a pass only means the build cleared a bar set in ignorance. Those five were seeded in Step 2's render, spread across different checks and items (all of them, when fewer than five passed everything); **never hand-picked by hunch**. Five is a floor, not a cap.
2. When annotations come back (pasted JSON), **propose clusters** — split by different root cause, merge by same, grounded names only. **Confirm with the user before using them** (AskUserQuestion: accept / rename / merge / split).
3. **Label every failure and every sampled pass** against the confirmed patterns, not just the annotated ones; show the counts; invite the user to hand-check a few labels. Report coverage across **both** groups, and point at unread items that look unlike anything labeled yet.
4. **Triage each pattern through the three doors, in order:** obvious bug → hand to `/surgical-fix` now · repeats and matters → draft the new `evals.md` row (code check preferred) and add it on the user's yes · rare and low-stakes → log it. Update the dashboard's PATTERNS and ACTIONS data.
5. Remind once: re-run this loop after a model swap or big spec change (S5's Model Recall is the trigger).

---

## Outputs

- `app/eval-results.html` — four tabs per the blueprint's render spec: **SCORECARD** (five reviewer cards, hard question, binary lights, evidence, coverage chips, predicted-vs-actual when the room's tally was given) · **TRACES** (cards grouped into failed→what-went-wrong, can't-tell→spec-decision, and passed→read-anyway — the latter seeded with five rows that passed every check, spread across different checks and items, badged "Uncovered" by the annotator when one holds a problem no check catches; annotation rules; notes persist to `app/eval-annotations.json` via `POST /eval-annotations` with a localStorage draft + clipboard fallback; Copy annotations export) · **PATTERNS** (only from confirmed clusters; run-over-run strip; trend) · **ACTIONS** (the three doors, triage order). Render via `frontend-design`; embed the current run's rows as a JSON blob.
- `app/eval-runs.json` — append `{run, timestamp, verdicts:[{check_id, reviewer, verdict, evidence_summary}]}` each run (dashboard history; not a handoff artifact).

Hand-off: obvious bugs → Debug now · repeating patterns → new `evals.md` rows (the checks grow as you learn) · can't-tell → fix the spec and re-run · **all green → the checks were too soft**: write one harder check from the five passing rows before the set becomes a regression net.

---

## Close out

Append: `<ISO>  S3  eval-results.html landed  RATIONALE: <overall verdict + dominant failure pattern>`. Do not mirror failure details into CLAUDE.md. CLAUDE.md §2 is touched only if the eval surfaces a tenet that survives a model swap.

One caveat, said out loud: green means the machine-runnable checks came back clean — not that the app is *audited*. Simulated reviewers aren't real audits; for money / data / safety, a human still signs off.

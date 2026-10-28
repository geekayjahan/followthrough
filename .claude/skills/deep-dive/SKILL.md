---
name: deep-dive
description: Run a 5-Whys orchestrator-workers deep dive on a fuzzy incident — conversational loop where each Why's shape emerges from the prior answer, then 5 parallel workers compile the report. Use when the user invokes /deep-dive, says "deep dive on", "do a 5 whys on", "root cause this", "investigate this incident", or when the layer to fix is ambiguous in S3 or S5. Output appends to app/claude-progress.txt as a trace entry (or writes deep-dive-report.md when standalone).
argument-hint: <incident>
---

# Deep Dive

Orchestrator-workers — the orchestrator runs the 5-Whys loop one question at a time, then dispatches 5 parallel workers to compile the report from the transcript.

Read `@modules/deep-dive-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

---

## Input

User-provided fuzzy incident paragraph. No structure required.

---

## Procedure

1. Restate the incident in one sentence · ask Why 1 · **stop**.
2. User responds with Why-N answer + cited evidence.
3. Apply depth rubric. If shallow, refuse and re-ask the same Why one layer down.
4. Paraphrase the user's last answer · ask Why N+1 naming the noun the answer introduced · **stop**.
5. After Why 3 — counterfactual probe ("what evidence would make us reject this chain?") · **stop**.
6. Continue until Why 5, or a rubric criterion is satisfied earlier.

**One question per turn. After asking Why N, stop and output nothing else.**

Compile: dispatch 5 workers in parallel, each filling its assigned report sections from the transcript. `[NEEDS_INPUT — not covered in conversation]` for every gap. Invent nothing.

---

## Depth rubric — an answer is deep enough only when it names ONE of

- missing guardrail or validation
- missing monitoring or alerting
- broken handoff between teams
- unclear ownership boundary
- process gap that predictably repeats
- missing test, review checkpoint, or runbook

**Refuse on sight**: "we forgot", "human error", "they should have known", "communication gap" without a named mechanism.

---

## Usage

Invoked in S3 (when the trace surfaces a fuzzy incident) and S5 (when the layer to fix is ambiguous on a surviving FAIL). Output appends to `app/claude-progress.txt` as a trace entry. When run standalone (outside a session), writes `deep-dive-report.md`.

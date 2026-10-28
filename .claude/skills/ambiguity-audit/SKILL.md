---
name: ambiguity-audit
description: Run the Ambiguity Audit against a draft spec — an independent read that flags names used before they're defined, instructions with no concrete how, and numbers with no bound. Use when the user invokes /ambiguity-audit, says "audit the spec", "check the spec for ambiguity", "find the loose phrases", or after /spec finishes cleanly. Produces app/ambiguity-audit.html.
effort: high
argument-hint: [spec path]
---

# Ambiguity Audit

An independent read of a finished spec, before the build. Single linear scan, four flag classes (undefined names · missing hows · unbounded numbers · unmeasured adjectives), four halt conditions.

Read `@modules/s1-working-backwards/ambiguity-audit-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

---

## Input

`SPEC` — path to a draft spec (`app/spec.html` by default, or whatever path the user provides).

If the spec path is missing or the file does not exist, halt and ask.

---

## Procedure

Run the blueprint's scan. Halt on any of the four conditions:

1. A name used before it's defined → fix the spec.
2. An instruction ("shall / will / can") with no concrete "how" → fix the spec.
3. A number with no bound (a range, window, or ratio with no unit or limit) → fix the spec.
4. An adjective with no measure ("stale", "relevant", "fast", "large") → pin it to a number or time bound.

On halt, name the failed condition + the offending row(s) and stop.

---

## Output

`app/ambiguity-audit.html` — render via the `frontend-design` skill. Pass the flagged rows (word · location · why it's ambiguous · **what it would cost**: a rough estimate of the rework if it reaches the build — tokens + the re-run a wrong guess forces) + a pass/fail count. Let the skill own table styling and the red-flag treatment. Do not hand-roll the HTML.

---

## When NOT to run

Inside the Working Backwards skill. The audit is the independent read — run it *after* `/spec` finishes cleanly, never as part of it.

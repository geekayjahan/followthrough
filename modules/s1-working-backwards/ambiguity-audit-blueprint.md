---
name: ambiguity-audit-blueprint
description: Run an independent read of a finished spec, before the build — flag every word the AI could read two ways and force it closed.
reads:
  - app/spec.html (a draft)
produces:
  - app/ambiguity-audit.html
---

# Ambiguity Audit

An ambiguous spec is exactly where the AI drifts — it picks one reading and runs.

## The four findings

| Finding | Test | Fix |
|---|---|---|
| a name used before it's defined | does the spec define it first? | define it |
| an instruction with no concrete "how" | "shall / will / can" with nothing behind it | say how |
| a number with no bound | a range, window, or ratio with no unit or limit | bound it |
| an adjective with no measure | "stale", "relevant", "fast", "large" — nothing numeric or time-based behind it | pin it ("stale" = posted >30 days ago; "fast" = <2s) |

## Steps

1. Read the spec once, end to end.
2. Flag every instance of the four findings above.
3. For each flag, output one row:

   ```text
   word · where it is · why it's ambiguous · what it would cost (rough rework estimate — the tokens and the re-run a wrong guess forces)
   ```

4. Render the list per the **render rule** (see [`../shared-rules.md`](../shared-rules.md)) → `app/ambiguity-audit.html`. A clean spec shows nothing.

   Done when: every flag has all four fields and the page is rendered.

## Checkpoints

- HALT IF a name is used before it's defined → fix the spec
- HALT IF an instruction has no "how" → fix the spec
- HALT IF a number has no bound → fix the spec
- HALT IF an adjective has no measure → fix the spec

This is the **spec-clarity check** — *is the spec complete and unambiguous?* — a different question from S3 Eval, which checks the built **output** against the spec.

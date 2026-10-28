---
name: s1-working-backwards-steps
description: One-page map of stage S1 — run order and artifact paths. The procedure lives in the blueprints.
---

# S1 — Spec (Working Backwards)

Rough idea → spec an agent can build from reliably.

## Run order

1. Build the `/spec` skill from [`./working-backwards-blueprint.md`](./working-backwards-blueprint.md).
2. Run `/spec` → `spec.html` · `CLAUDE.md` · `spec-summary.json` · `evals.md`.
3. Run the one-shot audit vs. [`./ambiguity-audit-blueprint.md`](./ambiguity-audit-blueprint.md) → `ambiguity-audit.html`.
4. Close: append to `claude-progress.txt` per the trace rule.

## Artifacts

| Artifact                | Path                                                                |
|-------------------------|---------------------------------------------------------------------|
| `/spec` skill           | `.claude/skills/spec/SKILL.md`                                      |
| Spec                    | `app/spec.html`                                                     |
| CLAUDE.md               | `app/CLAUDE.md`                                                     |
| Spec summary            | `app/spec-summary.json`                                             |
| Evals                   | `app/evals.md`                                                      |
| Ambiguity audit         | `app/ambiguity-audit.html`                                          |
| Progress trace          | `app/claude-progress.txt`                                           |

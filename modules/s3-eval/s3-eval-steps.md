---
name: s3-eval-steps
description: One-page map of stage S3 — run order and artifact paths. The procedure lives in the blueprint.
---

# S3 — Eval

App + `evals.md` → pass/fail scorecard, one row per check.

## Run order

1. Run the Independent Judge per [`./eval-blueprint.md`](./eval-blueprint.md), reading evals + app output + progress → `eval-results.html` (four tabs: scorecard · traces · patterns · actions) + `eval-runs.json` run history.
2. Close (the blueprint's final step): append to `claude-progress.txt`; touch `CLAUDE.md` §2 only if a durable tenet surfaced.

## Artifacts

| Artifact          | Path                                               |
|-------------------|----------------------------------------------------|
| Eval results      | `app/eval-results.html`                            |
| Trace (appended)  | `app/claude-progress.txt`                          |

---
name: s5-strip-steps
description: One-page map of stage S5 — run order and artifact paths. The procedure lives in the blueprint.
---

# S5 — Strip

Repaired prototype + a new model → a leaner harness.

## Run order

1. Run the Model Recall + Strip discipline per [`./strip-blueprint.md`](./strip-blueprint.md), reading progress + eval-results + debug-log → `recall-notice.html` · `strip-plan.html` · `strip-page.html`.
2. Close (the blueprint's final step): append per-strip RATIONALE to `claude-progress.txt`; update `CLAUDE.md` §2 Durable Tenets.

## Artifacts

| Artifact         | Path                                                  |
|------------------|-------------------------------------------------------|
| Recall notice    | `app/recall-notice.html`                              |
| Strip plan       | `app/strip-plan.html`                                 |
| Strip page       | `app/strip-page.html`                                 |
| Trace (appended) | `app/claude-progress.txt`                             |

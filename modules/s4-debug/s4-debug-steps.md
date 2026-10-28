---
name: s4-debug-steps
description: One-page map of stage S4 — run order and artifact paths. The procedure lives in the blueprint.
---

# S4 — Debug

Failed checks → repaired prototype.

## Run order

1. Run Surgical Fix per [`./surgical-fix-blueprint.md`](./surgical-fix-blueprint.md), reading eval-results + progress — one change per failed check at the named layer (spec · screen · tech stack · prompt · data · code) → `debug-log.html` + live edits in the named layer.
2. Close (the blueprint's final step): append per-fix RATIONALE to `claude-progress.txt`; update `CLAUDE.md` with surviving tenets.

## Artifacts

| Artifact         | Path                                               |
|------------------|----------------------------------------------------|
| Debug log        | `app/debug-log.html`                               |
| Trace (appended) | `app/claude-progress.txt`                          |

---
name: s2-build-steps
description: One-page map of stage S2 — run order and artifact paths. The procedure lives in the blueprint.
---

# S2 — Build

Spec → working app + trace.

## Run order

1. Run the three build subagents in order — decompose → initialize → write the code — per [`./build-blueprint.md`](./build-blueprint.md), reading spec + progress.
2. Halt at the credential checkpoint until the key lands in `.env`.
3. Build feature by feature — read `app/comments.json` before each feature (comments are change requests) → `feature-list.json` · `app-spec.json` · the source under `app/`.
4. Close (the coding step's handoff condition): append session-level RATIONALE to `claude-progress.txt`; update `CLAUDE.md` only if a durable tenet surfaced.

## Artifacts

| Artifact         | Path                                               |
|------------------|----------------------------------------------------|
| Feature list     | `app/feature-list.json`                            |
| App spec         | `app/app-spec.json`                                |
| App              | `app/` (the build picks the conventional layout for the chosen language — e.g. `app/src/app.py` for Python, `app/api/`+`app/lib/`+`app/components/` for Next.js) |
| Trace (appended) | `app/claude-progress.txt`                          |

---
name: explain
description: Interrogate the build against the spec — where does each requirement live, what breaks if you change it, how does one user action flow through. Not a summary. Use when the user invokes /explain, says "explain the build", "where does this requirement live", "what breaks if I change this", or wants to understand the app before changing it. Produces app/understanding-map.html.
---

# Explain

"Never ship what you don't understand" — and a summary that *sounds* right just fools you. You understand the build when you can **predict what breaks if you change it** and **point to where each spec requirement lives**.

Read `@modules/explain-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

---

## Inputs

- `app/` — the built app
- `app/spec.html` — the requirements
- `app/claude-progress.txt` — the trace

---

## Steps

1. **Map** — for each requirement in the spec, find where it lives in the code (requirement → file / function).
2. **Predict** — pick a piece and ask *"what breaks if I change this?"* Trace the blast radius before you touch it.
3. **Trace** — follow one real user action from the click to the result, all the way through.

*Done when* every requirement is mapped and at least one full action is traced.

---

## Output

`app/understanding-map.html` — one row per requirement: `requirement → where it lives → what depends on it`. A requirement you **can't** find in the code is a **gap** — the build drifted from the spec; hand it to `/surgical-fix` as a bug. Render per the render rule via `frontend-design`.

---
name: explain-blueprint
description: Interrogate the build against the spec until you can predict what breaks if you change it — not just paraphrase it. Run before changing an app you didn't just build.
reads:
  - the built app (app/)
  - app/spec.html
  - the trace
produces:
  - an understanding map (app/understanding-map.html)
---

# Explain

You understand the build when you can predict what breaks if you change it and point to where each requirement lives — a summary that *sounds* right just fools you. (The spec + the trace are the real understanding; the code is disposable.)

## Steps

1. **Map** — for each requirement in the spec, find where it lives in the code (requirement → file / function).
   Done when: every requirement is mapped.
2. **Predict** — pick a piece and ask *"what breaks if I change this?"* Trace the blast radius before touching it.
   Done when: you can name the blast radius for the pieces you'd change.
3. **Trace** — follow one real user action from the click to the result, all the way through.
   Done when: at least one full action is traced end to end.

## Outputs

An understanding map, one row per requirement:

```text
requirement → where it lives → what depends on it
```

- A requirement you **can't** find in the code is a **gap** — the build drifted from the spec. Report it as a bug for `/surgical-fix`.
- Can't predict the blast radius or point to where a requirement lives? You don't understand it yet — a paraphrase won't fix that.

Render per the **render rule** (see [`./shared-rules.md`](./shared-rules.md)).

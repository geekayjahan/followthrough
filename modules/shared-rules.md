---
name: shared-rules
description: Four rules every blueprint follows — trace, render, doors, CLAUDE.md. Stated once here; blueprints reference them by name.
---

# Shared rules

Follow these four rules in every stage. Blueprints reference them by name instead of repeating them.

## Trace rule

End every session by appending one line per artifact to `app/claude-progress.txt`:

```text
<ISO timestamp>  <session>  <artifact> landed  RATIONALE: <one sentence — why, not what>
```

Write it with `node scripts/trace.mjs <session> "<artifact> landed" "<rationale>"` — the script stamps the clock, so no timestamp is ever typed.

- `<session>` is the stage tag: `S1` · `S3` · `S4` · `S5`.
- Build is multi-agent, so it tags `S2.DECOMPOSER` / `S2.INITIALIZER` / `S2.CODER`.
- RATIONALE answers *why it worked*, not *what you did*.

## Render rule

Render artifacts as HTML for one reason — so the user can review them cleanly at a glance. They're not hosted; don't over-build them.

1. Pass the sections to the `frontend-design` skill as structured content and let it own layout, type, and colour. Never hand-roll HTML.
2. Put the five-stage strip in every header — `S1 spec → S2 build → S3 eval → S4 debug → S5 strip` — with the current stage lit.
3. **Only `app/spec.html` carries the selection annotator** — the spec is the one artifact that drives the build, so it's the one you annotate. Every other artifact (eval · debug · strip · audit) is a read-only review surface: **no comment or feedback widget.** (One exception, and it's not this widget: the eval dashboard's TRACES tab has error-analysis note fields — the eval blueprint defines them, they save to `app/eval-annotations.json`, and they never feed the build.)

   On the spec, the reader selects any text and a small popover appears anchored to that passage — the quoted snippet, a one-line note field (optional), a Send button. It POSTs to `/comments`:

   ```json
   {"target": "artifact:app/spec.html", "quote": "<the selected text>", "text": "<the note, or the quote when left empty>"}
   ```

   The kit server writes it to `app/comments.json`; the build folds spec annotations in before it starts, and re-reads before each feature. POST to `/comments`, and when the page isn't being served (opened as `file://`), retry `http://localhost:4000/comments` before falling back to copy-to-clipboard — the kit server allows cross-origin posts. The anchor *is* the annotation — no bottom comment box.

## Doors rule

Classify every change before you make it:

- **Two-Way** — reversible: roll back the file, re-run with fresh context, no defence owed.
- **One-Way** — irreversible: write a defence in the trace *before* the step fires.

## CLAUDE.md rule

Keep `CLAUDE.md` to durable rules, the workflow map, and the artifact map — **never** product or failure content. Update it only when a tenet survives a model swap.

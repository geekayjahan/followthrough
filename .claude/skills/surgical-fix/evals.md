# Evals — surgical-fix skill

Binary checks on a debug session's outputs. Grade with a fresh agent that did not
make the fixes, pointing at `app/debug-log.html`, the trace, and git log. Any
fail: fix, then re-grade with a new fresh agent until all pass. Cap ~12 — to add
a check, merge or retire a weaker one.

1. Every debug-log entry names the layer (spec / screen / tech stack / prompt /
   data / code) and grounds it in the locate evidence: the trace entry, the
   owning feature, the commit, and the file:line.
2. For every human-reported bug, the entry shows the proposed fix was read back
   to the user and confirmed before anything was touched.
3. Every entry is one change — it reads as a single before / change / after row.
   Nothing bundled; a bundled fix was split into separate entries.
4. Every entry's eval delta shows the whole check suite was re-run, not just the
   check being fixed.
5. Every receipt is complete: before, the verbatim diff, after, which checks
   flipped, and the cost (tokens + model for AI fixes; files + lines for code
   edits).
6. Where a fix broke something else, the entry shows the rollback and the
   rethink (or is marked still-open) — no silent regression left behind.
7. `app/claude-progress.txt` has one RATIONALE line per fix with the
   before/after eval delta and the verdict.

Gold example: none yet — this kit ships unbuilt. Aim for a `app/debug-log.html`
where each entry names its layer, makes one change, and reads
before / change / after with the eval delta beside it. Replace this line with a
real reference after the first run.

---
name: surgical-fix
description: Fix failed checks and reported bugs one change at a time. Use when the user invokes /surgical-fix, says "debug the failed checks", "fix this bug", "surgical fix", "run S4", "walk the eval results", or has failed checks in eval-results.html waiting to be addressed. Produces app/debug-log.html — one entry per fix with a receipt.
disable-model-invocation: true
---

# Surgical Fix

One change, one re-eval, one verification, one receipt per entry. Anything else is poking.

Read `@modules/s4-debug/surgical-fix-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

Read `memory.md` in this skill's folder before running. After the session, grade the debug log against this skill's `evals.md` with a fresh-context agent, dispatched in the foreground, then append what you learned to `memory.md` — a debugging lesson that stays in your head is a lesson the next session pays for again.

---

## Step 0 — Route at the start

Ask the user once: *"Debug from eval results, or describe a bug/change you want fixed?"*

- **Eval-driven** — walk each **failed** row in `app/eval-results.html` through the discipline. When the eval's error analysis produced an ACTIONS list, its "fix the build" items are the to-do list, in that order. (A **can't-tell** row is a spec gap — the fix is a spec edit + re-run, logged like any other fix at the spec layer.)
- **Manual** — a human reported it. Locate first, then read the fix back for a yes before touching anything.

Either way, check `app/comments.json` (when present) for `status:"new"` entries whose `target` is `artifact:app/debug-log.html` — the debug-scoped notes the Build Assistant queues here. Treat each as a manual-route item: flip it `new → picked-up` when you start and `picked-up → done` once its receipt lands, and append a trace RATIONALE naming the comment. (Comments carrying any other `target` — spec- or eval-scoped — aren't S4's; leave them `new` for their stage.)

---

## Locate before you fix

A failed check tells you *what's* wrong, not *where*:

1. **M1** — read the trace (`app/claude-progress.txt`); find the entry that matches the failure.
2. **M2** — read `app/feature-list.json`; which feature owns it.
3. **M3** — read `git log`; which commit landed it.
4. **M4** — open that file and line.
5. **M5** *(human-reported bugs only)* — read it back: *"You said X. I'm fixing feature Y at file:line, from commit Z. Proposed change: …"* — and wait for the yes.

---

## Discipline (both routes)

| Step | Action |
|---|---|
| 1 | **NAME** the layer, using what M1–M4 showed you — not a guess. A bug isn't always in the code: it can be in the **spec** (you asked for the wrong thing), a **screen**, the **tech stack**, the **prompt**, or the **data**. If it's the spec, the fix is a spec edit + re-run — the spec is allowed to change as you learn. Still can't tell? Invoke `/deep-dive`. |
| 2 | **MAKE** the change. The smallest one. If you can't write the entry as one before/change/after row, you didn't make one change — split it. |
| 3 | **RE-RUN** the whole eval (the `eval` skill — S3's independent judge). Every check, not just the one you fixed — that's how you catch a fix that quietly broke something else. |
| 4 | **VERIFY**. Failure gone → closed. Still there → still open (write a new entry). Something *else* broke → regression — roll back, rethink. |
| 5 | **LOG** to `app/debug-log.html`: before · change (verbatim diff) · after · which checks flipped · the receipt — input tokens · output tokens · model · approx cost for AI fixes; files + lines for code edits. |

---

## Close out

- Append a RATIONALE entry to `app/claude-progress.txt` per fix: `<ISO>  S4  <layer> fix landed  RATIONALE: <one sentence — before/after eval delta + verdict>`
- Update `app/CLAUDE.md` §2 Durable Tenets only with tenets that survived the fix (or were disproved by it). Fix details live in `debug-log.html`, not CLAUDE.md.

Render `app/debug-log.html` via the `frontend-design` skill. Pass each entry as structured content; let the skill own the closed/still-open/regression treatment.

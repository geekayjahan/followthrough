---
name: surgical-fix-blueprint
description: Fix failed checks and reported bugs one change at a time — locate, one change, re-run every check, receipt.
reads:
  - app/eval-results.html (the failed checks) — or a bug a human reports
  - app/comments.json (when present) — debug-scoped comments queued from the build assistant
produces:
  - app/debug-log.html (one entry per fix, each with a receipt)
---

# Surgical Fix

Change one thing, re-run every check, then touch the next — the opposite of changing five things at once and never knowing which one worked or what it broke.

## Entry routes

- **From the eval:** walk each failed check.
- **From a human ("this is broken"):** same steps, plus the read-back checkpoint (below) before touching anything.
- **From a debug comment:** the build assistant queues debug-scoped notes to `app/comments.json` — run the **debug-input checkpoint** (below) and treat each as a human-reported bug.

## Steps

**Locate before you fix** — a failed check tells you *what's* wrong, not *where*:

1. **M1** — read the trace (`app/claude-progress.txt`); find the entry that matches the failure.
2. **M2** — read `app/feature-list.json`; which feature owns it.
3. **M3** — read `git log`; which commit landed it.
4. **M4** — open that file and line.
5. **M5** *(human-reported bugs only)* — the read-back checkpoint (below).

**Then fix, one bug at a time:**

6. **Name where it lives** — using what M1–M4 showed you, not a guess. A bug isn't always in the code — it can be in the **spec** (you asked for the wrong thing), a **screen**, the **tech stack**, the **prompt**, or the **data**. Still can't tell? Run `/deep-dive`. If it's the spec, the fix is to edit the spec and re-run — the spec is allowed to change as you learn.
7. **Make one change** — the smallest. If you can't write it as a single before → after, it's more than one; split it.
8. **Re-run the whole eval — every check, not just the one you fixed.** That's how you catch a fix that quietly broke something else (see [`../s3-eval/eval-blueprint.md`](../s3-eval/eval-blueprint.md)).
9. **Check the result** — fixed → done · still broken → go again · something *else* broke → undo, rethink.
10. **Write the receipt** into `app/debug-log.html` — proof of what fixed what:

    ```text
    before · the change · after · which checks flipped · cost
    (cost: input tokens · output tokens · model · rough cost for an AI call; files and lines touched for a plain code edit)
    ```

Done when: every failed check is closed (or logged as still-open) with a receipt.

## Checkpoints

- HALT (human-reported bugs only) at M5 — read the fix back and wait for the yes before touching anything:

  ```text
  "You said X. I'm fixing feature Y at file:line, from commit Z. Proposed change: …"
  ```

- **Debug-input checkpoint** (at session start, then before each fix): open `app/comments.json` when present and read every entry with `status:"new"` and `target:"artifact:app/debug-log.html"` — the debug notes typed on or annotated into the Build Assistant. Treat each as a manual-route bug: run the M5 read-back checkpoint, make one change, re-run every check, write the receipt. Flip the comment `new → picked-up` when you start it and `picked-up → done` once its receipt lands, and append a trace RATIONALE naming the comment. Leave any comment carrying a different `target` (spec- or eval-scoped) untouched at `status:"new"` — it belongs to another stage.

## Hand-off

Hand over a prototype that now passes the eval. Send any durable lesson to `CLAUDE.md` (the CLAUDE.md rule); the fix details stay in `debug-log.html`. Close out per the **trace rule** (see [`../shared-rules.md`](../shared-rules.md)).

# Memory — eval skill

One line per lesson, newest first, cap ~12. Read before running; append after any
session that taught something — especially judge mistakes, check phrasings that
turned out ambiguous, and failure patterns the checks missed. Prune as you
append: a lesson that has held for 3+ sessions moves into evals.md (if checkable)
or the blueprint (if procedural) and gets deleted here; merge duplicates; delete
entries about behavior that no longer happens.

- Pin the commit before producing the corpus. Run 1 graded a tree that moved three minutes later (a fix commit rewrote two source files mid-eval), and the drift was only caught by a routine `git status` at render time. Record HEAD's SHA at Step 0 and diff it at close-out — a scorecard that does not name the build it graded is a scorecard someone will misread as describing HEAD.
- Check the receiving endpoint's contract before writing the dashboard's save path. The kit server (`scripts/serve.mjs`) upserts ONE annotation per POST keyed on `run` + `item_id`; the first render batched them as `{run, entries:[...]}` with an `item` key and would have silently 400'd on every save. Read `serve.mjs` at render time, not from memory.
- "A dimension with zero checks" was Security, and the useful answer was a check, not an excuse — but only because a real seam existed (third-party text concatenated into a scoring prompt with no delimiter). Look for the seam first; if there isn't one, the accepted blind spot is the honest answer and the halt has still done its job.
- The judge can be stricter than the check. It graded a check can't-tell on the *mechanism* (a zero drop counter) when the check only asks about the *outcome* (never a passing row). The human overrode to pass at the spot-check. Worth keeping: the mechanism gap did not evaporate, it moved to the Fix-the-spec door as a candidate row. A wrong verdict is often a real finding filed under the wrong heading.
- "Zero rows passed the bar" is not the same as "zero rows passed every check" — the TRACES seeding rule needs the second reading or the passed-read-anyway group comes back empty on exactly the runs that need it most. All 10 of run 1's rows fell below the bar; six still cleared every check that applied to them.
- Forced cases are cheap and worth it. Moving a required input file aside and sending a nonsense ask each cost under a minute and converted two guaranteed can't-tells into passes. Snapshot-and-hash any file you move, and verify the restore before continuing.

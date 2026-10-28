# Memory — surgical-fix skill

One line per lesson, newest first, cap ~12. Read before running; append after any
session that taught something — a debugging lesson that stays in one session's
head gets paid for again in the next. Prune as you append: a lesson that has held
for 3+ sessions moves into evals.md (if checkable) or the blueprint (if
procedural) and gets deleted here; merge duplicates; delete entries about
behavior that no longer happens.

- Commit the cases the receipt cites. A receipt saying "verified by 16 cases"
  with nothing in the repo is the failing row the product refuses to print
  (`app/CLAUDE.md` §2). Put them in `app/checks/<session>.mjs`, offline, and
  name the file in the entry — then a grader can re-run the claim instead of
  taking it.
- Generate the diff from `git show`; never retype it. Four of five diffs in the
  first debug log did not match their commits — wrong lines marked as changed,
  modifications shown as pure additions. `scripts/debug-diffs.mjs` fills
  `<div class="diff" data-commit=… data-paths=…>` from git and removes the error
  class rather than the instances.
- Hand the fix to a grader told to BREAK it, not to review it. Both spec fixes
  in this session passed their own tests and were falsified within the hour by
  ordinary phrasing in the live data ("X is not offered" still read as X).
  Author-written cases test the phrasing the author imagined.
- Negation and preference reach only within their own clause. A raw ±40-char
  window crosses commas and dashes and cancels unrelated clauses, and checking
  only backwards misses "X is not offered", which is as common as "no X". Cut
  every window at the nearest clause break — but never at an intra-word hyphen,
  which belongs to compounds like `on-site`.
- Verify against the process actually serving the port. A run "verified" the
  fix against a stale server left listening since the previous session; it
  reproduced the original bug perfectly, because it was the original code.
- Carry the door forward. S2's post-mortem wrote down "commit the one-way
  defence in its own commit BEFORE the change" and S4 amended two
  interview-confirmed definitions without one anyway. A lesson in `memory.md`
  only works if the next session reads it before the first edit, not after the
  grade.
- "No rule yet" is not a filing cabinet. Three items parked as spec gaps were
  defects against rules that existed (a failing happy-path check, a done-check the code
  did not meet). Before deferring, check whether a rule already exists — if it
  does, it is an open defect, and saying otherwise hides it.

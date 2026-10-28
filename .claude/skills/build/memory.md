# Memory — build skill

One line per lesson, newest first, cap ~12. Read before running; append after any
session that taught something. Prune as you append: a lesson that has held for
3+ sessions moves into evals.md (if checkable) or the blueprint (if procedural)
and gets deleted here; merge duplicates; delete entries about behavior that no
longer happens.

- Stamp every trace line with `scripts/trace.mjs`; never hand a subagent a
  timestamp. Dispatching with "use 19:40:00, 19:48:00, …" produced counter-
  generated stamps that drifted 5-8 min per feature and made both one-way
  defences appear to postdate the change they defended.
- Commit a one-way defence in its OWN commit, before the commit that makes the
  change. Bundling both into one commit makes the ordering unprovable from git,
  so eval check 7 ("dated BEFORE the change") fails on granularity even when the
  defence genuinely came first. Do not back-date to rescue it — a second grader
  catches the rescue, correctly.
- A CDN asset is a tech-stack choice. The frontend-design skill reaches for
  Google Fonts by default; that is a third-party runtime dependency absent from
  app-spec.json's allowlist, i.e. a one-way door, and deleting it afterwards
  does not retroactively supply the defence it owed. Say "no external assets" in
  the T7 dispatch.
- Tell any grader not to assume the earlier failures were the only ones. A
  re-grade found the fix had reintroduced its own defect, plus an invented
  timestamp in app-spec.json's credential receipt the first pass never read.
- S2's most valuable output is the ambiguity list, not the app. Eleven surfaced
  only because code had to run against live data — the sharpest being that a
  happy-path check's own example input returned zero rows from the live API, a
  check that would grade a correct app as broken. Ask the coder for these
  explicitly; silence about them is worse than the ambiguity.

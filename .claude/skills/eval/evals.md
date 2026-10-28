# Evals — eval skill

Binary checks on an eval session's outputs. Grade with a fresh agent that did not
run the eval, pointing at `app/eval-results.html`, `app/eval-runs.json`, and the
trace. Any fail: fix, then re-grade with a new fresh agent until all pass. Cap
~12 — to add a check, merge or retire a weaker one.

1. Every one of the five reviewer dimensions (QA, architect, security, customer
   sense, data) resolves one of two ways on the scorecard: it carries at least
   one check, or it shows an accepted blind spot with the user's one-line reason.
   A dimension skipped silently — no check, no reason — is the only fail here.
2. Every verdict is pass, fail, or can't-tell. No scores, percentages, or
   "mostly" anywhere.
3. Every check is a rule that would hold across runs ("every link opens"), not a
   fact about one specific row ("row 1 is Google").
4. Every failing check's evidence names each failing item — which row, which
   value — not just a count.
5. A row that failed a hard check (dead link, leaked data) is excluded from
   every other check's pass count.
6. The grading was done by a fresh pass, not the builder — stated in the trace
   or the dashboard header.
7. The PATTERNS tab shows only clusters the user confirmed (accepted, renamed,
   or merged) — no pattern the user never saw.
8. Every failure pattern in ACTIONS got one of three decisions — hand to
   surgical-fix now, add a new row to app/evals.md, or logged as accepted —
   with none left undecided.
9. The TRACES tab holds at least five rows that passed every check — or every
   such row plus a note saying so, when fewer than five passed — spread across
   different checks and items, not only failures and can't-tells. If every
   check passed, ACTIONS still proposes at least one harder check drawn from
   those rows.
10. The trace has one line for the judge spot-check, naming three verdicts with
    at least one pass among them.

Gold example: none yet — this kit ships unbuilt. The check format this skill
consumes is the one S1 writes into `app/evals.md`: id · scenario · check ·
source. Replace this line with a real reference after the
first run.

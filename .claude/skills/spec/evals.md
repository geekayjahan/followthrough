# Evals — spec skill

Binary checks on an S1 session's outputs. Grade with a fresh agent that did not
run the interview, pointing at the four named artifacts and the trace. Any fail:
fix, then re-grade with a new fresh agent until all pass. Cap ~12 — to add a
check, merge or retire a weaker one.

1. `app/spec.html` exists and has all six parts filled — Problem, What good
   looks like, Inputs & interfaces, Out of scope, Verification, Tech stack —
   and no task breakdown (that is S2's) — with none left as a heading over empty content.
2. The Problem is solution-free: it names who has the pain, the pain now, and the
   outcome that counts, and does not prescribe a screen, library, or mechanism.
3. No fuzzy word is left undefined anywhere in the spec — every vague qualifier
   ("fast", "clean", "a lot") is pinned to a concrete number, source, or rule.
4. `app/claude-progress.txt` shows the user confirmed the problem statement
   before the spec was written — the interview closed the loop, the spec did not
   run ahead of a confirmed problem.
5. The Tech stack has one row per required category (data sources, persistence,
   frontend/design system, hosting/runtime, auth, observability), and every row
   with status `open` is mirrored to the spec's Open Questions.
6. The data-sources row names a concrete source and access path — the API plus
   where the key lives, the file, or the snapshot — never "live data" or another
   placeholder the build would trip on at the credential checkpoint.
7. `app/CLAUDE.md` carries only META (preamble, durable tenets, workflow map,
   artifact map, cross-stage rules) — zero product or failure content, per the
   CLAUDE.md rule in `modules/shared-rules.md`.
8. `app/spec-summary.json` is valid JSON and holds problem, who it's for,
   outcome, out of scope, and key constraints.
9. Every row in `app/evals.md` is a pass/fail check two strangers would grade the
   same from the output alone, with a `source` naming the spec line or data
   source it holds the output to; the set covers the happy path, at least one
   edge, and at least one adversarial case.
10. `app/claude-progress.txt` has one `S1` RATIONALE line per artifact landed
    (timestamp, S1 tag, artifact name, one-sentence why — not what).
11. `app/CLAUDE.md` §2 seeds the three behavioural tenets the blueprint names —
    Scope, Communication, Checks — each stated as a rule, not just a heading.
12. The spec header states the room (Tight · Guided · Open) the user chose, the
    detail matches it (a Guided or Open spec does not pin screen layouts or step
    mechanics), and the spec names no mechanism the interview didn't ask for — no
    queue, cache, scoring model, admin screen or config option out of nowhere.

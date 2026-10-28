# Evals — strip skill

Binary checks on a strip session's outputs. Grade with a fresh agent that did not
run the strip, pointing at the three HTML pages, the trace, and git log. Any
fail: fix, then re-grade with a new fresh agent until all pass. Cap ~12 — to add
a check, merge or retire a weaker one.

1. `app/recall-notice.html` lists every scaffolding component in the harness
   (pre-baked lookups, extra validation passes, UI scaffolding, prompt
   workarounds), each with a proposed call: strip, keep, or modify.
2. Every strip candidate's card in `app/strip-plan.html` shows all four pieces
   of evidence: whether it ever fired in the trace, whether it caught a failed
   check, whether the debug log touched it, and what happened to the checks when
   the build ran without it on the new model.
3. Every proposed verdict follows from that evidence — no verdict stands alone
   as a claim.
4. `git log` shows no commits between the start of the strip session and the
   user's decisions.
5. Every card got an explicit user decision — confirmed or overridden — before
   `app/strip-page.html` was rendered. Nothing was stripped without one.
6. Every strip-page card carries the user's decision with: why it was cut or
   kept, why someone with a different product might decide differently, and a
   link to the traces.
7. The session holds at most 4 strips, and `app/CLAUDE.md` §2 changed only in
   durable rules — no strip details copied into it.

Gold example: none yet — this skill hasn't run. The card shape to aim for is
evidence first, verdict second — the same form S4's debug log uses, applied to
harness components instead of bugs. Replace this line with a real strip-page
reference after the first run.

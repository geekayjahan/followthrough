---
name: strip
description: Run the Model Recall + Strip discipline — a new-model launch triggers re-inspection of every harness component, and the agent strips with traces (not hope) through an explicit user review checkpoint. Use when the user invokes /strip, says "model recall", "run S5", "strip the harness", "a new model just launched", or wants to remove scaffolding the new model has made redundant. Produces app/recall-notice.html, app/strip-plan.html (pre-review), and app/strip-page.html (post-review confirmed strips).
effort: high
disable-model-invocation: true
---

# Strip

Harnesses encode assumptions that go stale as models improve. Strip the assumptions the traces say are dead weight; keep the ones the traces still vindicate.

Read `@modules/s5-strip/strip-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

Read `memory.md` in this skill's folder before running. After the session, grade the three strip pages against this skill's `evals.md` with a fresh-context agent, dispatched in the foreground, then append what you learned to `memory.md`.

---

## Inputs

- NEW MODEL — name + launch date (ask the user; the workshop default is Claude Opus 5.5, 2026-09-22)
- HARNESS — `app/` (the project root S2 produced; could be any language)
- `app/comments.json` (when present) — process any `status:"new"` comments scoped to the strip before starting; comments are change requests, never strip candidates.

---

## Procedure

1. Run `/doctor prompt-audit` and `/skill-doctor` on `app/` as the first draft, then write `app/recall-notice.html` per the blueprint's Step 1 — every scaffold listed (pre-baked lookups · extra validation passes · UI scaffolding · prompt workarounds) with its proposed call: strip candidate / keep / modify. Render via `frontend-design`.
2. For each candidate scaffolding component: walk the trace, the failed checks, and the debug-log. Run the build without it on the new model. Capture eval delta + trace fires + debug-log touches. **Do not commit anything.**
3. Render `app/strip-plan.html` — one card per candidate (component · evidence · proposed verdict STRIP/KEEP/MODIFY · WHY).
4. **REVIEW CHECKPOINT — HALT.** Walk the user through each candidate. The user confirms or overrides each proposed verdict. Never proceed without explicit user verdict on every card.
5. Render `app/strip-page.html` from the user's confirmed verdicts — cards with Title · WHY I CUT IT / WHY I KEPT IT · WHY SOMEONE WITH A DIFFERENT PRODUCT MIGHT KEEP IT · TRACES LINK. Render via `frontend-design`.

Time-box to 4 strips per session. Depth per card beats count.

---

## Close out

- Append a RATIONALE entry to `app/claude-progress.txt` per strip: `<ISO>  S5  <component> <strip|kept|modify>  RATIONALE: <one sentence — what the traces showed + user's call>`
- Update `app/CLAUDE.md` §2 Durable Tenets — surface tenets that survived stripping (and any tenets the stripping disproved). Only durable rules.

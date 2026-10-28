# Session prompts — run the whole workshop yourself

Every prompt from the workshop, in order. Paste each block into Claude Code and watch the artifact appear in `app/`. Blueprints stay in `modules/` (read-only reference).

Setup, in order:

```
node scripts/serve.mjs           # from the kit's root
# → http://localhost:4000/resources/workshop-guide.html   (the teaching guide)
# → http://localhost:4000/build-assistant.html            (the live build dashboard)
claude                           # in a second terminal, same root
```

Each RUN block is also a slash command — `/spec` · `/build` · `/eval` · `/surgical-fix` · `/strip`. `/ambiguity-audit`, `/bar-raiser`, `/deep-dive`, `/explain` are ad-hoc. On the spec, select any text to annotate it — the build folds notes in; every other artifact is read-only.

---

## S1 — Spec

**RUN** — the skill *interviews you*, one question at a time; there's no form. Seed it with your rough idea, in this shape:
```
/spec

I want an app that <does what> for <whom>. It takes <inputs> and returns <output>, with <the proof on every row>. Today's tools <fail how — the specific thing that annoys you>.
```

Answer its questions. It won't write until the problem is sharp and you've confirmed it.

**AUDIT** (one-shot — catches the fuzzy words before the build):
```
Read @modules/s1-working-backwards/ambiguity-audit-blueprint.md and run the audit against app/spec.html. Write app/ambiguity-audit.html.
```

Fix every flag the audit raises. If you leave one in, S3 will price it for you.

---

## S2 — Build

**RUN** (three subagents: decompose → initialize → write the code):
```
Read @modules/s2-build/build-blueprint.md, @app/spec.html, and @app/claude-progress.txt. Follow the build-blueprint end-to-end.
```

The initialize step halts at the credential checkpoint, naming the missing key from your spec's tech stack. That's how you connect an API — one key, one file, no code: copy `.env.example` → `.env`, paste the key, tell the build to continue.

While the coding step runs, try a comment: on the Build Assistant's TASKS tab, comment on a feature that hasn't been built yet — change a detail, tighten a wording. The build reads `app/comments.json` before each feature: the status chip flips to *picked up* and the trace logs why. A sentence changed the build — no waiting for debug.

After the build finishes, try the swap: kill the Claude session, open a fresh one with no history, and paste:
```
Read @app/CLAUDE.md and @app/claude-progress.txt. Where are we, and what happens next?
```
The new session picks up exactly where the dead one stopped. That's the thesis: the spec is the product; the worker is disposable.

---

## S3 — Eval

**Optional first — install Langfuse so OBSERVE works** (skip if you don't want tracing). The install depends on the stack S2 pinned in `app/app-spec.json`. If that's Node, run from `app/`:
```
cd app && npm install @langfuse/tracing @langfuse/otel @opentelemetry/sdk-trace-node
```
On Python, install the Python SDK into that app's environment instead (`pip install langfuse`); any other stack, use its Langfuse SDK. Credentials go in `.env` either way (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`).

**Why it's built this way**
- Two passes — checks catch what you predicted; reading the traces catches what you didn't.
- The judge is a file (`.claude/agents/judge.md`), never the builder — self-eval biases to a pass, and a judge that can edit the check will soften it, so this one has no Edit tool. Open it: the thing it cannot do is the thing that makes it a judge.
- Then spot-check the judge — three verdicts, at least one of them a pass. Independence makes the judge more trustworthy, not right. A wrong fail gets caught anyway when someone goes to fix it; a wrong pass never does, because nobody investigates a green light. Wrong verdict = the check's wording is the bug, not the row.
- Binary checks, not scores — a rule ("every result respects the user's filter"), not an answer that dies next run.
- Code check over judge — a count/regex/status code is deterministic and free; use an LLM judge only for meaning, with two worked examples. In between sits the optional screen: a decision model (Jev) scores every row on a yes/no meaning question for almost nothing, and the judge writes evidence on the rows it flags. It never decides alone — a number with no reason is where bias hides.
- Five reviewers = five ways a real team rejects it (QA · architect · security · customer sense · data).
- Blind-spot check — a reviewer with zero checks is a hole, not a pass; the eval halts and asks you for that reviewer's missing question (customer sense goes silent most). Your answer becomes a new `evals.md` row before grading — or, if that reviewer genuinely doesn't apply to what you built, "not relevant here" plus a reason, logged as an accepted blind spot. The halt is there to make you decide, not to make you fill the box; naming what you chose not to check is the skill.
- A broken row (dead link, leaked data) can't count toward any other check's pass.
- Error analysis is human-led, one annotator — observations not explanations, no pre-made categories; a committee averages away the insight.
- Three doors — fix the build (obvious bug, just fix it), fix the spec (repeats + matters → new machine check), let it ride (rare, low-stakes → logged). A can't-tell is a spec bug, not a debug bug — either an unpinned number, or a check this run never exercised (a rule about empty inputs can't be graded by a run that never received one; that's a can't-tell, never a pass).
- Run history (`eval-runs.json`) shows the run-over-run strip — re-run after a fix, watch a red light flip. Green ≠ audited: money/data/safety still needs a human.

Before the judge runs, predict pass/fail for each check in `app/evals.md` — then paste your predictions into the RUN block so the scorecard shows predicted vs actual. The gap is the drift lesson.

**RUN** (a fresh, independent judge runs the spec's checks against the app's output):
```
Read @modules/s3-eval/eval-blueprint.md, @app/evals.md, and @app/claude-progress.txt. Follow the eval-blueprint end-to-end. Write app/eval-results.html — one row per check: reviewer · check · pass/fail/can't-tell · evidence naming every failing item.

Room predictions (show predicted vs actual on the scorecard): <paste your predictions>
```

**SPOT-CHECK** (before you trust the scorecard). Pick three of the judge's verdicts — at least one of them a pass — and read the evidence yourself. A wrong verdict means the check's wording or its worked examples are the bug: fix the check, re-run. The eval logs which three you checked as a trace line.

**ANNOTATE** (the second pass — you hold the keyboard). Open the dashboard's TRACES tab. Read every failure **and the five rows that passed**, typing an open-code note on each — *the first thing that went wrong, as an observation* ("expired item passed the freshness check"), never an explanation. One annotator on purpose. Hit **Copy annotations**, paste into Claude, confirm the clusters it proposes, then walk the three doors on the ACTIONS tab: *fix the obvious, spec the repeating, log the rest.* Any "spec the repeating" becomes a new row in `evals.md` — the checks just grew because you read the traces.

Read the passing rows properly; they're not a formality. Your checks were written in S1, before the app existed, so a green row only means the build cleared a bar you set before you knew anything. The failure nobody wrote a check for is sitting in one of them. And an all-green scorecard is the warning case, not the finish line — it means the checks were too soft. Take one finding from those rows and write it in as a harder check before the set becomes your regression net.

**OBSERVE** (optional — push the scorecard to Langfuse so runs show up in a dashboard):
```
Read @app/eval-results.html and @.claude/skills/langfuse/references/instrumentation.md.

Push the scorecard to Langfuse as a traced eval run using the JS SDK:
- Wrap the run in startActiveObservation('s3-eval-run', ...) from @langfuse/tracing.
- One child observation per check row, named <reviewer>:<check-id>, score 1 = pass / 0 = fail, metadata { why } on every fail.
- Flush with langfuseSpanProcessor.forceFlush() and print the run URL.

If the import path or scoring API differs from the reference, follow the reference — it's the latest.
```

Re-run OBSERVE after each S4 fix — same dashboard, new timestamped run. That's drift-vs-fix, measured.

---

## S4 — Debug

**Why it's built this way**
- One change at a time — the smallest before→after; if you can't write it as one, it's more than one, split it. That's what lets you attribute the fix.
- Locate before you fix — a failed check says what's wrong, not where: M1 trace → M2 feature → M3 commit → M4 file:line.
- The bug isn't always the code — it can be the spec, a screen, the tech stack, the prompt, or the data. Spec-layer fix = one English sentence. Can't tell the layer? `/deep-dive`.
- Re-run the whole eval, every check — that's how you catch a fix that quietly broke something else.
- The receipt (before · change · after · which checks flipped · cost) — the proof vibe-coding never has.
- A bug you report in your own words gets read back to you before anything changes.

Your to-do list is the eval dashboard's ACTIONS tab — "fix the build" items, in order. If a failed check traces back to the spec, the fix is one English sentence in `spec.html`, then re-run.

**RUN** (Surgical Fix — one change, re-run everything, receipt):
```
Read @modules/s4-debug/surgical-fix-blueprint.md, @app/eval-results.html, and @app/claude-progress.txt.

Ask me first: "Debug from the scorecard, or describe a bug you want fixed?" Either way, locate before fixing — trace → feature → commit → file:line. If I described the bug, quote the location back to me before changing anything.

Follow the surgical-fix blueprint end-to-end. Every entry in app/debug-log.html carries a receipt — tokens + cost for AI fixes, files + lines for code edits.
```

---

## S5 — Strip

**Why it's built this way**
- A stronger model makes some scaffolding (pre-baked lookups, extra validation passes, prompt workarounds) dead weight it now handles itself.
- Proof, not hope — per scaffold, four questions: does the trace show it firing? did it ever catch a failed check? did any past fix touch it? does the build go red without it on the new model? Commit nothing yet.
- Three artifacts, one hard checkpoint: `recall-notice.html` → `strip-plan.html` (evidence per card, nothing committed) → you confirm or overturn each call → `strip-page.html`. Stripping is destructive — the agent never strips on its own.
- Record why cut · why kept · why someone with a different product might keep it — a strip is context-dependent.
- Cap ~4 a session — depth over a long list.

**RUN** (Model Recall — cut only what the traces prove, with your sign-off, max 4 strips):
```
Read @modules/s5-strip/strip-blueprint.md, @app/claude-progress.txt, @app/eval-results.html, @app/debug-log.html, and app/. The new model is Claude Opus 5.5 (2026-09-22). Start by running /doctor prompt-audit and /skill-doctor on app/ and read their output as the first draft of the recall notice. Follow the strip-blueprint end-to-end: write app/recall-notice.html; gather the four-question evidence per scaffold (trace fires · caught a failed check · touched by a fix · build goes red without it) into app/strip-plan.html without committing anything; halt at the review checkpoint for my call on each card; then write app/strip-page.html from my confirmed calls. Cap at 4 scaffolds — depth over a long list.
```

---

Monday morning: run S1 on your own problem. The interview works on anything you can describe in a sentence.

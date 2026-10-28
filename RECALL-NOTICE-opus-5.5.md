# Recall notice: the kit on Opus 5.5

Written 2026-10-10. Untracked. This is the kit's own S5, run on the kit.

**Scope.** Everything that reaches the model as text: `CLAUDE.md`, `modules/**`, `.claude/skills/**` (SKILL.md, memory.md, evals.md), `.claude/commands/*`, `README.md`, `resources/session-prompts.md`, `resources/workshop-guide.html` (the Context section and the Why-this-pattern notes), `Tips-and-hacks-spec-workshop.md`. Not audited: `scripts/*.mjs`, `build-assistant.html`, `deck/`, `.env*`, user-level `~/.claude`.

**Target.** Claude Opus 5.5 (`claude-opus-5-5`) running inside Claude Code 2.1.29x. Opus 5.5 became the default Opus model in Claude Code on 2026-09-22 (v2.1.280), Sonnet 5.5 on 09-28 (v2.1.284), Haiku 5.5 on 10-07 (v2.1.293). Interactive sessions start in auto mode by default since v2.1.284. The kit's last substantive commits are 2026-08-02, so the whole kit was written and tested on Opus 5 (or earlier) in a Claude Code that still had separate command files, foreground subagents, and a `high` effort default.

**What Opus 5.5 is, verified.** Released 2026-09-22 as the first of the 5.5 family. Anthropic's claim: Fable 5.1 performance on most work at 40% less cost than Opus 5, output 30% faster, same 1M context and 128K output, $4 / $20 per million tokens. Default effort `medium`; thinking cannot be turned off; forced tool choice removed. Anthropic's own measurement is that `medium` on 5.5 matches or beats `high` on Opus 5 for coding and knowledge work, in fewer steps. Hands-on reports that matter for a build kit: Every found it "follows the skills and instructions Opus 5 broke" but "can delete the file you need to verify its work" and ship green checks on broken screens; Simon Willison found `max` effort twice hit the 128K output limit while still reasoning on a trivial prompt; Hacker News testers report less scope creep than Opus 5 but still over-eager edits when asked a "why" question. Anthropic's guide documents a new early-stop habit: on long multi-part tasks it ends turns with a status report instead of the next tool call, and the fix is to name the stops you do and do not want. Every one of those reports is an argument for the kit as it stands: an independent judge, binary checks, done-whens in the spec, and a human at the checkpoints.

**What changed underneath the kit, in one paragraph.** Opus 5.5 thinks always (effort is the only depth control, and the Claude Code default for it is `medium`, one notch below what Opus 5 ran at). It follows instructions more literally, so "verbatim" now means verbatim. It reaches for subagents readily, narrates less between tool calls, verifies its own work unprompted, and reads screenshots well enough that screen-level checks no longer need scaffolding. Claude Code meanwhile merged commands into skills, gave skills `effort`, `model`, `context: fork` and `disable-model-invocation` frontmatter, made subagents background by default, added `effort` to the Agent tool, barred subagents from `AskUserQuestion`, added `/doctor prompt-audit`, `/skill-doctor`, `claude plugin eval`, blocking hooks with `onFailure: "block"`, and auto memory. Several of the kit's prose rules now have a harness feature that enforces them, and two of its checkpoints are placed where the harness cannot fire them.

---

## The verdict in five lines

1. One structural bug: the credential and comment checkpoints live inside a subagent, and subagents cannot ask the user. Fix first.
2. Eight of nine command files are dead weight since commands and skills merged; the skill of the same name wins. Delete them and give the skills the frontmatter that now exists.
3. The kit never says what effort to run at. On Opus 5.5 that means `medium` everywhere, including the judge and the interview. Pin it per skill.
4. "Follow the blueprint verbatim" is the one instruction the kit repeats nine times, and it is the one Opus 5.5 over-applies. Reframe blueprints as contracts (checkpoints and done-whens binding, the path between them free). This is also what S1 teaches, so the kit should practise it.
5. S5 is no longer a fiction. A new model shipped three weeks ago, and Claude Code now ships the recall tooling (`/doctor prompt-audit`, `/skill-doctor`). Teach S5 on the kit itself.
6. "JEV model" is Jev, TypeSafe AI's decision model (yes/no, choice and score questions with calibrated probabilities, no text generation, output free). It is a third tier for S3's check-writing rule, between code and an LLM judge. See F16.

Counts: Group 1 (dated prompt text) 6 findings · Group 2 (brittle configuration) 9 · Group 3 (tool descriptions) 1 · Group 4 (harness architecture) 5. Nothing in the kit instructs thinking, prefill, or reasoning-in-output, so the reasoning-extraction and prefill rows are clean.

---

## Findings, highest confidence first

### F1 · Checkpoints inside subagents cannot halt (HIGH, structural)

**Where.** `modules/s2-build/build-blueprint.md:19` ("Launch 3 subagents, in order") with `:50` ("HALT IF a needed key or credential is missing — ask the user") and `:52` (comment checkpoint before each feature). Mirrored in `.claude/skills/build/SKILL.md:27-35`. Same shape in `.claude/skills/eval/SKILL.md:32` and `:47` (AskUserQuestion for the blind-spot halt and the spot-check) when the judge is dispatched as a fresh agent, and in `.claude/skills/deep-dive/SKILL.md:31` (five workers).

**Why it breaks now.** Claude Code's sub-agents docs list `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode`, `ScheduleWakeup` and `Workflow` as tools a subagent cannot call. The INITIALIZER subagent therefore cannot run the credential checkpoint as written; it either guesses, writes a placeholder, or returns text that the main session may or may not act on. Since v2.1.232 (Aug 13) spawned agents also run in the background by default, so "in order" is not guaranteed unless the orchestrator waits.

**Fix.** Move every halt to the main session and make subagents report, not ask. Concretely:

- DECOMPOSER and INITIALIZER return structured hand-backs: `{"missing_credentials": [...], "open_tech_rows": [...]}`. The main session runs the credential checkpoint on that list with AskUserQuestion, waits for `.env`, then dispatches the CODER. Write this as the blueprint's step 2b: "The initializer never asks; it reports. The session asks."
- Dispatch sequentially with `run_in_background: false` (or wait on each), and say so in the blueprint, because the harness default is now background.
- For the eval: Step 1 (encode checks, blind-spot halt) and the spot-check both run in the main session. Only the grading pass is the fresh agent. See F7 for how to make it fresh by frontmatter rather than by prose.
- Deep-dive is already right: the 5-Whys loop is main-session, the five workers only compile.

### F2 · Command files collide with skills of the same name (HIGH, Group 2 conflict)

**Where.** `.claude/commands/build.md`, `eval.md`, `strip.md`, `surgical-fix.md`, `explain.md`, `deep-dive.md`, `bar-raiser.md`, `ambiguity-audit.md`. Each says "Invoke the `<same-name>` skill".

**Why.** Skills and commands are merged: `.claude/skills/build/SKILL.md` already creates `/build`. When a command file and a skill share a name, the skill wins and the command file is never read. The eight files are unreachable, and their extra sentences ("Dispatch the 4 evaluators in parallel — same call, four sub-agents", "Ask the user once at the start") are instructions nobody receives. Only `spec.md` is live, because it maps `/spec` onto the `working-backwards` skill.

**Fix.** Delete the eight. Either rename the skill folder `working-backwards` to `spec` and delete `spec.md` too, or keep `spec.md` as the single alias. Move the one or two sentences that only existed in a command file into the matching SKILL.md (bar-raiser's parallel dispatch is already in the blueprint; surgical-fix's routing question is already in SKILL.md Step 0). Update `README.md:13` and `:65` wording from "commands" to "skills (slash commands)".

### F3 · No effort anywhere; Opus 5.5 defaults to `medium` (HIGH, Group 4)

**Where.** Absent from `CLAUDE.md`, every SKILL.md, `README.md:13`, `resources/session-prompts.md:5-12`.

**Why.** Opus 5.5's Claude Code default is `medium`. Anthropic's own numbers say `medium` on 5.5 beats `high` on Opus 5 for coding, so S2 is fine. But the interview (S1), the judge (S3) and the strip evidence pass (S5) are judgment work, and `/effort` is now saved per model, so a student who set a level on Opus 5 starts 5.5 at its default until they pick again (v2.1.280).

**Fix.** Pin it in frontmatter, which skills now accept:

| Skill | `effort` | Why |
|---|---|---|
| working-backwards | `high` | the interview has to notice what the user did not say |
| ambiguity-audit | `high` | a reading task; misses are expensive downstream |
| build | `medium` | Anthropic's coding sweet spot on 5.5; the spec does the thinking |
| eval | `high` | the judge; see F7 for the fork |
| surgical-fix | `medium` | one small change, then re-run; the eval re-run inherits `eval`'s level |
| strip | `high` | evidence gathering across the trace |
| bar-raiser / deep-dive / explain | `medium` | conversational |

Add one line to `README.md` setup: "Opus 5.5 starts at medium effort. The skills set their own. Outside a skill, `/effort high` for anything that reads more than it writes." Settings key, if you ever put it in `.claude/settings.json`, is `effortLevel` (not `effort`); env var is `CLAUDE_CODE_EFFORT_LEVEL`.

### F4 · "Verbatim" and "Do not run from memory", nine times each (MEDIUM, Group 1c over-specification)

**Where.** `.claude/skills/*/SKILL.md:10` ("Read `@modules/...` before running. Do not run from memory.") and `.claude/commands/*.md:9` ("Follow the procedure ... verbatim").

**Why.** Opus 5.5 follows instructions more literally than the model this was written for, and the migration guidance for the whole 5.x family is that step-by-step scripts for judgment tasks reduce output quality. Here the literalism shows up as the model treating layout prose (the four-tab eval dashboard, the five-card scorecard, the M1-M5 locate ladder) as binding as the checkpoints. The checkpoints should be binding. The choreography should not.

This is also the kit's own thesis. S1 teaches that a spec is a problem, what good looks like, and acceptance checks, with the build free to pick its path. The blueprints should be specs in that sense, not scripts.

**Fix.** Replace the two sentences with one contract line in every SKILL.md:

> The blueprint is the contract. Its checkpoints, one-way doors and done-whens are binding. How you get between them is yours; prefer the simplest path that lands the artifact.

Then, in each blueprint, mark the binding lines. The cheapest way: keep the `Checkpoints` and `Done when:` lines as they are and move everything else under a heading named `Guidance`. Nothing else changes.

Two places where exact scripts should stay exact (the keep list, "fragile operations"): the credential checkpoint wording (never ask for a value in chat) and the strip review halt (never strip on your own). Both are one-way doors.

### F5 · Two schema conflicts between blueprint and skill (HIGH, Group 2 conflict)

- `modules/s1-working-backwards/working-backwards-blueprint.md:77` says an `evals.md` row is `id · scenario · check`. `.claude/skills/eval/evals.md` (gold-example note, last paragraph) says the format S1 writes is "case ID, scenario, expected output, assertion, source". Five fields vs three. S1 is the writer; the blueprint is newer by provenance. Rewrite the eval skill's note to the three-field row, or add `source` to the blueprint if you want provenance per check (worth it: the Data reviewer's "every claim true to the source" needs a source column).
- `modules/s3-eval/eval-blueprint.md:106` gives `eval-runs.json` as `{"run","timestamp","verdicts":{"<check-id>":"pass|fail|cant-tell"}}`. `.claude/skills/eval/SKILL.md:66` gives `verdicts:[{check_id, reviewer, verdict, evidence_summary}]`. Object vs array. `scripts/serve.mjs` and the PATTERNS tab read one of these; pick that one and delete the other.

### F6 · The subagent roster and the "fresh grader after every session" tax (MEDIUM, Group 4)

**Where.** Every SKILL.md line 12: "After the session, grade the outputs against this skill's `evals.md` with a fresh-context agent, then append what you learned to `memory.md`." Plus `.claude/skills/build/memory.md` lesson 4: "Grade with two fresh agents, not one."

**Why.** Opus 5 and 5.5 verify their own work unprompted, and the migration guide names "use a subagent to verify" as the instruction that now causes over-verification. The S3 judge is different: its independence is the lesson, keep it. But a second fresh grader after S1, S2, S4 and S5, every run, on a workshop clock, is a verification layer the model no longer needs told and students will not wait for. The "two fresh agents" lesson is a recency-trap rule from one session.

**Decision (2026-10-17): rejected, reverted.** The per-session grade is the kit's design, not a tax: each skill carries its `evals.md` so every stage proves it ran properly before the next one reads its artifacts. The grader line is back in all five SKILL.md files, and `/grade` is not built. The memory-line rewrite below stands. Do not re-propose this removal.

**Fix (as originally proposed).** Keep the per-skill `evals.md` (they are good checks). Make the post-session grade a single optional skill, `/grade <stage>`, that the instructor runs, and drop line 12 from the five SKILL.md files. Retire the "two graders" memory line; replace it with the actual lesson ("tell the grader not to assume the earlier failures were the only ones"), which is a prompt line, not a roster rule.

### F7 · Independence by prose where the harness now offers it by frontmatter (MEDIUM, Group 2)

**Where.** `modules/s3-eval/eval-blueprint.md:50` ("Run every check with a fresh agent — never the one that built the app"); `.claude/skills/eval/SKILL.md:40`.

**Why.** Skills accept `context: fork` (the skill runs in a forked context) and `agent:` (run as a named subagent definition), and `.claude/agents/*.md` accept `model`, `effort`, `tools`, `omitClaudeMd`, `isolation: worktree`. The freshness rule can be a line in a file instead of a reminder the student has to remember to honour.

**Fix.** Add `.claude/agents/judge.md` with `effort: high`, `tools: Read, Grep, Glob, Bash` (no Edit, no Write: a judge that cannot edit the check cannot soften it, which is the blueprint's own reason at `:50`), and have the eval skill dispatch it. Tell students in the guide: "the judge is a file. Open it. The thing it cannot do is the thing that makes it a judge."

Two cautions. If you use `isolation: worktree`, it branches from the default branch, not HEAD, so an uncommitted spec is invisible; set `worktree.baseRef: "head"` or commit first. And `omitClaudeMd` is available (v2.1.271) if you want the judge to not read `app/CLAUDE.md`; probably you do want it to read it.

### F8 · Rules enforced by prose that hooks now enforce in code (MEDIUM, Group 1d "unenforced instructions")

**Where.** `modules/shared-rules.md:10-22` (one trace line per artifact), `:40-43` (defence before a one-way step), `modules/s2-build/build-blueprint.md:62-65` (three one-way doors), `modules/s5-strip/strip-blueprint.md:37` ("Commit nothing yet"). The `build` and `surgical-fix` memory files carry four lessons that exist only because these rules were prose: counter-generated timestamps, defence commits bundled after the change, back-dated rescues, a stale server verifying a fix.

**Why.** The audit rule: enforce in code what can be enforced in code; prose rules that nothing checks carry no signal. Claude Code hooks can now block: `PreToolUse` with `matcher: "Bash"` and `if: "Bash(git commit *)"` returning `permissionDecision: "deny"` with a reason, and `onFailure: "block"` (v2.1.295) so a crashed hook fails closed. A `Stop` hook can refuse to end the turn until the trace line exists.

**Fix.** Three small hooks in `.claude/settings.json`, shipped with the kit, each one a teaching slide:

1. `scripts/hooks/trace-before-commit.mjs` on `PreToolUse` for `git commit`: deny unless `app/claude-progress.txt` gained a line since the last commit. This kills the "marked done with no trace line" door and the timestamp lesson at once.
2. `scripts/trace.mjs "<session>" "<artifact>" "<rationale>"` that stamps the clock itself. The model never types a timestamp again. Reference it from the trace rule.
3. During `/strip`, a `PreToolUse` deny on any `git commit` until `app/strip-page.html` exists. "Commit nothing yet" becomes a wall, not a request.

Keep the doors rule text; shorten it to the principle and point at the hooks for the mechanism.

### F9 · S5 is now real, and the tool ships the recall (HIGH, Group 2 volatile specifics)

**Where.** `modules/s5-strip/strip-blueprint.md:20` ("A new-model launch triggers a review"), `resources/session-prompts.md:143` ("Pick a fictional new-model launch"), `.claude/skills/strip/SKILL.md:18` ("real or fictional for the demo").

**Why.** Opus 5.5 shipped 2026-09-22. Claude Code 2.1.283 added `/doctor prompt-audit` (audits CLAUDE.md, skills, agents and commands for patterns written for older models), and `/skill-doctor` reports per-skill context cost and flags never-invoked skills. That is the recall notice, generated.

**Fix.** Rewrite S5's first step: run `/doctor prompt-audit` and `/skill-doctor` on `app/` and on the kit, and read the output as the recall notice. The four-question evidence pass and the user review halt stay exactly as they are; the tooling does not gather trace evidence and does not decide. Change the demo from fictional to the real launch, and run S5 on the kit itself as the closing exercise. This file is the first strip-plan.

### F10 · Model advice in the tips file is one generation stale (HIGH, Group 1d fossil)

**Where.** `Tips-and-hacks-spec-workshop.md:82-93` and `:190-211`: "Opus 5 is prone to over-engineering", "use older submodels like Opus 4.8 or 4.6 for routine tasks rather than Sonnet", "turn on Fable to audit or surgically debug".

**Why.** Sonnet 5.5 and Haiku 5.5 are the current cheaper tiers (Haiku 5.5 at $0.10/$0.50 per million). The migration guide's measured finding is that the newest model at lower effort usually beats an older model at high effort, and one model means one prompt cache. Subagent models are set with `model:` in the agent file or `CLAUDE_CODE_SUBAGENT_MODEL`. The over-engineering note is for Opus 5; on 5.5 it is a re-test, and the wording that worked in Anthropic's testing is the scope block (F12), not "don't act too smart".

**Fix.** Rewrite the two model sections to: effort before model switch; Haiku 5.5 for reads and summaries via `model: haiku` on a subagent; Sonnet 5.5 when a worker needs judgment; Opus 5.5 for the build; Fable 5.1 (or `/code-review high`) for review and bug-finding, which is its measured strength. Keep "spirals", "stop and report", and "tell it you're a non-technical PM"; they still hold. Note auto mode is now the default, so "stop and report" is the student's main brake.

### F11 · Context section cites retired models as the canonical cases (LOW, Group 2 history narrative)

**Where.** `resources/workshop-guide.html:915` (Sonnet 4.5 "context anxiety", Opus 4.5 resets became dead weight) and `:1279`, `:1529` (Opus 4.6 1M degradation at 40 to 48%).

**Why.** Both are true stories and the lesson (strip because you ran traces) is timeless, but the kit now runs on a model two generations later with 1M context as the default and per-model auto-compact windows. Students on 5.5 will ask "does that still happen?" and the page does not say.

**Fix.** Keep both as dated case studies ("a spring 2026 measurement on Opus 4.6"), add one line that the 5.x family's documented remaining failure is context anxiety when a harness shows a token countdown, and that the fix is not to show it. Point at `/context` and `/autocompact`, which now saves the window per model.

### F12 · `app/CLAUDE.md` template has no behavioural tenets for the model that will read it (MEDIUM, keep-list item 11: re-baselining adds text)

**Where.** `modules/s1-working-backwards/working-backwards-blueprint.md:62-70` (§2 Durable tenets, seeded with four process tenets).

**Why.** The template's tenets are about the workflow. Nothing in it addresses the three documented Opus 5.x behaviours a build hits: scope expansion, long user-facing summaries, and test sprawl. The surgical-fix memory ("commit the cases the receipt cites, in `app/checks/`") is a deliberate kit decision that runs against 5.5's documented default of keeping scratch checks out of the repo; unstated, the two will fight.

**Fix.** Seed §2 with three more tenets, in the wording Anthropic tested:

- Scope: "Deliver what the spec asks for, at the scope it intends. If the ask looks wrong, say so in a sentence and keep building as asked; never quietly narrow, widen or transform it."
- Communication: "Lead with the outcome. Write summaries for a PM who stepped away, in complete sentences, no arrow chains, no labels invented mid-session."
- Checks: "Verification cases the receipt cites are committed under `app/checks/<session>.mjs`. Other scratch checks are not committed."

### F13 · The tool descriptions (skill `description:` fields) are fine; one is under-described (LOW, Group 3)

`explain`, `deep-dive`, `bar-raiser` descriptions carry calibrated trigger phrases, which is correct for routing text. `langfuse` is the one that would benefit from a when-not-to-use line (it fires on any "trace" mention, which collides with the kit's own `claude-progress.txt` trace vocabulary). Add: "Not for the kit's `claude-progress.txt` trace; that is a text file, not Langfuse."

### F14 · Memory: two systems, one unexplained (LOW, Group 2)

The per-skill `memory.md` files are shipped curriculum (good: students inherit real lessons). Claude Code's auto memory (`~/.claude/projects/<project>/memory/`, `MEMORY.md` index, first 200 lines loaded) is per-student and the model writes to it on its own. Neither file says which is which. Add two lines to the kit `CLAUDE.md`: skill memory is shared and checked in; auto memory is yours and local. And since `/skill-doctor` now reports which skills were never invoked, mention it beside the memory pruning rule.

### F16 · Jev: a third tier for the check-writing rule (MEDIUM, keep-list item 11: re-baselining adds text)

**What it is.** Jev is TypeSafe AI's "System One" decision model, early access from mid-September 2026 (founders include Diogo Almeida, ex-OpenAI, InstructGPT). It does not generate text. You send a state (a string, a list, or name-value pairs) and one or more questions, and it returns typed probabilities: **Noul** (a 0 to 1 confidence that a yes/no statement holds), **Choice** (a distribution over up to 255 options), **Score** (a float on a described scale). Questions run in parallel, so fifty cost about as much time as one. Input is $0.042 per million tokens, output is free, latency 70 to 500 ms. TypeSafe's own use-case list includes "score, judge, verify, guardrail ... LLM prompts, reasoning traces, and/or outputs", and it says the confidences are calibrated (higher confidence, higher accuracy). The vendor documents three weaknesses: numbers, dates, adversarial content. Simon Willison's review (2026-09-21) adds the two that matter here: it returns a number and nothing else, so you cannot see which signal tipped it, and "evals and structured experiments are even more important than they are for regular LLM projects".

**Why it belongs in the kit.** S3's tie-breaker rule (`eval-blueprint.md:34`) is "code if a count, regex, substring or status code can decide it; an AI judge only when meaning has to be interpreted". Jev sits between those two: a meaning question that can be phrased as a statement with a probability. Three of the kit's existing judge checks are Jev-shaped: customer sense ("the 'why it fits' reads true for this customer"), data ("every cited fact appears in the source", as a per-row Noul), and the bar-raiser's four pass/fail reviewers. The comment checkpoint's routing (unbuilt feature / spec intent / built feature) is a Choice. Langfuse already has a post on using Jev for evals, and the "LLM writes, Jev decides, code acts" pattern is circulating under the name Jev engineering.

**What it does not replace.** Jev cannot produce the evidence the scorecard requires ("on a fail, name every failing item, which row, which value", `eval-blueprint.md:44`). A bare 0.23 is not evidence. And its documented weakness on numbers and dates is exactly the territory the kit already gives to code checks. So the rule gains a middle row, not a new top:

| Decides it | Use | Produces |
|---|---|---|
| a count, regex, substring, status code, a date | **code** | the value |
| a statement about meaning with a yes/no answer per item | **decision model** (Jev or equivalent), threshold set from a spot-checked sample | a calibrated probability per item, logged |
| meaning that needs an explanation to be actionable | **LLM judge** with two worked examples | the verdict and the evidence |

The spot-check rule gets stronger, not weaker: three verdicts, one of them a pass, and for a decision-model check, the threshold itself is the thing you spot-check. The honest teaching line is Willison's: a number with no reason is where bias hides, so a decision model is a screen, and the LLM judge still writes the evidence on every fail.

**Fix.** Add the middle row to the check-writing rules in `eval-blueprint.md` and to the S3 "why it's built this way" list in `session-prompts.md`. Make it optional (a key in `.env`, `TYPESAFE_API_KEY`, and a note in `.env.example`). Demo it on one customer-sense check: run the Opus judge and Jev on the same ten rows, show the disagreement, and have the room decide who is right. That is error analysis with two judges, and it is a better S3 demo than the one you have.

### F15 · Opportunities the kit cannot see because it predates the features (advisory, no diff)

- **Vision.** Opus 5.5 reads screenshots precisely without scaffolding, and the built-in `run` skill launches and screenshots the project app. S3's QA reviewer can grade screens from screenshots ("the primary action named in What good looks like is visible above the fold"). Today the eval reads only the trace and JSON output.
- **AskUserQuestion previews** (v2.1.286 in VS Code): the S1 interview can show the tech-stack rows as side-by-side option cards. Cheap, visible, and it makes the "name it or the build invents it" lesson concrete.
- **Workflows and ultracode.** Bar-raiser's four parallel evaluators, deep-dive's five workers and S3's five-reviewer panel are workflow-shaped. A saved script in `.claude/workflows/bar-raiser.js` runs on "use a workflow" and costs real tokens; keep it optional, but it is the clearest live demo of orchestration you have.
- **Built-ins that overlap the kit.** `/code-review` (effort-tunable; `ultra` runs a multi-agent cloud review), `/simplify`, `/security-review`. S3's simulated security reviewer should say in its header that `/security-review` is the real one.
- **Hooks as curriculum.** The three hooks in F8 are the first time a student sees "the harness, not the prompt, holds the rule". That is the S5 thesis stated early.

---

## Proposed diff, by hunk

Each hunk stands alone. Take the ones you want.

1. **Delete** `.claude/commands/{build,eval,strip,surgical-fix,explain,deep-dive,bar-raiser,ambiguity-audit}.md`. Keep `spec.md` or rename the skill folder to `spec`. (F2)
2. **Add frontmatter** to each SKILL.md: `effort:` per the F3 table; `disable-model-invocation: true` on `build`, `surgical-fix`, `strip` (side effects: commits, deletes); `argument-hint:` on `bar-raiser` (`<artifact path>`), `ambiguity-audit` (`[spec path]`), `deep-dive` (`<incident>`). (F3)
3. **Replace** line 10 in every SKILL.md with the contract line. **Delete** line 12 (post-session grader) from working-backwards, build, surgical-fix, strip; keep it only in eval, reworded as "the judge's own evals.md is graded by `/grade eval`". (F4, F6) *The line-12 half of this hunk was rejected; see F6.*
4. **Rewrite** `build-blueprint.md` steps 1 to 3 so the initializer returns `missing_credentials` and the session runs the checkpoint; add "dispatch each subagent and wait for it; the harness default is background". Mirror in `build/SKILL.md`. (F1)
5. **Add** `.claude/agents/judge.md` (`effort: high`, read-only tools, `description` says it never edits a check). **Rewrite** eval SKILL.md Step 2 to dispatch it; keep Steps 1 and the spot-check in the main session. (F1, F7)
6. **Reconcile** the `evals.md` row schema and the `eval-runs.json` shape to one definition each; delete the other. (F5)
7. **Add** `scripts/trace.mjs` and `scripts/hooks/trace-before-commit.mjs`; wire both in `.claude/settings.json` with `onFailure: "block"`; shorten the trace rule to point at the script. (F8)
8. **Rewrite** `strip-blueprint.md` step 1 to start from `/doctor prompt-audit` and `/skill-doctor`; change the session prompt from "fictional launch" to "Opus 5.5, 2026-09-22". (F9)
9. **Rewrite** the two model-selection sections of the tips file. (F10)
10. **Seed** three behavioural tenets into the `app/CLAUDE.md` template in S1. (F12)
11. **Date** the two context-rot case studies in the guide and add the 5.x line. (F11)
12. **Add** two lines on the two memory systems to `CLAUDE.md`; one when-not-to-use line to the langfuse skill description. (F13, F14)
13. **Add** the decision-model row to the check-writing rules and the S3 why-list; `TYPESAFE_API_KEY` to `.env.example` as optional. (F16)

Not in the diff (advisory): F15.

One more, on the tips file and the Opus 5.5 "unattended runs" prompt: do not add it. Anthropic's guide says to leave it out of human-in-the-loop applications, and the workshop is one. The students' brake is "stop and report"; the kit's checkpoints are the stops the model should keep. Add instead the one line from the Claude Code blog that fits a workshop: "Say what done looks like, then let it run. Stop and ask only when you can't continue without me, or before anything destructive." That is the doors rule in the model's own idiom.

---

## What I would not touch

- The two-pass eval, the five reviewers, the binary-check rules, the broken-row rule, the can't-tell semantics, the five passing rows. None of it is model-specific and all of it is the product.
- The seven-part spec and the tech-stack row schema.
- The doors rule as a concept. Only its enforcement moves.
- The strip blueprint's four questions and the user review halt.
- The memory.md lessons from the August runs, except the two named in F6 and F8, which the hooks make unnecessary.
- The "spirals", "stop and report" and "interview first" tips. Still true on 5.5.

---

## How to verify before committing any hunk

Removal is a hypothesis. For each hunk that changes model-facing text: run one S2 on the same spec before and after on a scratch branch, and diff `feature-list.json`, the trace and the eval scorecard. The kit's own `evals.md` files are the probes. The one hunk that needs no probe is F2: the files are unreachable today.

## Sources

- Claude Code docs: skills, sub-agents, hooks, memory, model-config, workflows, scheduled-tasks, worktrees, changelog (v2.1.232 through v2.1.296). `code.claude.com/docs/en/`.
- Anthropic model migration and prompt-audit guides bundled with the `claude-api` skill (Opus 5.5, Opus 5 and Fable 5.1 sections).
- Anthropic engineering: "Harness design for long-running application development" (2026-03-24), "How we built Claude Code auto mode" (2026-03-25), "Demystifying evals for AI agents" (2026-01-09), "An update on recent Claude Code quality reports" (2026-04-23). No engineering post after April 2026 was found on the index at the time of writing.
- Opus 5.5: anthropic.com/claude-opus-5-5 (launch, 2026-09-22); platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5 (effort, unattended runs, progress updates, frontend defaults); platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5. Third-party: simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/; every.to/vibe-check/vibe-check-opus-5-5-is-pulling-our-codex-converts-back-to-claude; claude.dev/blog/getting-the-most-out-of-opus-5-5/.
- Jev: typesafe.ai/blog/introducing-system-one-models-and-jev; simonwillison.net/2026/Sep/21/jev/; techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/; langfuse.com/blog/2026-09-18-using-typesafes-jev-for-evals; productcompass.pm/p/jev-decision-model. An open-weight clone, Jebadiah ("Jeb", Frontier Infra, Apache-2.0 on Qwen3.5), exists if you want a local demo without a key.

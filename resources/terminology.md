# Terminology — what is what, in AI terms

[workshop-guide.html](workshop-guide.html) teaches the arc: what each of the five sessions does and in what order. It uses the words *agent*, *harness*, *subagent*, and *context* on almost every screen and never stops to define them.

This file defines them, and it defines them against files in this kit rather than in the abstract. Every claim below points at something you can open.

Read this before your first session, or after one, if you ran a session and still can't say what the agent actually was.

---

## 1. Two things live in this kit

Kill this confusion before any other.

**The kit** is `modules/`, `.claude/`, `resources/`, and `scripts/`. It is a procedure for building software with an AI. It has nothing to do with whatever you decide to build.

**Your app** is `app/`, and right now it is empty. Everything the five sessions produce lands there — the spec, the checks, the source, the scorecard, the trace.

That empty folder is the clearest thing in the repo. The kit is the machine. `app/` is the output tray. When you read a path like `app/spec.html` below, it does not exist yet — S1 writes it.

Every term in this file applies at two levels, which is where people trip. The kit runs a model in a session that writes your spec. Your app might call a model of its own to do its actual job. Both are "using AI," they are different layers, and confusing them makes the whole thing look like magic.

When someone asks "so what's the agent here," ask back: the agent building the app, or an agent inside the app. Usually they mean the first.

---

## 2. The layer cake

Five terms, stacked from the bottom.

| Term | What it is here | What it gets confused with |
|---|---|---|
| **Model** | The Claude model running your Claude Code session. Separately, any model your built app calls at runtime. | The agent. A model is stateless weights. It does not remember your last session and has no access to your files. |
| **Harness** | Claude Code, plus `.claude/`, `modules/`, the artifact contracts, and the trace | The model. Anthropic's own framing: two agents are two prompts on the same harness. |
| **Agent** | One session with a goal, a tool loop, and an end. `/build` running is an agent. So is each of its three subagents. | A person, or something permanent. Agents get spawned and they die. |
| **Skill** | `.claude/skills/*` — a trigger and a pointer, loaded on demand; its folder name is its slash command | The procedure. These files are stubs. The procedure is in `modules/`. |
| **Context window** | The working memory one agent run has, and loses when it ends | Memory. There is none. That absence is the reason this kit writes so many files. |

### Model

The model is the part you already know, and it is the part that matters least to how this kit works. It has no state. It cannot see your repo. Everything it knows about your project arrived as text in the current request.

Two different models can be in play, and S5 only cares about the first. Swapping the model that runs your sessions changes what the rest of this list needs to do. Swapping a model your app calls is a change to the app, and the eval catches it.

### Harness

Everything wrapped around the model so it can do work the model alone cannot hold. Section 4 lists this kit's harness piece by piece.

The useful test: if you deleted it and the model still produced the same output, it was never harness — it was decoration.

### Agent

A model in a loop, with tools, aimed at a goal, running until the goal is met. That loop is what separates an agent from a chat turn. It reads a file, decides what to do next, writes something, checks, continues.

### Skill

A skill is a folder of instructions the harness loads when its trigger fires. Its folder name is its slash command: `.claude/skills/build/` is `/build`. Section 5 explains why they are almost empty here.

### Context window

The single constraint that explains the kit's design. Each agent run holds a finite amount of text and then it is gone. Not compressed — gone. Section 7 is about what that forces.

---

## 3. What is the agent here?

There is no *the* agent. That framing is the problem.

Nine skills in `.claude/skills/` each define one agent procedure. Running `/build` spawns an agent that follows the build procedure. Running `/eval` spawns a different one that follows the eval procedure. They share a model and a harness, and nothing else.

Then S2 splits further. From [modules/s2-build/build-blueprint.md](../modules/s2-build/build-blueprint.md):

> Launch 3 subagents, in order. Each has one responsibility and tags its trace line `S2.DECOMPOSER` / `S2.INITIALIZER` / `S2.CODER` (trace rule).

| Agent | Spawned when | Reads | Writes | Why it's on its own |
|---|---|---|---|---|
| S1 spec | `/spec` | Your answers in the interview | `spec.html`, `CLAUDE.md`, `spec-summary.json`, `evals.md` | Nothing exists yet. This one is talking to you, not to a file. |
| Ambiguity audit | `/ambiguity-audit` | `spec.html` | `ambiguity-audit.html` | The author of a spec cannot see their own ambiguity. A fresh reader can. |
| S2.DECOMPOSER | `/build`, first | The spec's What good looks like + Verification | `feature-list.json` | The build's design step: it decides how and in what order. Every feature cites the spec line it serves, so it cannot invent one. |
| S2.INITIALIZER | `/build`, second | The spec's tech stack and interfaces | `app-spec.json` | Pins the shared foundation once, so your features cannot each pick a different database. |
| S2.CODER | `/build`, third | `app-spec.json`, `feature-list.json`, the trace, `git log` | The source, commits, trace lines | Can only build against decisions already made. |
| S3 eval | `/eval` | `evals.md`, the app's output, the trace | `eval-results.html`, `eval-runs.json` | See below. |
| S4 surgical fix | `/surgical-fix` | `eval-results.html`, the trace, `git log` | `debug-log.html`, one edit | One change at a time, then re-run every check. |
| S5 strip | `/strip` | The harness, the trace, the scorecard, the debug log | `recall-notice.html`, `strip-plan.html`, `strip-page.html` | Audits the harness that produced everything above it. |

The eval agent carries the rule worth reading twice. From [modules/s3-eval/eval-blueprint.md](../modules/s3-eval/eval-blueprint.md):

> Run every check with the **`judge` agent** (`.claude/agents/judge.md`) — never the one that built the app, and with no Edit or Write tool. *Why: a builder grading its own work talks its way to a pass, or quietly edits the check.*

That is not a cost decision, and people assume it is. It is independence. An agent that spent an hour arguing for a design has that argument sitting in its context, and it will defend it.

**A note for the engineers.** `.claude/agents/` holds exactly one file, `judge.md`. Every other agent here is a *session running a procedure*, and the procedure lives in a markdown file. The judge is the exception because its independence is the lesson: its tool list has no Edit and no Write, so the separation is enforced by a config entry, not by a reminder.

---

## 4. What is the harness here?

Every piece of a harness encodes an assumption about something the model cannot do on its own. Read the list that way and it stops being scaffolding and starts being a set of claims.

| Harness piece | The assumption it encodes |
|---|---|
| `modules/*-blueprint.md` | The model won't reconstruct a 100-line procedure correctly from a one-line summary. |
| `.claude/skills/*/SKILL.md` | It needs a trigger and a pointer in context at all times, not the whole procedure. |
| `app/claude-progress.txt` | Context dies between sessions, so the reasoning has to be written down. |
| `app/feature-list.json`, `app/app-spec.json` | Decisions must survive a reset in a form the next agent can read without re-deriving them. |
| `app/evals.md` | The builder cannot grade itself. |
| The HALT checkpoints | Some doors don't reopen, so a human has to be standing at them. |
| `.env` and the credential checkpoint | The model will happily write a key into a file if nobody stops it. |
| `scripts/serve.mjs` | Your notes on the spec need a path back into the build that isn't the chat window. |

This list is the point of S5. When a new model ships, [modules/s5-strip/strip-blueprint.md](../modules/s5-strip/strip-blueprint.md) walks every row and asks whether the assumption still holds. Evidence per row, out of the trace: did it ever fire, did it ever catch a failed check, does a run without it turn any check red.

The harness auditing itself is the most unusual thing in this kit, and it is the part most worth understanding. Scaffolding nobody re-examines becomes permanent, and permanent scaffolding is how a workflow ends up expensive for reasons nobody can name.

---

## 5. Skills and blueprints

Two names, one chain, and the shape surprises people. Open two files side by side and the design explains itself.

`.claude/skills/build/SKILL.md` carries this line:

> Read `@modules/s2-build/build-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours.

All nine kit skills carry the identical formula, pointed at their own blueprint. The skill is a doorbell. The blueprint is the house.

The chain runs: **skill** (`/build`, from `.claude/skills/build/` — the trigger and the interface) → **blueprint** (`modules/s2-build/build-blueprint.md`, the actual procedure).

The indirection is not bureaucracy, it is context economics. Every skill's `description` field sits in context for the whole session so the harness knows when to fire it. Descriptions have to be cheap. The 100-line procedure loads once, at the moment the door opens, and not before.

That instinct runs through the whole kit. Hold the pointer, load the payload late. It is why S1 writes a spec file rather than keeping your requirements in the conversation, and why S3 reads the trace instead of asking the build what it did.

**Where the source of truth is.** `modules/` is where behaviour lives. `.claude/` is only the entry point. To change how the build works, edit the blueprint — editing the skill changes *when* it fires, not *what* it does. Engineers get this backwards on first contact, because in every other repo the markdown is documentation and the config is real.

---

## 6. What CLAUDE.md holds, and yes, the process writes it

Two files end up with that name, and they have different owners.

**`CLAUDE.md` at the root** ships with the kit. It orients you: the spec-engineering premise, the arc, where things live. You maintain it.

**`app/CLAUDE.md`** does not exist yet. S1 writes it, and S4 and S5 amend it. Five sections: preamble, durable tenets, workflow map, artifact map, cross-stage rules. It becomes the standing memory every later session reads first.

So yes — the pipeline writes part of its own configuration. That is the interesting part, and the rule governing it is the interesting part of *that*. From [modules/shared-rules.md](../modules/shared-rules.md):

> Keep `CLAUDE.md` to durable rules, the workflow map, and the artifact map — **never** product or failure content. Update it only when a tenet survives a model swap.

Read the promotion bar carefully. A lesson enters `CLAUDE.md` only once a new model has shipped and the lesson still holds. Anything that helped one specific model was a workaround, not a tenet, and it gets stripped in S5 instead of enshrined.

Three files carry three kinds of memory, and telling them apart is most of the lesson:

| File | Holds | Bar for entry |
|---|---|---|
| `app/claude-progress.txt` | Everything that happened, and why | Every artifact, every session. No filter. |
| `app/evals.md` | What must stay true | A check the spec can grade binary |
| `app/CLAUDE.md` | What stays true regardless of model | Survived a model swap |

The failure mode this prevents is one most people have lived: a `CLAUDE.md` that accretes every fix, every complaint, and every product detail until it is four thousand tokens of noise the model skims past. The rule is a bouncer.

---

## 7. Why files instead of a conversation

The context window is the whole answer. An agent's memory ends when the agent ends, so anything the next agent needs has to exist as a file.

That reframes the artifact list. These are not deliverables and they are not documentation. Each one exists because a specific downstream agent needs something an upstream agent knew and can no longer be asked.

| Artifact | Written by | Read by | Breaks without it |
|---|---|---|---|
| `app/spec.html` | S1 | S2, S3, S4 | The build guesses at requirements |
| `app/evals.md` | S1, grown by S3 | S3 | Grading becomes taste, not pass/fail |
| `app/feature-list.json` | S2.DECOMPOSER | S2.CODER, S4 | No traceability from a failed check back to a feature |
| `app/app-spec.json` | S2.INITIALIZER | S2.CODER | Each feature picks its own stack |
| `app/claude-progress.txt` | Every stage | Every stage | Nobody can answer "why was it done this way" |
| `app/eval-results.html` | S3 | S4 | Debug has no queue |
| `app/debug-log.html` | S4 | S5 | Strip has no evidence that a scaffold ever mattered |

The trace is the one to watch as you go. One line per artifact, and the format ([modules/shared-rules.md](../modules/shared-rules.md)) forces the useful half:

```text
<ISO timestamp>  <session>  <artifact> landed  RATIONALE: <one sentence — why, not what>
```

*Why, not what.* Git already records what changed. Nothing else records why the decision looked right at the time, and that is exactly what S5 needs weeks later when it is deciding whether a scaffold still earns its place.

---

## 8. Terms you'll bring that don't apply here

People arrive with vocabulary from elsewhere and try to map it on.

**Vibe coding** — describing what you want and accepting what comes back. This kit is the opposite trade: you spend the effort up front, in the spec, so that what comes back is gradeable.

**Prompt engineering** — tuning the wording of a request to get a better answer. Spec engineering tunes the *artifact* instead. The spec is the product; the code is regenerated from it. Nobody here is optimising a sentence.

**RAG** — retrieval over a document store to ground answers. Not used. The grounding here is a file the agent reads directly, because it is small and because it is the point.

**Fine-tuning** — changing the model's weights. Not used, and not needed. Everything specific to your project lives in the harness.

**Memory** — usually means a persistent store an assistant queries. Here it means files with different bars for entry (section 6). No magic, no vector database, and no ambiguity about what got remembered.

---

## 9. Teaching it in fifteen minutes

**The demo.** Open `.claude/skills/build/SKILL.md` and `modules/s2-build/build-blueprint.md` side by side. Point at the deferral line. Ask which file is doing the work. Most rooms guess the one in `.claude/`. This works on a fresh clone, before anything is built.

Then show `app/` — empty. Everything in section 7's table is something the room is about to produce. After S1 runs, come back and read three RATIONALE lines from `app/claude-progress.txt` aloud, including one where the reasoning later turned out to be wrong. That is the second half of the demo and it is better after the first session than before it.

**The question to put to the room.** *If the agent forgets everything when the session ends, where does this build's memory actually live?* Let them answer before showing the table. The good answers name files. The revealing answers name the conversation, and that is the misconception the whole kit exists to fix.

**The correction to make on the spot.** Someone will say S3's fresh agent is about saving tokens. It is about independence. A builder grading its own work talks its way to a pass — the blueprint says so in a footnote and it is the load-bearing sentence in the eval.

**The close.** Every piece of the harness is a claim about what the model can't do yet. Models get better, which means most of those claims will be wrong within a year. The discipline is not building the harness. It is knowing which parts to delete when the assumption expires, and keeping a trace good enough to prove it.

---

## 10. Glossary

**Agent** — a model in a tool loop, aimed at a goal, running until it is met. Spawned per session, and it ends.

**Artifact** — a file one stage writes for a later stage to read. Everything in `app/`.

**Blueprint** — a file in `modules/` holding the actual procedure for one session. The source of truth for behaviour.

**Context window** — the finite text one agent run holds. Lost when the run ends.

**Doors** — a change is two-way if you can roll it back, one-way if you can't. One-way changes need a written defence in the trace before they fire.

**Eval** — a binary pass/fail check written in `evals.md` from the spec, run by an agent that did not build the app.

**HALT** — a hard stop in a blueprint where the agent waits for you. Not advisory.

**Harness** — everything around the model that lets it do work the model alone can't hold: the tool loop, the files, the checkpoints, the contracts.

**Model** — the weights. Stateless, no file access, no memory of your last session.

**Skill** — a folder under `.claude/skills/` holding a trigger and a pointer to a blueprint. Loaded on demand.

**Spec engineering** — treating the spec as the product and the code as regenerable output.

**Subagent** — an agent spawned by another agent, with a narrower job and its own context. S2 runs three.

**Trace** — `app/claude-progress.txt`. One line per artifact, recording why rather than what.

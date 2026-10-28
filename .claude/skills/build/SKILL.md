---
name: build
description: Build the app from the spec, feature by feature. Use when the user invokes /build, says "build the app", "run S2", "build from the spec", or has a spec.html ready and wants a running app. Produces feature-list.json, app-spec.json, the source under app/, per-feature trace entries, and one git commit per feature.
disable-model-invocation: true
---

# Build

Spec → working app. Three subagents. One feature at a time. RATIONALE in the trace per feature, one git commit per feature.

Read `@modules/s2-build/build-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

Read `memory.md` in this skill's folder before running. After the session, grade the outputs against this skill's `evals.md` with a fresh-context agent, dispatched in the foreground, then append what you learned to `memory.md`.

---

## Inputs

- `app/spec.html`
- `app/claude-progress.txt`

If the spec is missing, halt and ask.

---

## Procedure

Run three subagents in order, each in the foreground — wait for one before dispatching the next. Each has a single responsibility and tags its trace line accordingly (see below). **Subagents report; this session asks:** a subagent cannot call AskUserQuestion, so every checkpoint runs here, on what they hand back.

1. **Decompose.** Read the spec's What good looks like and Verification, and break them into ordered features — the spec says *what*, this step decides *how* and in what order (a Tight spec's steps are followed as written). Write `app/feature-list.json`: `name · serves · what goes in · what comes out · how you know it's done · status = todo`, where `serves` cites the spec line or `evals.md` check the feature delivers. A feature that serves nothing is an invention.
2. **Initialize.** Read the spec's Tech stack, Inputs & interfaces, and screens (What good looks like); write `app/app-spec.json` — the config every feature shares (one database, one auth path, one design system). The initializer never asks; it returns `{"missing_credentials": [...], "open_tech_rows": [...]}`. **Credential checkpoint (this session):** if that list is non-empty, stop here and ask the user to put it in `.env` — never ask for the value in chat, never write a credential value into any file except `.env`, and don't let the build start half-wired.
3. **Write the code.** Read app-spec + feature-list + trace + git log; build feature by feature into `app/` (conventional layout for the chosen stack). Per feature: write the code · draw any screen with the `frontend-design` skill from the spec's What good looks like · tick status todo → done only after appending a RATIONALE line · one git commit per feature. Never import a tech-stack choice not in `app-spec.json`.

**Build-start sweep.** Before the first subagent reads the spec, process every `status:"new"` entry in `app/comments.json` — spec-targeted comments are folded into the spec *first*, so decomposition runs on the annotated spec. This is what "the build folds your notes in before it starts" means. Then run the comment checkpoint as normal.

**Comment checkpoint.** At the build-start sweep and before starting each feature (dispatch the coder one feature at a time so this session gets the gap), read `app/comments.json` (when present) for `status:"new"` entries — comments annotated on the spec or typed on the Build Assistant feed back here. An entry may carry a `quote` (the exact spec text the user selected) — use it to locate the edit; a `quote` with empty-ish `text` means "this passage needs attention." Route each: touches an **unbuilt feature** → update its feature-list row first · touches the **spec's intent** → spec edit + re-decompose that task (living spec; doors rule applies) · touches a **built feature** → note it for eval/debug, don't thrash mid-build. Mark it `picked-up` (then `done` when landed) and append a trace RATIONALE naming the comment.

Trace tags per the trace rule: `S2.DECOMPOSER` · `S2.INITIALIZER` · `S2.CODER`.

---

## The doors — no silent invention

Three changes are one-way and need a written reason in the trace *first*: inventing a feature that serves no spec line or check · using a tech-stack choice not in `app-spec.json` · marking a feature done with no trace line. Everything else is two-way — roll back and redo, no defence owed. (See the doors rule in `modules/shared-rules.md`.)

---

## Outputs

- `app/feature-list.json` — ordered features with `name · in · out · done-check · status`
- `app/app-spec.json` — tech stack + interfaces + screens config
- `app/` source — conventional layout per stack (e.g. `app/src/app.py` for Python; `app/api/`+`app/lib/`+`app/components/` for Next.js)
- Per-feature RATIONALE entries + session close in `app/claude-progress.txt`
- One git commit per feature
- `app/CLAUDE.md` §2 touched only if a durable tenet surfaced (rare)

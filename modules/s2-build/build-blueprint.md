---
name: build-blueprint
description: Turn the spec into a running app, one feature at a time — every piece traces back to a line in the spec.
reads:
  - app/spec.html
produces:
  - app/feature-list.json
  - app/app-spec.json
  - the source under app/
  - one git commit per feature
---

# Build

There is no contract stage — read the spec directly, and let every piece trace back to a line in it.

## Steps

Launch 3 subagents, in order. Each has one responsibility and tags its trace line `S2.DECOMPOSER` / `S2.INITIALIZER` / `S2.CODER` (trace rule). Dispatch each one in the foreground and wait for it before the next — the harness default is background.

**Subagents report; the session asks.** A subagent cannot ask the user anything, so every checkpoint below runs in the main session on what the subagents hand back.

**Before the first subagent runs, do the [build-start sweep](#checkpoints)** — fold any pending spec annotations into the spec first, so decomposition reads the annotated spec.

1. **Decompose the spec into a build list.**
   Read the spec's What good looks like and Verification, and break them into the ordered features that deliver them. This is the build's design step: the spec says what must be true, the decomposer decides how and in what order. Write one row per feature into `app/feature-list.json`:

   ```text
   name · serves (the spec line or evals.md check it delivers) · what goes in · what comes out · how you know it's done · status = todo
   ```

   Every feature cites what it serves; a feature that serves no spec line is an invention. A Tight spec's steps are followed as written.
   Done when: every What-good-looks-like line and every check is served by at least one feature, and every feature serves one.

2. **Initialize the shared foundation, once.**
   Read the spec's Tech stack, Inputs & interfaces, and screens; write them into `app/app-spec.json` — the config every feature shares (one database, one auth path, one design system). The initializer never asks; it hands back `{"missing_credentials": [...], "open_tech_rows": [...]}`, and the session runs the **credential checkpoint** (below) on that list before the coder starts. *Why: pinning this once stops the build reinventing auth five different ways.*
   Done when: `app-spec.json` holds the shared config and every required credential is present.

3. **Write the code, feature by feature.** For each feature in the list:
   1. Check the **comment checkpoint** (below) against `app/comments.json`.
   2. Write the code. Draw any screen with the `frontend-design` skill from the spec's "What good looks like."
   3. Append one RATIONALE line to the trace (trace rule).
   4. Set the feature's status to `done` and make one git commit.

   Done when: every feature is `done`, committed, and traced.

## Checkpoints

**Build-start sweep** (before the first subagent reads the spec): process every `status:"new"` entry in `app/comments.json` **first**, so decomposition runs on the annotated spec, not the stale one. Spec-targeted comments (`target:"artifact:app/spec.html"`) are folded into the spec before anything is decomposed — this is what "the build folds your notes in before it starts" means mechanically. Run the comment checkpoint below on this pass, then continue to decomposition.

**Credential checkpoint** (main session, after the initializer reports):
- HALT IF a needed key or credential is missing — ask the user to put it in `.env`. Never ask for the value in chat, and never write a credential value into any file except `.env`. Never start the build half-wired.

**Comment checkpoint** (main session — build-start sweep, then between features: dispatch the coder one feature at a time, or have it return at each feature boundary): read `app/comments.json` for new comments — a comment is a change request, not a debug item. An entry may carry a `quote` — the exact spec text the user selected; use it to locate the edit. A `quote` with empty-ish `text` means "this passage needs attention" — interpret it against the spec. Route each:

| Comment touches | Action |
|---|---|
| an unbuilt feature | update its `feature-list.json` row first |
| the spec's intent | edit the spec and re-decompose that task |
| an already-built feature | hold it for eval/debug |

Mark the comment `picked-up` and log why in the trace.

**One-way doors** (doors rule, [`../shared-rules.md`](../shared-rules.md)): most changes are reversible — roll back and redo, no harm. Three are not, and need a written reason in the trace *first*:
- inventing a feature that serves no spec line or check
- using a tech-stack choice not in `app-spec.json`
- marking a feature done with no trace line

## Hand-off

Hand the running app + `feature-list.json` (what got built) + the trace (why) to **Eval**, which checks the output against the spec's checks.

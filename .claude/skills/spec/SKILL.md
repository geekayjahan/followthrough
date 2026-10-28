---
name: spec
description: Interview the user until the problem is sharp, then write the spec — work backwards from the customer, not the solution. Use when the user invokes /spec, says "write the spec", "run S1", "work backwards", or has a rough idea and wants a spec an agent can build from. Produces app/spec.html, app/CLAUDE.md, app/spec-summary.json, and app/evals.md.
effort: high
---

# Working Backwards

Rough idea → spec an agent can build from. Grill first, write second — a spec is only as reliable as the problem the user has actually confirmed.

Read `@modules/s1-working-backwards/working-backwards-blueprint.md` before running. It is the contract: its checkpoints, one-way doors and done-whens are binding; how you get between them is yours. Prefer the simplest path that lands the artifact.

Read `memory.md` in this skill's folder before running. After the session, grade the outputs against this skill's `evals.md` with a fresh-context agent, dispatched in the foreground, then append what you learned to `memory.md`.

---

## Inputs

- A rough idea — the interview itself is the input. No PRODUCT / FEATURE / BROKE form to fill in first.
- `app/claude-progress.txt` (when present).

S1 starts from an empty `app/`; this session is what first fills it.

---

## Procedure

1. **Interview one topic at a time** (AskUserQuestion). Ask, wait for the answer, then probe the soft spots — who has the problem · the pain today · the outcome that counts · what "good" looks like — then the hard parts they haven't thought through: edge cases, constraints, tradeoffs. Last, ask **how much room the build gets**: **Tight** (build exactly this; the spec pins the screens and steps) · **Guided**, the default (the spec pins what good looks like; the build picks how) · **Open** (the spec pins the problem and the checks; the build explores). Done when the problem statement is sharp, solution-free, every fuzzy word pinned, the room chosen, and the user confirms it.
2. **Write `app/spec.html`** — lean (under 120 lines) and living (updated whenever S2–S4 learn something). The header states the room (`Room: Guided`), and the room sets the detail. **Never over-engineer:** name no mechanism the problem doesn't need (no queue, cache, scoring model, admin screen or config option unless the interview asked for it). Six parts — the *what*; the build's decomposer owns the *how*: **Problem** (who · pain now · outcome — solution-free) · **What good looks like** (the behaviour in one pass; names the screens + primary action) · **Inputs & interfaces** (files, data, APIs, credentials the build needs) · **Out of scope** · **Verification** (acceptance checks → `evals.md`; write the old Always / Ask First / Never rules as concrete checks here) · **Tech stack** (one row per category). Done when all six are filled and no fuzzy word is left undefined.
3. **Pin the tech stack** — one row per category (`id · category · status · choice · reason · owner · eta`), or the build picks silently and reshapes what the eval can measure. Cover data sources · persistence · frontend/design system · hosting/runtime · auth · observability (plus payments · search · queue · ML/AI providers · jobs · secrets when used). A data-sources row names the **concrete source and access path** — the API plus where the key lives, the file, or the snapshot; "live data" is not a source. Mirror every open row to the spec's Open Questions.
4. **Write `app/CLAUDE.md`** — the project's standing memory, per the CLAUDE.md rule: META about *how we build*, read first every session, never product content. Five sections: Preamble · Durable tenets · Workflow map (S1 spec → S2 build → S3 eval → S4 debug → S5 strip) · Artifact map · Cross-stage rules.
5. **Write `app/spec-summary.json`** — a short machine-readable summary for later stages: problem · who it's for · outcome · out of scope · key constraints.
6. **Write `app/evals.md`** — the spec's Verification part written as the checks S3 runs (`id · scenario · check · source`), each a pass/fail two strangers grade the same from the output alone. Cover the happy path, the edges, and a couple of adversarial cases.

---

## The doors — HALT before writing

**HALT before step 2** if any fuzzy word is undefined, a solution is baked into the *problem*, or the user has not confirmed the problem statement. Getting the problem confirmed is a one-way door — everything downstream is generated from it. Everything else is two-way: roll back the file and re-run, no defence owed. (See the doors rule in `modules/shared-rules.md`.)

---

## Outputs

- `app/spec.html` — the six-part living spec; **the one artifact that carries the selection annotator** (render rule).
- `app/CLAUDE.md` — durable tenets + workflow map + artifact map; META only, no product content.
- `app/spec-summary.json` — the machine-readable summary for later stages.
- `app/evals.md` — the Verification checks S3 will run.
- Session close in `app/claude-progress.txt` — one `S1` RATIONALE line per artifact (trace rule).

Render the four artifacts via the `frontend-design` skill per the **render rule** — every other artifact is a read-only review surface. Close out per the **trace rule** (`S1` tag). `spec.html` hands off to Build.

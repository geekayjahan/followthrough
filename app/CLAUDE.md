# Followthrough — how we build

## §1 Preamble

This project follows spec engineering. `app/spec.html` is the canonical input; the build reads it directly; `app/evals.md` is the check bar. Everything for this app, including `.env`, `.env.example`, data, logs and build files, lives under `app/`.

## §2 Durable tenets

- The spec is the source of truth; code is regenerated from it. When the build learns something, the fix is a spec edit, then a re-run.
- One change per Surgical Fix.
- The eval's checks come from the spec, never from the code.
- The build never imports a tech-stack choice the spec does not list. An open stack row blocks the feature that needs it; it does not get a silent default.
- No real person's data, ever. Fixtures and demo data come only from the synthetic file the spec names; test sends go only to the test lists the spec names.
- Keys live in `app/.env` only. Never in chat, a spec, a log, a commit or a fixture.
- **Scope.** Deliver what the spec asks for, at the scope it intends. If the ask looks wrong, say so in a sentence and keep building as asked; never quietly narrow, widen or transform it.
- **Communication.** Lead with the outcome. Write summaries for a PM who stepped away, in complete sentences, no arrow chains, no labels invented mid-session.
- **Checks.** Verification cases a receipt cites are committed under `app/checks/<session>.mjs`; other scratch checks are not.

## §3 Workflow map

S1 spec → S2 build → S3 eval → S4 debug → S5 strip. Each stage reads upstream artifacts only. Blueprints live in the kit's `modules/`; the trace format is in `modules/shared-rules.md`.

## §4 Artifact map

| Artifact | Path | What lives there | Written by |
|---|---|---|---|
| spec | `app/spec.html` | the six-part living spec, tiers, ideas, future scope, open questions | S1 (edited by S2–S4 when they learn something) |
| spec summary | `app/spec-summary.json` | machine-readable problem, who, outcome, out of scope, constraints | S1 |
| evals | `app/evals.md` | the checks S3 runs, one row each | S1, grown by S3 |
| feature list | `app/feature-list.json` | the build's decomposition, one row per feature, traceable to the spec | S2 decomposer |
| app spec | `app/app-spec.json` | the initialised stack and interfaces | S2 initializer |
| eval results | `app/eval-results.html` | scorecard, traces, patterns, actions | S3 |
| debug log | `app/debug-log.html` | surgical fixes and their defences | S4 |
| trace | `app/claude-progress.txt` | one RATIONALE line per artifact per session | every stage |
| action log | `app/logs/actions.jsonl` | the running app's evidence output | the app at runtime |
| workflows | `app/workflows.md` | the catalogue the spec points at: rows, tiers, sources, the one Core list | S1 (merged by the Business session) |
| demo scenes | `app/demo-scenes.md` | hero scenes and off-script asks for the 3-minute demo | S1 |
| owner data | `app/data/voice.md`, `app/data/terms.md`, `app/data/calendar.json` | the owner's voice, terms and stall dates; signed off by the owner, read by the build | owner, via S1 |

## §5 Cross-stage rules

- The eval reads the spec, not the code.
- `CLAUDE.md` never carries product content; product facts live in the spec.
- Per-feature traceability runs through `feature-list.json`: every feature names the spec line it serves and the eval rows that prove it.
- Classify every change as a two-way or one-way door before making it; one-way doors get a defence in the trace first.

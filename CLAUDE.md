# Followthrough — built with the Product Builder Kit

This repo is one app, Followthrough (the Meta Global AI Developer Hackathon entry, deadline 4 Nov 2026 21:00 ET), built with the kit. The kit is prior tooling; everything under `app/` is hackathon work. Context: `docs/followthrough-idea.md`, `docs/meta-hackathon-context.md`.

This project follows **spec engineering**: the spec is the product; code is the disposable thing you regenerate from it.

- `modules/` holds the blueprints — the source of truth for every session's procedure. Skills in `.claude/skills/` are their executable mirrors, and `.claude/agents/judge.md` is S3's judge. A blueprint is a contract: its checkpoints, one-way doors and done-whens are binding; the path between them is free.
- The arc: **S1 spec → S2 build → S3 eval → S4 debug → S5 strip.** Each stage reads upstream artifacts only.
- Everything the workshop produces lands in `app/` — spec.html, evals.md, feature-list.json, app-spec.json, the source, eval-results.html, debug-log.html — plus one trace, `app/claude-progress.txt` (format in `modules/shared-rules.md`).
- The four rules every blueprint follows (trace · render · doors · CLAUDE.md) live in `modules/shared-rules.md`.
- Two memories: each skill's `memory.md` is shared curriculum, checked in, read before the skill runs. Claude Code's auto memory (`~/.claude/projects/…/memory/`) is yours and local. Each skill that has an `evals.md` grades its own outputs against it with a fresh-context agent before the session closes, so every stage proves it ran properly before the next one reads its artifacts. `/skill-doctor` shows which skills never fire, for when you prune.
- `docs/accounts-map.md` records which account, org and ID the app uses (names and IDs only). Read it before touching Zoho, WhatsApp or Railway, and update it in the same commit whenever an account, ID or status changes.
- App keys (WhatsApp, Zoho, model endpoint) live in `app/.env` only (gitignored; template in `app/.env.example`); kit-level keys (Langfuse, TypeSafe) in root `.env`. Never in chat, a spec, or any other file.
- `app/CLAUDE.md` (written by S1) carries the build's durable tenets; this file just orients the kit.

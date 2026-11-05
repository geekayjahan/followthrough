# Followthrough

This repo is one app, Followthrough (the Meta Global AI Developer Hackathon entry). Context: `docs/followthrough-idea.md`, `docs/meta-hackathon-context.md`.

- Everything the app needs lives under `app/`: the spec (`app/spec.html`), the checks (`app/evals.md`, `app/checks/`), the feature list, the source, and the decision trace `app/claude-progress.txt`. Railway builds the `followthrough` service from `app/` and the `shops` service from `shops/Dockerfile` at the repo root.
- `app/CLAUDE.md` carries the build's durable tenets. Read it before changing the app.
- `docs/accounts-map.md` records which account, org and ID the app uses (names and IDs only). Read it before touching Zoho, WhatsApp or Railway, and update it in the same commit whenever an account, ID or status changes.
- App keys (WhatsApp, Zoho, model endpoint) live in `app/.env` only (gitignored; template in `app/.env.example`). Never in chat, a spec, or any other file.
- Trace lines in `app/claude-progress.txt` are appended with the real clock, one per decision, in the form `<ISO timestamp>  <session>  <event>  RATIONALE: <why>`.

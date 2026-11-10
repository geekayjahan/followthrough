# Followthrough

This repo is one app, Followthrough, the Meta Global AI Developer Hackathon entry. It was built by spec engineering: the spec is the product, and the code is regenerated from it. Context: `docs/followthrough-idea.md` and `docs/decisions-and-safeguards.md`.

- Everything the app needs lives under `app/`: the spec (`app/spec.html`), the checks (`app/evals.md`, `app/checks/`), the feature list, the source, and the decision trace `app/claude-progress.txt`. Railway builds the `followthrough` service from `app/` and the `shops` service from `shops/Dockerfile`.
- `app/CLAUDE.md` carries the build's durable tenets. Read it before changing the app.
- The arc is spec, build, eval, debug, strip. Each stage reads upstream artefacts only.
- Trace lines in `app/claude-progress.txt` are appended with the real clock, one per decision, in the form `<ISO timestamp>  <session>  <event>  RATIONALE: <why>`.
- `docs/accounts-map.md` records which account each service runs on and who owns it (names only; account IDs stay in the team's private note). Read it before touching Zoho, WhatsApp or Railway, and update it in the same commit whenever an account or its owner changes.
- App keys (WhatsApp, Zoho, model endpoint) live in `app/.env` only (gitignored; template in `app/.env.example`). Never in chat, a spec, or any other file.
- `SECURITY.md` lists the controls in place. A change that weakens one needs the owner's sign-off, and `app/checks/privacy.test.mjs` must pass on the tree and on history before any push.

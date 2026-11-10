# Security

Followthrough reads an owner's WhatsApp messages, drafts replies to customers and writes to accounting software. This page lists the controls that exist in the code today, the limits we know about, and how to report a problem. The reasoning behind each decision is in [docs/decisions-and-safeguards.md](docs/decisions-and-safeguards.md).

## Reporting a problem

Please report a vulnerability privately through the repository's Security tab ("Report a vulnerability"). Please do not open a public issue for a security problem.

## Controls in place

| Risk | Control | Where |
|---|---|---|
| A forged webhook injects messages | Every WhatsApp webhook is checked against Meta's HMAC-SHA256 signature with a constant-time comparison, and unsigned requests are refused. | `app/src/auth.mjs`, `app/src/server.mjs` |
| A stranger messages the bot | Only numbers on the owner and test lists are processed. Any other sender is logged as blocked and gets no reply. | `app/src/intake.mjs` |
| Someone guesses the owner password | The password is stored as an scrypt verifier, compared in constant time, and an address is locked out for 15 minutes after ten attempts. | `app/src/auth.mjs` |
| A malicious page acts as the signed-in owner | Session cookies are `HttpOnly` and `SameSite=Strict`. Every state-changing request needs a matching Origin and a per-session CSRF token. | `app/src/auth.mjs`, `app/src/server.mjs` |
| The model sends something the owner did not approve | Nothing reaches a customer without the owner's yes. An approval is bound to a hash and a version of the exact draft, so an edited draft cancels the earlier approval. | `app/src/engine.mjs` |
| A write fails halfway and is repeated | A send or a Books write with an uncertain outcome is marked as needing reconciliation, kept visible and never retried automatically. | `app/src/engine.mjs`, `app/src/providers.mjs` |
| Message content steers the model | Inbound text reaches the model labelled as untrusted evidence, and the model's answer is validated against a fixed shape before the app acts on it. | `app/src/providers.mjs` |
| Lead enrichment is used to reach internal addresses | Enrichment fetches only allowlisted hosts over public IP addresses. Private, loopback, link-local and reserved ranges are refused. | `app/src/enrichment.mjs` |
| Real customer data ends up in the repo | The demo runs on synthetic data. A test fails the suite if any checked-in file, or any commit in history, holds a phone number or a non-allowlisted email address. | `app/checks/privacy.test.mjs` |
| A key is committed | Keys live only in the host's variables and in `app/.env`, which is ignored. Two secret scans run on every push. | `app/checks/secret-scan.mjs`, `.github/workflows/ci.yml` |
| A dependency is compromised | The app has one pinned runtime dependency. CI installs with install scripts disabled, fails on a high-severity advisory, and pins each GitHub Action to a commit. Dependabot proposes updates weekly. | `.github/workflows/ci.yml`, `.github/dependabot.yml` |
| The app touches the owner's real accounts | The app runs on separate test accounts. None of the owner's real business accounts are connected. | `docs/accounts-map.md` |

## Known limits

- The untrusted-content label is a prompt instruction. It lowers the chance that message content steers the model and does not remove it. The approval step is the control that holds if it fails.
- Whether an owner reply counts as a yes is decided by a model classification with a confidence threshold. A reply only approves the card it answers.
- There is one shared owner login and no per-user roles.
- The container runs as root. Moving to a non-root user needs a change to how the data volume is mounted on the host.
- The checks here are tests and scans. No independent penetration test has been done.

## History

On 10 November 2026 the repository history was rewritten to remove account identifiers, mailbox addresses and early example data that named real businesses. Files deleted before publication were removed from every commit, and documentation and data files show their current content throughout. Source code history is unchanged apart from replaced names.

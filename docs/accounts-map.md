# Followthrough: accounts map

Which account each service runs on, and who owns it. This file exists so that anyone can check the app is isolated from the owner's real business accounts.

No passwords, tokens, secrets, phone numbers, email addresses or account IDs appear in this file. Secrets live only in the host's variables and in `app/.env`, which is not checked in. The team keeps the IDs in a private note.

## Who logs in where

| What | Platform | Owner | Status | Notes |
|---|---|---|---|---|
| Model API (Muse Spark), live app | dev.meta.ai | GK | Active | Managed Meta account with no Business Tools or developer access by design, so it cannot be used for WhatsApp. |
| Model API, dev and testing | dev.meta.ai | Vince | Active | Fallback key if the first balance runs low. |
| Spark Open (open weights) | Baseten | GK | Active | Model `meta-models/muse-spark-open-1026`. |
| WhatsApp test number | developers.facebook.com | Vince's mailbox, set up by GK | Active | Portfolio "Followthrough Demo". Only owner phones are recipients. |
| Zoho test account (the app's Books and Mail) | Zoho, EU data centre | Vince | Active | A separate Zoho account from the real business. |
| Zoho Books test org | books.zoho.eu | Vince | Seeded by script | "Kāma Coffee (Test)", GBP, Europe/London. The only organisation on this login. |
| Zoho CRM (demo backdrop only) | crm.zoho.eu | Vince | Empty | Not connected to the app and no OAuth scope. |
| Real Kāma Books | books.zoho.eu | GK | Do not use | Never connected to the app. |
| Real Kāma Instagram and Facebook | Instagram, Facebook | GK | Do not use | Real business accounts, kept away from this setup. |
| Real email inbox | Zoho Mail | GK | Do not use | Never connected to the app. |
| Hosting | Railway, project "followthrough" | Vince | Live | Builds from `main`, root `/app`. See `setup-keys.md` §6. |
| Code | GitHub | GK | Public | |

## Variables on the host (names only)

| Variable | Source |
|---|---|
| WHATSAPP_PHONE_NUMBER_ID | Meta WhatsApp dashboard |
| WHATSAPP_WABA_ID | Meta WhatsApp dashboard |
| WHATSAPP_TEST_NUMBERS | Owner phones only |
| WHATSAPP_OWNER_NUMBERS | Owner phones only |
| WHATSAPP_TOKEN | Meta |
| WHATSAPP_APP_SECRET | Meta app settings |
| WHATSAPP_VERIFY_TOKEN | Chosen by the team, matches the webhook config |
| GRAPH_API_VERSION | Meta |
| ZOHO_REGION | `eu` |
| ZOHO_CLIENT_ID | Zoho Self Client |
| ZOHO_CLIENT_SECRET | Zoho Self Client |
| ZOHO_REFRESH_TOKEN | Token exchange |
| ZOHO_BOOKS_ORG_ID | The test organisation |
| ZOHO_MAIL_ACCOUNT_ID | Zoho Mail API |
| ZOHO_MAIL_INBOX_ID | Zoho Mail API |
| ZOHO_MAIL_FROM | The test mailbox |
| MAIL_FROM_COFFEE | The coffee alias on the test mailbox |
| OWNER_TEST_EMAILS | Owner addresses only |
| CASH_ACCOUNT_ID | Printed by `scripts/seed-books.mjs` |
| EXPENSE_ACCOUNT_ID | Printed by `scripts/seed-books.mjs` |
| STALL_CUSTOMER_ID | Printed by `scripts/seed-books.mjs` |

Also set: `APP_URL`, `APP_LIVE`, `OWNER_PASSWORD`, `DEMO_AGE_DAYS`, `DEMO_SEND_DELAY_MINUTES`, `ENABLE_JOBS`, `ENABLE_POLLING`, `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`, `VOICE_TRANSCRIBE_KEY`, `SYNTHETIC_DATA_APPROVED`, `ENRICHMENT_ALLOWED_HOSTS`.

## Rules

- Tokens and secrets go straight from the provider's screen into the host's variables. They never go into chat, WhatsApp, email or this repo.
- Phone numbers go only into Meta's dashboard and the host's variables.
- Only owner phones are WhatsApp recipients. No customer numbers.
- The app only ever uses the test Zoho account. `checks/privacy.test.mjs` fails the suite on any phone number or non-allowlisted email in a checked-in file.
- None of the owner's real business accounts are connected to the app.

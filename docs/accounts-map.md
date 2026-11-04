# Followthrough: accounts map

Source of truth for which account, org and ID the app uses. Update this file whenever an account, ID or status changes.

No passwords, tokens, secrets or phone numbers in this file. Secrets live only in Railway Variables (project "followthrough", service "followthrough") and `app/.env`. IDs below are not secrets.

Last updated: 4 Nov 2026, 21:35 UK. Railway column checked against the service's variable names (names only) by the master session at 21:30.

## Who logs in where
| What | Platform | Login | Owner | Status | Notes |
|---|---|---|---|---|---|
| Model API (Muse Spark), live app | dev.meta.ai | info@flywheelbygk.com | GK | Active | Managed Meta account, org "Flywheel by GK", Team ID 1786403422438743. $150 credits. No Business Tools or developer access by design, so it can't be used for WhatsApp. |
| Model API, dev and testing | dev.meta.ai | Vince's Meta account | Vince | Active | $150 credits. Fallback key if GK's balance runs low. |
| Spark Open (open weights) | Baseten | GitHub (geekayjahan) | GK | Claimed | $100 credits. Model meta-models/muse-spark-open-1026. |
| WhatsApp test number | developers.facebook.com | a teamvince.com mailbox | GK sets up; Vince's mailbox | **Not working (4 Nov)** | Portfolio "Followthrough Demo". Cause not yet diagnosed. Meta sign-in codes go to this inbox. |
| Zoho test account (app's Books + Mail) | Zoho, EU data centre | Vince's teamvince.com login (the address is `ZOHO_MAIL_FROM`) | Vince | Active | Separate Zoho account from Kāma. Mail user ID 20121059056 (admin console). Coffee alias on teamvince.com added 4 Nov (the address is `MAIL_FROM_COFFEE`). API Mail account ID and Inbox ID still to fetch. |
| Zoho Books test org | books.zoho.eu | Vince's teamvince.com login | Vince | Verified empty | "Kāma Coffee (Test)", ID 20121062531, Premium Trial created 4 Nov 2026, GBP, Europe/London. 0 invoices, 0 customers, 0 items (rechecked 4 Nov 21:25). Only org on this login. Confirm trial lasts past 9 Nov. |
| Zoho CRM (demo backdrop only) | crm.zoho.eu | Vince's teamvince.com login | Vince | Activated, empty | CRM org ID 20121062804. Not connected to the app; no OAuth scope. |
| Real Kāma Books | books.zoho.eu | info@flywheelbygk.com | GK | Do not use | Never connected to the app. Claude's Zoho connectors are signed in here: read-only use only. |
| Kāma Instagram / Facebook | Instagram, Facebook | gk@kamacoffee.co.uk | GK | Do not use | Real business account. Keep it away from the hackathon setup. |
| Real email inbox | Zoho Mail | info@flywheelbygk.com (aliases gk@kamacoffee.co.uk, beans@kamacoffee.co.uk) | GK | Do not use | Never connected to the app. |
| Hosting | Railway, project "followthrough" | Vince's Railway account | Vince | Live | https://followthrough-production.up.railway.app (see setup-keys.md §6) |
| Code | GitHub | geekayjahan | GK | Must be public by submission | Railway builds from `main`, root `/app`. |
| Hackathon registration | Cerebral Valley | info@flywheelbygk.com | GK | Registered | Vince still to be added to the team. |

## Books test org: account and contact IDs (read 4 Nov 21:25)
| Item | Name | ID | Notes |
|---|---|---|---|
| Cash account (stall sales) | Petty Cash (type Cash) | 1362847000000000349 | Reference only. The seed creates its own cash account "Followthrough Synthetic Cash & Takings (GBP)" with a £2,500 opening balance and prints its ID; Petty Cash would fail the £2,875 read-back. |
| Expense account (supplier receipts) | Other Expenses (type Expense) | 1362847000000000448 | Reference only. The seed creates "Packaging & Roastery Consumables (Synthetic)" and prints its ID. |
| Alternative for green-bean purchases | Cost of Goods Sold | 1362847000000000509 | Reference only; not used by the seed. |
| Stall walk-up customer | None | Not created | `scripts/seed-books.mjs` creates it (STALL_CUSTOMER_ID). |
| Invoices | None | | FT-INV-1001 to 1006 do not exist yet. |

The three env values come only from the seed script output (setup-keys.md §5). GK approved the data pack (candidate-v1 at 54ae2cc) on 4 Nov 20:45, so `SYNTHETIC_DATA_APPROVED=true` may be set and the seed run. Decision 4 Nov 21:10: keep the seed as is; do not point it at the existing accounts.

## Zoho setup progress (setup-keys.md §3)
| Step | Status | Result |
|---|---|---|
| 1. Region | Done | `eu` (books.zoho.eu) |
| 2. Books org | Done | "Kāma Coffee (Test)", ID 20121062531 |
| 3. Mailbox and coffee alias | Done | Vince's teamvince.com mailbox and its coffee alias. Sending from the alias via API unverified. |
| 4. OAuth Self Client (api-console.zoho.eu) | Done by Vince | `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` are on Railway |
| 5. Refresh token | Done by Vince | `ZOHO_REFRESH_TOKEN` is on Railway |
| 6. Mail account ID, Inbox ID | Done by Vince | Both on Railway |
| 7. Isolation check | Partly done | Test org ID differs from the real Kāma org and the test org is empty |
| 8. Railway Variables | Zoho done; WhatsApp, seed IDs, `OWNER_TEST_EMAILS`, `ENRICHMENT_ALLOWED_HOSTS`, `SYNTHETIC_DATA_APPROVED` still missing | Checked 21:30 |

## Railway Variables (names only)
| Variable | Source | Set? |
|---|---|---|
| WHATSAPP_PHONE_NUMBER_ID | Meta WhatsApp dashboard | Yes (21:40) |
| WHATSAPP_WABA_ID | Meta WhatsApp dashboard | No (21:30) |
| WHATSAPP_TEST_NUMBERS | Owner phones only | No (21:30) |
| WHATSAPP_OWNER_NUMBERS | Owner phones only | No (21:30) |
| WHATSAPP_TOKEN | Meta | No (21:30) |
| WHATSAPP_APP_SECRET | Meta app settings | No (21:30) |
| WHATSAPP_VERIFY_TOKEN | Chosen by us, matches webhook config | No (21:30) |
| GRAPH_API_VERSION | Meta | Yes (21:40) |
| ZOHO_REGION | eu | Yes (21:30) |
| ZOHO_CLIENT_ID | Self Client, step 4 | Yes (21:30) |
| ZOHO_CLIENT_SECRET | Self Client, step 4 | Yes (21:30) |
| ZOHO_REFRESH_TOKEN | Token exchange, step 5 | Yes (21:30) |
| ZOHO_BOOKS_ORG_ID | 20121062531 | Yes (21:30); Vince to confirm the value matches this ID |
| ZOHO_MAIL_ACCOUNT_ID | Step 6 | Yes (21:30) |
| ZOHO_MAIL_INBOX_ID | Step 6 | Yes (21:30) |
| ZOHO_MAIL_FROM | Vince's teamvince.com mailbox | Yes (21:30) |
| MAIL_FROM_COFFEE | the coffee alias on teamvince.com | Yes (21:30) |
| OWNER_TEST_EMAILS | Owner addresses only | No |
| CASH_ACCOUNT_ID | Seed script (Vince); candidate Petty Cash 1362847000000000349 | No |
| EXPENSE_ACCOUNT_ID | Seed script (Vince); candidate Other Expenses 1362847000000000448 | No |
| STALL_CUSTOMER_ID | Seed script (Vince); customer not yet created | No |

## Open to-dos
- Vince sets `SYNTHETIC_DATA_APPROVED=true` on Railway (GK approved 4 Nov 20:45).
- Fix WhatsApp test number (not working as of 4 Nov).
- Finish Zoho step 8: `OWNER_TEST_EMAILS` and the three seed IDs.
- Vince runs `scripts/seed-books.mjs` (setup-keys.md §5) to create the stall customer and FT-INV-1001 to 1006.
- Add Vince to the team on Cerebral Valley.
- Submit by 02:00 UK, 5 Nov.

## Rules
- Tokens and secrets go straight from the provider's screen into Railway. Never paste them into chat, WhatsApp, email or this repo.
- Phone numbers go only into Meta's dashboard and Railway Variables.
- Only owner phones (GK, and Vince if he wants) are WhatsApp recipients. No customer numbers.
- The app only ever uses Vince's teamvince.com Zoho account. Its addresses live in Railway Variables, not in this file: `checks/privacy.test.mjs` fails the suite on any non-allowlisted email.

## Also on Railway (names only, 21:30)
Set: `APP_URL`, `APP_LIVE`, `OWNER_PASSWORD`, `DEMO_AGE_DAYS`, `DEMO_SEND_DELAY_MINUTES`, `ENABLE_JOBS`, `ENABLE_POLLING`, `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`, `VOICE_TRANSCRIBE_KEY`. Not set: `SYNTHETIC_DATA_APPROVED`, `ENRICHMENT_ALLOWED_HOSTS`, `OWNER_TEST_EMAILS`.

Railway project `67c99ace-0c00-4bd2-a1e8-3eae47864036`, service `followthrough` `ce2bc3f8-4de9-448f-b181-a254c1d66066`, environment `production`, volume `followthrough-data` at `/data`, region europe-west4. Builds from `geekayjahan/followthrough` `main`, root `/app`, Dockerfile; only pushes that touch `app/` redeploy.

# Followthrough: accounts map

Source of truth for which account, org and ID the app uses. Update this file whenever an account, ID or status changes.

No passwords, tokens, secrets or phone numbers in this file. Secrets live only in Railway Variables (project "followthrough", service "followthrough") and `app/.env`. IDs below are not secrets.

Last updated: 4 Nov 2026, 21:30 UK.

## Who logs in where
| What | Platform | Login | Owner | Status | Notes |
|---|---|---|---|---|---|
| Model API (Muse Spark), live app | dev.meta.ai | info@flywheelbygk.com | GK | Active | Managed Meta account, org "Flywheel by GK", Team ID 1786403422438743. $150 credits. No Business Tools or developer access by design, so it can't be used for WhatsApp. |
| Model API, dev and testing | dev.meta.ai | Vince's Meta account | Vince | Active | $150 credits. Fallback key if GK's balance runs low. |
| Spark Open (open weights) | Baseten | GitHub (geekayjahan) | GK | Claimed | $100 credits. Model meta-models/muse-spark-open-1026. |
| WhatsApp test number | developers.facebook.com | char@teamvince.com | GK sets up; Vince's mailbox | **Not working (4 Nov)** | Portfolio "Followthrough Demo". Cause not yet diagnosed. Meta sign-in codes go to this inbox. |
| Zoho test account (app's Books + Mail) | Zoho, EU data centre | vince@teamvince.com | Vince | Active | Separate Zoho account from Kāma. Mail user ID 20121059056 (admin console). Alias coffee@teamvince.com added 4 Nov. API Mail account ID and Inbox ID still to fetch. |
| Zoho Books test org | books.zoho.eu | vince@teamvince.com | Vince | Verified empty | "Kāma Coffee (Test)", ID 20121062531, Premium Trial created 4 Nov 2026, GBP, Europe/London. 0 invoices, 0 customers, 0 items (rechecked 4 Nov 21:25). Only org on this login. Confirm trial lasts past 9 Nov. |
| Zoho CRM (demo backdrop only) | crm.zoho.eu | vince@teamvince.com | Vince | Activated, empty | CRM org ID 20121062804. Not connected to the app; no OAuth scope. |
| Real Kāma Books | books.zoho.eu | info@flywheelbygk.com | GK | Do not use | Org "JM Valor Ltd", ID 20108595691. Claude's Zoho connectors are signed in here: read-only use only. Never connected to the app. |
| Kāma Instagram / Facebook | Instagram, Facebook | gk@kamacoffee.co.uk | GK | Do not use | Real business account. Keep it away from the hackathon setup. |
| Real email inbox | Zoho Mail | info@flywheelbygk.com (aliases gk@kamacoffee.co.uk, beans@kamacoffee.co.uk) | GK | Do not use | Never connected to the app. |
| Hosting | Railway, project "followthrough" | Vince's Railway account | Vince | Live | https://followthrough-production.up.railway.app (see setup-keys.md §6) |
| Code | GitHub | geekayjahan | GK | Must be public by submission | Railway builds from `main`, root `/app`. |
| Hackathon registration | Cerebral Valley | info@flywheelbygk.com | GK | Registered | Vince still to be added to the team. |

## Books test org: account and contact IDs (read 4 Nov 21:25)
| Item | Name | ID | Notes |
|---|---|---|---|
| Cash account (stall sales) | Petty Cash (type Cash) | 1362847000000000349 | Candidate for CASH_ACCOUNT_ID. Undeposited Funds is the other Cash-type account; the seed script warns if the stall sale lands there. |
| Expense account (supplier receipts) | Other Expenses (type Expense) | 1362847000000000448 | No "General Expenses" account exists. Candidate for EXPENSE_ACCOUNT_ID. |
| Alternative for green-bean purchases | Cost of Goods Sold | 1362847000000000509 | Use if supplier receipts should hit COGS. |
| Stall walk-up customer | None | Not created | `scripts/seed-books.mjs` creates it (STALL_CUSTOMER_ID). |
| Invoices | None | | FT-INV-1001 to 1006 do not exist yet. |

Final values for the three IDs come from the seed script output (setup-keys.md §5), which may differ from the candidates above.

## Zoho setup progress (setup-keys.md §3)
| Step | Status | Result |
|---|---|---|
| 1. Region | Done | `eu` (books.zoho.eu) |
| 2. Books org | Done | "Kāma Coffee (Test)", ID 20121062531 |
| 3. Mailbox and coffee alias | Done | vince@teamvince.com; alias coffee@teamvince.com. Sending from the alias via API unverified. |
| 4. OAuth Self Client (api-console.zoho.eu) | To do | Create while logged in as vince@teamvince.com |
| 5. Refresh token | To do | `accounts.zoho.eu` |
| 6. Mail account ID, Inbox ID | To do | `mail.zoho.eu` |
| 7. Isolation check | Partly done | Org ID differs from JM Valor Ltd and org is empty |
| 8. Railway Variables | To do | |

## Railway Variables (names only)
| Variable | Source | Set? |
|---|---|---|
| WHATSAPP_PHONE_NUMBER_ID | Meta WhatsApp dashboard | Check: WhatsApp not working |
| WHATSAPP_WABA_ID | Meta WhatsApp dashboard | Check |
| WHATSAPP_TEST_NUMBERS | Owner phones only | Check |
| WHATSAPP_OWNER_NUMBERS | Owner phones only | Check |
| WHATSAPP_TOKEN | Meta | Check |
| WHATSAPP_APP_SECRET | Meta app settings | Check |
| WHATSAPP_VERIFY_TOKEN | Chosen by us, matches webhook config | Check |
| GRAPH_API_VERSION | Meta | Check |
| ZOHO_REGION | eu | No |
| ZOHO_CLIENT_ID | Self Client, step 4 | No |
| ZOHO_CLIENT_SECRET | Self Client, step 4 | No |
| ZOHO_REFRESH_TOKEN | Token exchange, step 5 | No |
| ZOHO_BOOKS_ORG_ID | 20121062531 | No |
| ZOHO_MAIL_ACCOUNT_ID | Step 6 | No |
| ZOHO_MAIL_INBOX_ID | Step 6 | No |
| ZOHO_MAIL_FROM | vince@teamvince.com | No |
| MAIL_FROM_COFFEE | coffee@teamvince.com | No |
| OWNER_TEST_EMAILS | Owner addresses only | No |
| CASH_ACCOUNT_ID | Seed script (Vince); candidate Petty Cash 1362847000000000349 | No |
| EXPENSE_ACCOUNT_ID | Seed script (Vince); candidate Other Expenses 1362847000000000448 | No |
| STALL_CUSTOMER_ID | Seed script (Vince); customer not yet created | No |

## Open to-dos
- Fix WhatsApp test number (not working as of 4 Nov).
- Finish Zoho steps 4 to 8.
- Vince runs `scripts/seed-books.mjs` (setup-keys.md §5) to create the stall customer and FT-INV-1001 to 1006.
- Add Vince to the team on Cerebral Valley.
- Submit by 02:00 UK, 5 Nov.

## Rules
- Tokens and secrets go straight from the provider's screen into Railway. Never paste them into chat, WhatsApp, email or this repo.
- Phone numbers go only into Meta's dashboard and Railway Variables.
- Only owner phones (GK, and Vince if he wants) are WhatsApp recipients. No customer numbers.
- The app only ever uses the vince@teamvince.com Zoho account.

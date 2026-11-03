# Setup: keys, Books seed and first boot

For GK and Vince on 3 and 4 Nov 2026. Every value goes into `app/.env` (copy `app/.env.example`) or the host's environment variables. Never into chat, a commit or any other file. Run the commands in your own terminal from `app/`.

Steps marked **verify** are ones the build has never run against the live service; if Zoho or Meta shows something different, follow the screen and tell Claude what you saw.

## 1. Meta models (do first: judging stage 1 depends on them)

| Key | Where it comes from |
|---|---|
| `MODEL_BASE_URL` | `https://inference.baseten.co/v1` |
| `MODEL_NAME` | The Spark Open model slug in the Baseten dashboard (the context doc records `meta-models/muse-spark-open-1026`; copy it from the dashboard) |
| `MODEL_API_KEY` | Baseten dashboard, API keys |
| `VOICE_TRANSCRIBE_KEY` | Your Meta Model API key at dev.meta.ai with Voice Transcribe access (**verify**) |

As soon as these four are in, Claude can run the three single checks: JSON output, an image, a voice note.

## 2. WhatsApp Cloud API

1. developers.facebook.com, My Apps, create a Business app and add the WhatsApp product.
2. WhatsApp, API Setup shows a test phone number. Copy its **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID` and the **temporary access token** into `WHATSAPP_TOKEN`.
3. In the same screen add up to five recipient numbers and verify each with its code. All of them go into `WHATSAPP_TEST_NUMBERS` in E.164 form (`+447...`, comma-separated). The owners' own phones also go into `WHATSAPP_OWNER_NUMBERS`.
4. App settings, Basic, **App secret** into `WHATSAPP_APP_SECRET`.
5. `WHATSAPP_VERIFY_TOKEN`: any long random string you choose.
6. `GRAPH_API_VERSION`: the version API Setup shows in its sample request, e.g. `v26.0`.
7. After the app is deployed: WhatsApp, Configuration, set Callback URL to `<APP_URL>/webhooks/whatsapp`, Verify token to the same string as step 5, then subscribe to the `messages` field.

Two traps:

- The temporary token expires after 24 hours. Generate a fresh one on recording morning, or create a System User token in Business Settings, which does not expire.
- WhatsApp only lets the app message a number freely within 24 hours of that number writing to it. Before recording, send any message ("hi") from each owner and counterpart phone to the test number. Otherwise the brief needs an approved template (`WHATSAPP_BRIEF_TEMPLATE`).

## 3. Zoho Books and Zoho Mail

Use a fresh Books organisation for the test copy of Kāma Coffee, never the real one. The seed script refuses an org that already holds invoices it does not own, because the app would then show Books as unavailable.

1. **Region.** The domain you sign in on decides it: `books.zoho.eu` is `eu`, `books.zoho.com` is `com`. Put it in `ZOHO_REGION`.
2. **Books org.** Create the organisation "Kāma Coffee (Test)", currency GBP, time zone Europe/London. Its organisation ID (Settings, Organization Profile) goes into `ZOHO_BOOKS_ORG_ID`.
3. **Mail.** A Zoho Mail mailbox for the owner side. Its address goes into `ZOHO_MAIL_FROM`. Add a verified email alias for coffee mail (Settings, Mail Accounts, Email Address, add alias) and put that in `MAIL_FROM_COFFEE`.
4. **OAuth Self Client.** At `api-console.zoho.<region>`, add a Self Client. Copy Client ID and Client Secret into `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET`. Under Generate Code, enter these scopes and a 10-minute duration (**verify** the scope names on screen):

   ```text
   ZohoBooks.fullaccess.all,ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.READ
   ```

5. **Refresh token.** Exchange the code within 10 minutes. The response holds `refresh_token` (into `ZOHO_REFRESH_TOKEN`) and a one-hour `access_token` for step 6.

   ```bash
   curl -X POST "https://accounts.zoho.<region>/oauth/v2/token" -d grant_type=authorization_code -d client_id=<id> -d client_secret=<secret> -d code=<code>
   ```

6. **Mail account and inbox IDs.** `accountId` goes into `ZOHO_MAIL_ACCOUNT_ID`. The Inbox `folderId` goes into `ZOHO_MAIL_INBOX_ID`, needed for the supplier balance email scene.

   ```bash
   curl -H "Authorization: Zoho-oauthtoken <access_token>" "https://mail.zoho.<region>/api/accounts"
   curl -H "Authorization: Zoho-oauthtoken <access_token>" "https://mail.zoho.<region>/api/accounts/<accountId>/folders"
   ```

Clear those commands from your shell history afterwards; they carry the secret and the token.

`CASH_ACCOUNT_ID`, `EXPENSE_ACCOUNT_ID` and `STALL_CUSTOMER_ID` come from the seed script in step 5.

## 4. App settings

| Key | Value |
|---|---|
| `OWNER_PASSWORD` | Choose one |
| `APP_URL` | The Railway HTTPS URL from §6 (locally `http://127.0.0.1:4310`) |
| `OWNER_TEST_EMAILS` | The owners' inboxes; no email leaves for anyone else |
| `SYNTHETIC_DATA_APPROVED` | `true` only after GK approves the data pack. GK approved candidate-v1 at a148464 on 4 Nov 20:45, so Vince may set it. Until it is set nothing writes to Books or sends |
| `DEMO_AGE_DAYS` | `3` |
| `DEMO_SEND_DELAY_MINUTES` | `0` |
| `ENABLE_JOBS` / `ENABLE_POLLING` | `false` for the demo; the brief is composed from the page |
| `ENRICHMENT_ALLOWED_HOSTS` | The hostnames serving the ten shop pages |

`npm run doctor` lists any key still missing, by name only.

## 5. Data, Books seed and first boot (in this order)

The app fingerprints its dataset on first boot and refuses a changed one afterwards, so finish the mapping before the first `npm start`.

1. Shift the pack's dates onto the demo clock. The target is the recording day plus `DEMO_AGE_DAYS`: recording Wed 4 Nov with 3 gives Sat 7 Nov. A Saturday is fine because the brief is composed from the page; scheduled briefs only run on weekdays.

   ```bash
   node data/candidate-v1/shift-dates.mjs 2026-11-07
   ```

2. Seed Books. The dry run needs no keys and prints the plan; the real run needs Zoho keys and `SYNTHETIC_DATA_APPROVED=true`. It creates only what is missing, so a re-run after an error resumes. It writes the Books IDs into `data/candidate-run/synthetic.json` and prints the three account IDs for `.env`.

   ```bash
   node scripts/seed-books.mjs --dry-run
   ```

   ```bash
   node scripts/seed-books.mjs
   ```

   It ends by reading back cash and owed: expect £2,875.00 and £622.50. If cash is £80 short, the stall sale landed in Undeposited Funds; the script names the receipt to fix in Books.
3. Point each lead's `website` in `data/candidate-run/synthetic.json` at its hosted shop page (pack README §6 step 5).
4. Promote the run copy, then boot.

   ```bash
   cp data/candidate-run/synthetic.json data/synthetic.json
   ```

   ```bash
   npm start
   ```

## 6. Deploy on Railway

The app is live at **https://followthrough-production.up.railway.app**: project `followthrough` on Vince's Railway account, one service, region EU West (Amsterdam). Set up 3 Nov.

### How it is wired

- **Source.** Railway builds from `geekayjahan/followthrough`, branch `main`, root `/app`, with `app/Dockerfile`. Railway reads repos through its GitHub App, which only the account owner can install, so GK installed it on her account for this repo on 4 Nov; until then the service built from a private mirror, `VJDiPaola/followthrough`, which is kept as a fallback and no longer deploys. A push to `main` that touches `app/` redeploys; other pushes do not.
- **Service settings** live on the service, not in a file: health check `/health` (60 s), restart on failure (5 retries), one replica, never sleeps.
- **Volume** `followthrough-data`, mounted at `/data`. The image sets `DATA_DIR=/data/run`, so the SQLite file and `logs/actions.jsonl` live there; the committed `data/` folder ships inside the image. The image also sets `HOST=0.0.0.0` and `TRUST_PROXY=true`, and Railway supplies `PORT`.
- **Variables already set:** `APP_URL` (the address above), `APP_LIVE=false`, `ENABLE_JOBS=false`, `ENABLE_POLLING=false`, `DEMO_AGE_DAYS=3`, `DEMO_SEND_DELAY_MINUTES=0`, `MODEL_BASE_URL`, `MODEL_NAME`.

### Shipping a change

Push to `main` on GK's repo; Railway builds it.

```bash
git push origin main
```

If the GitHub link ever breaks, point the service back at `VJDiPaola/followthrough` and push `main` there too.

### Still to do by hand

1. **Secret keys.** Railway, service `followthrough`, Variables. `OWNER_PASSWORD`, `MODEL_API_KEY` and `VOICE_TRANSCRIBE_KEY` are in (4 Nov); add each WhatsApp and Zoho key from §2 to §4 as it arrives. Never `HOST`, `PORT` or `APP_URL`; those are set. Saving redeploys. Until `OWNER_PASSWORD` is in, login refuses everyone with "owner setup incomplete".
2. **WhatsApp webhook.** §2 step 7 with callback `https://followthrough-production.up.railway.app/webhooks/whatsapp` and the same verify token as `WHATSAPP_VERIFY_TOKEN`. A GET without the token returns 403, which is correct.
3. **Check.** `/health` returns `{"ok":true}`, the address shows "Owner sign in", and your password gets in.

### Final deploy (after §5, when the data is promoted)

The first boot fingerprinted the starter dataset into `/data/run`, and the app refuses a changed dataset, so the promoted pack needs a clean folder. Order matters:

1. In Variables, add any keys that arrived since (`CASH_ACCOUNT_ID`, `EXPENSE_ACCOUNT_ID`, `STALL_CUSTOMER_ID`, Zoho, WhatsApp, and `SYNTHETIC_DATA_APPROVED=true` once GK approves the pack).
2. Set `DATA_DIR=/data/run2` **without deploying** (Railway stages the change; do not click Deploy, or Claude sets it with deploys skipped). A deploy at this point would fingerprint the old pack into the new folder.
3. Commit the promoted `data/synthetic.json` and push `main`. The deploy that push triggers boots the new pack on a clean database; `/data/run` stays on the volume as the rehearsal record.
4. Check `/health`, log in, and confirm the dashboard shows the candidate pack's loops before recording.

Keys never go into the image or any repo: they live in `app/.env` locally and in Railway Variables when hosted. `app/.dockerignore` keeps `.env` out of the image.

# Setup interview

Paste everything below this line into whichever coding agent you use, from the repo root, on a checkout of `claude/amazing-mayer-0gknmk` (or `main` once merged). It makes the agent interview you instead of assuming.

---

You are helping set up Followthrough, a hackathon build, on my machine. Before doing anything, read `CLAUDE.md`, `app/CLAUDE.md`, `app/spec.html` (section 6, Tech stack, and Open Questions), `app/app-spec.json` (`remaining_open`), `app/.env.example`, `app/README.md`, `docs/build-review.md` section 5 and section 6, and `docs/mindpalace.md` section 7.

Then interview me, one question at a time, until every open item below has an answer or an explicit "later". Do not guess, do not fill a value you were not given, and never ask me to type a secret into the chat: when a key is needed, tell me the exact variable name, I put it in `app/.env` myself, and you verify with `npm --prefix app run doctor` (which prints only names, never values).

Open items, in the order to ask:

1. Who I am in this setup: GK or Vince, my machine OS, my Node version (`node --version`; the app needs 22.5 or newer and prefers 24), and which agent you are.
2. Which role split GK and Vince agreed, if any. If none, record "open" and continue.
3. WhatsApp Cloud API: do we have a Meta app with a test phone number? Which number is GK's, which is Vince's, which three numbers play customers? Each must be verified on the test recipient list. Variables: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `GRAPH_API_VERSION`, `WHATSAPP_TEST_NUMBERS`, `WHATSAPP_OWNER_NUMBERS`.
4. Hosting: where will the process run so WhatsApp can reach `POST /webhooks/whatsapp` over HTTPS? The host needs a long-lived process, a disk that survives restarts (SQLite and `logs/actions.jsonl`), and the ability to run the bundled ffmpeg. Ask what I already know how to operate; do not recommend a vendor unless I ask. Record the public URL in `APP_URL`.
5. Zoho: a fresh dummy Zoho Mail account and a fresh Zoho Books organisation, never the real Kāma ones (decided 29 Oct). Region, client id and secret, refresh token, Mail account and inbox folder ids, Books organisation id, expense account id, cash account id, stall customer id. Ask whether Books contacts and items for the synthetic data exist yet; their ids go into `app/data/synthetic.json` (`books_contact_id`, `books_item_id`).
6. Model: Spark Open on Baseten was chosen (`MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`). Ask me to confirm the exact model id from the Baseten dashboard and whether it accepts `response_format: json_object` and image input; if not, a second hosted Muse Spark endpoint handles receipt photos. `VOICE_TRANSCRIBE_KEY` comes from dev.meta.ai.
7. Synthetic data: is `app/data/synthetic.json` still the four-org starter? Who is writing the real one, by when, and where do the fake shop pages live (hosts for `ENRICHMENT_ALLOWED_HOSTS`)? The data brief is in `docs/build-review.md` section 5.
8. Demo: which path do we show (WhatsApp-only counterparts, or email too), on whose phone, and which five moments. Record the answers in `docs/demo-plan.md` (create it).
9. Flags, last: `SYNTHETIC_DATA_APPROVED`, `ENABLE_JOBS`, `ENABLE_POLLING`, `DEMO_AGE_DAYS`, `APP_LIVE` (stays `false`).

After the interview: write every answer and every "later" into `docs/decisions.md` with the date and who answered, update the matching rows in `app/spec.html` section 6 and `app/app-spec.json` `remaining_open`, run `npm --prefix app install`, `npm --prefix app test`, `npm --prefix app run doctor`, and append one trace line per artifact with `node scripts/trace.mjs S2.INITIALIZER "<artifact> landed" "<why>"`. Commit on a branch named after yourself and push. Do not merge to `main`.

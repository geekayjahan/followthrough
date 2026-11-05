# Followthrough

**The back office for owners who run their business from WhatsApp.** It watches every open deal, drafts the next move in the owner's voice, and waits for a yes.

Our entry to the Meta Global AI Developer Hackathon (Startup track), built on **Muse Spark Open**, **Muse Voice Transcribe** and the **WhatsApp Cloud API**.

- Demo video (3 min): [link]
- Live app: [link]

## The problem

A small B2B sale is a chain of follow-ups: a sample, a quote, an order, an invoice. Owner-operators with no sales or finance staff carry that chain in their head, across WhatsApp, email, the accounting tool and a spreadsheet. Nothing says which deal is going cold, so the one they forget is the one that leaks.

User one is GK, who imports Indian green coffee for UK roasters and sells at a market stall.

## What it does

- **Chase.** Tracks every open loop (lead, sample, quote, order, invoice, receipt, stock lot, stall day) and spots the cold ones. A weekday brief lands in WhatsApp at 08:00 and 18:00, warm leads first, each item a drafted next move. The owner approves with a tap, a "yes" or a voice note.
- **Grow.** Paste a shop's web page and it qualifies the lead: price tier against the specialty bar, whether Indian coffee is already on the shelf, every fact with its source quote. It finds a warm path through an existing customer or stockist, and the first draft names it.
- **Ask.** Questions about the business are answered from the books and loops, with a source on every line. Things it should not do, like filing a VAT return, get a plain refusal and the nearest step it can take.
- **Capture.** A voice note at the end of a stall day is read back, then on a yes the sale lands in Zoho Books and the lot's stock drops. Receipt photos become expenses after review.
- **Where I stand.** One page with cash, owed, stock per lot, what is due today and what leaked.

## How it uses Meta models

| Model | Job |
|---|---|
| Muse Spark Open (open weights, on Baseten) | Drafts in the owner's voice, reads her replies as approve, edit or question, splits one message into captured items, qualifies leads from shop pages, reads receipt photos, answers Ask |
| Muse Voice Transcribe | Voice-note approvals and stall cash-ups |
| WhatsApp Cloud API | Briefs, cards, approvals and customer follow-ups, through signed webhooks |

Every model call logs the model id and token usage.

## Safe by design

Nothing reaches a customer or the books without the owner's approval, and each approval binds to one exact draft: edit it and the old yes can no longer send it. It never moves money, and a write whose outcome is uncertain is held for review, never retried blind. Every safeguard, the known open findings and the reasoning behind each decision are in [docs/decisions-and-safeguards.md](docs/decisions-and-safeguards.md).

The demo runs on a test copy of Kāma Coffee: the brand, lots and prices are real, and every customer, person, invoice and message is fictional. Emails use `example.test`, WhatsApp goes only to test numbers, and Books is a fresh test organisation. No real customer appears anywhere.

## Run it

Node 22.5 or newer. Keys go in `app/.env` only (template in `app/.env.example`).

```bash
npm --prefix app install
```

```bash
npm --prefix app test
```

```bash
npm --prefix app start
```

Full setup, from keys to the Books seed: [docs/setup-keys.md](docs/setup-keys.md). App details and recovery: [app/README.md](app/README.md).

### Where each key comes from

When hosted, values live only in Railway Variables (service `followthrough`). This table lists names and sources, never values. Whose account each service lives on, the non-secret IDs and what is already set: [docs/accounts-map.md](docs/accounts-map.md).

| Service | Variables | Source |
|---|---|---|
| Meta Model API (Muse Spark, Voice Transcribe) | `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`, `VOICE_TRANSCRIBE_KEY` | dev.meta.ai, the team's Model API account |
| WhatsApp Cloud API (test number) | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `GRAPH_API_VERSION`, `WHATSAPP_TEST_NUMBERS`, `WHATSAPP_OWNER_NUMBERS` | developers.facebook.com, a separate test app and business portfolio. The verify token is chosen by us. Recipients are owner phones only. |
| Zoho Books and Mail (test organisation) | `ZOHO_REGION`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_BOOKS_ORG_ID`, `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_MAIL_INBOX_ID`, `ZOHO_MAIL_FROM`, `MAIL_FROM_COFFEE`, `OWNER_TEST_EMAILS` | A Zoho account that holds only the test organisation, never the real books or inbox |
| Books seed | `CASH_ACCOUNT_ID`, `EXPENSE_ACCOUNT_ID`, `STALL_CUSTOMER_ID` | Seed script, [docs/setup-keys.md](docs/setup-keys.md) §5 |
| App | `OWNER_PASSWORD` | Chosen by the owner |

## How it was built

By spec engineering with Claude Code. The spec came first, then a build split into 28 features, each tied to a spec line and the checks that prove it. 91 automated checks pass.

| Read this | For |
|---|---|
| [app/spec.html](app/spec.html) | The spec: problem, outcomes, constraints, acceptance checks |
| [app/feature-list.json](app/feature-list.json) | The 28 features and what proves each |
| [app/claude-progress.txt](app/claude-progress.txt) | One line of reasoning per decision |
| [app/checks/](app/checks/) | The automated checks |
| [docs/demo-video-script.md](docs/demo-video-script.md) | What the video shows |

Everything under `app/` was built during the hackathon. GK's earlier coffee-business trackers are prior work and none of their code is here.

## Team

- GK
- Vince DiPaola

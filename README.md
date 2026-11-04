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

Nothing reaches a customer or the books without the owner's approval, and each approval binds to one exact draft: edit it and the old yes can no longer send it. Approved messages wait in an undo window. It never moves money. A write whose outcome is uncertain is held for review, never retried blind. Every brief, approval, send and Books write is logged to `app/logs/actions.jsonl`.

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

When hosted, values live only in Railway Variables (service `followthrough`). This table lists names and sources, never values.

| Service | Variables | Source |
|---|---|---|
| Meta Model API (Muse Spark, Voice Transcribe) | `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`, `VOICE_TRANSCRIBE_KEY` | dev.meta.ai, the team's Model API account |
| WhatsApp Cloud API (test number) | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `GRAPH_API_VERSION`, `WHATSAPP_TEST_NUMBERS`, `WHATSAPP_OWNER_NUMBERS` | developers.facebook.com, a separate test app and business portfolio. The verify token is chosen by us. Recipients are owner phones only. |
| Zoho Books and Mail (test organisation) | `ZOHO_REGION`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_BOOKS_ORG_ID`, `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_MAIL_INBOX_ID`, `ZOHO_MAIL_FROM`, `MAIL_FROM_COFFEE`, `OWNER_TEST_EMAILS` | A Zoho account that holds only the test organisation, never the real books or inbox |
| Books seed | `CASH_ACCOUNT_ID`, `EXPENSE_ACCOUNT_ID`, `STALL_CUSTOMER_ID` | Seed script, [docs/setup-keys.md](docs/setup-keys.md) §5 |
| App | `OWNER_PASSWORD` | Chosen by the owner |

## How it was built

By spec engineering with Claude Code, using the Product Builder Kit below. The spec came first, then a build split into 28 features, each tied to a spec line and the checks that prove it. 86 automated checks pass.

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

---

*Below is the README of the Product Builder Kit this app was built with.*

# Workshop #2 — Student Kit

**The Product Builder Certification: From Vibe Coding to Spec Engineering**

Ask an AI for "the best options" and it doesn't fail. It returns stale results, the wrong scope and invented sources, and never tells you the ask was underspecified. It's trained to please you, so it guesses. **AI doesn't fail, it drifts.** The cure isn't a better model. It's a spec.

That's the workshop in one line: **the spec is the product; code is the disposable thing you regenerate from it.**

---

## Start here

1. **First** (20 min): install [Claude Code](https://claude.com/claude-code) and sign in · install [Node.js LTS](https://nodejs.org) and [git](https://git-scm.com) · run `claude` from the kit's root and type `/` — seeing the workshop skills (`/spec`, `/build`, `/eval`, `/surgical-fix`, `/strip`, and the four tools) is the whole check. Opus 5.5 starts at medium effort; the skills that read more than they write (`/spec`, `/ambiguity-audit`, `/eval`, `/strip`) set themselves to high.
2. **Then start the kit server** — `node scripts/serve.mjs` from the kit's root, in its own terminal, left running the whole session. Open [`http://localhost:4000/build-assistant.html`](http://localhost:4000/build-assistant.html): every tile grey is the correct first look, because nothing is built yet. The server is what lights those tiles and carries your notes back to the build — open the dashboard as a file instead and both go dead.
3. Show up with your laptop. We build everything live.

---

## The arc — five sessions

```
S1  Spec     →  interview to a sharp problem, write the spec       spec.html · evals.md · CLAUDE.md · spec-summary.json
S2  Build    →  three agents turn the spec into a running app      feature-list.json · app-spec.json · app/
S3  Eval     →  the review panel grades the build, pass/fail       eval-results.html
S4  Debug    →  one change, re-run, receipt — per bug              debug-log.html
S5  Strip    →  a new model ships; cut what the traces say is dead recall-notice.html · strip-page.html
```

One trace — `claude-progress.txt` — collects the *why* behind every decision. Each session reads it.

---

## What each session teaches

**S1 — Spec** · [blueprint](modules/s1-working-backwards/working-backwards-blueprint.md)
Two steps: the AI interviews *you* — one question at a time, until the problem is sharp, solution-free, and every fuzzy word is pinned — then it writes the spec. Six parts: the problem, what good looks like, inputs & interfaces, out of scope, the acceptance checks, and the tech stack. It says *what* must be true; the build works out *how*. Lean, and living — it updates as you learn.

**S2 — Build** · [blueprint](modules/s2-build/build-blueprint.md)
Three subagents in a line: one breaks the spec into features (each citing the spec line it serves), one pins the shared foundation (and **stops if a credential is missing**), one codes feature by feature — each committed and traced. Nothing gets invented that the spec didn't ask for.

**S3 — Eval** · [blueprint](modules/s3-eval/eval-blueprint.md)
The build faces the panel it would face on a real team — QA, architect, security, the customer, a data reviewer. Each raises their hard question, **encoded as a binary check** (every link opens · no data leaks · every claim traces back to its source). An independent judge — not the builder, and a file you can open (`.claude/agents/judge.md`) with no power to edit a check — grades them. Any fail holds the ship. And honestly: these reviewers are simulated, not real audits — for money, data, or safety, a human still signs off.

**S4 — Debug** · [blueprint](modules/s4-debug/surgical-fix-blueprint.md)
For each failed check: locate it, name the layer (spec · screen · tech stack · prompt · data), make **one** change, re-run *every* check, log the receipt. The opposite of vibe-coding, where five changes go in at once and nobody knows which one worked.

**S5 — Strip** · [blueprint](modules/s5-strip/strip-blueprint.md)
A new model ships (Opus 5.5 did, on 2026-09-22) and some of your scaffolding just became dead weight. `/doctor prompt-audit` drafts the recall notice; you re-inspect every scaffold, gather proof from the traces, and cut — only with your sign-off, never on a hunch.

---

## The tools — for when the path gets fuzzy

| Command | What it does |
|---|---|
| `/ambiguity-audit` | Finds the words in your spec the AI could read two ways — before the build. |
| `/bar-raiser` | Four checks (customer · data · bet · owner) on any doc before you send it. |
| `/deep-dive` | 5 Whys to a fixable root cause when you can't see the layer. |
| `/explain` | Interrogates the build against the spec — where does each requirement live, what breaks if you change it. Not a summary. |

---

## How it runs

Type the skill's slash command → it reads its blueprint in `modules/` → the artifact appears in `app/`. Nothing is shown that wasn't built live.

| Command | Produces |
|---|---|
| `/spec` | `spec.html` · `CLAUDE.md` · `spec-summary.json` · `evals.md` |
| `/build` | `feature-list.json` · `app-spec.json` · the source under `app/` |
| `/eval` | `eval-results.html` — scorecard · traces · patterns · actions |
| `/surgical-fix` | `debug-log.html` — one receipt per fix |
| `/strip` | `recall-notice.html` · `strip-plan.html` · `strip-page.html` |

The four rules every blueprint follows (the trace, rendering, doors, CLAUDE.md) are in [`modules/shared-rules.md`](modules/shared-rules.md). Every prompt from the workshop, in run order, is in [`resources/session-prompts.md`](resources/session-prompts.md) — paste your way through the whole build solo. And if the words doing the heavy lifting above — *agent*, *harness*, *subagent*, *context* — are ones you'd struggle to define out loud, [`resources/terminology.md`](resources/terminology.md) defines each one against a file in this kit.

---

## Your app

The kit ships with no app. Bring a problem you can describe in one sentence; `/spec` interviews you until it's sharp, and everything after builds from that spec. Try it first with a vague prompt and watch it drift, then with the spec and watch it hold.

---

## Your kit

```
product-builder-kit/
├── README.md                 (this file)
├── build-assistant.html      (the build, live — tiles light up, tasks tick, notes feed the builder)
├── modules/                  (the blueprints — what each session runs)
│   └── shared-rules.md       (the four rules every blueprint follows)
├── scripts/serve.mjs         (the kit server — dashboards + the comment pipe)
├── scripts/trace.mjs         (writes a trace line with the real clock)
├── resources/workshop-guide.html  (the teaching guide — Overview · Sessions · Reference · Context)
├── resources/terminology.md  (what is what in AI terms — agent · harness · model · context)
├── .claude/                  (the skills, plus agents/judge.md for S3)
├── .env.example              (copy to .env; keys go in during S2)
└── app/                      (starts empty — everything the workshop produces goes here)
```

---

## Security

- **Your data stays local.** The app processes it on your machine; nothing leaves except the model calls and API requests you run yourself, and the eval's security check ("no PII in output") holds that line.
- **Keys live in `.env`**, which is gitignored. Never paste a key into a spec, a comment, or the chat — the credential checkpoint will ask for it in the right place.
- **The kit server binds to localhost only.** Comments are a plain local file (`app/comments.json`) — nothing is exposed to the network.
- **Simulated reviewers aren't audits.** The eval's security reviewer is a teaching device. For money, data, or safety, a human still signs off.

---

## The fine print

Educational: the kit teaches spec engineering. Whatever you build with it, live data can be stale or wrong the moment it's fetched, so verify anything that matters at its source before acting on it.

---

## Go deeper — a short list, on purpose

- *Building effective agents* — Anthropic's canonical patterns. → https://www.anthropic.com/engineering/building-effective-agents
- *Effective harnesses for long-running agents* — what S2's three-agent chain borrows. → https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- *Effective context engineering for AI agents* — why small context wins. → https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- *Working Backwards* (PR/FAQ) — the spec philosophy S1 borrows. → https://coda.io/@colin-bryar/working-backwards-how-write-an-amazon-pr-faq
- *Your AI Product Needs Evals* — why the checks are the load-bearing artifact. → https://hamel.dev/blog/posts/evals/
- *A Field Guide to Rapidly Improving AI Products* — the obsession is measurement, not tools. → https://hamel.dev/blog/posts/field-guide/
- *The Three Gulfs* — comprehension · specification · generalization, the failure map S3 reads by. → https://hamel.dev/notes/llm/data-processing/shreya-data-processing.html
- *Error-analysis skill* — the discipline behind S3's second pass. → https://github.com/hamelsmu/evals-skills
- *Error-discovery skill* — human annotation with diverse sampling, the TRACES tab's pattern. → https://github.com/shreyashankar/error-discovery-skill
- *HTML is the new Markdown* — why the artifacts render as HTML. → https://www.lennysnewsletter.com/p/how-i-ai-html-is-the-new-markdown

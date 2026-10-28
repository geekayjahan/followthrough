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

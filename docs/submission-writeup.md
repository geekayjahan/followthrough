# Submission write-up

Draft for the Cerebral Valley form, Meta Global AI Developer Hackathon, due Wed 4 Nov 2026 21:00 ET. Sections follow the usual CV fields; the form itself sits behind the CV login, so paste each section into whichever field matches and trim to its limit. Square brackets are things to fill or confirm before submitting.

Every claim below is true of the repo today, except the lines marked *after recording*: those hold only once the live run in the video has happened.

---

## Name

Followthrough

## Tagline

The back office for owners who run their business from WhatsApp. It watches every open deal, drafts the next move in the owner's voice, and waits for a yes.

## Track

Startup

## The problem

A small B2B sale is a chain of follow-ups: a sample, a quote, an order, an invoice. Owner-operators with one to twenty people and no sales or finance staff carry that chain in their head, across WhatsApp threads, email, the accounting tool and a spreadsheet. Nothing tells them which deal is going cold, so the one they forget is the one that leaks. New leads get the same blanket message whether or not they already know one of the owner's customers.

User one is GK, who imports Indian green coffee for UK roasters and sells at a market stall. Her customers answer on WhatsApp. Her books are in Zoho. Her follow-ups were in her head.

## What it does

Followthrough holds the whole commercial picture and does three jobs.

**Chase.** It tracks every open loop: lead, sample, quote, order, invoice, receipt, stock lot, stall day. A lead untouched for three days is cold. An invoice is cold the day after it falls due. A lot is low under 20% of its starting weight. A stall day with no cash-up by 21:00 is flagged. At 08:00 and 18:00 on weekdays the owner gets a brief in WhatsApp, warm leads first, each item a drafted next move written in her voice. She approves with a tap, a "yes", or a voice note replying to the card.

**Grow.** Paste a shop's web page and it qualifies the lead before anyone writes to them: retail price against the specialty bar (£8 per 250g), shelf tier, whether Indian coffee is already stocked. Every fact keeps the exact quote and source URL it came from. It then looks for a warm path, one or two steps from the lead to an existing customer, supplier or stockist. Warm leads rank first and the first draft names the connection.

**Ask.** "It's tax season, what am I missing?" gets a list built from her books and loops, with a source on every line. "Just file my VAT return" gets a plain refusal and the nearest thing it can do.

Around those jobs: a voice note at the end of a stall day ("sold six 250g bags of lot 2, £120 cash") is read back, and on her yes the sale lands in Zoho Books and the lot drops 1.5 kg. A missing bag size gets a question, never a guess. Receipt photos become expenses after review. One page shows cash, owed, stock per lot, what is due today and what leaked.

## How it uses Meta models

- **Muse Spark Open** (open weights, served on Baseten through an OpenAI-compatible endpoint) does the reasoning: drafts in the owner's voice, grounded in her signed-off voice file and the thread so far; reads her WhatsApp replies as approve, edit or question, with a 0.8 confidence floor before a reply counts as a yes; splits one owner message into several captured items; qualifies leads from shop pages with a quote behind every fact; reads receipt photos; answers Ask questions from the store. Every call logs the model id and token usage.
- **Muse Voice Transcribe** (`muse-voice-transcribe-1.0`) turns voice notes into approvals and cash-ups. Audio is normalised to mono WAV first; a note over two minutes is rejected, never cut short.
- **WhatsApp Cloud API** is the surface: briefs, cards, approvals and customer follow-ups, with signed webhooks.

We entered for the open-weights bonus on the strength of Spark Open: every model call in the app goes to it except transcription.

## Why it is agentic, and why that is safe

The agent decides what each loop needs next, writes it, and acts across WhatsApp, Zoho Mail and Zoho Books. The owner's job shrinks to deciding.

Nothing reaches a customer or the books without her approval, and an approval binds to one exact draft. Each pending action carries a version hash; editing a draft issues a new card and the old yes can no longer send it. Approved messages are held with an undo window. A refusal in a voice note, an ambiguous yes, a stale card or a replayed webhook cannot send. It never moves money: Books writes are limited to sales, expenses, customer payments and items. If a write starts and the outcome is uncertain, the action is held for reconciliation and never retried blind.

## Technical depth

- Node 22 ESM with `node:sqlite`; the only runtime package is `ffmpeg-static`.
- Every Books write carries an `FT-<action id>` reference and is read back before it counts.
- Stock reservations never exceed free kilograms, so two approvals cannot sell the same coffee twice.
- Lead pages come only from an allowlist of hosts; retrieval pins validated DNS and rechecks redirects.
- Every brief, approval, send and Books write lands in an append-only action log with timestamps.
- 86 automated checks pass, alongside an adversarial review probe and a secret scan of the publishable source.

It was built by spec engineering with Claude Code. The spec (`app/spec.html`) came first, with its acceptance checks. The build was split into 28 features, each naming the spec line it serves and the checks that prove it (`app/feature-list.json`). Every decision left a one-line reason in `app/claude-progress.txt`. The repo shows the whole trail.

## Data

The demo runs on a synthetic company, Monsoon & Ghats Green Coffee (Synthetic Test Co.): twelve organisations, fourteen people, three coffee lots, a fresh Zoho Books organisation seeded by script, emails under `example.test`, and WhatsApp messages only to the Cloud API test numbers. No real customer appears anywhere. The app refuses to write or send until the data pack is approved, and every send goes to the test lists until a live switch is set by hand.

## What is new

Everything under `app/` was built during the event; the first commit is 28 Oct 2026. Before the event GK ran an early version for her coffee business as a set of separate trackers. That prototype is context only: none of its code is in this repo.

## What we learned

The hard part was making "yes" safe. A voice note saying "yes, send it" has to mean one draft, so approvals bind to the card being replied to and its exact version. Next was time: a demo has to show deals going cold, so the app has a demo clock that ages loops without touching the dates in the books.

## What's next

- Warm paths from public Instagram business signals (tags, mentions, stockist pages) through the official Business Discovery API.
- Muse Glimmer as a local mode for owners who keep their books on their own machine.
- A real WhatsApp Business number, and GK's own business as the first live user once the lawful basis for live sends is confirmed.
- More loop types for trades and service businesses: bookings, deposits, call-outs.

## Team

- GK: founder of the coffee business, user one, product owner and spec. [confirm wording]
- Vince DiPaola: build. [confirm wording]

## Links

- Repo: https://github.com/geekayjahan/followthrough [must be public before submitting]
- Demo video: [link, tested while logged out]
- Live product: [deployed URL] *after recording*

---

## Before pasting

1. Settled 3 Nov: Spark Open on Baseten read the synthetic receipt image correctly, every field matching the pack, so "every model call goes to Spark Open except transcription" holds and no Muse Spark 1.3 fallback is needed.
2. The video's title card says "Built 26 Oct to 4 Nov" and the close says "ten days". The first `app/` commit is 28 Oct. GK should pick one framing and use it in both places.
3. The repo's root `README.md` is still the Product Builder Kit's workshop README, so a judge opening the repo lands on the workshop, not Followthrough. It needs a Followthrough section on top: what it is, the Meta models, how to run, team, video link.
4. Vince must be on the CV team before the form will list him.

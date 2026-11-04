# Submission write-up

Answers for the Cerebral Valley submission form, Meta Global AI Developer Hackathon, due Wed 4 Nov 2026 21:00 ET (02:00 UK, 5 Nov). The headings in part 1 are the form's own fields, in the form's order, as read from the live form on 4 Nov. Each long answer is plain text under its 3,000-character limit, so it can be pasted as it stands.

The impact figures, the reasons for choosing Meta's models, the customer channels and the team roles come from GK's answers on 4 Nov. Everything else is true of the repo at commit 1b839f0.

---

## Part 1: form answers

### Team Name

Followthrough

### Which track are you submitting to?

Startups Track

### Which problem statement did you build towards?

Build for Your World

### X post link (Most Viral)

[paste after the thread in docs/x-post.md is posted]

### Project Description

Followthrough is the back office for owners who run a small business from their phone. It watches every open deal, drafts the next move in the owner's voice, and waits for a yes.

THE PROBLEM
A small B2B sale is a chain of follow-ups: a sample, a quote, an order, an invoice. Owner-operators with one to twenty people and no sales or finance staff carry that chain in their head, across WhatsApp, email, the accounting tool and a spreadsheet. Nothing tells them which deal is going cold, so the one they forget is the one that leaks.

User one is GK, who imports Indian green coffee for UK roasters and sells at a market stall. She sends at least 50 follow-ups a week by hand. Her customers reply by email or WhatsApp, her books are in Zoho, and the follow-ups were in her head. In October two cafes owed her £340 that was 50 days overdue.

WHAT IT DOES
Chase. It tracks every open loop (lead, sample, quote, order, invoice, receipt, stock lot, stall day) and spots the cold ones. On weekdays at 08:00 and 18:00 a brief lands in WhatsApp, warm leads first, each item a drafted next move in her voice. She approves with a tap, a "yes" or a voice note, and the follow-up goes out by email or WhatsApp, whichever that customer uses.

Grow. Paste a shop's web page and it qualifies the lead: price tier, whether Indian coffee is already on the shelf, and a warm path through an existing customer or stockist. Every fact keeps the quote and URL it came from.

Ask. Questions about the business are answered from the books and the loops, with a source on every line. A request it should not act on, such as filing a VAT return, gets a plain refusal and the nearest step it can take.

Capture. A voice note at the end of a stall day is read back, and on her yes the sale lands in Zoho Books and the stock drops. If the bag size is missing, it asks before it books anything.

WHY IT IS SAFE TO LET IT ACT
Nothing reaches a customer or the books without the owner's approval, and each approval binds to one exact draft. Edit the draft and the old yes can no longer send it. It never moves money, and a write whose outcome is uncertain is held for review and never retried blind.

WHAT IS NEW
Everything under app/ was built during the hackathon, starting with the first commit on 28 Oct 2026. Before the event, GK ran a set of separate trackers for her coffee business that turned cold roaster leads into warm buyers in four days. That prototype is why we built this, and none of its code is in the repo.

DATA
The demo runs on a test copy of the business. The brand and its coffee lots are real. Every customer, person, invoice and message is fictional, and the app is connected only to test accounts.

LIVE APP
https://followthrough-production.up.railway.app
The workspace is owner-only by design, because anyone signed in can approve sends. The video is the walkthrough, and we are glad to demo it live on request.

### Public GitHub Repository

https://github.com/geekayjahan/followthrough

### 3-Minute Demo Video

[paste the link, tested while logged out]

### Describe your use of Meta products to build the submitted project

Three Meta products do the core work, and the app calls no other model.

MUSE SPARK OPEN (open weights, served on Baseten through an OpenAI-compatible endpoint) does all the reasoning.
- It drafts follow-ups in the owner's voice, grounded in her signed-off voice file and the thread so far.
- It reads her WhatsApp replies as approve, edit or question. A reply counts as a yes only at a confidence of 0.8 or more. Anything less becomes a question back to her.
- It splits one owner message into several captured items.
- It qualifies leads from shop pages, with an exact quote behind every fact.
- It reads receipt photos. It read our test receipt correctly on the live key, so one model covers text and images.
- It answers Ask questions from the books and the open loops.

MUSE VOICE TRANSCRIBE (muse-voice-transcribe-1.0, through the Meta Model API) turns voice notes into approvals and stall cash-ups. Audio is normalised to mono WAV first. A note longer than two minutes is rejected in full, so a cut-off instruction can never be acted on. When the owner replies to a card with "Yes, send it", the app tells her what it heard before anything leaves.

WHATSAPP CLOUD API is the owner's whole interface: the brief at 08:00 and 18:00, the cards, approvals by tap, text or voice, and follow-ups to the customers who use WhatsApp. Webhooks are verified by signature, replays are blocked, and only owner numbers can approve.

HOW WE WORKED WITH THE MODELS
Every model call writes the model id and token usage to an append-only action log, so a reviewer can confirm which model did which job.

Our first live call to Spark Open returned nothing, because the model spent its whole token budget on reasoning. We gave it reasoning headroom and made an empty or cut-off answer a hard error. A model failure can therefore never turn into an invented draft, receipt or balance.

Customer messages and web pages are passed to the model as untrusted evidence and never as instructions. A draft that quotes a price missing from the owner's own price list is blocked and turned into a question for her.

OPEN WEIGHTS
We are entering for Best Build on Open Weights. Every model call in the app goes to Spark Open, except transcription.

NOT BUILT YET
Muse Glimmer as a local mode on the owner's own machine, and warm introductions from public Instagram business signals, are next on the roadmap. Neither is in this submission.

### Why are Meta's models important to your solution?

Followthrough has to do three things at once for a small business owner: let her run it by talking, earn her trust with the books, and cost little enough to use on every deal. Meta's models are what make those three possible together.

VOICE IS HOW THE OWNER WORKS
GK imports coffee and runs a market stall. At the end of a stall day her hands are full and she will not type a cash-up. She sends a voice note in WhatsApp: "Sold six 250g bags of lot 2, 60 pounds cash." Muse Voice Transcribe turns the note into text, Muse Spark Open turns the text into a sale, and the app reads it back before it writes to the books. Her approvals travel the same way. A spoken "yes, send it" releases one exact draft to one customer, so the product stands on transcription that is accurate enough to act on.

OPEN WEIGHTS ARE WHY SHE CAN TRUST IT WITH THE BOOKS
The agent sees prices, margins, invoices and who owes what. GK does not want that held by a closed model she cannot inspect or move. Spark Open is open weights, so the same model can run on infrastructure the owner or her accountant controls. Today we serve it on Baseten. Muse Glimmer as a local mode on the owner's own machine is the next step, and it is possible only because Meta publishes the weights.

COST DECIDES WHETHER THIS IS A PRODUCT
GK sends at least 50 follow-ups a week. Each one needs the model to read a thread, check her price list and draft in her voice. A business of one to twenty people cannot pay enterprise prices for that. Open weights let us choose where the model runs and what it costs. Every call logs its token usage, so the cost of a single follow-up can be read from the log.

THE STACK IS THE POINT
The app calls Spark Open through a standard endpoint, so the reasoning model alone could be swapped. The combination could not: an open-weights model for reasoning, a speech model good enough to act on, and WhatsApp as the place the owner already spends her day, all from one provider. Most personal assistants sit in a separate app and wait to be asked. Here the brief, the draft, the voice note and the yes all happen in one chat she already has open, and the customers who use WhatsApp are chased there too.

WHAT THIS MAKES POSSIBLE
The theme asks for a problem we know firsthand. GK's follow-ups lived in her head, and the one she forgot was the deal she lost. With Meta's models she gets a back office that listens, remembers every open deal and never acts without her yes.

### Provide feedback from your experience using partner technologies

Baseten served Spark Open on an OpenAI-compatible endpoint that worked with plain HTTP. Docs should say reasoning needs token headroom.

### Ratings, recommendation scores and the permission tick box

GK answers these herself on the form. Two of the ratings are required.

---

## Part 2: reference

These sections are not form fields. They back up the answers above and can be quoted if a judge asks.

### Tagline

The back office for owners who run their business from WhatsApp. It watches every open deal, drafts the next move in the owner's voice, and waits for a yes.

### Why it is agentic, and why that is safe

The agent decides what each loop needs next, writes it, and acts across WhatsApp, Zoho Mail and Zoho Books. The owner's job shrinks to deciding.

Nothing reaches a customer or the books without her approval, and an approval binds to one exact draft. Each pending action carries a version hash; editing a draft issues a new card and the old yes can no longer send it. Approved messages are held with an undo window. A refusal in a voice note, an ambiguous yes, a stale card or a replayed webhook cannot send. It never moves money: Books writes are limited to sales, expenses, customer payments and items. If a write starts and the outcome is uncertain, the action is held for reconciliation and never retried blind.

### Technical depth

- Node 22 ESM with `node:sqlite`; the only runtime package is `ffmpeg-static`.
- Every Books write carries an `FT-<action id>` reference and is read back before it counts.
- Stock reservations never exceed free kilograms, so two approvals cannot sell the same coffee twice.
- Lead pages come only from an allowlist of hosts; retrieval pins validated DNS and rechecks redirects.
- Every brief, approval, send and Books write lands in an append-only action log with timestamps.
- 93 automated checks pass at commit 1b839f0, alongside an adversarial review probe and a secret scan of the publishable source. An offline eval run is in `app/eval-results.html`.

It was built by spec engineering with Claude Code. The spec (`app/spec.html`) came first, with its acceptance checks. The build was split into 28 features, each naming the spec line it serves and the checks that prove it (`app/feature-list.json`). Every decision left a one-line reason in `app/claude-progress.txt`. The safeguards, the open findings and the reasoning behind each decision are in `docs/decisions-and-safeguards.md`.

### Data

The demo runs on a test copy of Kāma Coffee. The brand is real; every customer, person, invoice and message is fictional: twelve organisations, fourteen people, three coffee lots, a fresh Zoho Books organisation seeded by script, emails under `example.test`, and WhatsApp messages only to the Cloud API test numbers. No real customer appears anywhere. The app refuses to write or send until the data pack is approved, and every send goes to the test lists until a live switch is set by hand.

### What we learned

The hard part was making "yes" safe. A voice note saying "yes, send it" has to mean one draft, so approvals bind to the card being replied to and its exact version. Next was time: a demo has to show deals going cold, so the app has a demo clock that ages loops without touching the dates in the books.

### What's next

- Warm paths from public Instagram business signals (tags, mentions, stockist pages) through the official Business Discovery API.
- Muse Glimmer as a local mode for owners who keep their books on their own machine.
- Meta AI as a second surface for the owner, through a Meta AI Connector.
- A real WhatsApp Business number, and GK's own business as the first live user once the lawful basis for live sends is confirmed.
- More loop types for trades and service businesses: bookings, deposits, call-outs.

### Team

- GK: founder of the coffee business, user one, product, spec and build with Claude Code.
- Vince DiPaola: build, integrations, adversarial review and deployment.

---

## Before submitting

1. The repo must be public and carry a LICENSE file. The organisers call an open source repo mandatory.
2. Paste the video link and the X post link into the two bracketed fields above and into the README.
3. The video should say "built during the hackathon". The first commit is 28 Oct, so "ten days" and "26 Oct" do not match the history.
4. `docs/x-post.md` still says "£120 cash" for the stall sale. The data pack and the video script say £60.
5. The count of automated checks moves as fixes land. Run `npm --prefix app test` before quoting it anywhere new.

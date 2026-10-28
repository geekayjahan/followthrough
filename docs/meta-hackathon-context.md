# Meta Global AI Developer Hackathon: context

## Status (26 Oct)
- GK approved and registered on Cerebral Valley (info@flywheelbygk.com). Vince is out, so GK is solo for now and looking for teammates on Discord (max team size 4).
- Track on application: Startup (UK, bootstrapped). The track can be changed at any time.
- Idea: Followthrough (see followthrough-idea.md). Topic refinement is closed.
- $150 credit claim submitted 26 Oct (account info@flywheelbygk.com). Still to do: add a card under Billing (no payment method on file yet) and set a $150 spend limit. Credits arrive within 2 business days under Billing > free credits.

## What GK submitted (application)
- Build: a back office agent for WhatsApp/Instagram small businesses. It tracks open loops (sample, quote, order, invoice, booking), spots deals going cold, drafts follow-ups in the owner's voice (WhatsApp/IG give the style context), takes approval by tap or voice note in WhatsApp or Meta AI, and chases on the customer's channel. Warm intros come from public IG signals. Stack: Muse Spark, Voice Transcribe, Glimmer (local option), Meta AI Connector. GK is user one through her speciality coffee business; the prototype turned cold roaster leads warm in 4 days.
- Technical proof: Product Builder Kit. This is spec-driven agentic building with Claude Code: a problem-probing agent, spec and evals with an independent ambiguity audit, subagents executing decomposed tasks, an evals dashboard and a debug agent. The course is in its 4th cohort, rated 4.7/5.
- Links: github.com/geekayjahan, linkedin.com/in/gayathri-keerthana. Says she has used Meta Model API before.

## Rules that affect us
- Repo must be public. Only work built during the event counts, and the demo must clearly show what is new. The coffee prototype is prior work and can only be mentioned as context.
- Must use Meta models (Muse Spark series, Wonder, Image, Voice Transcribe, SAM 3.1 via API; Glimmer or Spark Open as open weights; Muse Code).
- Submission: one per team, through the CV platform, by 4 Nov 21:00 ET (02:00 UK, 5 Nov). Needs a public repo, a 3-minute demo video, a live product, and all members listed.
- Anti-projects to avoid: basic RAG, simple image analysers, education chatbots, medical, political.

## Judging
- Stage 1, pass/fail: fits the theme and genuinely uses Meta models.
- Stage 2 rubric: Impact 30%, Use of Meta AI tooling 25%, Demo 25%, Technical depth 20%.
- Stage 3: top 5 per track judged live on 9 Nov, 12:00 ET.

## Prizes
- Indie: $150k / 100k / 75k / 50k / 25k. Startup: $250k / 150k / 75k / 50k / 25k.
- Bonuses relevant to us: Best Agentic Use-Case $5k; Best Build on Open Weights (Glimmer or Spark Open) $10k; Most Viral on X $20k (engagement up to 8 Nov); Community Vote $10k.

## Schedule (all ET)
- UK conversion: US clocks change on 1 Nov, so ET is UK minus 4 hours until then and UK minus 5 after. Kickoff is listed as "12 PM EST": that is 16:00 UK if they mean ET, or 17:00 UK if they literally mean EST (the calendar invite says 17:00 UK).
- 26 Oct 12:00: kickoff livestream.
- 27 Oct 12:00: Agents 101 (multimodal agent). 28 Oct 12:00: Agents 102 (verifiable agents). 30 Oct 12:00: Fireworks open models session.
- Weekdays 10:00 to 11:00 ET: office hours in Discord #office-hours.
- 3 Nov: last day for submission troubleshooting. 4 Nov 21:00: deadline.

## Credits
- Meta $150 each, claimed individually by 4 Nov. Credits arrive within 2 business days.
- Baseten $100 (2,000 places; use model meta-models/muse-spark-open-1026), Modal $100 (first 1,000), Fireworks $25 (selected teams).

## Links
- Event: cerebralvalley.ai/e/meta-ai-developer-hackathon (guide at /details, Discord at /discord)
- Models and docs: dev.meta.ai

## Build assessment (26 Oct)
- GK's strength is agent design and spec-driven builds with coding agents; she has no backend deployment experience. Hard parts: an always-on server, WhatsApp Cloud API setup, Connector access. Drop Instagram warm intros.
- Realistic solo scope: a daily WhatsApp brief of stalling deals from the sheet and Zoho Books, drafted chases, approval by reply or voice note, send, update the record.
- Recruit one backend developer with WhatsApp Cloud API or webhook experience via #team-search.

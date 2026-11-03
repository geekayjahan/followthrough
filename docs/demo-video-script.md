# Demo video: script and shot list

Three minutes, hard limit. Recorded Wed 4 Nov on the shifted synthetic data (`shift-dates.mjs 2026-11-07`, `DEMO_AGE_DAYS=3`, `DEMO_SEND_DELAY_MINUTES=0`). Voiceover is GK as the owner; the close can be Vince. About 250 spoken words, well under the pace a viewer can follow, so every scene has a beat of silence for the screen to land. Not yet rehearsed against the live app: time the first full run and cut from the bottom of the fallback table if it runs long.

Built from `app/demo-scenes.md` and the rehearsal in `docs/handoff.md` §7. Judging weights it serves: Impact 30%, Meta tooling 25%, Demo 25%, Technical depth 20%.

## Recording setup

- One laptop screen, split: **WhatsApp Web** (GK's owner phone, logged in) on the left, the **Followthrough page** on the right. WhatsApp Web records voice notes, so nothing needs a second camera.
- Record each scene as its own take and cut them together. A failed step costs one re-take, not the whole video.
- On-screen labels (added in the edit, bottom left, small) name the Meta piece doing the work in that moment. They carry the "Use of Meta AI tooling" score without spending voiceover time.
- Synthetic data only. Every name below is from the pack; no real customer appears.

## Before the first take

1. Fresh WhatsApp token (the temporary one lasts 24 hours).
2. From GK's phone, send "hi" to the test number so the 24-hour window is open. Do the same from any counterpart phone the video shows.
3. Books read-back shows cash £3,335.00 and owed £1,245.00.
4. `voice.md` and `terms.md` signed, `SYNTHETIC_DATA_APPROVED=true`, app restarted.
5. Clear the browser's other tabs and notifications; WhatsApp Web set to dark or light, not switching mid-take.

## Script

| Time | Scene | Voiceover (GK) | On screen | Label |
|---|---|---|---|---|
| 0:00 to 0:18 | **Cold open** | "I import Indian green coffee for UK roasters and sell at a market stall. Every sale is a chain of follow-ups: a sample, a quote, an order, an invoice. The one I forget is the one that goes cold." | Slow pan of the Where I stand page, cards blurred; then a crowded WhatsApp chat list. | |
| 0:18 to 0:28 | **What it is** | "Followthrough watches every open loop, drafts the next move in my voice, and waits for my yes. In WhatsApp, where I already am." | Title card: *Followthrough*. One line under it: *Built 26 Oct to 4 Nov for the Meta Global AI Developer Hackathon.* | |
| 0:28 to 1:02 | **1. The brief** | "This is my brief. Warm leads first. Bean & Bloom in Bath has never heard from me, but they stock Harbour Roasters, who already buy my coffee, so the draft says so. Harbour's invoice is a day overdue. Lot 3 is low." *(pause on the cards)* "I just say yes." | Click "Show me the brief now". Brief lands in WhatsApp Web. Zoom on the Bean & Bloom card: the draft names Harbour Roasters. Then the FT-INV-1001 £480 chase card and the lot 3 reorder line. GK swipes to reply to the Bean & Bloom card and records a voice note: "Yes, send it." Replying to the card is what tells the app which draft she means. The app replies with what it heard, then the send. Cut to the page: the card turns sent, from the coffee alias. | *Muse Spark Open drafts in the owner's voice* · *Muse Voice Transcribe* · *WhatsApp Cloud API* |
| 1:02 to 1:28 | **2. A new lead** | "A café in York came up. I paste their shop page. It reads the price, checks whether Indian coffee is already on the shelf, and finds the path: they buy from Clifton Pantry, a customer of mine." | Paste Pennine Espresso Kiosk's shop URL. Lead panel opens: £8.00 per 250g, mid-shelf, Indian on shelf, the source line quoted under each fact, the path to Clifton Pantry. Two cards: the first message to Callum Reid naming Clifton Pantry, and an intro ask to Clara Finch. | *Muse Spark Open reads the page; every fact keeps its source* |
| 1:28 to 1:58 | **3. Stall cash-up** | "End of a stall day. I send a voice note." *(voice note plays)* "It needs the bag size before it books anything." *(second note)* "Now it reads it back. Yes." | Voice note: "Sold six bags of lot 2, 120 pounds cash." The app asks for the bag size; nothing written. Second note: "Sold six 250g bags of lot 2, 120 pounds cash." Read-back with the numbers. "Yes." Page: Books sale £120, lot 2 from 10 kg to 8.5 kg, a new low-stock line for lot 2. | *Muse Voice Transcribe* · *Zoho Books write after approval* |
| 1:58 to 2:22 | **4. Ask, and a plain no** | "It's tax season, what am I missing?" *(answer appears)* "Every line says where it came from." *(beat)* "Just file my VAT return." *(answer)* "It won't. It tells me the nearest thing it can do." | Voice note, then the sourced list (on this data: unpaid invoices and a stall day not cashed up; receipts and statutory dates appear only if the data holds them), each line with its source. Second voice note, then the refusal and the next step. | *Muse Spark Open answers from the books and loops only* |
| 2:22 to 2:45 | **5. Where I stand** | "Cash, what I'm owed, stock and what's due, on one page. And every action is logged. Nothing reaches a customer without my yes." | Where I stand: cash, owed, stock per lot, today's cards, the what-leaked tile. Scroll `logs/actions.jsonl` briefly: approve, held, send, Books write. | |
| 2:45 to 3:00 | **Close** (Vince or GK) | "Built in ten days on Meta's open-weight Muse Spark, Voice Transcribe and the WhatsApp Cloud API. For owners who run their business from their phone, it's the back office that remembers." | End card: *Followthrough* · repo URL · *Muse Spark Open · Muse Voice Transcribe · WhatsApp Cloud API*. | |

## What each scene proves

| Scene | Rubric it serves | Proof on screen |
|---|---|---|
| 1. The brief | Impact, Meta tooling | A cold loop caught, a warm path named, approval by voice, a real send |
| 2. A new lead | Technical depth, Impact | Qualification and network placement with a source per fact |
| 3. Stall cash-up | Meta tooling, Technical depth | Voice to a gated Books write and a stock movement; the ask when data is missing |
| 4. Ask and refuse | Technical depth | Answers grounded in the store; a refusal that is logged and helpful |
| 5. Where I stand | Demo, Impact | The whole business on one page; the audit trail |

## If something breaks on the day

| Step fails | Fallback that keeps the scene |
|---|---|
| Lead page will not fetch | Use Bean & Bloom's panel from scene 1, already qualified, and say "It already checked this one." |
| Voice note transcribes wrong | Re-take the note; the read-back is part of the story, so a wrong read-back caught before "yes" can stay in |
| Books write slow | Cut on the read-back, then cut back once the page shows the sale |
| WhatsApp send blocked by the 24-hour window | Send "hi" from that phone, re-take |

Running long: drop the second half of scene 4 (the VAT refusal) first, then shorten the cold open. Never drop scene 1 or 3; they carry the Meta models.

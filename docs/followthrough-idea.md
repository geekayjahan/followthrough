# Followthrough (lead idea)

## Problem statement (Meta style, 22 Oct)

**Who.** Owner-operators of small B2B and high-touch businesses: food and drink importers, local traders, tradespeople, service businesses. 1 to 20 people, little or no dedicated sales or finance staff. Most customer relationships run through WhatsApp and Instagram threads.

**Problem.** Revenue is lost between first contact and a paid invoice. Each deal is a chain of follow-ups (sample feedback → quote → order → invoice), and each step relies on the owner remembering to chase at the right time, on the platform the client actually checks. With the history spread across the inbox, spreadsheets, the accounting tool and chat apps, nothing flags which deal is stalling. Overdue invoices and neglected leads pile up while the owner runs the business.

**Why existing tools fall short.** Each category solves one piece.
- Personal AI assistants (Duet, Dot, Muse, Grok Bot) see your apps and draft messages. They sit in a separate app waiting to be asked, and none reaches customers through WhatsApp Business or Instagram.
- WhatsApp bots answer inbound questions. Reminder tools run fixed flows with no view of the pipeline or the books.
- CRMs and invoicing tools store history and send email reminders that get ignored.
- Open-source agents connect everything, at the cost of technical setup owners can't manage.
No product holds the whole commercial picture and acts where the customer replies.

**Insight.** Meet both sides where they already are. The owner's briefs, nudges and approvals arrive in WhatsApp or Meta AI: no new app, no new habit to build. The customer gets the follow-up on the channel they check daily, and every reply updates the deal as it arrives.

**Why Meta.** Meta holds the owner's chats, the customer's chats and the Instagram business graph that shows who already knows your customers. Muse Spark runs multi-step follow-ups at costs that suit per-deal pricing, Muse Voice Transcribe turns voice notes into actions, Muse Glimmer keeps records on the owner's own machine. Messages after WhatsApp's 24-hour window are paid business messages, which means every chase adds to Meta's messaging revenue. (Verify window pricing before submission.)

**Proof.** An early version, run across separate trackers for a coffee import business, turned cold roaster leads into warm buyers ready to pay within four days.

**Success measures.** Loop resolution rate (open deals closed within 14 days) · payment speed (invoice to cash) · intro conversion (warm intros to booked calls) · in-chat execution (approvals per day without leaving the chat).

## Application answer: "What do you want to build for this hackathon?"
Followthrough: a back office agent for small businesses that run on WhatsApp and Instagram. It tracks every open loop in a deal (sample feedback, quote, order, invoice, booking), notices which one is going cold, and drafts the follow-up at the right moment. The owner approves with a tap or a voice note inside WhatsApp or Meta AI, and the customer gets chased on the channel they actually answer. It also grows the pipeline: public Instagram signals such as tags, mentions and shared stockists reveal which prospects already know the owner's existing customers, turning cold outreach into warm intros. Muse Spark runs the multi-step chases, Muse Voice Transcribe handles voice approvals, Muse Glimmer offers a local option for owners who keep their books private, and a Meta AI Connector is the surface. One of us imports coffee and is user one, which means the demo runs on live deals: an early prototype turned cold roaster leads into warm buyers in four days.

## Coverage map: why no single app solves it
| Capability | Personal agents | WhatsApp business bots | CRM / invoicing | Open-source agents | Followthrough |
|---|---|---|---|---|---|
| Sees inbox, pipeline and books together | Yes | No | Partly | Yes, after setup | Yes |
| Acts on customer's WhatsApp / Instagram | No | Yes | No | Possible, after setup | Yes |
| Decides next move across loops | Generic tasks | One flow each | No | Generic | Yes |
| Finds warm paths to new customers | No | No | No | No | Yes |
| Meets owner where they already are | Weak (own app) | No | Email | Possible | WhatsApp / Meta AI |
| Works outside the US, no server skills | Mostly no | Yes | Yes | No | Yes |

**Jobs:** Chase · Grow · Ask.
**Meta stack:** Muse Spark · Muse Voice Transcribe · Muse Glimmer · Meta AI Connectors + WhatsApp/Instagram.
**Build notes:** Kāma is user one. Instagram's API exposes public data on business accounts but not follower lists; warm-path scoring uses tags, mentions and stockist pages. Agent never sends without approval.

Sources reviewed: Every personal agents comparison and Duet vibe check (Dan Shipper), Claire Vo on Lenny's Newsletter, Peter Yang, AIMultiple, explainx, OneWave, Darwin AI WhatsApp guide. Feedback from Kalin Stoev (21 Oct).

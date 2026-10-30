# Followthrough: market research

Date: 29 October 2026. Prepared for the Meta Global AI Developer Hackathon submission. Every factual claim carries a source link; where a claim rests on a vendor blog or an aggregator rather than a primary source, the text says so. Where a figure could not be checked against a primary source, the text says "could not verify".

Research constraints: Meta's own newsroom, developer and help pages mostly do not resolve from this session, and the Tavily quota ran out part way through. The WhatsApp pricing page was read in full; the Meta Business Agent, Meta One and Muse announcements are cited through secondary coverage.

## Summary

Late payment is a measured, government-costed problem for UK small businesses, and the single biggest cost line is owner time spent chasing. WhatsApp is the default customer channel in the UK and in most of the world. Meta shipped its own free customer-facing agent in June 2026, but it answers inbound messages and does not chase quotes or invoices with the books in view. Accounting tools send reminders from the invoice outward, mostly by email. CRMs and WhatsApp platforms hold the thread but not the ledger. No product found in this research tracks all open loops of a deal across inbox, pipeline and books and then acts on the customer's WhatsApp or Instagram with the owner's approval. That gap is real, but several claims in the idea document are out of date and should be corrected before the pitch.

## 1. The pain, quantified

### Late payment in the UK

The most authoritative numbers come from research commissioned by the Department for Business and Trade and the Office of the Small Business Commissioner, carried out by London Economics and published on 31 July 2025 ([OSBC summary](https://www.smallbusinesscommissioner.gov.uk/late-payments-research-2), [full report PDF](https://assets.publishing.service.gov.uk/media/688a089a6478525675738ff9/late_payments_research_impact_on_uk_economy.pdf)).

| Measure | Figure | Source |
|---|---|---|
| Cost to the UK economy | almost £11 billion a year | DBT and OSBC, July 2025 |
| Businesses affected each year | over 1.5 million, or 28% of businesses | DBT and OSBC, July 2025 |
| Owed in late payments at any time | £26 billion, about £17,000 per affected business | DBT and OSBC, July 2025 |
| Businesses closing each year because of late payment | 14,000, or 38 a day | DBT and OSBC, July 2025 |
| Staff time chasing, per affected business | 86 hours a year; 133 million hours across the economy | DBT and OSBC, July 2025 |
| Cost of late payment as a share of turnover, micro businesses (0 to 9 staff) | 4.61% of annual turnover for affected micro businesses | DBT and OSBC PDF, table on page 21 |
| Hours chasing, micro businesses affected | 75 hours a year | DBT and OSBC PDF, hours table |

Two independent surveys point the same way. The FSB and GoCardless report of March 2025 (over 2,000 small business respondents) found 45% experiencing more late payments than a year earlier, 24% receiving payments up to 60 days late, and 61% saying late payment holds the business back, rising to 67% in food and beverage ([GoCardless](https://gocardless.com/blog/gocardless-fsb-late-payments-report-2025)). The FSB's own February 2025 piece puts the "holding back growth" share at 60% and says 38% relied more on credit in the past year ([FSB](https://www.fsb.org.uk/resources/article/late-payments-and-payment-methods-in-small-businesses-MCG3GFLR7YJFFV7EZM7C3XPPYYXM)). Coface's first UK payment survey (October 2025) found 90% of UK companies experienced late payment in the past year, an average delay of 32 days, and that nearly 50% of micro and small firms report delays becoming more frequent ([Coface](https://www.coface.com/news-economy-and-insights/2025-uk-payment-survey-companies-face-rising-payment-delays-amid-buyer-cash-flow-concerns)).

Government statistics on large companies' payment practices show 15% of invoices paid late by number and 14% by value in 2025, with manufacturing at 21% and wholesale and retail at 15% ([GOV.UK](https://www.gov.uk/government/statistics/large-businesses-payment-practices-and-performance-statistics-2025/large-businesses-payment-practices-and-performance-statistics-2025-commentary)). Xero's Small Business Insights put UK small businesses at an average of 29.1 days to be paid and 8.3 days late in a June quarter; Paidnice attributes this to the June 2026 quarter, but Xero's own post could not be fetched to confirm the year ([Paidnice citing Xero](https://www.paidnice.com/blog/xero-invoice-reminders-explained)).

### Leads lost between first contact and order

No UK-specific study of small-business follow-up failure was found. The widely quoted figures are vendor-sourced and often old. Salesgenie's 2025 round-up cites Salesforce's claim that 80% of sales need at least five follow-ups and a Peak Sales Recruiting figure that response chances fall to 24% after five days ([Salesgenie](https://www.salesgenie.com/blog/follow-up-statistics)). A 2026 compilation with sources linked cites CallRail's 2025 benchmark (1.1 million leads) that 28% of calls to businesses go unanswered, and InsideSales' 2021 study (5.7 million leads) that 57% of first calls came more than a week after the lead ([Megawebvision](https://megawebvision.com/insights/lead-response-time-statistics)). Setter AI cites Voiso's claim that 30% of leads never receive any follow-up and Vendasta's that 55% of companies take more than five days to respond ([Setter AI](https://www.trysetter.com/blog/sales-response-time-statistics-2026)). Treat these as directional, not as pitch headlines.

### Where small-business customer conversations happen

Meta's 2025 State of Business Messaging report, a Kantar survey of 11,056 adults across 22 markets including the UK, found 73.3% of consumers prefer messaging when communicating with a business, 72.4% are more likely to buy from a brand that offers messaging, 74.6% trust a business more when they can message it, and 66.8% are frustrated when messaging is not offered ([WhatsApp for Business](https://whatsappbusiness.com/resources/resource-library/state-of-business-messaging)). This is Meta-commissioned research and should be attributed as such.

Scale figures: WhatsApp passed 3 billion monthly active users in April 2025 ([this+that, citing Meta's earnings call](https://www.thisandthat.chat/blog/whatsapp-business-statistics)); the WhatsApp Business app passed 200 million monthly users in 2023, and the 175 million people a day messaging a business is a 2020 Meta figure best read as a floor ([ChatMaxima, each stat sourced](https://chatmaxima.com/blog/whatsapp-business-statistics-2026)). Meta said at the Business Agent launch that there are more than one billion active business conversation threads a day across WhatsApp, Messenger and Instagram ([Omnichat, citing Meta](https://blog.omnichat.ai/meta-business-agent-platform-explained-features-pricing-and-what-the-2026-whatsapp-changes-mean-for-your-business)).

UK-specific: WhatsApp was used by 82.6% of UK internet users in Q2 2025 ([Statista](https://www.statista.com/statistics/284506/united-kingdom-social-network-penetration)) and reached 92% of UK online adult smartphone users in May 2025 per Ofcom's Online Nation report, as summarised by Sprout Social, whose own 2026 survey found 85% of UK consumers interact with brands on WhatsApp at least weekly and 31% contact brands on it multiple times a day ([Sprout Social](https://sproutsocial.com/insights/social-media-statistics-uk)). On the business side, a 2024 Vodafone study is reported as finding 45% to 47% of UK SMEs use WhatsApp as their primary business communication platform; the two secondary sources disagree and the Vodafone release could not be fetched, so could not verify the exact share ([SME Today](https://www.smetoday.co.uk/technology/dangers-of-using-whatsapp-for-business-communication), [Startups Magazine](https://startupsmagazine.co.uk/article-whatsapp-putting-your-business-risk)).

Instagram: aggregators report over 350 million business accounts, about 65% of them small businesses ([CompaniesHistory](https://www.companieshistory.com/instagram-business-statistics)); the often-quoted "150 million people have a conversation with a business on Instagram each month" could not be traced to a Meta primary source and should not be used. No statistic was found giving the share of small-business customer conversations that take place on WhatsApp versus Instagram, in the UK or globally; the pitch should say "most" only on the strength of the reach figures above and the team's own experience.

## 2. Existing tools by category

### Personal AI assistants

The idea document names Duet, Dot, Muse and Grok Bot. All four exist, but "Dot" is ambiguous.

| Product | Maker, launch | What it does today | Price and availability | Source |
|---|---|---|---|---|
| Claude Duet | Anthropic, 21 Oct 2026, research preview | Watches connected apps (Gmail, Slack, Stripe, QuickBooks among 6,000+ connectors), sends a morning brief with drafted next steps, runs tasks on its own cloud computer, asks before sending, paying or signing; checks accounts every few hours | Included in Pro and Max, waitlist, US only; shares plan usage limits | [Kompozy](https://kompozy.io/reviews/claude-duet), [Superpower Daily on Shipper's review](https://superpowerdaily.com/posts/anthropic-opens-claude-duet-preview-for-ai-work-that-keeps-going-between-chats) |
| Dots (OpenAI) | OpenAI, 29 Sep 2026 | Always-on agents inside ChatGPT on GPT-6 Astra, own cloud computer, 4,000+ apps, reachable in ChatGPT, Slack and voice | First dot included on ChatGPT Pro ($100 a month) and Business Premium; Pro does not include dots in the EU, UK or Switzerland | [Fello AI](https://felloai.com/openai-dots), [eesel](https://www.eesel.ai/blog/openai-dots), [WIRED](https://www.wired.com/story/openai-dots-always-on-ai-agents-that-proactively-help) |
| Dot (New Computer) | New Computer, 2023 | AI companion app for reflection and advice | Shut down 5 October 2025 | [TechCrunch](https://techcrunch.com/2025/09/05/personalized-ai-companion-app-dot-is-shutting-down) |
| Muse | Meta, 8 Sep 2026 | Personal agent that runs errands, manages schedules, shops and fills forms in a Muse Secure VM; reachable in the Muse app, muse.ai and inside WhatsApp; third-party connectors via the Muse Connector Platform (18 Sep 2026) | Free tier plus Power $20 and Maximum $100 a month; US, 18+, at launch | [Tech Insider](https://tech-insider.org/meta-muse-personal-ai-agent-launch-2026), [PBS](https://www.pbs.org/newshour/nation/meta-launches-personal-ai-agent-muse-to-help-with-everyday-tasks), [RuntimeWire on connectors](https://runtimewire.com/article/meta-opens-muse-connectors-developers) |
| Grok Bot | xAI, beta 11 Aug 2026 | Named persistent bots with a shared cloud computer (browser, files, terminal), connectors and MCP tools, approvals before sensitive actions | Included with X Subscription Premium from $30 a month and Cursor paid plans; up to 50 bots | [AY Automate](https://www.ayautomate.com/blog/grok-bot-xai-ai-agents-explained), [Vellum](https://www.vellum.ai/blog/official-grok-bot-breakdown) |

What they share: each works for the owner, inside its own app or chat surface, on the owner's own accounts. None sends messages as the business from a WhatsApp Business number or an Instagram professional account to the business's customers, and none holds pipeline stages or an accounts-receivable ledger as first-class objects. Duet can read QuickBooks through a connector but Shipper notes scheduled runs cannot use custom connectors, and Anthropic itself says it can misjudge urgency.

Correction to the idea document: Muse now sits inside WhatsApp as the owner's surface, so the sentence "none reaches customers through WhatsApp Business or Instagram" should be reworded to "none acts as the business on the business's WhatsApp number or Instagram account". Also, if "Dot" means New Computer's app, it no longer exists; if it means OpenAI's Dots, it is not available to UK Pro subscribers.

### Meta's own small-business tooling

WhatsApp Business app (free): business profile, catalogue and cart, quick replies, greeting and away messages, lists (formerly labels), broadcast lists capped at 256 contacts who must have saved the number, one phone plus four linked devices; paid business broadcasts, more devices and chat assignment arrive with Meta Verified or Meta One plans ([ChatMitra](https://chatmitra.com/blog/whatsapp-business-features), [Fidus](https://fidusflo.com/blog/whatsapp-broadcast-limit-2026)). The app has no scheduling, no reminders tied to invoices and no integration with accounting software.

Meta Business Agent: announced 3 June 2026 at Conversations in London, built into the WhatsApp Business app, Instagram and Messenger. Meta's own list of what it does: answers business-specific questions, recommends products from the catalogue, books appointments, qualifies inbound leads, closes sales, and lets the business decide when a person steps in. Over one million businesses were already using it; use is free to start, with paid subscription access to follow ([Meta newsroom, Brazil edition](https://about.fb.com/br/news/2026/06/conversations-2026-apresentamos-o-meta-business-agent), [AiChat recap](https://www.aichat.com/blog/meta-conversations-2026-announcements)). The Meta Business Agent Platform (enterprise build-and-deploy layer with connectors such as Shopify and Zendesk) opened to partners on 1 July 2026, and token billing started 1 August 2026 at $2.00 per million tokens, which Meta itself estimates at 4 to 5 cents per message ([Meta pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing), [ChatMaxima](https://chatmaxima.com/blog/meta-business-agent-platform-explainer-2026)). Third-party reviews list its gaps: no CRM integration, no broadcast tools, no custom automation, inbound-only ([WATI, via search summary; could not verify article body](https://www.wati.io/?p=55658), [360dialog known limitations](https://docs.360dialog.com/docs/mba/meta-business-agent/known-limitations)). Nothing in Meta's announcement describes the agent initiating a chase for a quote or an invoice, and nothing describes it reading an accounting ledger. Conversations 2026 also introduced WhatsApp Business Discovery, which lets customers search for businesses by name inside WhatsApp ([AiChat](https://www.aichat.com/blog/meta-conversations-2026-announcements)).

Meta One (15 September 2026) folds Meta Verified for business into four plans: Essential $14.99, Advanced $49.99, Expert $149 and Max $499 a month, each adding a verified badge, impersonation protection and more Business Agent reply capacity, with team access and broadcast credits from Advanced; it does not change API per-message rates ([Engagelab](https://www.engagelab.com/blog/whatsapp-api-pricing), [imBee](https://www.imbee.io/resource/meta-one-business-plans-whatsapp), [Hootsuite on Meta Verified](https://blog.hootsuite.com/meta-verified)).

Meta's earlier "Business AI" pilot ran in India, Mexico and Brazil from October 2024 and became Business Agent ([Dapta](https://dapta.ai/blog-posts/ai-news-meta-business-agent)). No Meta product found chases invoices or follows up stalled quotes on Meta's own surfaces.

### WhatsApp bot and inbox platforms

| Platform | What it does today | Pricing (checked 2026) | Books or pipeline view | Source |
|---|---|---|---|---|
| Wati | Shared inbox, broadcasts, no-code flows, Astra AI agents | Growth $69 and Pro $149 monthly ($59 and $119 yearly); Business now custom; 60% to 80% markup on Meta message rates; Astra $99 or $399 extra | No ledger; CRM add-ons | [eesel](https://www.eesel.ai/blog/wati-pricing), [Macha](https://www.getmacha.com/blog/wati-pricing-explained) |
| Interakt | WhatsApp-first CRM and marketing, Shopify focus | From about ₹2,499 a month; separate marketing and sales plans | Shopify orders only | [CXWizard](https://cxwizard.app/blog/respondio-alternatives), [respond.io review](https://respond.io/blog/interakt-review) |
| Respond.io | Omnichannel inbox (13 channels incl. WhatsApp, Instagram), workflows, AI agents from Growth | Starter $79 yearly or $99 monthly; Growth $159 to $199; Meta fees at cost | HubSpot, Zoho, Salesforce sync; no ledger | [Macha](https://www.getmacha.com/blog/respond-io-pricing-explained), [respond.io](https://respond.io/blog/best-interakt-alternatives) |
| Twilio | Raw API transport, build everything yourself | $0.005 per message in or out plus Meta fees; $0.001 per failed message | None | [W.app](https://w.app/blog/twilio-whatsapp-pricing), [Aissist](https://aissist.io/insights/whatsapp-business-api-pricing) |
| Kommo | Pipeline plus inbox CRM, Salesbot from Advanced | $15, $25, $45 per user per month, six months prepaid; one WhatsApp number on Base | Pipeline yes, no ledger | [Taskip](https://taskip.net/best-crm-with-whatsapp-integration), [Kanal](https://getkanal.com/blog/best-whatsapp-crm) |
| Visito | AI agent for WhatsApp and Instagram with team inbox, automatic follow-ups when a customer goes quiet, payment links, coexistence with the Business app | Not captured | No ledger | [Visito](https://www.visitoai.com/blog/top-8-whatsapp-ai-agents-to-automate-customer-service) |

Correction to the idea document: "WhatsApp bots answer inbound questions" undersells the category. Meta Business Agent and tools like Visito now qualify, book, send payment links and re-ping a quiet customer. What they lack is a view of the accounting ledger and the deal's other loops, and they are built around a single business number rather than the owner's own chat.

### CRM and invoicing follow-up

| Tool | Follow-up capability today | Channel | Pricing | Source |
|---|---|---|---|---|
| Xero | Up to five reminders per organisation, one schedule for all customers, nothing after the fifth, no escalation or task | Email only; Xero said SMS is "not in our current roadmap" (17 June 2026) | Included; UK plans not checked | [Paidnice](https://www.paidnice.com/blog/xero-invoice-reminders-explained) |
| QuickBooks Online | Automated payment reminders on schedules | Email | $38 to $340 a month (US) | [Intuit help](https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-invoices/create-automated-payment-reminders-invoices/L5ZYxcW2q_US_en_US), [Fino Partners](https://thefinopartners.com/blogs/xero-accounting-vs-quickbooks) |
| FreeAgent | Could not verify native reminder channels; third-party chasers (Chaser, Equisettle, Satago) integrate with it | Email via third parties | Not checked | [Trove comparison](https://trove.works/credit-control-software-compared), [Equisettle](https://equisettle.co.uk/blogs/post/best-accounts-receivable-software-uk-comparison-guide) |
| Zoho Books | Invoice, estimate and sales-order notifications and automated due-date payment reminders on WhatsApp via Meta-approved templates, including bulk overdue reminders | WhatsApp, email | WhatsApp billed per utility message through Zoho (₹0.115 in India per one integrator) | [Zoho Books help](https://www.zoho.com/us/books/help/integrations/whatsapp-integration.html), [Codelix](https://www.codelixitsolutions.com/blog/whatsapp-payment-reminders-for-invoices) |
| Zoho Bigin | Pipeline CRM with WhatsApp | WhatsApp | Free, $9, $15, $21 per user | [Breakcold](https://www.breakcold.com/blog/crm-integration-with-whatsapp) |
| HubSpot | WhatsApp in the conversations inbox only on Professional; only new messages sync and they stop appearing in the WhatsApp app | WhatsApp, email | Professional $90 per seat yearly ($100 monthly) plus onboarding fee | [Kanal](https://getkanal.com/blog/best-whatsapp-crm), [PromptLab](https://trypromptlab.com/blog/best-crm-with-whatsapp-integration) |
| Pipedrive | WhatsApp via Marketplace apps from the Growth plan | WhatsApp, email | $39 per seat yearly; third-party inbox $59 to $129 a month | [PromptLab](https://trypromptlab.com/blog/best-crm-with-whatsapp-integration), [Instant Reply](https://www.instantreply.co/blog/pipedrive-whatsapp-integration-guide-2026) |
| Chaser | Scheduled reminders, escalation workflows, payment portal, auto-call, AI reply agent; Xero, QuickBooks, FreeAgent, Sage | Email, SMS, phone | Compact £199, Core £599, Complete £899 a month, banded by turnover; 100 SMS credits on Compact | [Paidnice](https://www.paidnice.com/blog/chaser-pricing-alternatives), [Trove](https://trove.works/credit-control-software-compared) |
| Equisettle (UK, founded 2024) | Predicts late payers, chases by email, SMS and WhatsApp, FreeAgent and Xero integration | Email, SMS, WhatsApp | Solo £75, SME £350 a month | [Equisettle, vendor-authored](https://equisettle.co.uk/blogs/post/best-accounts-receivable-software-uk-comparison-guide) |

Correction to the idea document: "CRMs and invoicing tools send email reminders that get ignored" is accurate for Xero and QuickBooks natively, but Zoho Books already sends WhatsApp reminders and UK chasing tools send SMS and WhatsApp. The sharper gap is that all of them start from the invoice and stop at the invoice; none sees the sample, the quote or the order that preceded it, and none reads the customer's reply back into the deal.

### Open-source agent frameworks that could be wired to WhatsApp

OpenClaw (formerly Clawdbot) is a self-hosted personal agent that connects to WhatsApp, Telegram, Signal, Discord and Slack, reads email and calendars, runs commands, works with any model, and passed 380,000 GitHub stars by mid-2026; it links to WhatsApp as a linked device, requires server setup and maintenance, and has had security incidents ([AY Automate](https://www.ayautomate.com/blog/openclaw-open-source-ai-agent), [Contabo](https://contabo.com/blog/what-is-openclaw-self-hosted-ai-agent-guide), [Blueticks](https://blueticks.co/blog/whatsapp-ai-agent)). n8n is self-hostable, has about 1,000 integrations and native LangChain agents, and is typically wired to WhatsApp via the Cloud API or the unofficial Evolution API; a minimum deployment is 2 vCPUs and 4 GB RAM ([Serverspace](https://serverspace.io/about/blog/how-to-set-up-n8n-integration-with-whatsapp-crm-and-online-store-to-sell-more-in-2026)). Evolution API avoids Meta's approval and fees but carries a ban risk and continuous maintenance ([GuruSup](https://gurusup.com/blog/evolution-api-whatsapp)). Activepieces' WhatsApp piece sends but has no inbound trigger ([Visito](https://www.visitoai.com/blog/n8n-alternatives-ai-agents-for-whatsapp-business)). CrewAI, AutoGPT, Dify and Langflow have no messaging layer of their own ([ClawTank](https://clawtank.dev/blog/best-open-source-ai-agents-2026)). The idea document's line on this category holds: everything is possible, nothing is assembled, and the owner must run a server.

### Coverage map, filled with evidence

| Capability | Personal agents (Duet, Dots, Muse, Grok Bot) | Meta Business Agent | WhatsApp platforms (Wati, Respond.io, Kommo, Visito) | CRM and invoicing (Xero, QuickBooks, Zoho, Chaser) | Open-source agents (OpenClaw, n8n) | Followthrough (intended) |
|---|---|---|---|---|---|---|
| Sees inbox, pipeline and books together | Inbox yes; books only via connectors (QuickBooks on Duet); no pipeline object | No; catalogue and business profile only | Inbox and pipeline (Kommo); no books | Books yes (accounting) or pipeline yes (CRM), rarely both | Yes, after the owner builds it | Yes |
| Acts on the customer's WhatsApp or Instagram as the business | No | Yes, replies to inbound | Yes | Zoho Books and Chaser send templates; Xero and QuickBooks email only | Possible, unofficial or via Cloud API | Yes, with approval |
| Decides the next move across loops (sample, quote, order, invoice) | Generic tasks on the owner's apps | No; answers the current message | One flow at a time; Visito re-pings quiet chats | Invoice loop only | Generic | Yes |
| Finds warm paths to new customers | No | No (Business Discovery is customer-side search) | No | No | No | Only within what the Instagram API exposes (see section 4) |
| Meets the owner where they already are | Own app; Muse also inside WhatsApp | Inside WhatsApp Business app | Separate inbox | Separate app, email | Chat apps, after setup | WhatsApp or Meta AI |
| Works outside the US without server skills | Duet US only; Dots not on Pro in UK; Muse US at launch; Grok Bot in some countries | Yes, global | Yes | Yes | No | Yes, if built on the Cloud API |

## 3. Nearest competitors

**Meta Business Agent.** Why us and not them: Meta's agent replies to whoever messages the business. It does not know that a sample went out on Tuesday, that the quote has sat unanswered for nine days, or that invoice 1043 is twelve days overdue in Zoho Books, and Meta's own feature list contains no outbound chase and no accounting integration ([Meta newsroom](https://about.fb.com/br/news/2026/06/conversations-2026-apresentamos-o-meta-business-agent), [360dialog limitations](https://docs.360dialog.com/docs/mba/meta-business-agent/known-limitations)). Followthrough is the outbound, cross-loop layer that starts where Business Agent stops. Where they beat us: it is free to start, already on over a million businesses, requires no setup beyond a tap in the app, and from 1 August 2026 Meta prices its replies at roughly half the cost of a third-party AI reply on the same platform ([Meta pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). Any inbound-answering feature Followthrough builds will be compared to a free Meta default.

**Chaser (and UK accounts-receivable tools such as Paidnice, Satago and Equisettle).** Why us and not them: Chaser chases invoices by email, SMS and phone on fixed schedules from £199 a month and only sees the ledger; Equisettle adds WhatsApp and payment prediction but likewise starts at the invoice ([Paidnice on Chaser](https://www.paidnice.com/blog/chaser-pricing-alternatives), [Equisettle](https://equisettle.co.uk/blogs/post/best-accounts-receivable-software-uk-comparison-guide)). An invoice that was never raised because the quote stalled is invisible to all of them. Followthrough covers the loops before the invoice and chases on the channel where the customer actually replied. Where they beat us: credit control depth (statements, late-fee rules, payment portals, dispute handling, accounting-firm multi-client views) and years of reconciliation reliability. A finance team will trust Chaser's audit trail over a hackathon build.

**Kommo (and Respond.io).** Why us and not them: Kommo puts WhatsApp and Instagram threads on a pipeline for $15 to $45 per user with a Salesbot on the Advanced tier, and Respond.io adds AI agents from $159 to $199 a month, but both are inboxes with stages, not agents that read the books or decide which loop is going cold ([Taskip](https://taskip.net/best-crm-with-whatsapp-integration), [Macha](https://www.getmacha.com/blog/respond-io-pricing-explained)). They also require the owner to live in their inbox, and HubSpot's WhatsApp integration stops messages appearing in the WhatsApp app at all ([Kanal](https://getkanal.com/blog/best-whatsapp-crm)). Where they beat us: mature multi-channel routing, team seats, template management, broadcast tooling, and coexistence with the Business app are solved problems there and will not be in a ten-day build.

**OpenClaw.** Why us and not them: OpenClaw is the closest thing to a personal agent that already lives in the owner's WhatsApp and can be wired to any CRM or ledger, but it links as a device on the owner's own number, runs on a server the owner maintains, and has had security incidents; a coffee importer will not operate it ([AY Automate](https://www.ayautomate.com/blog/openclaw-open-source-ai-agent)). Followthrough packages the same idea with Meta's official APIs, approval gates and no server. Where they beat us: full data ownership, any model, 380,000 stars' worth of community skills, and zero licence cost. A technical owner can assemble most of Followthrough from OpenClaw and n8n in a weekend.

**Meta Muse with the Connector Platform.** Why us and not them: Muse is the owner's agent, reachable inside WhatsApp, and Meta is reviewing third-party connectors so services can plug in ([RuntimeWire](https://runtimewire.com/article/meta-opens-muse-connectors-developers), [KuCoin news](https://www.kucoin.com/news/flash/meta-opens-muse-to-third-party-developers-triggering-agent-app-store-competition)). It does not act as the business toward customers and has no deal model. Followthrough can present itself to Muse as a connector rather than compete with it. Where they beat us: distribution to the WhatsApp user base, a free tier, and the owner-side surface the idea document calls "Meta AI". If Meta adds a business-side skill to Muse, the owner-facing half of Followthrough becomes a feature.

## 4. Meta-specific facts that affect the pitch

**WhatsApp Business Platform pricing.** Since 1 July 2025 Meta charges per delivered message, by category and recipient market, instead of per 24-hour conversation; inbound messages are free ([Meta pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing), [Twilio notice](https://help.twilio.com/articles/30304057900699-Notice-Changes-to-WhatsApp-s-Pricing-July-2025)). Non-template (free-form) messages can only be sent inside the 24-hour customer service window that opens with each customer message; reaching out first requires an approved template (utility, marketing or authentication). Since 1 October 2026, service replies inside the window are billed after a free tier of 1,000 per business phone number per month, utility templates sent inside the window are billed again (they had been free since July 2025), and a number without a payment method stops delivering service messages once the free tier is used. The 72-hour free entry point window from Click-to-WhatsApp ads and Page buttons remains free. Meta Business Agent replies are a fifth category at $2.00 per million tokens, about 4 to 5 cents a message. All of this is on Meta's pricing page. UK list rates are published as CSV files that could not be read here; third-party rate tables give £0.0159 per utility or authentication message and £0.0458 per marketing message for UK recipients from 1 October 2026, with one site showing £0.0382 for marketing, so could not verify the UK marketing rate ([Kanal](https://getkanal.com/es/blog/precios-whatsapp-business.md), [ChatMaxima UK](https://chatmaxima.com/whatsapp-api-pricing/uk/), [Whautomate](https://whautomate.com/whatsapp-business-api-pricing-uk)). For the pitch: every chase Followthrough sends outside a live window is a paid utility or marketing template, which is the "adds to Meta's messaging revenue" line in the idea document, now with a per-message rate attached.

**AI assistant policy.** From 15 January 2026 Meta bars general-purpose AI assistants (ChatGPT, Copilot, Perplexity) from the WhatsApp Business Platform; business-specific agents for support, sales, notifications and follow-ups remain allowed ([TechCrunch](https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform), [respond.io](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)). Followthrough acting as Kāma toward Kāma's customers is within policy. An owner-facing "ask me anything" brief delivered through the Business API to the owner's own phone sits closer to the line and should be framed as business notifications, or delivered through Muse or the Meta AI surface instead.

**Coexistence.** A number already on the WhatsApp Business app (version 2.24.17 or higher) can be connected to the Cloud API through a Solution Partner or Tech Provider so the app and the API share the thread; broadcast lists in the app are disabled and groups do not sync ([Meta onboarding doc](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users), [360dialog](https://docs.360dialog.com/partner/waba-management/whatsapp-coexistence)). This is how the owner keeps chatting in the app while Followthrough sends from the same number.

**Instagram API limits on public business data.** Business Discovery returns follower count, media count, media and basic metrics for other public professional accounts by username; age-gated accounts are excluded ([Meta Business Discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery)). The tags, mentioned_media and mentioned_comment edges return media and comments in which the app user's own account was tagged or mentioned; they need App Review, mentions on private accounts' media are not delivered, and Stories mentions are unsupported ([Meta mentions guide](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/mentions), [mentioned_media reference](https://developers.facebook.com/docs/instagram-api/reference/ig-user/mentioned_media/)). Follower lists, arbitrary public profiles, hashtag streams beyond a capped search, and competitor benchmarks are not available through official endpoints ([Storrito](https://storrito.com/resources/instagram-api-2026)). Consequence for "Grow": warm-path scoring can use who tags or mentions Kāma, plus Business Discovery lookups of named roasters and stockists, but cannot traverse who follows whom. Instagram messaging needs a reply within 24 hours of the customer's message, with the Human Agent tag allowing a human reply within seven days ([Meta policy overview](https://developers.facebook.com/docs/messenger-platform/policy/policy-overview)).

**Meta's small-business agent announcements, last 12 months.** Business AI pilot in India, Mexico and Brazil (from October 2024); Meta Business Agent global launch and Business Agent Platform (3 June 2026); Platform APIs to partners (1 July 2026); token pricing (1 August 2026); Muse personal agent (8 September 2026); Meta One business plans bundling Business Agent capacity (15 September 2026); Muse Connector Platform (18 September 2026); service-message pricing (1 October 2026). Sources are in the sections above.

**Meta models for the build.** Muse Spark 1.3 is on the Meta Model API at $1.25 per million input tokens and $4.25 per million output tokens, with a cheaper "contributor" tier at $0.10 and $0.20 on which Meta may train; aggregators cite Meta's pricing page, which could not be fetched ([eesel](https://www.eesel.ai/blog/muse-spark-1-3-pricing), [LiteLLM](https://docs.litellm.ai/blog/muse_spark_1_3)). Muse Voice Transcribe (1 September 2026) is hosted only, $3.00 per 1,000 audio minutes, with streaming diarisation and a file endpoint ([Shattered](https://shattered.io/meta-muse-voice-transcribe-ai-glasses-2026), [Meta Model API models page, via search snippet](https://dev.meta.ai/docs/models)). Muse Glimmer (10 August 2026) is a 30B open-weight multimodal model for local agents on a single GPU or Mac Mini ([Fullstack](https://www.fullstack.com/blog/everything-you-need-to-know-about-metas-muse-glimmer), [Meta developers blog](https://developers.meta.com/blog/meta-connect-recap)). "Meta AI Connectors" in the idea document should read "Muse Connector Platform".

## 5. Hackathon angle

Rubric from the context document: Impact 30, Meta tooling 25, Demo 25, Technical depth 20, with bonuses for Best Agentic Use-Case and Best Build on Open Weights. The Cerebral Valley page could not be fetched from this session, so the rubric is taken from the team's own notes.

Three claims the evidence supports:

1. **The cost is counted by the UK government, and it lands on owner time.** 1.5 million UK businesses are affected, £17,000 is owed per affected business, 86 hours a year go to chasing, and micro businesses lose 4.6% of turnover to late payment. Say this with the DBT and OSBC source on screen. It carries Impact.

2. **Meta's own stack stops one step short.** Meta Business Agent answers inbound messages for free on over a million businesses; Muse works for the owner inside WhatsApp; the Business app caps broadcasts at 256 saved contacts and has no view of the ledger. None of them notices that a quote is nine days silent or an invoice twelve days overdue and then drafts the chase. Followthrough runs on Muse Spark for the decision and drafts, Muse Voice Transcribe for voice-note approvals, Muse Glimmer for the local-ledger option, and the WhatsApp Cloud API for delivery. That is the Meta tooling score and the open-weights bonus, provided Glimmer or Spark Open does real work in the demo.

3. **Every chase is a priced, agentic action.** Show the agent choosing between loops (sample feedback, quote, order, invoice), drafting in the owner's voice, waiting for a tap or a voice note, sending a utility template outside the window at the UK list rate, and updating the deal when the reply lands. The per-message pricing turned live on 1 July 2025 and tightened on 1 October 2026, so the "every chase is Meta revenue" line is now literal. This is the Demo score and the agentic bonus.

One claim to avoid: **"Followthrough finds warm intros through the Instagram graph of who knows your customers."** The official API does not expose follower lists or arbitrary public accounts' tags, and the mentions edges only cover tags and mentions of the owner's own account. Demonstrating a follower-graph traversal would require scraping, which judges from Meta will notice. Present "Grow" as tags and mentions of the owner's account plus Business Discovery lookups of named prospects, or leave it for the roadmap. Separately, the four-day cold-to-warm result is prior work under the event rules and can only be mentioned as context.

## Could not verify

The Vodafone UK SME WhatsApp share (45% or 47%); the UK marketing template rate (£0.0382 or £0.0458); the year of Xero's 8.3-days-late figure; Meta's exact Business Agent reply quotas per Meta One tier; the "150 million Instagram business conversations a month" figure, which should not be used; FreeAgent's native reminder channels; the Cerebral Valley rubric text.

## Sources

- https://www.smallbusinesscommissioner.gov.uk/late-payments-research-2
- https://assets.publishing.service.gov.uk/media/688a089a6478525675738ff9/late_payments_research_impact_on_uk_economy.pdf
- https://gocardless.com/blog/gocardless-fsb-late-payments-report-2025
- https://www.fsb.org.uk/resources/article/late-payments-and-payment-methods-in-small-businesses-MCG3GFLR7YJFFV7EZM7C3XPPYYXM
- https://www.coface.com/news-economy-and-insights/2025-uk-payment-survey-companies-face-rising-payment-delays-amid-buyer-cash-flow-concerns
- https://www.gov.uk/government/statistics/large-businesses-payment-practices-and-performance-statistics-2025/large-businesses-payment-practices-and-performance-statistics-2025-commentary
- https://www.paidnice.com/blog/xero-invoice-reminders-explained
- https://www.salesgenie.com/blog/follow-up-statistics
- https://megawebvision.com/insights/lead-response-time-statistics
- https://www.trysetter.com/blog/sales-response-time-statistics-2026
- https://whatsappbusiness.com/resources/resource-library/state-of-business-messaging
- https://www.thisandthat.chat/blog/whatsapp-business-statistics
- https://chatmaxima.com/blog/whatsapp-business-statistics-2026
- https://blog.omnichat.ai/meta-business-agent-platform-explained-features-pricing-and-what-the-2026-whatsapp-changes-mean-for-your-business
- https://www.statista.com/statistics/284506/united-kingdom-social-network-penetration
- https://sproutsocial.com/insights/social-media-statistics-uk
- https://www.smetoday.co.uk/technology/dangers-of-using-whatsapp-for-business-communication
- https://startupsmagazine.co.uk/article-whatsapp-putting-your-business-risk
- https://www.companieshistory.com/instagram-business-statistics
- https://kompozy.io/reviews/claude-duet
- https://superpowerdaily.com/posts/anthropic-opens-claude-duet-preview-for-ai-work-that-keeps-going-between-chats
- https://felloai.com/openai-dots
- https://www.eesel.ai/blog/openai-dots
- https://www.wired.com/story/openai-dots-always-on-ai-agents-that-proactively-help
- https://techcrunch.com/2025/09/05/personalized-ai-companion-app-dot-is-shutting-down
- https://tech-insider.org/meta-muse-personal-ai-agent-launch-2026
- https://www.pbs.org/newshour/nation/meta-launches-personal-ai-agent-muse-to-help-with-everyday-tasks
- https://runtimewire.com/article/meta-opens-muse-connectors-developers
- https://www.kucoin.com/news/flash/meta-opens-muse-to-third-party-developers-triggering-agent-app-store-competition
- https://www.ayautomate.com/blog/grok-bot-xai-ai-agents-explained
- https://www.vellum.ai/blog/official-grok-bot-breakdown
- https://chatmitra.com/blog/whatsapp-business-features
- https://fidusflo.com/blog/whatsapp-broadcast-limit-2026
- https://about.fb.com/br/news/2026/06/conversations-2026-apresentamos-o-meta-business-agent
- https://www.aichat.com/blog/meta-conversations-2026-announcements
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- https://chatmaxima.com/blog/meta-business-agent-platform-explainer-2026
- https://www.wati.io/?p=55658
- https://docs.360dialog.com/docs/mba/meta-business-agent/known-limitations
- https://www.engagelab.com/blog/whatsapp-api-pricing
- https://www.imbee.io/resource/meta-one-business-plans-whatsapp
- https://blog.hootsuite.com/meta-verified
- https://dapta.ai/blog-posts/ai-news-meta-business-agent
- https://www.eesel.ai/blog/wati-pricing
- https://www.getmacha.com/blog/wati-pricing-explained
- https://cxwizard.app/blog/respondio-alternatives
- https://respond.io/blog/interakt-review
- https://www.getmacha.com/blog/respond-io-pricing-explained
- https://respond.io/blog/best-interakt-alternatives
- https://w.app/blog/twilio-whatsapp-pricing
- https://aissist.io/insights/whatsapp-business-api-pricing
- https://taskip.net/best-crm-with-whatsapp-integration
- https://getkanal.com/blog/best-whatsapp-crm
- https://www.visitoai.com/blog/top-8-whatsapp-ai-agents-to-automate-customer-service
- https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-invoices/create-automated-payment-reminders-invoices/L5ZYxcW2q_US_en_US
- https://thefinopartners.com/blogs/xero-accounting-vs-quickbooks
- https://trove.works/credit-control-software-compared
- https://equisettle.co.uk/blogs/post/best-accounts-receivable-software-uk-comparison-guide
- https://www.zoho.com/us/books/help/integrations/whatsapp-integration.html
- https://www.codelixitsolutions.com/blog/whatsapp-payment-reminders-for-invoices
- https://www.breakcold.com/blog/crm-integration-with-whatsapp
- https://trypromptlab.com/blog/best-crm-with-whatsapp-integration
- https://www.instantreply.co/blog/pipedrive-whatsapp-integration-guide-2026
- https://www.paidnice.com/blog/chaser-pricing-alternatives
- https://www.ayautomate.com/blog/openclaw-open-source-ai-agent
- https://contabo.com/blog/what-is-openclaw-self-hosted-ai-agent-guide
- https://blueticks.co/blog/whatsapp-ai-agent
- https://serverspace.io/about/blog/how-to-set-up-n8n-integration-with-whatsapp-crm-and-online-store-to-sell-more-in-2026
- https://gurusup.com/blog/evolution-api-whatsapp
- https://www.visitoai.com/blog/n8n-alternatives-ai-agents-for-whatsapp-business
- https://clawtank.dev/blog/best-open-source-ai-agents-2026
- https://help.twilio.com/articles/30304057900699-Notice-Changes-to-WhatsApp-s-Pricing-July-2025
- https://getkanal.com/es/blog/precios-whatsapp-business.md
- https://chatmaxima.com/whatsapp-api-pricing/uk/
- https://whautomate.com/whatsapp-business-api-pricing-uk
- https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform
- https://respond.io/blog/whatsapp-general-purpose-chatbots-ban
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
- https://docs.360dialog.com/partner/waba-management/whatsapp-coexistence
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/mentions
- https://developers.facebook.com/docs/instagram-api/reference/ig-user/mentioned_media/
- https://storrito.com/resources/instagram-api-2026
- https://developers.facebook.com/docs/messenger-platform/policy/policy-overview
- https://www.eesel.ai/blog/muse-spark-1-3-pricing
- https://docs.litellm.ai/blog/muse_spark_1_3
- https://shattered.io/meta-muse-voice-transcribe-ai-glasses-2026
- https://dev.meta.ai/docs/models
- https://www.fullstack.com/blog/everything-you-need-to-know-about-metas-muse-glimmer
- https://developers.meta.com/blog/meta-connect-recap

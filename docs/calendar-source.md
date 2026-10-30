# T11: stall days and dates from the Cowork artifacts

GK's Cowork artifacts already hold the calendar the app needs. Two of them matter:

| Artifact | What it holds | Collections |
|---|---|---|
| Kāma Stall Tracker (`claude.ai/artifact/1dxpATChZVDxJLQVyQHerX`) | Market dates with status (booked, tentative, requested, possible, waitlist, cancelled), fee, time, where, needs; tasks with due dates, owner (GK or Claude), gate flags; decisions; a log; Christmas markets; lift requests; email drafts approved with a one-hour Zoho hold | `dates`, `tasks`, `decisions`, `log`, `xmas`, `lifts`, `drafts`, `meta/status` |
| Kāma Sales Tracker (`claude.ai/artifact/5xQeKvTwMfy6L44wDACozg`) | Roaster leads with stage, owner, next action and due date; sample status; offers (lot, kg, price); price bands per lot (floor, suggested, ceiling); landed-cost inputs; the next-shipment plan | `leads`, `drafts`, `log`, `settings` (costs, goals, lots, priceBands, shipment) |

## How the app can use them

An artifact's database is read and written through claude.ai (the `ArtifactData` tool in a Claude session, or the page itself in the browser). The Followthrough server cannot call it directly: there is no public API endpoint for an artifact's store, and the app's host has no claude.ai credentials. Three ways, in order of effort:

1. **Export on demand (today).** A Claude session reads the `dates` collection and writes `app/data/calendar.json`; the app reads that file at start and on "Refresh sources". Done once on 29 Oct (`app/data/calendar.json`, organiser names and phones removed). Re-run whenever the tracker changes. Fits the demo and the no-hosting-secrets rule.
2. **Push from the page (small build).** The Stall Tracker page already has a Zoho MCP connection; it could also `fetch()` the app's `POST /api/calendar` with a shared token whenever a date changes. Needs the app on public HTTPS (same requirement as the WhatsApp webhook) and a 20-line handler. Keeps the tracker as the source of truth.
3. **Owner messages only (no build).** GK tells the bot "stall at Clevedon on Sunday" and Capture (workflow A8) opens the loop. Works without any link, but the tracker and the app drift.

Recommendation: 1 for the demo, 2 after, 3 as the fallback that always works. The spec's T11 row should record "calendar.json exported from the Stall Tracker; push endpoint Next".

## Schema the app reads (`app/data/calendar.json`)

```json
{"stall_days":[{"id":"d09","date":"2026-11-01","market":"Clevedon Sunday Market","status":"booked","fee":"£16 suitcase pitch","time":"10 to 2","cashed_up":false}]}
```

`status` booked or possible opens a stall loop; cancelled and waitlist do not. `cashed_up` is written back by the app after a cash-up is approved, never by hand.

## Same pattern for the Sales Tracker

The roaster pipeline in the Sales Tracker is real customer data and stays out of the app under the no-real-data rule. Its `settings` collection (price bands, landed-cost inputs, lots) is business data, not personal data, and is the source of `app/data/terms.md`. Export the same way when prices change.

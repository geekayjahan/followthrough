---
name: eval-blueprint
description: Run the two-pass eval — grade the spec's checks binary with the independent judge agent, then read the traces for what the spec never imagined.
reads:
  - app/evals.md (the encoded checks, from the spec's Verification)
  - the app's output, via the trace app/claude-progress.txt
produces:
  - app/eval-results.html (pass/fail scorecard, one row per check)
  - app/eval-runs.json (run history, appended)
---

# Eval

The build faces the panel it would face on a real team; every question is a binary check; any fail holds the build. The eval is **two passes** — run the checks (top-down), then error analysis (bottom-up). Run both.

## The panel

The panel is how the checks were *written* back in S1 — the eval runs them. Reviewer → the question they raise → the check it becomes:

| Reviewer | Bar-raiser question | Encoded as a binary check |
|---|---|---|
| **QA** | Does it work, including the edges? | every link opens · empty / huge input doesn't crash · N results returned |
| **Architect** | Sound and consistent — nothing reinvented? | same output shape every run · one auth path, not five |
| **Security** | Could it leak data or be injected? | no PII in output · links only to allowed domains · injected input rejected |
| **Customer sense** | Would the person in the spec's Problem actually accept this row? Does it serve their stated outcome — not just match keywords? | ≥ X of N results meet every stated constraint · the "why it fits" reads true for *this* customer |
| **Data / accuracy** | Every claim true to the source? | every cited fact appears in the source (no hallucination) |

## Check-writing rules

Write every check so it is:

- **Binary** — pass or fail, never "7/10." "Every link opens" holds or it doesn't.
- **A rule, not one answer** — the AI rebuilds differently each run, so check the invariant ("every result respects the user's filter"), never "result #1 is the one I expected."
- **Code, screen or judge — the tie-breaker:**

  | Decides it | Tag | Produces |
  |---|---|---|
  | a count, regex, substring, status code, a date | **code** — always, when it can | the value |
  | a statement about meaning, yes/no per item | **screen** — a decision model (Jev) scores every item; the LLM judge writes evidence on the ones below threshold | a probability per item, logged, plus evidence on every fail |
  | meaning that needs an explanation to be actionable | **judge** — the LLM, with two worked pass/fail examples so it grades the way the user would | the verdict and the evidence |

  *Why the screen: it reads every row at almost no cost, so the judge spends its effort where something looks wrong. Why it never decides alone: it returns a number with no reason, and a bare 0.23 tells Debug nothing. The screen is optional (`TYPESAFE_API_KEY` in `.env`); without it, screen checks run as judge checks.*
- **Shape checks mean *exactly* these fields** — an extra, unexpected field is a fail too (extra fields are how things leak).
- **Owned by a reviewer** — assign each `evals.md` check to one of the five dimensions above.

## Pass 1 — Run the checks

1. Turn each reviewer's question into a binary check in `app/evals.md` — tag each *code*, *screen* or *judge*.
   Done when: every check is binary, tagged, and owned by a reviewer.
2. Run every check against every output item, honoring the checkpoints below. A row that fails a hard check (dead link, leaked data) is a broken row — **it counts toward no other check's pass** (a 404 row can't help you "meet the customer's ask"). And **a check whose case this run never exercised is a can't-tell, not a pass** — a rule about empty inputs can't be graded by a run that never received one; green on a scenario that never happened is coverage you don't have.
   Done when: each check has a pass / fail / can't-tell + the value that failed.
3. Write the scorecard `app/eval-results.html`: one row per check — `reviewer · check · pass / fail / can't-tell · evidence`. **On a fail, the evidence names every failing item** (which row, which value) — "2/5 matched" alone gives Debug nothing to fix. This step also seeds the TRACES tab's **Passed → read anyway** group: five rows that passed every check, spread across different checks and items, picked here — never later, never by hunch. When fewer than five rows passed everything, seed all of them and say so on the tab.
   Done when: every fail names its failing items and the passed group is seeded.

## Checkpoints

- HALT IF any reviewer dimension has zero checks — **a blind spot, not a pass**: ask the user for that reviewer's missing question (customer sense goes silent most often). Two answers are legal: a new `evals.md` row written in before the judge runs, or **"not relevant here" plus a one-line reason**, recorded on the scorecard as an *accepted blind spot*. *Why both: the halt exists to force the decision, not to fill the box. An invented security check on an app with no users teaches box-ticking, which is worse than an honest gap. Naming what you chose not to check is the skill.* What stays illegal is skipping the dimension silently.
- Run every check with the **`judge` agent** (`.claude/agents/judge.md`) — never the one that built the app, and with no Edit or Write tool. *Why: a builder grading its own work talks its way to a pass, or quietly edits the check.* The blind-spot halt and the spot-check run in the main session; a subagent cannot ask the user.
- Before the scorecard is trusted, the human **spot-checks three of the judge's verdicts, and at least one of them is a pass** (on a screen check, the threshold is what gets spot-checked). *Why: independence stops the builder talking itself to a pass; it doesn't make the judge right. A wrong fail gets caught anyway — someone goes to fix it. A wrong pass is invisible, because nobody investigates a green light.* When a verdict is wrong, the bug is the check's wording or its two worked examples, not the item: fix the check and re-run. Log the spot-check as one trace line — which three verdicts, and what it found.

## Pass 2 — Error analysis (human-led)

The checks are top-down: the spec wrote them, the judge ran them. Error analysis is bottom-up: the traces show what the spec never imagined.

1. **Read the failures *and five passing rows*, and open-code them** — one annotator writes one note per item: *the first thing that went wrong* (the root cause, not the cascade), as an observation, never an explanation ("missed the location filter", never "the model didn't understand"). No pre-defined failure list — categories emerge from what you actually see. One owner grounds the categories; a committee averages away the insight.

   *Why the passing rows: the checks were written in S1, before the app existed, so a pass only means the app cleared a bar set in ignorance — the failure that no check asked about is sitting in a green row.* Spread the five across different checks and items (the same diversity rule the TRACES tab renders by); **nobody hand-picks them by hunch**, because the hunch is made of the same assumptions that wrote the checks. Five is the floor — raise it when you're not working against a clock.
2. **Cluster the notes into patterns** — split when the root causes differ, merge when they're the same; a handful of grounded names ("expired items pass the freshness check", never generic scores like "hallucination score"). If the AI proposes the clusters, **confirm them with the user before using them** — accept, rename, merge, or split.
3. **Label every failure and every sampled pass** against the confirmed patterns — not just the annotated ones; sample a few labels and check them by hand. Count per pattern; the counts set the priority.
4. **Triage each pattern through the three doors, in this order** — *fix the obvious, spec the repeating, log the rest*:

   | Door | Trigger | Action |
   |---|---|---|
   | **Fix the build** | an obvious bug | → Debug now — don't build an evaluator for something you can just fix |
   | **Fix the spec** | it repeats and matters | → a new row in `evals.md`; next run it's machine-checked — code check preferred, judge only for judgment calls |
   | **Let it ride** | rare and low-stakes | → logged, not chased |

5. **Stop and re-run rules:** stop reading when new failures stop naming new problems. Re-run the whole loop after a model swap or a big spec change — error analysis is not a one-time activity (S5's Model Recall is exactly this trigger).

## Hand-off

- An **obvious bug** → Debug's to-do list now (the failing check *is* the bug).
- A **repeating pattern that matters** → a new check in `evals.md` — the spec is living; the checks grow as you learn.
- A **can't-tell** → two triggers, one fix. Either the *spec* never pinned it down (a missing number or bound), or the *run never exercised the case* (the check is fine; nothing in this output tested it). Both mean fix the spec — pin the number, or pin an input that forces the case — and re-run. Neither is a Debug fix. (If the check itself was just written vaguely, rewrite the check.)
- All **green** → the checks were too soft, not the app finished. Passing 100% means the checks aren't stressing the build; before they become a regression net, take one finding from the five passing rows you read and write it in as a harder check (the "fix the spec" door). *Then* the set stays on as a regression net, re-run after every later change.
- Green means the machine-runnable checks came back clean — not that the app is *audited*. For money / data / safety, a human still signs off.

## Outputs — the eval dashboard

Render `app/eval-results.html` per the **render rule** (see [`../shared-rules.md`](../shared-rules.md)) — it's the workshop's most-watched screen. State the two passes in its header. Four tabs:

- **SCORECARD** — five reviewer cards (QA · architect · security · customer sense · data), each with:
  - its hard question
  - a binary verdict light per check (green pass · red fail · grey can't-tell)
  - evidence expanding under each fail, naming every failing item
  - a coverage chip, three states: "3 checks" · "0 checks — accepted blind spot" with the user's one-line reason on the card · "0 checks — unexamined" (the halt never got an answer, and this one is a fail)
  - a predictions row when the room's pass/fail tally was given: predicted vs actual per check — the gap is the drift lesson
- **TRACES** — header line: *"No grading yet — just read and name what you see."* Print the three annotation rules at the top, then the cards grouped by what the annotator does with each:
  - **Failed → what went wrong** — one card per failing item: the check it failed, the value that failed it, the trace excerpt, a note field. Every failure gets a card; this is the group the annotator works first.
  - **Can't-tell → needs a spec decision** — one card per can't-tell check: the check, the uncertain item(s), the trace excerpt, a note field. (These are the spec gaps — a missing number or bound, or a case this run never exercised.)
  - **Passed → read anyway** — **five rows that passed every check**, spread across different checks and items, seeded in Pass 1's render step (all of them, when fewer than five passed everything) so the group is never empty. Each carries the trace excerpt and a note field like any other card. When a row turns out to hold a problem no check catches, the annotator badges it **"Uncovered"** and it becomes a candidate `evals.md` row. This is where Pass 2 names what the spec never imagined — and the only group that has anything in it when the scorecard comes back all green.
  - Order cards within each group for **diversity** (spread across checks and items, never dump order). Every card carries seeded context + the trace excerpt + one open-code note field (first thing that went wrong, observation not explanation).
  - Persist each note to `app/eval-annotations.json` via the kit server (`POST /eval-annotations`, one entry per run + item), using the same same-origin → `:4000` → clipboard cascade as the spec's selection annotator; `localStorage` is an offline draft only, and the server file is the source of truth on load. A **Copy annotations** button still exports every note as JSON to paste back for Pattern clustering. (PATTERNS-tab cards are read-only resolution summaries — no note field.)
- **PATTERNS** — populate **only from confirmed clusters of human notes**; before that show: *"No patterns yet. Patterns come from your notes, not from a pre-made list — read the traces first."* Then:
  - pattern counts ranked by frequency
  - the run-over-run strip (each re-run a column — a fix visibly flips a light)
  - the pass-rate trend from `eval-runs.json`
  - a coverage line ("4 of 9 failures annotated — the unread ones look unlike anything you've labeled; read those next")
- **ACTIONS** — the three doors as cards, in triage order: Fix the build (→ `/surgical-fix`) · Fix the spec (→ the new `evals.md` row, spelled out) · Let it ride (logged). *Fix the obvious. Spec the repeating. Log the rest.*

Each run also appends to `app/eval-runs.json` (dashboard data, not a handoff artifact) so history survives regeneration:

```json
{"run": "<n>", "timestamp": "<ISO>", "verdicts": [{"check_id": "<id>", "reviewer": "<dimension>", "verdict": "pass|fail|cant-tell", "evidence_summary": "<one line>"}]}
```

Close out per the **trace rule**.

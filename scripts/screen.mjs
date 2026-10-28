// Runs one S3 screen check through Jev: a yes/no meaning question scored on
// every row, so the judge only writes evidence where something looks wrong.
//
//   node scripts/screen.mjs app/screens/<check-id>.in.json
//
// The input file:
//   {"check_id": "C3", "threshold": 0.5,
//    "instructions": "Does the 'why it fits' describe this customer?",
//    "true": "It names the customer's own stated need.",
//    "false": "It is generic, or about someone else.",
//    "rows": [{"id": "row-1", "state": "<the row, as text>"}]}
//
// Writes app/screens/<check-id>.json: one {id, p, flagged} per row, where p is
// Jev's probability the statement holds and flagged means p <= threshold.
// A flagged row is a candidate fail, not a fail: the judge confirms it and
// writes the evidence. Jev returns a number with no reason.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ENDPOINT = 'https://jevmodel.org/v1/systemone';
const MODEL = 'jev-1.13.0'; // pinned: a threshold set on one version means nothing on the next
const PARALLEL = 1; // the free tier answers parallel requests with "Not enough input tokens"

const key = readFileSync('.env', 'utf8').match(/^TYPESAFE_API_KEY=(.*)$/m)?.[1]?.trim();
if (!key) {
  console.error('TYPESAFE_API_KEY is empty in .env — screen checks run as judge checks instead.');
  process.exit(1);
}

const inPath = process.argv[2];
if (!inPath) {
  console.error('usage: node scripts/screen.mjs app/screens/<check-id>.in.json');
  process.exit(1);
}
const check = JSON.parse(readFileSync(inPath, 'utf8'));
const threshold = check.threshold ?? 0.5;

async function score(row) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      state: row.state,
      questions: {
        q: { type: 'noul', instructions: check.instructions, criteria: { true: check.true, false: check.false } },
      },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${row.id}: HTTP ${res.status} ${body.error?.message ?? JSON.stringify(body)}`);
  const p = body.answers.q.noul;
  return { id: row.id, p, flagged: p <= threshold, tokens: body.usage.input_tokens + body.usage.output_tokens };
}

const results = [];
for (let i = 0; i < check.rows.length; i += PARALLEL) {
  results.push(...(await Promise.all(check.rows.slice(i, i + PARALLEL).map(score))));
}

const out = {
  check_id: check.check_id,
  model: MODEL,
  threshold,
  scored_at: new Date().toISOString(),
  tokens: results.reduce((n, r) => n + r.tokens, 0),
  rows: results.map(({ tokens, ...r }) => r),
};
const outPath = join(dirname(inPath), `${check.check_id}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

const flagged = out.rows.filter((r) => r.flagged).length;
console.log(`${check.check_id}: ${out.rows.length} rows scored, ${flagged} flagged at <= ${threshold}, ${out.tokens} tokens → ${outPath}`);

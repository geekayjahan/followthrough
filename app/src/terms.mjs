// Pinned: Price list, Offer ladder, Cadence. Reads app/data/terms.md; a draft may only offer what it allows.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./config.mjs";
const money = (cell) => [...String(cell).matchAll(/£\s?(\d+(?:\.\d{1,2})?)/g)].map((m) => Number(m[1]));
export function parseTerms(text) {
  const terms = { signed_off: /^signed-off:\s*(\d{4}-\d{2}-\d{2}|\d{1,2} \w+ \d{4})\s+\S/.test(text.split(/\r?\n/)[0] || ""), lots: [], bags: {}, cadence: { email: 7, sample: 5 }, never: [] };
  // Price rows: | Lot | Score | List | Floor | Suggested | Ceiling |
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 7 || !/£/.test(cells[3]) || /^Lot$/i.test(cells[1])) continue;
    const list = money(cells[3]), floor = money(cells[4])[0] ?? null, suggested = money(cells[5])[0] ?? null, ceiling = money(cells[6])[0] ?? null;
    const explicit = [...new Set([...list, ...money(cells[5])])];
    terms.lots.push({ name: cells[1], list, floor, suggested, ceiling, explicit, max: Math.max(...explicit, ceiling ?? 0) });
  }
  const bags = text.match(/Stall bags:([^\n]*)/i)?.[1] || "";
  for (const m of bags.matchAll(/(\d+)\s?(g|kg) at £\s?(\d+(?:\.\d{1,2})?)/g))
    terms.bags[m[2] === "kg" ? Number(m[1]) * 1000 : Number(m[1])] = Number(m[3]);
  const sample = text.match(/Chase (\d+) days after a sample/i), email = text.match(/(\d+) days after an outreach email/i);
  if (sample) terms.cadence.sample = Number(sample[1]);
  if (email) terms.cadence.email = Number(email[1]);
  const never = text.match(/^- Never:([^\n]*)/im)?.[1];
  if (never) terms.never = never.split(/,|\bor\b/).map((x) => x.replace(/^\s*(a|an)\s+/, "").trim()).filter(Boolean);
  return terms;
}
export function loadTerms(path = resolve(ROOT, "data/terms.md")) {
  if (!existsSync(path)) return { ok: false, reason: "terms file missing", ...parseTerms("") };
  return { ok: true, path, ...parseTerms(readFileSync(path, "utf8")) };
}
// What the owner never offers (terms.md "Never:" line, spec Pinned: Offer ladder), as text checks.
const FORBIDDEN = [
  { rule: "first-order or volume discount", test: (t) => /(\d+\s?%\s?off|discount)/i.test(t) && !/pallet/i.test(sentenceWith(t, /(\d+\s?%\s?off|discount)/i)) },
  { rule: "free equipment", test: (t) => /\b(free|lend|supply|provide)\b[^.]{0,40}\b(machine|grinder|equipment|espresso machine)\b|\b(machine|grinder|equipment)\b[^.]{0,40}\b(free|on us|no charge)\b/i.test(t) },
  { rule: "exclusivity", test: (t) => /exclusiv/i.test(t) },
  { rule: "availability beyond stock", test: (t) => /\b(guarantee[ds]?|unlimited|always (have|in stock|available)|as much as you (need|like|want)|never run out)\b/i.test(t) },
];
function sentenceWith(text, re) {
  return text.split(/(?<=[.!?])\s+/).find((s) => re.test(s)) || "";
}
// Returns null when the draft may be offered, else {reason, detail} for the draft_blocked line and the ask.
export function checkDraft(text, terms) {
  const placeholder = text.match(/\[([^\]\n]{1,60})\]/);
  if (placeholder) return { reason: "placeholder", detail: `needs a value for [${placeholder[1]}]` };
  const named = terms.lots.filter((l) => new RegExp(l.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text));
  for (const m of text.matchAll(/£\s?(\d+(?:\.\d{1,2})?)\s*(?:\/|per|a|each)\s*(kg|kilo|250\s?g|1\s?kg|bag)/gi)) {
    const price = Number(m[1]), unit = m[2].replace(/\s/g, "").toLowerCase();
    if (unit === "kg" || unit === "kilo") {
      const rows = named.length ? named : terms.lots;
      const allowed = rows.some((l) => l.explicit.includes(price) || (l.floor !== null && price >= l.floor && price <= l.max));
      if (!allowed) return { reason: "price not on price list", detail: `£${price}/kg is on no price-list row${named.length ? ` for ${named.map((l) => l.name).join(", ")}` : ""}` };
    } else {
      const grams = unit === "bag" ? null : unit === "1kg" ? 1000 : 250;
      const allowed = grams ? terms.bags[grams] === price : Object.values(terms.bags).includes(price);
      if (!allowed) return { reason: "price not on price list", detail: `£${price} per ${m[2]} is not a listed bag price` };
    }
  }
  for (const f of FORBIDDEN) if (f.test(text)) return { reason: "offer ladder", detail: `offers a ${f.rule}, which the owner never offers` };
  return null;
}

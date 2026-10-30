// Moves the pack's reference day (2026-10-29) to a target day so its fixed dates line up with the demo clock.
// The app ages loops with DEMO_AGE_DAYS from the moment it boots, so the target is boot day + DEMO_AGE_DAYS.
//   node data/candidate-v1/shift-dates.mjs 2026-11-07 [out-dir]   (out-dir defaults to data/candidate-run)
// Dates printed on the receipt images stay as they are: the PNGs cannot move, and extraction must match them.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REFERENCE_DAY = "2026-10-29";
export const FILES = ["synthetic.json", "books-seed.json", "scenarios.json", "sources.json", "negative-cases.json"];
// JSON paths whose dates come from a receipt image (scenario 7 is SCEN-08; mutation 1 books that receipt).
// "*" matches any array index or key.
export const IMAGE_DATES = {
  "sources.json": ["receipt_sources.*.expected_extraction.date"],
  "scenarios.json": ["scenarios.7.input.steps.*", "scenarios.7.expected_state_changes.extracted_date"],
  "books-seed.json": ["post_scenario_books_mutations.1.operation"],
};
const DAY = /\b(\d{4}-\d{2}-\d{2})(?=T|\b)/g;

export function deltaDays(target) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || new Date(`${target}T00:00:00Z`).toISOString().slice(0, 10) !== target)
    throw Error(`Target must be a real date as YYYY-MM-DD, got ${target}`);
  return (Date.parse(target) - Date.parse(REFERENCE_DAY)) / 86400000;
}
export function shiftDay(day, delta) {
  const t = Date.parse(`${day}T00:00:00Z`);
  // Leave impossible dates alone: negative-cases.json relies on 2026-02-30 staying invalid.
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== day) return day;
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}
const matches = (path, patterns = []) =>
  patterns.some((p) => {
    const a = p.split(".");
    return a.length === path.length && a.every((x, i) => x === "*" || x === path[i]);
  });
// Both receipt images are dated the reference day, so a kept path holds that day; other dates in it still move.
export function shiftJson(value, delta, keep = [], path = []) {
  if (typeof value === "string") {
    const fixed = matches(path, keep);
    return value.replace(DAY, (day) => (fixed && day === REFERENCE_DAY ? day : shiftDay(day, delta)));
  }
  if (Array.isArray(value)) return value.map((v, i) => shiftJson(v, delta, keep, [...path, String(i)]));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftJson(v, delta, keep, [...path, k])]));
  return value;
}
export function shiftPack(target, from = dirname(fileURLToPath(import.meta.url)), to = join(from, "..", "candidate-run")) {
  const delta = deltaDays(target);
  mkdirSync(to, { recursive: true });
  cpSync(join(from, "assets"), join(to, "assets"), { recursive: true });
  for (const f of FILES) {
    const json = JSON.parse(readFileSync(join(from, f), "utf8"));
    writeFileSync(join(to, f), JSON.stringify(shiftJson(json, delta, IMAGE_DATES[f]), null, 2) + "\n");
  }
  return { delta, to };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [target, out] = process.argv.slice(2);
  if (!target) {
    console.error("Usage: node data/candidate-v1/shift-dates.mjs YYYY-MM-DD [out-dir]");
    process.exit(1);
  }
  const { delta, to } = shiftPack(target, undefined, out);
  const weekday = new Date(`${target}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  console.log(`Shifted ${delta} days: reference day ${REFERENCE_DAY} is now ${target} (${weekday}). Written to ${to}`);
  if (delta % 7) console.log("Note: not a whole number of weeks, so stall days leave Thursday/Sunday.");
  if (["Saturday", "Sunday"].includes(weekday)) console.log("Warning: the reference day is a weekend; scheduled briefs only run Monday to Friday.");
}

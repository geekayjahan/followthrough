import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { Domain, demoNow, due, london } from "../src/domain.mjs";
import { validateData } from "../src/config.mjs";
import { shiftPack, deltaDays } from "../data/candidate-v1/shift-dates.mjs";

// The day the demo clock reads after a boot today with DEMO_AGE_DAYS=3: the pack's reference day moves there.
const target = london(demoNow({ DEMO_AGE_DAYS: "3" })).date;
const shifted = () => {
  const to = mkdtempSync(join(tmpdir(), "candidate-run-"));
  shiftPack(target, undefined, to);
  const read = (f) => JSON.parse(readFileSync(join(to, f), "utf8"));
  return { to, read };
};
const plus = (days) => new Date(Date.parse(`${target}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

test("pack dates move by whole days; receipt-image dates and invalid fixtures stay put", () => {
  const { to, read } = shifted();
  const data = read("synthetic.json"), books = read("books-seed.json"), scen = read("scenarios.json");
  assert.deepEqual(data.stall_days.map((d) => d.date), [plus(-7), plus(-4), target]);
  assert.equal(books.reference_clock.iso_utc, `${target}T18:00:00Z`);
  assert.match(books.post_scenario_books_mutations[0].operation, new RegExp(`on ${target}`));
  assert.match(books.post_scenario_books_mutations[1].operation, /2026-10-29/);
  assert.equal(scen.scenarios[7].expected_state_changes.extracted_date, "2026-10-29");
  assert.equal(scen.scenarios[7].event_time, `${target}T15:20:00Z`);
  assert.ok(read("sources.json").receipt_sources.every((r) => r.expected_extraction.date === "2026-10-29"));
  assert.equal(read("negative-cases.json").startup_rejection_cases[5].dataset_patch.invalid_stall_day.date, "2026-02-30");
  assert.ok(existsSync(join(to, "assets/receipts/receipt-01-rainhill-supplies.png")));
  assert.throws(() => deltaDays("2026-02-30"));
  rmSync(to, { recursive: true, force: true });
});

test("booted today and read on the demo clock, the shifted pack gives the scenarios' due loops", () => {
  const { to, read } = shifted();
  const data = read("synthetic.json");
  validateData(data, { SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test" });
  const s = new Store(":memory:"), d = new Domain(s, data);
  const loop = (key) => s.all("loops").find((l) => l.key === key);
  const at = (time) => new Date(`${target}T${time}:00Z`);
  // Seeded now, three demo days later every untouched commercial loop is cold (SCEN-05).
  for (const key of ["lead:org-2", "order:ORD-48201", "order:ORD-48202"]) assert.equal(due(loop(key), at("18:00")), true, key);
  // The reference stall day is not due at 18:00 and is due from 21:00 (SCEN-11); the earlier one is overdue.
  assert.equal(due(loop(`stall:${target}`), at("18:00")), false);
  assert.equal(due(loop(`stall:${target}`), at("21:00")), true);
  assert.equal(due(loop(`stall:${plus(-4)}`), at("18:00")), true);
  assert.equal(loop(`stall:${plus(-7)}`), undefined, "cashed-up day opens no loop");
  s.close();
  rmSync(to, { recursive: true, force: true });
});

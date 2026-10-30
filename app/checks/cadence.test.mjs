import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { Domain, due, cadence } from "../src/domain.mjs";
import { Engine, longDate } from "../src/engine.mjs";
import { fileURLToPath } from "node:url";
const data = () => ({
  orgs: [
    { id: "r1", name: "Northbank", type: "roaster", status: "lead", website: "https://a.example.test" },
    { id: "r2", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://b.example.test" },
  ],
  people: [{ id: "p1", org: "r1", email: "a@example.test" }, { id: "p2", org: "r2", email: "b@example.test" }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [],
});
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
test("W6: an emailed lead is chased after 7 days, a sampled lead after 5; a reply resets to the 3-day clock", () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const fresh = d.loop("lead", "r1", "lead:r1");
  assert.equal(due({ ...fresh, last_touch: ago(3) }, new Date(), d.cadence), true, "a never-contacted lead is cold at 3 days");
  d.touch(fresh.id, "approved send");
  const emailed = { ...s.get("loops", fresh.id), last_touch: ago(6) };
  const sampled = { ...d.loop("sample_out", "r2", "sample:r2"), last_touch: ago(6) };
  assert.equal(due(emailed, new Date(), d.cadence), false, "6 days after an email is not yet cold");
  assert.equal(due(sampled, new Date(), d.cadence), true, "6 days after a sample is cold");
  assert.equal(due({ ...emailed, last_touch: ago(7) }, new Date(), d.cadence), true);
  assert.deepEqual(cadence(emailed).days, 7);
  assert.deepEqual(cadence(sampled).days, 5);
  assert.equal(cadence({ ...emailed, replied: true }).days, 3);
  const live = s.get("loops", emailed.id);
  d.touch(live.id, "email");
  assert.equal(s.get("loops", live.id).replied, true);
  assert.equal(cadence(s.get("loops", live.id)).days, 3);
  assert.equal(due({ ...s.get("loops", live.id), last_touch: ago(3) }, new Date(), d.cadence), true);
  s.close();
});
test("W6: each draft line records its cadence reason, and a chase within 10 days of a shipment closing date names that date", async () => {
  const dir = mkdtempSync(join(tmpdir(), "followthrough-cadence-"));
  const closing = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
  writeFileSync(join(dir, "calendar.json"), JSON.stringify({ stall_days: [], shipments: [{ name: "Shipment 2", closing_date: closing }] }));
  const s = new Store(":memory:"), d = new Domain(s, data());
  let input = null;
  const e = new Engine(s, d, { model: async (task, i) => { input = i; return { text: "Hi Alex,\n\nHow did you find the samples?\n\nThank you.\n\nBest\nGK", subject: "Samples" }; } }, {
    SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x",
    VOICE_FILE: fileURLToPath(new URL("./fixtures/voice-signed.md", import.meta.url)), CALENDAR_FILE: join(dir, "calendar.json"),
  });
  assert.deepEqual(e.d.cadence, { email: 7, sample: 5, cold: 3 }, "cadence read from terms.md");
  const loop = d.loop("sample_out", "r2", "sample:r2");
  const a = await e.draft(loop);
  const line = s.events().find((x) => x.type === "draft" && x.action_id === a.id);
  assert.equal(line.cadence, "5 days after a sample is sent");
  assert.equal(line.closing_date, closing);
  assert.equal(input.cadence, "5 days after a sample is sent");
  assert.ok(a.payload.text.includes(longDate(closing)), a.payload.text);
  assert.ok(a.payload.text.indexOf("closing orders") < a.payload.text.indexOf("Thank you."), "named before the sign-off");
  s.close();
});

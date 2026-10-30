import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { Domain, due, london } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
const iso = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const data = () => ({
  orgs: [
    { id: "sup", name: "Rainhill Supplies", type: "supplier", status: "customer", website: "https://s.example.test" },
    { id: "mkt", name: "Clevedon Sunday Market", type: "market", status: "customer", website: "https://m.example.test" },
  ],
  people: [{ id: "p", org: "mkt", name: "Pat", email: "market@example.test" }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [],
});
function setup(calendar) {
  const dir = mkdtempSync(join(tmpdir(), "followthrough-clocks-"));
  writeFileSync(join(dir, "calendar.json"), JSON.stringify(calendar));
  const s = new Store(":memory:"), d = new Domain(s, data());
  const drafts = [];
  const e = new Engine(s, d, { model: async (task, input) => { drafts.push(input); return { text: "Hi Pat, please find the signed application form attached.", subject: "Form" }; } }, {
    SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x",
    VOICE_FILE: new URL("./fixtures/voice-signed.md", import.meta.url).pathname, CALENDAR_FILE: join(dir, "calendar.json"),
  });
  return { s, d, e, drafts };
}
test("E7: a receipt is cold 7 days after it arrives unbooked, a compliance date 30 days before it falls due; neither a day early", async () => {
  const { s, d, e } = setup({ stall_days: [], compliance: [{ id: "cs", what: "Confirmation statement", due: iso(31) }, { id: "ins", what: "Public liability insurance renewal", due: iso(30) }, { id: "old", what: "Done already", due: iso(10), done: true }] });
  const six = d.loop("receipt", "sup", "receipt:six"), seven = d.loop("receipt", "sup", "receipt:seven");
  s.put("loops", six.id, { ...six, last_touch: new Date(Date.now() - 6 * 86400000).toISOString() });
  s.put("loops", seven.id, { ...seven, last_touch: new Date(Date.now() - 7 * 86400000).toISOString() });
  const brief = await e.brief(new Date(), { manual: true, send: false });
  const ids = brief.loops.map((l) => l.key);
  assert.ok(!ids.includes("receipt:six"), "6 days is not yet cold");
  assert.ok(ids.includes("receipt:seven"), "7 days is cold");
  assert.ok(!ids.includes("compliance:cs"), "31 days out is not yet cold");
  assert.ok(ids.includes("compliance:ins"), "30 days out is cold");
  assert.equal(s.all("loops").find((l) => l.key === "compliance:old"), undefined, "done dates open nothing");
  assert.match(brief.text, /Public liability insurance renewal: due \d{4}-\d{2}-\d{2}, 30 days away/);
  assert.match(brief.text, /receipt unbooked since/);
  assert.equal(due(s.all("loops").find((l) => l.key === "compliance:cs"), new Date(Date.now() + 86400000)), true, "due tomorrow");
  s.close();
});
test("F22 and W4: a calendar stall day opens a loop with cash-up due 21:00; 3 days out an unsent document gets a draft to the organiser; 2 days out transport is named", async () => {
  const { s, e, drafts } = setup({ stall_days: [
    { id: "d1", date: iso(3), market: "Clevedon Sunday Market", status: "booked", cashed_up: false, documents: [{ name: "signed application form", sent: false }, { name: "insurance certificate", sent: true }], transport_confirmed: false },
    { id: "d2", date: iso(9), market: "Somewhere Else", status: "booked", cashed_up: false },
    { id: "d3", date: iso(-20), market: "Old Market", status: "booked", cashed_up: true },
  ] });
  const three = await e.brief(new Date(), { manual: true, send: false });
  const loop = s.all("loops").find((l) => l.key === `stall:${iso(3)}`);
  assert.ok(loop, "stall loop opened from the calendar");
  assert.equal(loop.org_id, "mkt");
  assert.equal(london(new Date(loop.due_at)).time, "21:00", "cash-up due 21:00 London");
  assert.ok(s.all("loops").some((l) => l.key === `stall:${iso(9)}`), "later stall day exists but is not cold yet");
  assert.ok(!s.all("loops").some((l) => l.key === `stall:${iso(-20)}`), "cashed-up days open nothing");
  assert.ok(three.loops.some((l) => l.id === loop.id));
  assert.ok(!three.loops.some((l) => l.key === `stall:${iso(9)}`));
  assert.match(three.text, /Stall Clevedon Sunday Market \d{4}-\d{2}-\d{2}: signed application form not sent to the organiser, 3 days out/);
  assert.ok(!three.text.includes("transport"), "transport is not named 3 days out");
  const draft = three.actions.find((a) => a.loop_id === loop.id);
  assert.equal(draft.payload.to, "market@example.test");
  assert.deepEqual(drafts[0].loop.documents_to_send, ["signed application form"]);
  await e.approve(draft.id, draft).catch(() => {});
  s.put("loops", loop.id, { ...s.get("loops", loop.id), documents: [{ name: "signed application form", sent: true }, { name: "insurance certificate", sent: true }] });
  const two = await e.brief(new Date(Date.now() + 86400000), { manual: true, send: false });
  assert.match(two.text, /transport unconfirmed, 2 days out/);
  s.close();
});

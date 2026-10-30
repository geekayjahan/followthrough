import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain, demoNow, due, weekday } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { createApplication } from "../src/server.mjs";
import { fileURLToPath } from "node:url";
const data = () => ({
  orgs: [
    { id: "c1", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" },
    { id: "l1", name: "Bean & Bloom", type: "cafe", status: "lead", website: "https://b.example.test" },
    { id: "l2", name: "Northbank", type: "roaster", status: "lead", website: "https://c.example.test" },
  ],
  people: [
    { id: "p1", org: "c1", email: "a@example.test", whatsapp: null },
    { id: "p2", org: "l1", email: "b@example.test", whatsapp: null },
    { id: "p3", org: "l2", email: "c@example.test", whatsapp: null },
  ],
  edges: [{ from: "l1", to: "c1", kind: "stocks" }],
  invoices: [],
  lots: [],
  orders: [],
  stall_days: [],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true",
  OWNER_TEST_EMAILS: "owner@example.test",
  WHATSAPP_TEST_NUMBERS: "+15555550002",
  WHATSAPP_OWNER_NUMBERS: "+15555550002",
  APP_URL: "http://127.0.0.1:4310",
  VOICE_FILE: fileURLToPath(new URL("./fixtures/voice-signed.md", import.meta.url)),
  CALENDAR_FILE: fileURLToPath(new URL("./fixtures/calendar-empty.json", import.meta.url)),
};
test("demo clock ages loops for cold checks only; real timestamps untouched", () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const loop = d.loop("quote", "c1", "q1");
  assert.equal(due(loop, new Date()), false);
  assert.equal(due(loop, demoNow({ DEMO_AGE_DAYS: "3" })), true);
  assert.ok(Date.now() - Date.parse(loop.last_touch) < 5000);
  s.close();
});
test("manual brief composes without sending, lists only open loops, warm lead first, max five cards", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  let sends = 0, drafts = 0;
  const p = {
    model: async () => { drafts++; return { text: "Hello via Harbour Roasters", subject: "Hi" }; },
    whatsapp: async () => ({ id: `W-${++sends}` }),
  };
  const e = new Engine(s, d, p, { ...cfg, DEMO_AGE_DAYS: "3" });
  // Leads need qualification before drafting; mark both complete, close l2 as below bar.
  s.put("qualifications", "l1", { complete: true, tier: "mid-shelf" });
  e.qualify = async (id) => {
    if (id === "l2") for (const l of s.all("loops").filter((l) => l.org_id === "l2")) d.close(l.id, "below bar");
  };
  for (let i = 0; i < 6; i++) d.loop("quote", "c1", `q${i}`);
  const brief = await e.brief(new Date(), { manual: true, send: false });
  assert.equal(sends, 0);
  assert.equal(brief.sent, false);
  assert.ok(!brief.loops.some((l) => l.org_id === "l2"), "below-bar lead excluded after qualification");
  assert.equal(brief.loops[0].org_id, "l1", "warm lead ranks first");
  assert.equal(brief.cards.length, 5);
  assert.ok(brief.text.includes("warm lead via Harbour Roasters"));
  assert.ok(brief.text.includes("more in Where I stand"));
  const events = s.events();
  assert.equal(events.filter((x) => x.type === "brief" && x.manual && !x.sent).length, 1);
  assert.equal(s.all("brief_slots")[0].status, "composed");
  // Sending the same composed brief delivers one summary plus one card per action inside the window.
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  const sent = await e.brief(new Date(Date.now() + 1000), { manual: true, send: true });
  assert.equal(sent.cards.length, 5);
  assert.equal(sends, 6);
  assert.equal(s.all("message_bindings").length, 5);
  s.close();
});
test("scheduled brief still ignores manual slots and jobs flag", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const e = new Engine(s, d, {}, cfg);
  assert.equal(await e.brief(new Date("2026-10-29T08:00:00Z")), undefined);
  s.close();
});
test("malformed request target returns 400 and the server survives", async () => {
  const s = new Store(":memory:");
  const app = createApplication({ c: { ...cfg, OWNER_PASSWORD: "x" }, data: data(), store: s, providers: {}, testLabel: "TEST" });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const port = app.server.address().port;
  const { connect } = await import("node:net");
  const reply = await new Promise((resolve) => {
    const sock = connect(port, "127.0.0.1", () => sock.write("GET http://[::1 HTTP/1.1\r\nHost: x\r\n\r\n"));
    let out = ""; sock.on("data", (d) => (out += d)); sock.on("end", () => resolve(out)); sock.on("close", () => resolve(out));
    setTimeout(() => sock.destroy(), 500);
  });
  assert.ok(/400|Invalid request target/.test(reply), reply);
  assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status, 200);
  await app.close();
});
test("E6: no scheduled brief on Saturday or Sunday; Monday 08:00 lists what went cold over the weekend", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  let deliveries = 0;
  const e = new Engine(s, d, { whatsapp: async () => ({ id: `W${++deliveries}` }) }, { ...cfg, ENABLE_JOBS: "true" });
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  const loop = d.loop("quote", "c1", "q-weekend");
  assert.equal(await e.brief(new Date("2026-10-31T08:00:00Z")), undefined, "Saturday");
  assert.equal(await e.brief(new Date("2026-11-01T18:00:00Z")), undefined, "Sunday");
  assert.equal(deliveries, 0);
  s.put("loops", loop.id, { ...loop, last_touch: "2026-10-28T09:00:00Z" });
  const monday = await e.brief(new Date("2026-11-02T08:00:00Z"));
  assert.equal(monday.slot, "08:00");
  assert.ok(monday.loops.some((l) => l.id === loop.id));
  assert.equal(s.events().filter((x) => x.type === "brief" && !x.manual).length, 1);
  assert.deepEqual([weekday(new Date("2026-10-31T12:00:00Z")), weekday(new Date("2026-11-02T12:00:00Z"))], [false, true]);
  s.close();
});

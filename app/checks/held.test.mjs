import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installIntake } from "../src/intake.mjs";
import { createApplication } from "../src/server.mjs";
const data = () => ({
  orgs: [{ id: "o", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" }],
  people: [{ id: "p", org: "o", email: "a@example.test", whatsapp: null }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [],
});
const cfg = (extra = {}) => ({
  SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://127.0.0.1:4310",
  WHATSAPP_TEST_NUMBERS: "+15555550002", WHATSAPP_OWNER_NUMBERS: "+15555550002", ...extra,
});
function setup(extra) {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const sent = [], replies = [];
  const e = new Engine(s, d, {
    email: async (x) => { sent.push(x); return { id: `M${sent.length}`, to: "owner@example.test" }; },
    whatsapp: async (to, text) => { replies.push(text); return { id: `W${replies.length}` }; },
  }, cfg(extra));
  installIntake(e);
  const loop = d.loop("quote", "o", "q");
  const a = s.action("message", { channel: "email", to: "a@example.test", text: "Hi", org_id: "o" }, loop.id);
  return { s, d, e, loop, a, sent, replies, types: () => s.events().map((x) => x.type).reverse() };
}
test("F2: approve holds the message for 60 minutes, then the tick sends it and the loop's touch resets at send", async () => {
  const { s, e, loop, a, sent, types } = setup();
  const before = s.get("loops", loop.id).last_touch;
  const held = await e.approve(a.id, a);
  assert.equal(held.status, "held");
  const hold = (Date.parse(held.send_at) - Date.parse(held.approved_at)) / 60000;
  assert.equal(hold, 60);
  assert.equal(sent.length, 0);
  assert.deepEqual(types().filter((t) => ["approve", "held", "send"].includes(t)), ["approve", "held"]);
  assert.equal(s.get("loops", loop.id).last_touch, before);
  await e.releaseDue(new Date(Date.parse(held.send_at) - 60000));
  assert.equal(sent.length, 0, "not yet due");
  await e.releaseDue(new Date(Date.parse(held.send_at)));
  assert.equal(sent.length, 1);
  const send = s.events().find((x) => x.type === "send");
  assert.equal(send.action_id, a.id);
  assert.equal(send.demo_delay, 60);
  assert.equal(s.get("actions", a.id).status, "completed");
  assert.ok(s.get("loops", loop.id).last_touch > before);
  assert.equal(s.get("loops", loop.id).chases, 1);
  s.close();
});
test("F2: DEMO_SEND_DELAY_MINUTES=0 sends at once with held then send carrying demo_delay 0", async () => {
  const { e, a, sent, types } = setup({ DEMO_SEND_DELAY_MINUTES: "0" });
  const done = await e.approve(a.id, a);
  assert.equal(done.status, "completed");
  assert.equal(sent.length, 1);
  assert.deepEqual(types().filter((t) => ["approve", "held", "send"].includes(t)), ["approve", "held", "send"]);
  assert.equal(e.s.events().find((x) => x.type === "send").demo_delay, 0);
});
test("F16: undo during the hold leaves held then undone, no send, loop untouched; a later yes on that card is blocked", async () => {
  const { s, e, loop, a, sent, replies, types } = setup();
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  s.put("message_bindings", "card1", { action_id: a.id, version: a.version, hash: a.hash });
  const msg = (id, body) => ({ id, from: "15555550002", timestamp: String(Math.floor(Date.now() / 1000)), context: { id: "card1" }, text: { body } });
  const before = s.get("loops", loop.id).last_touch;
  await e.inbound(msg("m1", "yes"));
  assert.equal(s.get("actions", a.id).status, "held");
  assert.match(replies.at(-1), /^Held\./);
  await e.inbound(msg("m2", "undo"));
  assert.equal(s.get("actions", a.id).status, "undone");
  assert.match(replies.at(-1), /^Undone/);
  await e.releaseDue(new Date(Date.now() + 3600001));
  assert.equal(sent.length, 0);
  assert.equal(s.get("loops", loop.id).last_touch, before);
  assert.deepEqual(types().filter((t) => ["held", "undone", "send"].includes(t)), ["held", "undone"]);
  await e.inbound(msg("m3", "yes"));
  assert.ok(s.events().some((x) => x.type === "blocked" && x.event_id === "m3"));
  assert.equal(sent.length, 0);
  s.close();
});
test("T1b: a counterpart reply during the hold revokes the held card; nothing sends", async () => {
  const { s, d, e, loop, a, sent } = setup();
  await e.approve(a.id, a);
  d.receive("o", "Thanks, got it, ordering 20 kg", "email", "r1", loop.id);
  assert.equal(s.get("actions", a.id).status, "revoked");
  await e.releaseDue(new Date(Date.now() + 3600001));
  assert.equal(sent.length, 0);
  s.close();
});
test("F16: the page can undo a held action through POST /api/actions/:id/undo", async () => {
  const s = new Store(":memory:");
  const c = { ...cfg(), OWNER_PASSWORD: "pw", APP_URL: "http://127.0.0.1" };
  let sends = 0;
  const app = createApplication({ c, data: data(), store: s, providers: { email: async () => { sends++; return { id: "x" }; }, booksSnapshot: async () => ({ cash: 0, invoices: [], updated_at: "now" }) }, testLabel: "TEST" });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  c.APP_URL = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const login = await fetch(c.APP_URL + "/api/login", { method: "POST", headers: { Origin: c.APP_URL }, body: JSON.stringify({ password: "pw" }) });
    const headers = { Cookie: login.headers.get("set-cookie").split(";")[0], Origin: c.APP_URL };
    const state = await (await fetch(c.APP_URL + "/api/state", { headers })).json();
    headers["X-CSRF-Token"] = state.csrf;
    const l = app.domain.loop("quote", "o", "q"), a = s.action("message", { channel: "email", to: "a@example.test", text: "t", org_id: "o" }, l.id);
    const held = await (await fetch(`${c.APP_URL}/api/actions/${a.id}/approve`, { method: "POST", headers, body: JSON.stringify(a) })).json();
    assert.equal(held.status, "held");
    const undone = await (await fetch(`${c.APP_URL}/api/actions/${a.id}/undo`, { method: "POST", headers, body: JSON.stringify({ version: a.version, hash: a.hash }) })).json();
    assert.equal(undone.status, "undone");
    await app.tick();
    assert.equal(sends, 0);
    const after = await (await fetch(c.APP_URL + "/api/state", { headers })).json();
    assert.equal(after.actions.find((x) => x.id === a.id).status, "undone");
  } finally {
    await app.close();
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installIntake } from "../src/intake.mjs";
import { installReceipts } from "../src/receipts.mjs";
const data = () => ({
  orgs: [
    { id: "crumb", name: "Crumb Bakery", type: "cafe", status: "customer", website: "https://crumb.example.test" },
    { id: "northgate", name: "Northgate Roasters", type: "roaster", status: "lead", website: "https://northgate.example.test" },
    { id: "courier", name: "Fast Courier", type: "supplier", status: "customer", website: "https://courier.example.test" },
  ],
  people: [
    { id: "p1", org: "crumb", email: "crumb@example.test", whatsapp: "+15555550001" },
    { id: "p2", org: "northgate", email: "northgate@example.test", whatsapp: null },
  ],
  edges: [], invoices: [], orders: [], stall_days: [],
  lots: [{ id: "lot-2", name: "Chikmagalur", start_kg: 50, left_kg: 20, books_item_id: "item-2" }],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true",
  OWNER_TEST_EMAILS: "owner@example.test",
  WHATSAPP_TEST_NUMBERS: "+15555550001,+15555550002",
  WHATSAPP_OWNER_NUMBERS: "+15555550002",
  APP_URL: "http://127.0.0.1:4310",
};
const fourItems = {
  items: [
    { type: "order", org_id: "crumb", reference: null, lot_id: null, kg: 2, date: null, text: "Crumb wants two more kilos Friday", missing: ["lot"] },
    { type: "stall", org_id: null, date: null, text: "the stall was dead", missing: [] },
    { type: "receipt", org_id: "courier", amount: 38, text: "I paid the courier 38 quid cash", missing: [] },
    { type: "chase", org_id: "northgate", text: "remind me to chase the Northgate sample", missing: [] },
  ],
};
function setup(split) {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const replies = [], sent = [];
  const p = {
    whatsapp: async (to, text, opts) => { replies.push({ to, text, action: opts?.action?.id }); return { id: `W${replies.length}` }; },
    email: async (x) => { sent.push(x); return { id: "M", to: "owner@example.test" }; },
    model: async (task, input) => {
      if (task.startsWith("Split")) return split(input);
      if (task.startsWith("Classify a message")) return { intent: "capture", confidence: 0.9 };
      if (task.startsWith("Extract receipt")) return { supplier: "Fast Courier", amount: 38, date: "2026-10-30", currency: "GBP", supplier_quote: "courier", amount_quote: "38" };
      throw Error(`unexpected model task ${task.slice(0, 30)}`);
    },
  };
  const e = new Engine(s, d, p, cfg);
  installReceipts(e);
  installIntake(e);
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  const msg = (id, body, context) => ({ id, from: "15555550002", timestamp: String(Math.floor(Date.now() / 1000)), text: { body }, context });
  return { s, d, e, replies, sent, msg };
}
test("W1: one message with four items gives one capture line, one read-back naming all four, and one ask for the missing lot", async () => {
  const { s, e, replies, msg } = setup(() => fourItems);
  await e.inbound(msg("v1", "Crumb wants two more kilos Friday, the stall was dead, I paid the courier 38 quid cash, and remind me to chase the Northgate sample"));
  const captures = s.events().filter((x) => x.type === "capture");
  assert.equal(captures.length, 1);
  assert.deepEqual(captures[0].items.map((i) => i.type), ["order", "stall", "receipt", "chase"]);
  assert.equal(replies.length, 1, "one read-back");
  for (const name of ["Crumb Bakery", "Stall", "Fast Courier", "Northgate Roasters"]) assert.ok(replies[0].text.includes(name), name);
  const asks = s.events().filter((x) => x.type === "ask");
  assert.equal(asks.length, 1);
  assert.match(asks[0].ask, /lot/);
  assert.ok(replies[0].text.includes("which lot"));
  const loops = s.all("loops").filter((l) => l.status === "open");
  assert.ok(loops.some((l) => l.type === "order_unconfirmed" && l.org_id === "crumb" && l.kg === 2));
  assert.ok(loops.some((l) => l.type === "stall"));
  assert.ok(loops.some((l) => l.type === "receipt" && l.org_id === "courier"));
  assert.ok(loops.some((l) => l.type === "sample_out" && l.org_id === "northgate"));
  s.close();
});
test("W2: the same order twice is one loop; the second capture is marked duplicate with no new loop_open", async () => {
  const { s, e, msg } = setup(() => ({ items: [{ type: "order", org_id: "crumb", reference: "PO-7", kg: 10, lot_id: "lot-2", text: "Crumb confirmed PO-7, 10 kg of lot 2", missing: [] }] }));
  await e.inbound(msg("o1", "Crumb confirmed PO-7, 10 kg of lot 2"));
  const opens = () => s.events().filter((x) => x.type === "loop_open").length;
  const before = opens();
  await e.inbound(msg("o2", "Crumb confirmed PO-7, 10 kg of lot 2"));
  assert.equal(opens(), before);
  assert.equal(s.all("loops").filter((l) => l.org_id === "crumb" && l.status === "open").length, 1);
  const second = s.events().filter((x) => x.type === "capture")[0];
  assert.equal(second.event_id, "o2");
  assert.equal(second.items[0].duplicate, true);
  s.close();
});
test("W2: an order the pack already holds at a later stage is a duplicate; a different kg asks instead of reserving again", async () => {
  const { s, d, e, replies, msg } = setup(() => ({ items: [{ type: "order", org_id: "crumb", reference: "PO-9", kg: 8, lot_id: "lot-2", text: "Crumb wants PO-9, 8 kg of lot 2", missing: [] }] }));
  d.loop("order_to_ship", "crumb", "order:PO-9", { order_id: "PO-9", kg: 6, lot_id: "lot-2" });
  const opens = () => s.events().filter((x) => x.type === "loop_open").length;
  const reserves = () => s.events().filter((x) => x.type === "reserve").length;
  const before = [opens(), reserves()];
  await e.inbound(msg("o9", "Crumb wants PO-9, 8 kg of lot 2"));
  assert.equal(opens(), before[0]);
  assert.equal(reserves(), before[1]);
  assert.equal(s.all("loops").filter((l) => l.org_id === "crumb" && l.status === "open").length, 1);
  const cap = s.events().find((x) => x.type === "capture" && x.event_id === "o9");
  assert.equal(cap.items[0].duplicate, true);
  const ask = s.events().find((x) => x.type === "ask" && x.reason === "kg_mismatch");
  assert.ok(ask && /6 kg/.test(ask.ask) && /8 kg/.test(ask.ask), "ask names both kg");
  assert.ok(replies.some((r) => /Which is right/.test(r.text)));
  s.close();
});
test("W15: a forwarded customer message attaches to the matching loop as thread_append, or opens a loop; nothing is drafted to the third party", async () => {
  const { s, d, e, replies, sent, msg } = setup((input) => ({
    items: [{ type: "thread", org_id: input.message.includes("Crumb") ? "crumb" : null, counterpart: input.message.includes("Crumb") ? null : "Marco from the deli", reference: null, text: input.message, missing: [] }],
  }));
  const existing = d.loop("quote", "crumb", "quote:crumb");
  await e.inbound(msg("f1", "Fwd from Crumb: can you do 5 kg next week?", { forwarded: true }));
  const append = s.events().find((x) => x.type === "thread_append");
  assert.equal(append.loop_id, existing.id);
  assert.deepEqual(d.thread(existing.id).map((m) => m.from), ["counterpart"]);
  await e.inbound(msg("f2", "Marco from the deli asked about wholesale", { forwarded: true }));
  assert.ok(s.events().some((x) => x.type === "loop_open" && x.source === "capture"));
  assert.ok(s.all("loops").some((l) => l.type === "lead" && s.get("orgs", l.org_id)?.name === "Marco from the deli"));
  assert.equal(sent.length, 0);
  assert.equal(s.all("actions").length, 0);
  assert.ok(replies.every((r) => r.to === "+15555550002"));
  s.close();
});

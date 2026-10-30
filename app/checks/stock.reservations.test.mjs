import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installIntake } from "../src/intake.mjs";
const data = () => ({
  orgs: [
    { id: "r1", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" },
    { id: "r2", name: "Northbank", type: "roaster", status: "customer", website: "https://b.example.test" },
    { id: "r3", name: "Devon Roasters", type: "roaster", status: "lead", website: "https://c.example.test" },
    { id: "estate", name: "Kalledevarapura Estate", type: "supplier", status: "customer", website: "https://e.example.test" },
  ],
  people: [
    { id: "p1", org: "r1", email: "a@example.test" }, { id: "p2", org: "r2", email: "b@example.test" },
    { id: "p3", org: "r3", email: "c@example.test" }, { id: "p4", org: "estate", email: "e@example.test" },
  ],
  edges: [], invoices: [], orders: [], stall_days: [],
  lots: [
    { id: "lot-4", name: "Yeast Maceration", start_kg: 140, left_kg: 140, books_item_id: "i4" },
    { id: "lot-2", name: "Plantation A", start_kg: 300, left_kg: 300, books_item_id: "i2" },
  ],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x", DEMO_SEND_DELAY_MINUTES: "0",
  WHATSAPP_TEST_NUMBERS: "+15555550002", WHATSAPP_OWNER_NUMBERS: "+15555550002",
  VOICE_FILE: new URL("./fixtures/voice-signed.md", import.meta.url).pathname,
};
test("F18: a reservation beyond free kg is refused with an allocation_conflict naming the lot, and another lot or a pre-book is proposed", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const sent = [];
  const e = new Engine(s, d, {
    whatsapp: async (to, text) => { sent.push(text); return { id: `W${sent.length}` }; },
    model: async (task, input) => {
      if (task.startsWith("Classify a message")) return { intent: "capture", confidence: 0.9 };
      if (task.startsWith("Split")) return { items: [{ type: "order", org_id: input.message.includes("Northbank") ? "r2" : "r1", reference: input.message.includes("Northbank") ? "PO-9" : "PO-8", kg: 70, lot_id: "lot-4", text: input.message, missing: [] }] };
      throw Error("unexpected");
    },
  }, cfg);
  installIntake(e);
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  s.put("lots", "lot-4", { ...s.get("lots", "lot-4"), left_kg: 70 });
  const first = d.loop("order_unconfirmed", "r1", "business:r1:PO-7");
  assert.equal(d.reserve(first.id, "lot-4", 70).ok, true);
  assert.equal(d.freeKg("lot-4"), 0);
  const msg = (id, body) => ({ id, from: "15555550002", timestamp: String(Math.floor(Date.now() / 1000)), text: { body } });
  await e.inbound(msg("m1", "Northbank want one more 70 kg bag of the Yeast Maceration, PO-9"));
  const types = s.events().map((x) => x.type);
  assert.equal(types.filter((t) => t === "reserve").length, 1, "no reserve line for the second roaster");
  const conflict = s.events().find((x) => x.type === "allocation_conflict");
  assert.equal(conflict.lot_id, "lot-4");
  assert.equal(conflict.org_id, "r2");
  assert.match(sent.at(-1), /Not reserved: Yeast Maceration has only 0 kg free\. Plantation A has 300 kg free, or pre-book/);
  assert.equal(s.all("loops").find((l) => l.org_id === "r2").reserved_kg, 0);
  s.close();
});
test("F19: a supplier balance below what is reserved gives a supplier_diff naming the shortfall, and the next brief drafts to every affected counterpart without sending", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const sent = [], drafts = [];
  const e = new Engine(s, d, {
    email: async (x) => { sent.push(x); return { id: "M", to: "owner@example.test" }; },
    model: async (task, input) => {
      if (task.startsWith("Classify commercial")) return { type: "supplier_balance", evidence: "40 kg left of the Yeast Maceration", balances: [{ lot_id: "lot-4", kg: 40 }] };
      if (task.startsWith("Write the owner")) { drafts.push(input); return { text: `Hi, the estate has less ${input.loop.lot} than expected; ${input.loop.supplier_shortfall.shortfall_kg} kg short.`, subject: "Lot update" }; }
      throw Error("unexpected " + task.slice(0, 20));
    },
  }, cfg);
  installIntake(e);
  const a = d.loop("order_unconfirmed", "r1", "business:r1:PO-1"), b = d.loop("order_unconfirmed", "r2", "business:r2:PO-2");
  d.reserve(a.id, "lot-4", 35);
  d.reserve(b.id, "lot-4", 20);
  await e.classifyIntake("Balance update: 40 kg left of the Yeast Maceration after the last dispatch.", "estate", "email", "mail-1");
  const diff = s.events().find((x) => x.type === "supplier_diff");
  assert.deepEqual([diff.lot_id, diff.supplier_kg, diff.reserved_kg, diff.shortfall_kg, diff.affected.length], ["lot-4", 40, 55, 15, 2]);
  assert.equal(d.freeKg("lot-4"), -15);
  assert.equal(d.reserve(d.loop("order_unconfirmed", "r3", "business:r3:PO-3").id, "lot-4", 10).ok, false, "a further reservation on the short lot is refused");
  const brief = await e.brief(new Date(), { manual: true, send: false });
  assert.match(brief.text, /Yeast Maceration is 15 kg short of what you've promised \(40 kg at the supplier, 55 reserved\)\. 2 counterparts affected/);
  const orgs = brief.actions.map((x) => x.payload.org_id).sort();
  assert.deepEqual(orgs, ["r1", "r2"]);
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].loop.supplier_shortfall.shortfall_kg, 15);
  assert.equal(sent.length, 0);
  assert.equal(s.events().filter((x) => x.type === "send").length, 0);
  s.close();
});
test("W11: a lead saying go ahead with 20 kg of lot 2 moves to order unconfirmed, reserves 20 kg, and asks for delivery details", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const e = new Engine(s, d, {
    model: async () => ({ type: "order_unconfirmed", reference: null, next_move: null, evidence: "go ahead with 20 kg of lot 2", kg: 20, lot_id: "lot-2", delivery: null }),
  }, cfg);
  installIntake(e);
  const lead = d.loop("quote", "r3", "quote:r3");
  const before = d.freeKg("lot-2");
  d.receive("r3", "Great, go ahead with 20 kg of lot 2 please", "email", "m2", lead.id);
  await e.classifyIntake("Great, go ahead with 20 kg of lot 2 please", "r3", "email", "m2");
  const order = s.all("loops").find((l) => l.org_id === "r3" && l.type === "order_unconfirmed");
  assert.ok(order, "order unconfirmed loop exists");
  assert.equal(order.reserved_kg, 20);
  assert.equal(d.freeKg("lot-2"), before - 20);
  assert.ok(s.events().some((x) => x.type === "reserve" && x.loop_id === order.id && x.kg === 20));
  const ask = s.events().find((x) => x.type === "ask" && x.reason === "delivery_details_missing");
  assert.equal(ask.loop_id, order.id);
  s.close();
});

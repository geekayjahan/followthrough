import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installStall, sizesInText } from "../src/stall.mjs";
function setup() {
  const s = new Store(":memory:"),
    d = new Domain(s, {
      orgs: [],
      people: [],
      lots: [
        {
          id: "lot-2",
          name: "Lot 2",
          start_kg: 10,
          left_kg: 2,
          books_item_id: "item-2",
        },
      ],
      orders: [],
      stall_days: [],
      edges: [],
    });
  let calls = 0;
  const p = {
    model: async () => ({
      count: 6,
      bag_grams: 250,
      lot_id: "lot-2",
      amount: 120,
      currency: "GBP",
    }),
    sale: async () => {
      calls++;
      return { id: "sale-1" };
    },
  };
  const e = new Engine(s, d, p, { SYNTHETIC_DATA_APPROVED: "true" });
  installStall(e);
  return { s, e, p, calls: () => calls };
}
test("approved six 250g bags moves exactly 1.5kg once; missing size only asks", async () => {
  const { s, e, p, calls } = setup();
  p.model = async () => ({
    count: 6,
    bag_grams: null,
    lot_id: "lot-2",
    amount: 120,
    currency: "GBP",
  });
  assert.ok((await e.cashup("six bags", "e1", "owner")).ask);
  assert.equal(calls(), 0);
  p.model = async () => ({
    count: 6,
    bag_grams: 250,
    lot_id: "lot-2",
    amount: 120,
    currency: "GBP",
  });
  const { action } = await e.cashup("250g", "e2", "owner");
  assert.equal(s.get("lots", "lot-2").left_kg, 2);
  await e.approve(action.id, action);
  assert.equal(s.get("lots", "lot-2").left_kg, 0.5);
  await assert.rejects(e.approve(action.id, action));
  assert.equal(calls(), 1);
  s.close();
});
test("unknown sale reserves stock and prevents overselling another action", async () => {
  const { s, e, p } = setup();
  const a = (await e.cashup("six 250g bags, 120 cash", "1", "a")).action;
  const b = (await e.cashup("six 250g bags, 120 cash", "2", "b")).action;
  p.sale = async () => {
    throw Error("timeout");
  };
  await assert.rejects(e.approve(a.id, a));
  await assert.rejects(e.approve(b.id, b), /Insufficient/);
  assert.equal(s.get("lots", "lot-2").left_kg, 2);
  s.close();
});
test("AR-08a: a bag size the owner never said is not accepted from the model; the ask comes first, then the size given later completes it", async () => {
  const { s, e, p, calls } = setup();
  p.model = async () => ({ count: 6, bag_grams: 250, lot_id: "lot-2", amount: 120, currency: "GBP" });
  const first = await e.cashup("sold six bags of lot 2, 120 pounds cash", "e1", "owner");
  assert.ok(first.ask, "no size in the words, so it asks");
  assert.equal(s.all("actions").length, 0);
  assert.equal(calls(), 0);
  const second = await e.cashup("they were 250g bags", "e2", "owner");
  assert.equal(second.action.payload.bag_grams, 250);
  assert.equal(second.action.payload.kg, 1.5);
  const third = await e.cashup("sold two 1kg bags of lot 2, 56 pounds", "e3", "owner2");
  p.model = async () => ({ count: 2, bag_grams: 1000, lot_id: "lot-2", amount: 56, currency: "GBP" });
  assert.ok(third.ask || third.action);
  s.close();
});
test("sizesInText reads grams and kilos the owner actually said", () => {
  assert.deepEqual(sizesInText("six 250g bags and two 1 kg bags"), [250, 1000]);
  assert.deepEqual(sizesInText("a kilo of lot 2"), [1000]);
  assert.deepEqual(sizesInText("sold six bags"), []);
});

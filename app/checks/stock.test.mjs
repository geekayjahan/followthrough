import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installStock } from "../src/stock.mjs";
test("strictly below twenty percent opens one due reorder loop", () => {
  const s = new Store(":memory:"),
    d = new Domain(s, {
      orgs: [],
      people: [],
      lots: [{ id: "l", name: "Test lot", start_kg: 10, left_kg: 2 }],
      orders: [],
      stall_days: [],
      edges: [],
    }),
    e = new Engine(s, d, {}, {});
  installStock(e);
  assert.equal(s.all("loops").length, 0);
  s.put("lots", "l", {
    id: "l",
    name: "Test lot",
    start_kg: 10,
    left_kg: 1.999,
  });
  e.refreshStock();
  e.refreshStock();
  assert.equal(d.cold().length, 1);
  assert.equal(d.cold()[0].type, "lot_low");
  s.close();
});

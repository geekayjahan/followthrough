import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
const data = () => ({
  orgs: [{ id: "c", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" }],
  people: [], edges: [], invoices: [], orders: [], stall_days: [],
  lots: [{ id: "lot-2", name: "Chikmagalur natural", start_kg: 50, left_kg: 5 }],
});
test("W14: what leaked counts loops that went cold twice in the window, from loop_open, touch and brief lines", () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const e = new Engine(s, d, {}, {});
  const twice = d.loop("quote", "c", "q1"), once = d.loop("sample_out", "c", "s1"), never = d.loop("lead", "c", "l1");
  s.audit("brief", { slot: "08:00", loop_ids: [twice.id, once.id] });
  s.audit("brief", { slot: "18:00", loop_ids: [twice.id, once.id] });
  d.touch(twice.id, "email");
  d.touch(once.id, "approved send");
  s.audit("brief", { slot: "08:00", loop_ids: [twice.id, once.id] });
  const leaked = e.leaked(new Date(), 7);
  assert.equal(leaked.count, 1);
  assert.deepEqual(leaked.loops, [{ loop_id: twice.id, episodes: 2 }]);
  assert.equal(leaked.briefed, 2);
  assert.equal(e.leaked(new Date(Date.now() + 8 * 86400000), 7).count, 0, "outside the window");
  assert.equal(e.title(d.loop("lot_low", null, "low:lot-2", { lot_id: "lot-2" })), "Chikmagalur natural");
  assert.equal(e.title(d.loop("stall", null, "stall:2026-11-01", { stall_date: "2026-11-01" })), "Stall 2026-11-01");
  assert.ok(never.id);
  s.close();
});

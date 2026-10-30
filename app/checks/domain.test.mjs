import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain, due, london, affirmative, warmPath } from "../src/domain.mjs";
const fixture = {
  orgs: [
    { id: "a", status: "lead", website: "https://a.example.test" },
    { id: "b", status: "lead", website: "https://b.example.test" },
    { id: "c", status: "customer", website: "https://c.example.test" },
  ],
  lots: [],
  orders: [],
  stall_days: [],
  edges: [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ],
};
test("London calendar cold boundary spans DST and ignores elapsed-hour shortcut", () => {
  const l = {
    status: "open",
    type: "lead",
    last_touch: "2026-10-23T22:30:00Z",
  };
  assert.equal(due(l, new Date("2026-10-26T00:01:00Z")), true);
  assert.equal(due(l, new Date("2026-10-25T23:59:00Z")), false);
  assert.equal(london(new Date("2026-03-29T07:00:00Z")).time, "08:00");
});
test("soft no closes only loop, hard decline blocks organization domain without shared example.test", () => {
  const s = new Store(":memory:"),
    d = new Domain(s, fixture);
  const l = s.all("loops").find((l) => l.org_id === "a");
  d.receive("a", "not now, maybe next quarter", "email", "1");
  assert.equal(s.get("loops", l.id).reason, "human reply");
  assert.ok(!d.blocked("a"));
  d.suppress("a");
  assert.ok(d.blocked("a"));
  assert.ok(!d.blocked("b"));
  s.close();
});
test("approval grammar rejects ambiguous or negated yes; network caps two edges", () => {
  assert.ok(affirmative("yes send it"));
  assert.ok(!affirmative("no, but yes"));
  assert.ok(!affirmative("yes to the other one"));
  assert.deepEqual(warmPath("a", fixture.orgs, fixture.edges), ["a", "b", "c"]);
});
test("intake deduplicates business references, shipment closes one loop, touches revoke drafts", () => {
  const s = new Store(":memory:"),
    d = new Domain(s, fixture);
  const l = d.intake(
    { type: "order_to_ship", org_id: "c", reference: "PO-1" },
    "email",
    "e1",
  );
  assert.equal(
    d.intake(
      { type: "order_to_ship", org_id: "c", reference: "PO-1" },
      "email",
      "e2",
    ).id,
    l.id,
  );
  const a = s.action("message", { text: "draft" }, l.id);
  d.touch(l.id, "reply");
  assert.equal(s.get("actions", a.id).status, "revoked");
  d.ship(l.id);
  assert.equal(s.get("loops", l.id).status, "closed");
  s.close();
});
test("revoking a pending card leaves a revoked line with the action, loop and reason", () => {
  const s = new Store(":memory:"),
    d = new Domain(s, fixture);
  const l = d.loop("quote", "c", "q-revoke");
  const a = s.action("message", { text: "draft" }, l.id);
  d.touch(l.id, "reply");
  const line = s.events().find((x) => x.type === "revoked");
  assert.equal(line.action_id, a.id);
  assert.equal(line.loop_id, l.id);
  assert.equal(line.reason, "new touch");
  s.close();
});
test("loops carry a stage from the counterpart's sequence; completing one moves to the next; chases reset on a counterpart touch", () => {
  const s = new Store(":memory:"),
    d = new Domain(s, {
      ...fixture,
      orgs: [
        { id: "cafe", type: "cafe", status: "lead", website: "https://cafe.example.test" },
        { id: "roaster", type: "roaster", status: "customer", website: "https://r.example.test" },
      ],
    });
  const cafe = s.all("loops").find((l) => l.org_id === "cafe");
  assert.equal(cafe.stage, "intro");
  assert.equal(cafe.chases, 0);
  d.complete(cafe.id, "sample");
  assert.equal(s.get("loops", cafe.id).stage, "guest slot offer");
  const line = s.events().find((x) => x.type === "stage");
  assert.deepEqual([line.completed, line.to], ["sample", "guest slot offer"]);
  const order = d.loop("order_unconfirmed", "roaster", "o1");
  assert.equal(order.stage, "Booked");
  assert.equal(order.reserved_kg, 0);
  d.touch(order.id, "approved send");
  d.touch(order.id, "approved send");
  assert.equal(s.get("loops", order.id).chases, 2);
  d.touch(order.id, "email");
  assert.equal(s.get("loops", order.id).chases, 0);
  assert.throws(() => d.complete(order.id, "guest slot offer"), /Unknown stage/);
  s.close();
});

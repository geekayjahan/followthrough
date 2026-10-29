import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import {
  Domain,
  london,
  replyClass,
  affirmative,
  calendarDue,
} from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installStall } from "../src/stall.mjs";
import { installStock } from "../src/stock.mjs";
import { installIntake } from "../src/intake.mjs";
import { createApplication } from "../src/server.mjs";
const fixture = () => ({
  orgs: [
    {
      id: "o",
      name: "Synthetic Customer",
      status: "customer",
      website: "https://customer.example.test",
    },
  ],
  people: [
    { id: "p", org: "o", email: "p@example.test", whatsapp: "+15555550001" },
  ],
  edges: [],
  invoices: [],
  lots: [
    { id: "l", name: "Lot", start_kg: 10, left_kg: 2, books_item_id: "item" },
  ],
  orders: [],
  stall_days: [{ date: london().date, cashed_up: false }],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true",
  OWNER_TEST_EMAILS: "owner@example.test",
  WHATSAPP_TEST_NUMBERS: "+15555550001,+15555550002",
  WHATSAPP_OWNER_NUMBERS: "+15555550002",
  APP_URL: "http://127.0.0.1:4310",
};
test("different concurrent sales cannot oversell; confirmed cash-up closes seeded stall and opens low-stock loop", async () => {
  const s = new Store(":memory:"),
    d = new Domain(s, fixture());
  let calls = 0;
  const e = new Engine(
    s,
    d,
    {
      model: async () => ({
        count: 6,
        bag_grams: 250,
        lot_id: "l",
        amount: 120,
        currency: "GBP",
      }),
      sale: async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 10));
        return { id: "TEST-SALE" };
      },
    },
    cfg,
  );
  installStall(e);
  installStock(e);
  const a = (await e.cashup("test", "1", "a")).action,
    b = (await e.cashup("test", "2", "b")).action;
  const outcomes = await Promise.allSettled([
    e.approve(a.id, a),
    e.approve(b.id, b),
  ]);
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
  assert.equal(calls, 1);
  assert.equal(s.get("lots", "l").left_kg, 0.5);
  assert.equal(
    s.all("loops").find((l) => l.key === `stall:${london().date}`).status,
    "closed",
  );
  assert.ok(s.all("loops").some((l) => l.type === "lot_low"));
  assert.equal(s.get("actions", b.id).status, "pending");
  s.close();
});
test("reply binding protects unrelated invoices; hard stop takes precedence and unbound yes is not approval", () => {
  const s = new Store(":memory:"),
    d = new Domain(s, fixture()),
    sample = d.loop("sample_out", "o", "sample"),
    invoice = d.loop("invoice", "o", "invoice", { invoice_due: "2026-10-01" });
  d.receive("o", "not now, next quarter", "email", "e", sample.id);
  assert.equal(s.get("loops", sample.id).status, "closed");
  assert.equal(s.get("loops", invoice.id).status, "open");
  assert.equal(replyClass("stop contacting me, maybe later"), "declined");
  assert.equal(affirmative("send it"), false);
  assert.equal(affirmative("approve"), false);
  assert.equal(calendarDue("2026-10-23T22:30:00Z"), "2026-10-26T00:00:00.000Z");
  s.close();
});
test("unknown inbound content is rejected before persistence; exact owner reply is replay-safe and refuses no-yes", async () => {
  const s = new Store(":memory:"),
    d = new Domain(s, fixture());
  let sends = 0;
  const e = new Engine(
    s,
    d,
    {
      email: async () => {
        sends++;
        return { id: "TEST-MAIL" };
      },
      whatsapp: async () => ({ id: "TEST-RESPONSE" }),
    },
    cfg,
  );
  installIntake(e);
  await e.inbound({
    id: "unknown",
    from: "19999999999",
    timestamp: String(Math.floor(Date.now() / 1000)),
    text: { body: "PRIVATE CONTENT MUST NOT PERSIST" },
  });
  assert.ok(!JSON.stringify(s.events()).includes("PRIVATE"));
  assert.equal(s.get("inbound", "unknown"), null);
  const loop = d.loop("quote", "o", "quote"),
    a = s.action(
      "message",
      {
        channel: "email",
        to: "p@example.test",
        text: "Approved test",
        org_id: "o",
      },
      loop.id,
    );
  s.put("message_bindings", "quoted", {
    action_id: a.id,
    version: a.version,
    hash: a.hash,
  });
  const message = {
    id: "in1",
    from: "15555550002",
    timestamp: String(Math.floor(Date.now() / 1000)),
    context: { id: "quoted" },
    text: { body: "no, but yes" },
  };
  await e.inbound(message);
  assert.equal(sends, 0);
  await e.inbound({ ...message, id: "in2", text: { body: "yes send it" } });
  await e.inbound({ ...message, id: "in2", text: { body: "yes send it" } });
  assert.equal(sends, 1);
  s.close();
});
test("London slots deduplicate across SQLite restart and do not catch up late", async () => {
  const dir = mkdtempSync(join(tmpdir(), "followthrough-scheduler-test-")),
    path = join(dir, "test.sqlite");
  let deliveries = 0;
  let s = new Store(path),
    d = new Domain(s, { ...fixture(), stall_days: [] });
  const p = { whatsapp: async () => ({ id: `TEST-${++deliveries}` }) },
    c = { ...cfg, ENABLE_JOBS: "true" };
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  let e = new Engine(s, d, p, c);
  await e.brief(new Date("2026-10-29T08:00:00Z"));
  await e.brief(new Date("2026-10-29T08:01:00Z"));
  s.close();
  s = new Store(path);
  d = new Domain(s, { ...fixture(), stall_days: [] });
  e = new Engine(s, d, p, c);
  await e.brief(new Date("2026-10-29T08:02:00Z"));
  await e.brief(new Date("2026-10-29T18:00:00Z"));
  await e.brief(new Date("2026-10-30T08:03:00Z"));
  assert.equal(deliveries, 2);
  assert.equal(s.events().filter((x) => x.type === "brief").length, 2);
  s.close();
});
test("transaction rollback emits no phantom JSONL event and crash-state actions remain locked after restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "followthrough-restart-test-")),
    path = join(dir, "test.sqlite"),
    log = join(dir, "events.jsonl");
  let s = new Store(path, log);
  assert.throws(() =>
    s.tx(() => {
      s.audit("phantom", { test: true });
      throw Error("rollback");
    }),
  );
  assert.equal(s.events().length, 0);
  assert.ok(!existsSync(log));
  const data = fixture(),
    c = { ...cfg, OWNER_PASSWORD: "test" };
  let app = createApplication({ c, data, store: s, providers: {} });
  const action = s.action("expense", { amount: 2 });
  action.status = "executing";
  s.put("actions", action.id, action);
  s.close();
  s = new Store(path, log);
  app = createApplication({ c, data, store: s, providers: {} });
  assert.equal(s.get("actions", action.id).status, "needs_reconciliation");
  const changed = structuredClone(data);
  changed.orgs[0].books_contact_id = "new-mapping";
  assert.throws(
    () => createApplication({ c, data: changed, store: s, providers: {} }),
    /dataset change/,
  );
  assert.ok(readFileSync(log, "utf8").includes("dataset_fingerprint_changed"));
  s.close();
});
test("ordinary invitation containing stop by does not suppress the organization", () => {
  assert.equal(replyClass("please stop by next week"), "reply");
});
test("positive shipment timing is not a soft refusal", () => {
  assert.equal(replyClass("yes, ship next week"), "reply");
});

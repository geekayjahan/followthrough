import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain, due } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installBooks } from "../src/books.mjs";
const data = {
  orgs: [
    {
      id: "o",
      status: "customer",
      website: "https://a.example.test",
      books_contact_id: "c",
    },
  ],
  people: [],
  edges: [],
  lots: [],
  orders: [],
  stall_days: [],
};
test("fresh invoices create overdue loop, payment revokes pending chase and closes it", async () => {
  const s = new Store(":memory:"),
    d = new Domain(s, data);
  let balance = 20;
  const p = {
    booksSnapshot: async () => ({
      cash: 100,
      updated_at: new Date().toISOString(),
      invoices: [
        {
          invoice_id: "i",
          customer_id: "c",
          invoice_number: "INV-1",
          balance,
          total: 20,
          due_date: "2026-10-01",
          status: balance ? "sent" : "paid",
        },
      ],
    }),
  };
  const e = new Engine(s, d, p, {});
  installBooks(e);
  await e.syncBooks();
  const l = s.all("loops")[0];
  assert.ok(due(l, new Date("2026-10-02T12:00:00Z")));
  const a = s.action("message", { text: "Pay INV-1" }, l.id);
  balance = 0;
  await e.syncBooks();
  assert.equal(s.get("loops", l.id).reason, "paid");
  assert.equal(s.get("actions", a.id).status, "revoked");
  assert.equal(s.get("books", "snapshot").owed, 0);
  s.close();
});
test("unmapped Books records never persist and block complete balance claims", async () => {
  const s = new Store(":memory:"),
    d = new Domain(s, data),
    e = new Engine(
      s,
      d,
      {
        booksSnapshot: async () => ({
          cash: 20,
          invoices: [
            {
              invoice_id: "private",
              customer_id: "unknown",
              customer_name: "Real Person",
              balance: 50,
            },
          ],
          updated_at: "now",
        }),
      },
      {},
    );
  installBooks(e);
  await e.syncBooks();
  const state = s.get("books", "snapshot");
  assert.equal(state.available, false);
  assert.equal(state.cash, null);
  assert.ok(!JSON.stringify(s.all("books")).includes("Real Person"));
  assert.ok(!JSON.stringify(s.all("books")).includes("private"));
  s.close();
});
test("paid invoice preflight prevents a stale approval external send", async () => {
  let sends = 0;
  const s = new Store(":memory:"),
    d = new Domain(s, data),
    e = new Engine(
      s,
      d,
      {
        invoice: async () => ({ status: "paid", balance: 0 }),
        email: async () => {
          sends++;
        },
      },
      { SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "o@example.test", DEMO_SEND_DELAY_MINUTES: "0" },
    );
  const l = d.loop("invoice", "o", "i", {
      books_invoice_id: "i",
      invoice_due: "2026-10-01",
    }),
    a = s.action(
      "message",
      { channel: "email", to: "a@example.test", text: "Pay" },
      l.id,
    );
  await assert.rejects(e.approve(a.id, a));
  assert.equal(sends, 0);
  assert.equal(s.get("actions", a.id).status, "revoked");
  s.close();
});
test("AR-03: a null balance is rejected as invalid input, never read as paid; a restored balance reopens a loop closed as paid", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data);
  let balance = 25, status = "sent";
  const e = new Engine(s, d, { booksSnapshot: async () => ({ cash: 1, updated_at: "now", invoices: [{ invoice_id: "i", customer_id: "c", invoice_number: "INV-1", balance, total: 25, due_date: "2026-10-01", status }] }) }, {});
  installBooks(e);
  await e.syncBooks();
  const loop = s.all("loops")[0], a = s.action("message", { text: "Pay INV-1" }, loop.id);
  balance = null;
  await assert.rejects(e.syncBooks(), /balance missing/);
  assert.equal(s.get("loops", loop.id).status, "open");
  assert.equal(s.get("actions", a.id).status, "pending");
  assert.equal(s.get("books", "snapshot").available, false);
  balance = 0; status = "paid";
  await e.syncBooks();
  assert.equal(s.get("loops", loop.id).reason, "paid");
  balance = 25; status = "sent";
  await e.syncBooks();
  assert.equal(s.get("loops", loop.id).status, "open", "payment reversal reopens the loop");
  assert.ok(s.events().some((x) => x.type === "loop_open" && x.source === "Books balance restored"));
  s.close();
});
test("AR-07: a draft or void invoice is never chased, counts nothing toward owed, and closes an earlier loop", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data);
  let status = "sent";
  const e = new Engine(s, d, { booksSnapshot: async () => ({ cash: 1, updated_at: "now", invoices: [{ invoice_id: "i", customer_id: "c", invoice_number: "INV-1", balance: 25, total: 25, due_date: "2026-10-01", status }] }) }, {});
  installBooks(e);
  await e.syncBooks();
  const loop = s.all("loops")[0], a = s.action("message", { text: "Pay INV-1" }, loop.id);
  status = "draft";
  const state = await e.syncBooks();
  assert.equal(state.owed, 0);
  assert.equal(s.get("loops", loop.id).status, "closed");
  assert.match(s.get("loops", loop.id).reason, /not collectible/);
  assert.equal(s.get("actions", a.id).status, "revoked");
  assert.equal(d.cold(new Date("2026-10-29T08:00:00Z")).length, 0);
  s.close();
});
test("AR-07: preflight refuses to send a chase for an invoice that went back to draft", async () => {
  let sends = 0;
  const s = new Store(":memory:"), d = new Domain(s, data),
    e = new Engine(s, d, { invoice: async () => ({ status: "draft", balance: 25 }), email: async () => { sends++; } }, { SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "o@example.test", DEMO_SEND_DELAY_MINUTES: "0" });
  const l = d.loop("invoice", "o", "i", { books_invoice_id: "i", invoice_due: "2026-10-01", amount: 25 }),
    a = s.action("message", { channel: "email", to: "a@example.test", text: "Pay" }, l.id);
  await assert.rejects(e.approve(a.id, a), /not collectible/);
  assert.equal(sends, 0);
  assert.equal(s.get("loops", l.id).status, "closed");
  s.close();
});

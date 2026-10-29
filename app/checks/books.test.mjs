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
      { SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "o@example.test" },
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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPlan, seed, mapIds } from "../scripts/seed-books.mjs";

const read = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../data/candidate-v1/${f}`, import.meta.url)), "utf8"));

// An in-memory Books: list endpoints return what was posted; balances follow the posted money.
function fakeBooks({ foreign = [] } = {}) {
  const db = { invoices: [...foreign], chartofaccounts: [{ account_id: "eq1", account_name: "Owner's Equity", account_type: "equity" }], bankaccounts: [], contacts: [], items: [], journals: [], customerpayments: [], salesreceipts: [], expenses: [] };
  let n = 0, cash = 0;
  const id = () => `id${++n}`;
  const posts = [];
  return {
    posts, db,
    async list(name) { return db[name.split("?")[0]]; },
    async get(path) { return { bankaccount: { balance: cash } }; },
    async post(path, body) {
      posts.push(path);
      const p = path.split("?")[0];
      if (p.endsWith("/bankaccounts")) { const r = { account_id: id(), ...body }; db.bankaccounts.push(r); return { bankaccount: r }; }
      if (p.endsWith("/chartofaccounts")) { const r = { account_id: id(), ...body }; db.chartofaccounts.push(r); return { chart_of_account: r }; }
      if (p.endsWith("/contacts")) { const r = { contact_id: id(), ...body }; db.contacts.push(r); return { contact: r }; }
      if (p.endsWith("/items")) { const r = { item_id: id(), ...body }; db.items.push(r); return { item: r }; }
      if (p.endsWith("/journals")) { cash += body.line_items[0].amount; db.journals.push(body); return {}; }
      if (p.endsWith("/invoices")) { const total = body.line_items.reduce((s, l) => s + l.quantity * l.rate, 0); const r = { invoice_id: id(), status: "draft", balance: total, ...body }; db.invoices.push(r); return { invoice: r }; }
      if (p.endsWith("/status/sent")) { db.invoices.find((i) => p.includes(i.invoice_id)).status = "sent"; return {}; }
      if (p.endsWith("/customerpayments")) { cash += body.amount; db.invoices.find((i) => i.invoice_id === body.invoices[0].invoice_id).balance -= body.amount; db.customerpayments.push(body); return {}; }
      if (p.endsWith("/salesreceipts")) { if (body.deposit_to_account_id) cash += body.line_items[0].quantity * body.line_items[0].rate; db.salesreceipts.push(body); return {}; }
      if (p.endsWith("/expenses")) { cash -= body.amount; db.expenses.push(body); return {}; }
      throw Error(`unexpected POST ${path}`);
    },
  };
}

test("the plan reads every invoice line and reconciles to the pack's cash and owed", () => {
  const plan = buildPlan(read("books-seed.json"));
  assert.equal(plan.invoices.length, 6);
  assert.deepEqual(plan.invoices.find((i) => i.number === "FT-INV-1004").lines, [{ item: "books-item-lot-3", quantity: 7.5, rate: 13 }]);
  assert.deepEqual(plan.expected, { cash: 2875, owed: 622.5 });
  const broken = read("books-seed.json");
  broken.invoices[0].total = 999;
  assert.throws(() => buildPlan(broken), /not the total/);
});

test("seeding reaches the expected cash and owed, marks invoices sent, and a re-run creates nothing", async () => {
  const plan = buildPlan(read("books-seed.json")), api = fakeBooks();
  const first = await seed(plan, api, () => {});
  assert.equal(first.cash, 2875);
  assert.equal(first.owed, 622.5);
  assert.ok(api.db.invoices.every((i) => i.status === "sent"), "no seeded invoice stays a draft");
  assert.ok(first.ids.STALL_CUSTOMER_ID && first.ids.CASH_ACCOUNT_ID && first.ids.EXPENSE_ACCOUNT_ID);
  const before = api.posts.length, again = await seed(plan, api, () => {});
  assert.equal(again.created.length, 0);
  assert.equal(api.posts.length, before);
  const data = mapIds(read("synthetic.json"), plan, first.ids);
  assert.ok(["org-1", "org-4", "org-5", "org-6"].every((o) => data.orgs.find((x) => x.id === o).books_contact_id));
  assert.ok(data.lots.every((l) => l.books_item_id));
});

test("an org that already holds someone else's invoices is refused before any write", async () => {
  const api = fakeBooks({ foreign: [{ invoice_number: "INV-000001" }] });
  await assert.rejects(seed(buildPlan(read("books-seed.json")), api, () => {}), /fresh test org/);
  assert.equal(api.posts.length, 0);
});

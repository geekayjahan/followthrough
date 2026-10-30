// Characterizes defects at 19bd69a; this is NOT a passing release gate.
// Exit 1: reviewed defects reproduced. Exit 2: a probe changed or errored.
// Uses synthetic fixtures, in-memory SQLite, injected providers, and one
// disposable loopback-only HTTP child. Never reads .env or calls live providers.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installBooks } from "../src/books.mjs";
import { installIntake } from "../src/intake.mjs";
import { installStall } from "../src/stall.mjs";
import { installReceipts } from "../src/receipts.mjs";
import { installEnrichment, qualificationFacts } from "../src/enrichment.mjs";
import { Providers } from "../src/providers.mjs";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true",
  DEMO_SEND_DELAY_MINUTES: "0",
  APP_URL: "http://127.0.0.1:4310",
  OWNER_TEST_EMAILS: "owner@example.test",
  WHATSAPP_TEST_NUMBERS: "+15555550001,+15555550002",
  WHATSAPP_OWNER_NUMBERS: "+15555550002",
  ENABLE_JOBS: "true",
  // Drafts need a signed-off voice file (spec Pinned: Voice file); the probes use the test fixture.
  VOICE_FILE: fileURLToPath(new URL("./fixtures/voice-signed.md", import.meta.url)),
  CALENDAR_FILE: fileURLToPath(new URL("./fixtures/calendar-empty.json", import.meta.url)),
};
const fixture = () => ({
  orgs: [{ id: "o", name: "Synthetic Customer", status: "customer",
    website: "https://customer.example.test", books_contact_id: "c" }],
  people: [{ id: "p", org: "o", email: "p@example.test", whatsapp: "+15555550001" }],
  edges: [], invoices: [], orders: [], stall_days: [],
  lots: [{ id: "l", name: "Lot 2", books_item_id: "item", start_kg: 10, left_kg: 10 }],
});
function setup(providers = {}, data = fixture()) {
  const s = new Store(":memory:");
  const d = new Domain(s, data);
  return { s, d, e: new Engine(s, d, providers, cfg) };
}
const results = [];
async function probe(id, run) {
  try {
    results.push({ id, reproduced: true, observed: await run() });
  } catch (error) {
    results.push({ id, reproduced: false, error: error.message });
  }
}

await probe("AR-01", async () => {
  const source = `
    import { createApplication } from './app/src/server.mjs';
    import { Store } from './app/src/store.mjs';
    import { connect } from 'node:net';
    const app = createApplication({
      c: { APP_URL: 'http://127.0.0.1', OWNER_PASSWORD: 'temporary-review-only' },
      store: new Store(':memory:'), providers: {}
    });
    app.server.listen(0, '127.0.0.1', () => {
      const socket = connect(app.server.address().port, '127.0.0.1', () =>
        socket.write('GET http://[ HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n'));
      socket.on('error', () => {});
      socket.on('data', () => {});
      setTimeout(() => { socket.destroy(); app.server.close(); process.exit(0); }, 1200);
    });`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-"], {
    input: source, encoding: "utf8", cwd: repo, timeout: 5000,
  });
  assert.equal(child.status, 1);
  assert.ok(child.stderr.includes("ERR_INVALID_URL"));
  assert.ok(child.stderr.includes("server.mjs:"));
  return { childExitStatus: child.status, error: "ERR_INVALID_URL" };
});

await probe("AR-02", async () => {
  let sends = 0;
  const { s, d, e } = setup({
    model: async () => ({ subject: "Follow-up", text: "Any update?" }),
    email: async () => {
      if (++sends === 1) throw Error("Simulated timeout after provider acceptance");
      return { id: "second-send", to: "owner@example.test" };
    },
  });
  try {
    const loop = d.loop("quote", "o", "quote:1", { last_touch: "2026-10-20T00:00:00Z" });
    const first = await e.draft(loop);
    await assert.rejects(e.approve(first.id, first));
    const next = await e.draft(s.get("loops", loop.id));
    await e.approve(next.id, next);
    assert.equal(sends, 2);
    assert.equal(s.get("actions", first.id).status, "needs_reconciliation");
    assert.equal(s.get("actions", next.id).status, "completed");
    return { sends, first: "needs_reconciliation", replacement: "completed" };
  } finally { s.close(); }
});

const invoice = (balance, status = "sent") => ({
  invoice_id: "i", customer_id: "c", invoice_number: "INV-1",
  total: 25, balance, due_date: "2026-10-01", status,
});
const snapshot = (record) => ({
  cash: 100, invoices: [record], updated_at: "2026-10-29T08:00:00Z",
});
await probe("AR-03", async () => {
  let balance = 25;
  const { s, e } = setup({ booksSnapshot: async () => snapshot(invoice(balance)) });
  installBooks(e);
  try {
    await e.syncBooks();
    const loop = s.all("loops")[0];
    const action = s.action("message", { text: "Pay INV-1" }, loop.id);
    balance = null;
    const state = await e.syncBooks();
    assert.equal(state.owed, 0);
    assert.equal(state.available, true);
    assert.equal(s.get("loops", loop.id).reason, "paid");
    assert.equal(s.get("actions", action.id).status, "revoked");
    balance = 25;
    await e.syncBooks();
    assert.equal(s.get("loops", loop.id).status, "closed");
    return { nullBalanceOwed: state.owed, restoredBalanceLoop: "closed" };
  } finally { s.close(); }
});

await probe("AR-04", async () => {
  const p = new Providers({ STALL_CUSTOMER_ID: "expected-customer", EXPENSE_ACCOUNT_ID: "expense" },
    async () => { throw Error("Unexpected network request"); });
  p.zoho = async (path, options = {}) => {
    if (path.includes("salesreceipts")) return {
      salesreceipt: options.method === "POST" ? { sales_receipt_id: "sale-1" } : {
        sales_receipt_id: "sale-1", total: 120, currency_code: "USD",
        customer_id: "wrong-customer", date: "2030-01-01",
        line_items: [{ item_id: "wrong-item", quantity: 1 }],
      },
    };
    return { expense: options.method === "POST" ? { expense_id: "expense-1" } : {
      expense_id: "expense-1", amount: 24, currency_code: "USD", date: "2030-01-01",
    } };
  };
  const { s, e } = setup({ sale: p.sale.bind(p) });
  installStall(e);
  try {
    const action = s.action("sale", { lot_id: "l", books_item_id: "item", count: 6,
      bag_grams: 250, kg: 1.5, amount: 120, currency: "GBP", date: "2026-10-29" });
    await e.approve(action.id, action);
    assert.equal(s.get("actions", action.id).status, "completed");
    assert.equal(s.get("lots", "l").left_kg, 8.5);
    const expense = await p.expense({ supplier: "Synthetic Customer", amount: 24,
      currency: "GBP", date: "2026-10-29", reference: "review" });
    assert.equal(expense.record.currency_code, "USD");
    return { approvedCurrency: "GBP", acceptedCurrency: "USD", saleStatus: "completed", stockKg: 8.5 };
  } finally { s.close(); }
});

await probe("AR-05", async () => {
  const text = "Confirmed order O-1, please ship.";
  const { s, e } = setup({ model: async () => ({ type: "order_to_ship",
    reference: "O-1", next_move: "Ship order", evidence: text }) });
  installIntake(e);
  try {
    await e.inbound({ id: "new-order", from: "15555550001",
      timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: text } });
    const loop = s.all("loops")[0];
    const action = s.action("shipment", { org_id: "o", description: "Confirm shipped" }, loop.id);
    await assert.rejects(e.approve(action.id, action), /ambiguous inbound reply/);
    assert.equal(loop.type, "order_to_ship");
    assert.equal(s.get("inbound", "new-order").status, "completed");
    return { loopType: loop.type, inbound: "completed", approval: "held" };
  } finally { s.close(); }
});

await probe("AR-06", async () => {
  const { s, d } = setup();
  try {
    d.intake({ org_id: "o", type: "quote", reference: "O-2", next_move: "Confirm quote" }, "email", "m1");
    const loop = d.intake({ org_id: "o", type: "order_to_ship", reference: "O-2", next_move: "Ship order" }, "whatsapp", "m2");
    assert.equal(loop.type, "quote");
    assert.equal(loop.next_move, "Confirm quote");
    return { requestedType: "order_to_ship", actualType: loop.type, nextMove: loop.next_move };
  } finally { s.close(); }
});

await probe("AR-07", async () => {
  const { s, d, e } = setup({ booksSnapshot: async () => snapshot(invoice(25, "draft")) });
  installBooks(e);
  try {
    const state = await e.syncBooks();
    assert.equal(state.owed, 25);
    assert.equal(d.cold(new Date("2026-10-29T08:00:00Z"))[0].type, "invoice");
    return { sourceStatus: "draft", owed: state.owed, coldInvoiceLoops: 1 };
  } finally { s.close(); }
});

await probe("AR-08a", async () => {
  const { s, e } = setup({ model: async () => ({ count: 6, bag_grams: 250,
    lot_id: "l", amount: 120, currency: "GBP" }) });
  installStall(e);
  try {
    const result = await e.cashup("sold six bags of lot 2, 120 pounds cash", "cashup", "owner");
    assert.equal(result.ask, undefined);
    assert.equal(result.action.payload.bag_grams, 250);
    return { omittedSize: true, offeredSaleGrams: 250 };
  } finally { s.close(); }
});

await probe("AR-08b", async () => {
  const { s, e } = setup({ model: async () => ({ supplier: "Synthetic Customer",
    amount: 24, date: "2030-01-01", currency: "GBP",
    supplier_quote: "Synthetic Customer", amount_quote: "USD 24.00" }) });
  installReceipts(e);
  try {
    const result = await e.receipt({ event_id: "receipt",
      text: "Receipt Synthetic Customer total USD 24.00 dated 2026-10-29" });
    assert.equal(result.action.payload.currency, "GBP");
    assert.equal(result.action.payload.date, "2030-01-01");
    return { sourceCurrency: "USD", offeredCurrency: "GBP", offeredDate: "2030-01-01" };
  } finally { s.close(); }
});

await probe("AR-08c", async () => {
  const url = "https://shop.example.test";
  const text = "250g coffee costs GBP 6. 1kg coffee costs GBP 11. We do not sell Indian coffee.";
  const result = qualificationFacts({ price: 11, sells_indian: true, sources: {
    price: { url, quote: text }, sells_indian: { url, quote: "We do not sell Indian coffee." },
  } }, [{ url, text }]);
  assert.equal(result.tier, "mid-shelf");
  assert.equal(result.sells_indian, true);
  return { accepted250gPrice: result.price, acceptedIndianCoffee: true };
});

await probe("AR-09", async () => {
  const data = fixture();
  Object.assign(data.orgs[0], { status: "lead", name: "Cheap Lead" });
  const url = data.orgs[0].website;
  const delivered = [];
  const { s, e } = setup({ model: async () => ({ price: 6,
    sources: { price: { url, quote: "Coffee GBP 6 for 250g" } } }),
    whatsapp: async (_to, text) => { delivered.push(text); return { id: "brief" }; },
  }, data);
  installEnrichment(e, async () => ({ url, text: "Coffee GBP 6 for 250g" }));
  try {
    const loop = s.all("loops")[0];
    loop.last_touch = "2026-10-20T00:00:00Z";
    s.put("loops", loop.id, loop);
    s.put("windows", "+15555550002", { at: new Date().toISOString() });
    await e.brief(new Date("2026-10-29T08:00:00Z"));
    assert.equal(s.get("loops", loop.id).reason, "below bar");
    assert.ok(delivered.some(text => text.includes("Cheap Lead")));
    return { loop: "closed below bar", stillNamedInBrief: true };
  } finally { s.close(); }
});

await probe("LIMIT-01a", async () => {
  let reads = 0, sends = 0;
  const { s, e } = setup({ whatsapp: async () => { sends++; return { id: "brief" }; } });
  e.syncBooks = async () => { if (++reads === 1) throw Error("Temporary read failure"); };
  try {
    s.put("windows", "+15555550002", { at: new Date().toISOString() });
    await assert.rejects(e.brief(new Date("2026-10-29T08:00:00Z")));
    await e.brief(new Date("2026-10-29T08:01:00Z"));
    assert.equal(reads, 1);
    assert.equal(sends, 0);
    assert.equal(s.all("brief_slots")[0].status, "failed_no_retry");
    return { reads, sends, slot: "failed_no_retry" };
  } finally { s.close(); }
});

await probe("LIMIT-01b", async () => {
  let reads = 0;
  const { s, e } = setup({
    mailMessages: async () => [{ fromAddress: "p@example.test", messageId: "m1" }],
    mailContent: async () => { if (++reads === 1) throw Error("Temporary read failure"); return "New order O-3"; },
    model: async () => ({ type: "order_to_ship", reference: "O-3", evidence: "New order O-3" }),
  });
  installIntake(e);
  try {
    await e.pollMail(); await e.pollMail();
    assert.equal(reads, 1);
    assert.equal(s.get("inbound", "mail:m1").status, "failed");
    assert.equal(s.all("loops").length, 0);
    return { contentReads: reads, inbound: "failed", createdLoops: 0 };
  } finally { s.close(); }
});

console.log(JSON.stringify({ reviewedRevision: "19bd69a", liveProvidersCalled: false,
  interpretation: "reproduced=true confirms a defect or documented limitation, not correctness",
  results }, null, 2));
process.exitCode = results.some(result => !result.reproduced) ? 2 : 1;

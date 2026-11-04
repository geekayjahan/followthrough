import test from "node:test";
import assert from "node:assert/strict";
import { Providers } from "../src/providers.mjs";
import { qualificationFacts, fetchWebsite } from "../src/enrichment.mjs";
import { EventEmitter } from "node:events";
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true",
  ZOHO_REGION: "eu",
  ZOHO_CLIENT_ID: "test",
  ZOHO_CLIENT_SECRET: "test",
  ZOHO_REFRESH_TOKEN: "test",
  ZOHO_BOOKS_ORG_ID: "org",
  EXPENSE_ACCOUNT_ID: "expense",
  STALL_CUSTOMER_ID: "customer",
  CASH_ACCOUNT_ID: "cash",
  WHATSAPP_WABA_ID: "waba",
  WHATSAPP_TOKEN: "test",
  GRAPH_API_VERSION: "v26.0",
  WHATSAPP_TEMPLATE_LANGUAGE: "en_GB",
};
test("Books write contracts use exact sales receipt ID and verified totals, and reject null cash", async () => {
  const calls = [];
  const p = new Providers(cfg, async (url, options) => {
    const u = String(url);
    calls.push([u, options]);
    let data = {};
    if (u.includes("oauth")) data = { access_token: "test" };
    else if (u.endsWith("/salesreceipts?organization_id=org"))
      data = { salesreceipt: { sales_receipt_id: "sale-1" } };
    else if (u.includes("/salesreceipts/sale-1"))
      data = { salesreceipt: { sales_receipt_id: "sale-1", total: 120 } };
    else if (u.includes("/expenses?") && options.method === "POST")
      data = { expense: { expense_id: "expense-1" } };
    else if (u.includes("/expenses/expense-1"))
      data = { expense: { expense_id: "expense-1", amount: 24 } };
    else if (u.includes("/bankaccounts/"))
      data = { bankaccount: { balance: null } };
    else
      data = {
        invoices: [],
        contacts: [],
        customerpayments: [],
        expenses: [],
        page_context: { has_more_page: false },
      };
    return { ok: true, json: async () => data };
  });
  assert.equal(
    (
      await p.sale({
        date: "2026-10-29",
        books_item_id: "item",
        count: 6,
        amount: 120,
        reference: "test",
      })
    ).id,
    "sale-1",
  );
  const sale = JSON.parse(
    calls.find(
      ([u, o]) => u.includes("/salesreceipts?") && o.method === "POST",
    )[1].body,
  );
  assert.equal(sale.line_items[0].quantity, 6);
  assert.equal(sale.line_items[0].rate, 20);
  assert.equal(sale.can_send_in_mail, false);
  assert.equal(
    (
      await p.expense({
        date: "2026-10-29",
        amount: 24,
        supplier: "Synthetic Supplier",
        reference: "test",
      })
    ).id,
    "expense-1",
  );
  await assert.rejects(p.booksSnapshot(), /cash_balance_missing/);
});
test("approved template rendering is exact and later template changes invalidate authority", async () => {
  let body = "Follow-up: {{1}}";
  const p = new Providers(cfg, async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          name: "followup",
          language: "en_GB",
          status: "APPROVED",
          components: [{ type: "BODY", text: body }],
        },
      ],
    }),
  }));
  const template = await p.template("followup", "Exact approved message");
  assert.equal(template.text, "Follow-up: Exact approved message");
  await p.verifyTemplate(template);
  body = "Changed: {{1}}";
  await assert.rejects(p.verifyTemplate(template), /template changed/);
});
test("DNS pinned lookup handles Node all:true and revalidates redirect destinations", async () => {
  let allShape = false;
  let requests = 0;
  const request = (url, options, callback) => {
    requests++;
    options.lookup("shop.test", { all: true }, (err, addresses) => {
      assert.equal(err, null);
      assert.deepEqual(addresses, [{ address: "8.8.8.8", family: 4 }]);
      allShape = true;
    });
    const req = new EventEmitter();
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 302;
      res.headers = { location: "http://127.0.0.1/private" };
      res.resume = () => {};
      callback(res);
    };
    req.destroy = () => {};
    return req;
  };
  await assert.rejects(
    fetchWebsite("https://shop.test", ["shop.test"], {
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
      request,
    }),
    /allowlisted/,
  );
  assert.equal(requests, 1);
  assert.ok(allShape);
});
test("below-bar closure does not depend on an unsupported Indian-coffee absence inference", () => {
  const page = { url: "https://shop.test", text: "Coffee 250g £6" };
  const facts = qualificationFacts(
    {
      price: 6,
      sells_indian: null,
      sources: { price: { url: page.url, quote: page.text } },
    },
    [page],
  );
  assert.equal(facts.tier, "below bar");
  assert.equal(facts.sells_indian, null);
});
test("every outbound provider request leaves a host line naming only the host and method", async () => {
  const events = [];
  const p = new Providers(cfg, async (url) => ({
    ok: true,
    json: async () =>
      String(url).includes("oauth")
        ? { access_token: "test" }
        : { invoice: { invoice_id: "i", balance: 5 } },
  }));
  p.audit = (type, fields) => events.push({ type, ...fields });
  await p.invoice("i");
  const hosts = events.filter((x) => x.type === "host");
  assert.deepEqual(
    hosts.map((h) => [h.host, h.method]),
    [
      ["accounts.zoho.eu", "POST"],
      ["www.zohoapis.eu", "GET"],
    ],
  );
  assert.ok(!JSON.stringify(hosts).includes("test-token"));
});

test("T6: a model call asks for low reasoning with headroom, and an empty or cut-off answer is an error, never null", async () => {
  const { REASONING_HEADROOM } = await import("../src/providers.mjs");
  const reply = (choice) => async (url, options) => {
    reply.body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ model: "m", usage: { prompt_tokens: 1, completion_tokens: 600 }, choices: [choice] }) };
  };
  const model = (choice) => new Providers({ SYNTHETIC_DATA_APPROVED: "true", MODEL_BASE_URL: "https://model.example.test/v1", MODEL_NAME: "m" }, reply(choice));
  assert.deepEqual(await model({ finish_reason: "stop", message: { content: "{\"kg\":1.5}" } }).model("Cash-up", {}, { maxTokens: 400 }), { kg: 1.5 });
  assert.equal(reply.body.reasoning_effort, "low");
  assert.equal(reply.body.max_tokens, 400 + REASONING_HEADROOM);
  // Reasoning used the whole budget: no answer at all.
  await assert.rejects(model({ finish_reason: "length", message: { content: null, reasoning_content: "We need to..." } }).model("Cash-up", {}), { code: "model_incomplete" });
  // Cut off part way through the answer.
  await assert.rejects(model({ finish_reason: "length", message: { content: "{\"kg\":" } }).model("Cash-up", {}), { code: "model_incomplete" });
  await assert.rejects(model({ finish_reason: "stop", message: { content: "  " } }).model("Cash-up", {}), { code: "model_incomplete" });
  await assert.rejects(model({ finish_reason: "stop", message: { content: "null" } }).model("Cash-up", {}), { code: "model_schema" });
});

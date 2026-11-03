// Seeds a fresh Zoho Books test organisation from the candidate pack's books-seed.json, then writes the
// Books IDs into the run copy of the data so the app can map them.
//   node scripts/seed-books.mjs --dry-run      print the plan and its reconciliation; no network
//   node scripts/seed-books.mjs                create what is missing, read back cash and owed
// Reads data/candidate-run/ (run data/candidate-v1/shift-dates.mjs first, so Books dates match the demo clock).
// Writes go through the same guard as the app: nothing reaches Books until SYNTHETIC_DATA_APPROVED=true.
// Every record is found by name or number before it is created, so a re-run after a failure resumes.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config, connected, requireKeys, ROOT } from "../src/config.mjs";
import { Providers } from "../src/providers.mjs";

const LOT_WORDS = { "lot-1": "Coorg", "lot-2": "Chikmagalur", "lot-3": "Shevaroy" };
const money = (n) => Math.round(n * 100) / 100;

// Turns books-seed.json into the exact records to create, and refuses a seed whose own totals do not add up.
export function buildPlan(seed) {
  const cash = seed.accounts.find((a) => a.env_var_target === "CASH_ACCOUNT_ID");
  const expense = seed.accounts.find((a) => a.env_var_target === "EXPENSE_ACCOUNT_ID");
  const contacts = seed.contacts.map((c) => ({
    key: c.logical_id, name: c.contact_name, type: c.contact_type, email: c.primary_email,
    org: c.maps_to_synthetic_org, env: c.env_var_target || null,
  }));
  const items = seed.items.map((i) => ({ key: i.logical_id, lot: i.maps_to_synthetic_lot, name: i.name, sku: i.sku, rate: i.rate_gbp }));
  const invoices = seed.invoices.map((i) => {
    const m = String(i.line_summary).match(/([\d.]+)\s*kg\s+(.+?)\s*@\s*GBP\s*([\d.]+)/);
    const item = m && items.find((it) => m[2].includes(LOT_WORDS[it.lot]));
    if (!m || !item) throw Error(`Cannot read a line item from ${i.invoice_number}: "${i.line_summary}"`);
    const quantity = Number(m[1]), rate = Number(m[3]);
    if (money(quantity * rate) !== i.total) throw Error(`${i.invoice_number}: ${quantity} x ${rate} is not the total ${i.total}`);
    return { number: i.invoice_number, customer: i.customer_logical_id, date: i.date, due: i.due_date, total: i.total, lines: [{ item: item.key, quantity, rate }] };
  });
  const payments = seed.customer_payments.map((p) => ({ ref: p.logical_id, customer: p.customer_logical_id, invoice: p.applied_to_invoice_number, date: p.date, amount: p.amount_gbp }));
  const sales = seed.sales_receipts.map((s) => ({ ref: s.logical_id, customer: s.customer_logical_id, date: s.date, item: s.item_logical_id, quantity: s.quantity_bags, rate: s.rate_gbp, total: s.total_gbp }));
  const expenses = seed.expenses.map((x) => ({ ref: x.logical_id, vendor: x.vendor_logical_id, date: x.date, amount: x.amount_gbp, description: x.description }));
  const opening = { ref: "FT-OPEN-0001", date: cash.opening_balance_date, amount: cash.opening_balance_gbp };
  const expected = {
    cash: money(opening.amount + payments.reduce((n, p) => n + p.amount, 0) + sales.reduce((n, s) => n + s.total, 0) - expenses.reduce((n, x) => n + x.amount, 0)),
    owed: money(invoices.reduce((n, i) => n + i.total, 0) - payments.reduce((n, p) => n + p.amount, 0)),
  };
  const stated = seed.expected_balances_at_reference_time;
  if (expected.cash !== stated.cash_account_gbp || expected.owed !== stated.total_owed_in_books_gbp)
    throw Error(`Seed does not reconcile: cash ${expected.cash} vs ${stated.cash_account_gbp}, owed ${expected.owed} vs ${stated.total_owed_in_books_gbp}`);
  return { cash: { name: cash.name }, expense: { name: expense.name }, contacts, items, invoices, payments, sales, expenses, opening, expected };
}

// Talks to Books with the app's own OAuth handling and guard, but keeps Zoho's error message for the person running it.
export function booksApi(c, fetcher = fetch) {
  const p = new Providers(c, fetcher);
  const call = async (method, path, body) => {
    const token = await p.zohoToken();
    const url = new URL(path, `https://www.zohoapis.${p.region}`);
    url.searchParams.set("organization_id", c.ZOHO_BOOKS_ORG_ID);
    const r = await fetcher(url, { method, headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || (json.code !== undefined && json.code !== 0)) throw Error(`Books ${method} ${url.pathname} failed: ${json.message || r.status}`);
    return json;
  };
  return {
    get: (path) => call("GET", path),
    post: (path, body) => call("POST", path, body),
    async list(name, key = name) {
      const rows = [];
      for (let page = 1; page <= 50; page++) {
        const r = await call("GET", `/books/v3/${name}${name.includes("?") ? "&" : "?"}page=${page}&per_page=200`);
        rows.push(...(r[key] || []));
        if (!r.page_context?.has_more_page) return rows;
      }
      throw Error(`Books ${name}: more than 50 pages`);
    },
  };
}

export async function seed(plan, api, log = console.log) {
  const ids = { contacts: {}, items: {} };
  const created = [];
  const made = (what, id) => (created.push(what), log(`  created ${what}`), id);

  // A fresh org only: an invoice the pack does not own would make the app show Books as unavailable.
  const ours = new Set(plan.invoices.map((i) => i.number));
  const invoices = await api.list("invoices");
  const foreign = invoices.filter((i) => !ours.has(i.invoice_number));
  if (foreign.length) throw Error(`This Books org already has ${foreign.length} invoice(s) the pack does not own (${foreign.slice(0, 3).map((i) => i.invoice_number).join(", ")}). Use a fresh test org.`);

  const accounts = await api.list("chartofaccounts");
  const banks = await api.list("bankaccounts");
  let cash = banks.find((b) => b.account_name === plan.cash.name);
  if (!cash) {
    let r;
    try { r = await api.post("/books/v3/bankaccounts", { account_name: plan.cash.name, account_type: "cash" }); }
    catch { r = await api.post("/books/v3/bankaccounts", { account_name: plan.cash.name, account_type: "bank" }); }
    cash = r.bankaccount;
    made(`cash account "${plan.cash.name}"`);
  }
  ids.CASH_ACCOUNT_ID = cash.account_id;
  let expense = accounts.find((a) => a.account_name === plan.expense.name);
  if (!expense) {
    expense = (await api.post("/books/v3/chartofaccounts", { account_name: plan.expense.name, account_type: "expense" })).chart_of_account;
    made(`expense account "${plan.expense.name}"`);
  }
  ids.EXPENSE_ACCOUNT_ID = expense.account_id;

  const contacts = await api.list("contacts");
  for (const c of plan.contacts) {
    let row = contacts.find((x) => x.contact_name === c.name);
    if (!row) {
      row = (await api.post("/books/v3/contacts", { contact_name: c.name, contact_type: c.type, contact_persons: [{ email: c.email, is_primary_contact: true }] })).contact;
      made(`contact "${c.name}"`);
    }
    ids.contacts[c.key] = row.contact_id;
    if (c.env) ids[c.env] = row.contact_id;
  }
  const items = await api.list("items");
  for (const i of plan.items) {
    let row = items.find((x) => x.sku === i.sku || x.name === i.name);
    if (!row) {
      row = (await api.post("/books/v3/items", { name: i.name, sku: i.sku, rate: i.rate })).item;
      made(`item "${i.name}"`);
    }
    ids.items[i.key] = row.item_id;
  }

  const journals = await api.list("journals");
  if (!journals.some((j) => j.reference_number === plan.opening.ref)) {
    const equity = accounts.find((a) => a.account_type === "equity" && /owner/i.test(a.account_name)) || accounts.find((a) => a.account_type === "equity");
    if (!equity) throw Error("No equity account found for the opening balance journal");
    await api.post("/books/v3/journals", {
      journal_date: plan.opening.date, reference_number: plan.opening.ref, notes: "Synthetic opening balance",
      line_items: [{ account_id: ids.CASH_ACCOUNT_ID, debit_or_credit: "debit", amount: plan.opening.amount }, { account_id: equity.account_id, debit_or_credit: "credit", amount: plan.opening.amount }],
    });
    made(`opening balance GBP ${plan.opening.amount}`);
  }

  const invoiceIds = {};
  for (const inv of plan.invoices) {
    let row = invoices.find((x) => x.invoice_number === inv.number);
    if (!row) {
      row = (await api.post("/books/v3/invoices?ignore_auto_number_generation=true", {
        customer_id: ids.contacts[inv.customer], invoice_number: inv.number, date: inv.date, due_date: inv.due,
        line_items: inv.lines.map((l) => ({ item_id: ids.items[l.item], quantity: l.quantity, rate: l.rate })),
      })).invoice;
      made(`invoice ${inv.number}`);
    }
    // A draft is never chased (AR-07), so every seeded invoice is marked sent.
    if (String(row.status).toLowerCase() === "draft") await api.post(`/books/v3/invoices/${row.invoice_id}/status/sent`);
    invoiceIds[inv.number] = row.invoice_id;
  }
  const payments = await api.list("customerpayments");
  for (const p of plan.payments) {
    if (payments.some((x) => x.reference_number === p.ref)) continue;
    await api.post("/books/v3/customerpayments", {
      customer_id: ids.contacts[p.customer], payment_mode: "banktransfer", amount: p.amount, date: p.date, reference_number: p.ref,
      account_id: ids.CASH_ACCOUNT_ID, invoices: [{ invoice_id: invoiceIds[p.invoice], amount_applied: p.amount }],
    });
    made(`payment ${p.ref} GBP ${p.amount}`);
  }
  const sales = await api.list("salesreceipts");
  for (const s of plan.sales) {
    if (sales.some((x) => x.reference_number === s.ref || x.receipt_number === s.ref)) continue;
    await api.post("/books/v3/salesreceipts", {
      customer_id: ids.contacts[s.customer], date: s.date, payment_mode: "cash", reference_number: s.ref, deposit_to_account_id: ids.CASH_ACCOUNT_ID,
      can_send_in_mail: false, line_items: [{ item_id: ids.items[s.item], quantity: s.quantity, rate: s.rate }],
    });
    made(`stall sale ${s.ref} GBP ${s.total}`);
  }
  const expenses = await api.list("expenses");
  for (const x of plan.expenses) {
    if (expenses.some((e) => e.reference_number === x.ref)) continue;
    await api.post("/books/v3/expenses", {
      account_id: ids.EXPENSE_ACCOUNT_ID, paid_through_account_id: ids.CASH_ACCOUNT_ID, vendor_id: ids.contacts[x.vendor],
      date: x.date, amount: x.amount, description: x.description, reference_number: x.ref,
    });
    made(`expense ${x.ref} GBP ${x.amount}`);
  }

  // Read back the two numbers the demo shows, the way the app reads them.
  const bank = (await api.get(`/books/v3/bankaccounts/${ids.CASH_ACCOUNT_ID}`)).bankaccount || {};
  const cashNow = Number(bank.balance ?? bank.current_balance);
  const owedNow = money((await api.list("invoices")).filter((i) => ours.has(i.invoice_number)).reduce((n, i) => n + Number(i.balance || 0), 0));
  return { ids, created, cash: cashNow, owed: owedNow };
}

// Writes the Books IDs into the run copy of synthetic.json (books_contact_id per org, books_item_id per lot).
export function mapIds(data, plan, ids) {
  for (const c of plan.contacts) if (c.org) data.orgs.find((o) => o.id === c.org).books_contact_id = ids.contacts[c.key];
  for (const i of plan.items) data.lots.find((l) => l.id === i.lot).books_item_id = ids.items[i.key];
  return data;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dry = process.argv.includes("--dry-run");
  const dir = join(ROOT, "data", "candidate-run");
  if (!existsSync(join(dir, "books-seed.json"))) {
    console.error("No data/candidate-run/. Run node data/candidate-v1/shift-dates.mjs <recording day + DEMO_AGE_DAYS> first.");
    process.exit(1);
  }
  const plan = buildPlan(JSON.parse(readFileSync(join(dir, "books-seed.json"), "utf8")));
  console.log(`Plan: ${plan.contacts.length} contacts, ${plan.items.length} items, ${plan.invoices.length} invoices, ${plan.payments.length} payments, ${plan.sales.length} stall sale, ${plan.expenses.length} expense, opening GBP ${plan.opening.amount} on ${plan.opening.date}.`);
  for (const i of plan.invoices) console.log(`  ${i.number}  ${i.date} due ${i.due}  GBP ${i.total}`);
  console.log(`Expected after seeding: cash GBP ${plan.expected.cash}, owed GBP ${plan.expected.owed}.`);
  if (dry) process.exit(0);
  const c = config();
  try {
    connected(c);
    requireKeys(c, ["ZOHO_REGION", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN", "ZOHO_BOOKS_ORG_ID"]);
    const result = await seed(plan, booksApi(c));
    const synthetic = join(dir, "synthetic.json");
    writeFileSync(synthetic, JSON.stringify(mapIds(JSON.parse(readFileSync(synthetic, "utf8")), plan, result.ids), null, 2) + "\n");
    writeFileSync(join(dir, "books-ids.json"), JSON.stringify(result.ids, null, 2) + "\n");
    console.log(`${result.created.length} record(s) created. Books IDs written into data/candidate-run/synthetic.json and books-ids.json.`);
    console.log("Add to app/.env:");
    for (const k of ["CASH_ACCOUNT_ID", "EXPENSE_ACCOUNT_ID", "STALL_CUSTOMER_ID"]) console.log(`  ${k}=${result.ids[k]}`);
    const ok = result.cash === plan.expected.cash && result.owed === plan.expected.owed;
    console.log(`Read back: cash GBP ${result.cash} (expected ${plan.expected.cash}), owed GBP ${result.owed} (expected ${plan.expected.owed}). ${ok ? "Matches." : "Does not match."}`);
    if (!ok && money(plan.expected.cash - result.cash) === plan.sales.reduce((n, s) => n + s.total, 0))
      console.log(`The stall sale landed outside the cash account. In Books, open sales receipt ${plan.sales[0].ref} and set Deposit To = "${plan.cash.name}".`);
    process.exit(ok ? 0 : 2);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

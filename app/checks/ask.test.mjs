import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installIntake } from "../src/intake.mjs";
import { fileURLToPath } from "node:url";
const data = () => ({
  orgs: [
    { id: "r", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test", books_contact_id: "c1" },
    { id: "sup", name: "Rainhill Supplies", type: "supplier", status: "customer", website: "https://s.example.test" },
  ],
  people: [{ id: "p", org: "r", email: "a@example.test" }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [{ date: "2026-10-24", cashed_up: false }],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x", DEMO_SEND_DELAY_MINUTES: "0",
  WHATSAPP_TEST_NUMBERS: "+15555550002", WHATSAPP_OWNER_NUMBERS: "+15555550002",
  CALENDAR_FILE: fileURLToPath(new URL("./fixtures/calendar-empty.json", import.meta.url)),
};
function setup() {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const replies = [], writes = [];
  const e = new Engine(s, d, {
    whatsapp: async (to, text) => { replies.push(text); return { id: `W${replies.length}` }; },
    email: async () => { writes.push("email"); return { id: "M" }; },
    expense: async () => { writes.push("expense"); return { id: "X" }; },
    model: async (task) => { if (task.startsWith("Classify a message")) return { intent: "ask", question: null, confidence: 0.9 }; throw Error("no model needed: " + task.slice(0, 20)); },
  }, cfg);
  installIntake(e);
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  const msg = (id, body) => ({ id, from: "15555550002", timestamp: String(Math.floor(Date.now() / 1000)), text: { body } });
  return { s, d, e, replies, writes, msg };
}
test("F23: the tax-season answer names every open receipt, invoice, stall day and compliance date with its source; nothing is sent or written", async () => {
  const { s, d, e, replies, writes, msg } = setup();
  d.loop("receipt", "sup", "receipt:1", { next_move: "Book receipt: courier 38" });
  d.loop("invoice", "r", "invoice:i1", { books_invoice_id: "i1", invoice_number: "INV-7", amount: 480, invoice_due: "2026-10-01" });
  d.loop("compliance", null, "compliance:cs", { what: "Confirmation statement", due_date: "2026-11-20" });
  s.put("books", "snapshot", { available: true, cash: 100, owed: 480, invoices: [{ org_id: "r", number: "INV-7", balance: 480, due: "2026-10-01" }], updated_at: "2026-10-30T08:00:00Z" });
  await e.inbound(msg("t1", "it's tax season, what am I missing?"));
  const answer = replies.at(-1);
  assert.match(answer, /Receipts not booked:\n• Rainhill Supplies: receipt unbooked since .* \(loop store\)/);
  assert.match(answer, /Invoices unpaid:\n• Harbour Roasters: INV-7, GBP 480\.00, due 2026-10-01 \(Zoho Books, read 2026-10-30T08:00:00Z\)/);
  assert.match(answer, /Stall days not cashed up:\n• Stall day 2026-10-24: not cashed up \(loop store, calendar\)/);
  assert.match(answer, /Statutory dates due:\n• Confirmation statement: due 2026-11-20, \d+ days away \(calendar\)/);
  assert.match(answer, /Say 'draft them' for cards\.$/);
  assert.ok(s.events().some((x) => x.type === "answer" && x.event_id === "t1"));
  assert.equal(writes.length, 0);
  assert.ok(!s.events().some((x) => ["send", "books_write"].includes(x.type)));
  s.close();
});
test("A9: file my VAT return, pay the freight invoice, post on Instagram: a plain no with the nearest step, a refused line, no write", async () => {
  const { s, e, replies, writes, msg } = setup();
  await e.inbound(msg("a1", "file my VAT return"));
  await e.inbound(msg("a2", "pay the freight invoice today"));
  await e.inbound(msg("a3", "Post the new lot on Instagram"));
  const refused = s.events().filter((x) => x.type === "refused").reverse();
  assert.deepEqual(refused.map((x) => x.request), ["file my VAT return", "pay the freight invoice today", "Post the new lot on Instagram"]);
  assert.match(replies[0], /^I can't file anything with HMRC or Companies House\. I can list what the accountant needs/);
  assert.match(replies[1], /^I can't pay or move money\. I can tell you what is owed/);
  assert.match(replies[2], /^I can't post publicly or edit the website\./);
  assert.equal(writes.length, 0);
  assert.ok(!s.events().some((x) => ["send", "books_write", "intent"].includes(x.type)), "no model intent call was needed");
  s.close();
});

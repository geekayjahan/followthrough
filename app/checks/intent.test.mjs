import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { installIntake } from "../src/intake.mjs";
const data = () => ({
  orgs: [{ id: "o", name: "Harbour Roasters", status: "customer", website: "https://a.example.test" }],
  people: [{ id: "p", org: "o", email: "p@example.test", whatsapp: null }],
  edges: [], invoices: [], lots: [{ id: "lot-2", name: "Chikmagalur", start_kg: 10, left_kg: 5 }], orders: [], stall_days: [],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true",
  DEMO_SEND_DELAY_MINUTES: "0",
  OWNER_TEST_EMAILS: "owner@example.test",
  WHATSAPP_TEST_NUMBERS: "+15555550002",
  WHATSAPP_OWNER_NUMBERS: "+15555550002",
  APP_URL: "http://127.0.0.1:4310",
};
function setup(intentReply) {
  const s = new Store(":memory:"), d = new Domain(s, data());
  const sent = [], replies = [];
  const p = {
    email: async (x) => { sent.push(x.text); return { id: "MAIL", to: "owner@example.test" }; },
    whatsapp: async (to, text, opts) => { replies.push({ text, action: opts?.action?.id }); return { id: `W${replies.length}` }; },
    model: async (task, input) => {
      if (task.startsWith("Classify a message")) return intentReply(input);
      if (task.startsWith("Answer the owner")) return { answer: `Owed GBP 0.00; ${input.lots[0].left_kg}kg of ${input.lots[0].name} left.` };
      throw Error("unexpected model task");
    },
  };
  const e = new Engine(s, d, p, cfg);
  installIntake(e);
  s.put("windows", "+15555550002", { at: new Date().toISOString() });
  const loop = d.loop("quote", "o", "q"),
    a = s.action("message", { channel: "email", to: "p@example.test", text: "Hi, price is 12 per kg.", org_id: "o" }, loop.id);
  s.put("message_bindings", "card1", { action_id: a.id, version: a.version, hash: a.hash });
  const msg = (id, body, context = "card1") => ({ id, from: "15555550002", timestamp: String(Math.floor(Date.now() / 1000)), context: context ? { id: context } : undefined, text: { body } });
  return { s, e, a, sent, replies, msg };
}
test("natural yes on a quoted card sends once and confirms", async () => {
  const { e, sent, replies, msg } = setup(() => ({ intent: "approve", confidence: 0.95 }));
  await e.inbound(msg("m1", "yeah go ahead and send that"));
  assert.deepEqual(sent, ["Hi, price is 12 per kg."]);
  assert.match(replies.at(-1).text, /^Sent to /);
});
test("low-confidence approve does not send and asks for a clear yes", async () => {
  const { e, sent, replies, msg } = setup(() => ({ intent: "approve", confidence: 0.4 }));
  await e.inbound(msg("m1", "hmm maybe"));
  assert.equal(sent.length, 0);
  assert.match(replies.at(-1).text, /not quite a yes/);
});
test("edit in the owner's words revises the draft, rebinds a new card, and the old approval is dead", async () => {
  const { s, e, a, sent, replies, msg } = setup((input) => ({ intent: "edit", edited_text: input.message.includes("14") ? "Hi, price is 14 per kg." : null, confidence: 0.9 }));
  await e.inbound(msg("m1", "yeah but say 14 not 12"));
  const updated = s.get("actions", a.id);
  assert.equal(updated.version, 2);
  assert.equal(updated.payload.text, "Hi, price is 14 per kg.");
  assert.equal(replies.at(-1).action, a.id);
  assert.ok(replies.at(-1).text.includes("14 per kg"));
  const newCard = `W${replies.length}`, newBinding = s.get("message_bindings", newCard);
  assert.equal(newBinding.version, 2);
  // Old card can no longer approve: logged blocked, nothing sent.
  await e.inbound(msg("m2", "yes send it", "card1"));
  assert.ok(s.events().some((x) => x.type === "blocked" && x.event_id === "m2"));
  assert.equal(sent.length, 0);
  // The new card can.
  await e.inbound(msg("m3", "yes send it", newCard));
  assert.deepEqual(sent, ["Hi, price is 14 per kg."]);
});
test("a question is answered from loops, Books and stock, nothing sent", async () => {
  const { e, sent, replies, msg } = setup(() => ({ intent: "ask", question: "what's left of lot 2?", confidence: 0.9 }));
  await e.inbound(msg("m1", "what's left of lot 2", null));
  assert.equal(sent.length, 0);
  assert.match(replies.at(-1).text, /5kg of Chikmagalur/);
});
test("exact yes never needs the model", async () => {
  const { e, sent, msg } = setup(() => { throw Error("model must not be called"); });
  await e.inbound(msg("m1", "yes"));
  assert.equal(sent.length, 1);
});

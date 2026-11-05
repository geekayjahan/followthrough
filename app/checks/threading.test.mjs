import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { Providers } from "../src/providers.mjs";
import { installIntake } from "../src/intake.mjs";
import { fileURLToPath } from "node:url";
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x", DEMO_AGE_DAYS: "3",
  ZOHO_MAIL_FROM: "consulting@example.test", ENABLE_POLLING: "true",
  VOICE_FILE: fileURLToPath(new URL("./fixtures/voice-signed.md", import.meta.url)),
  CALENDAR_FILE: fileURLToPath(new URL("./fixtures/calendar-empty.json", import.meta.url)),
};
const fixture = {
  orgs: [{ id: "r", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" }],
  people: [{ id: "p", org: "r", name: "Alex", email: "alex@example.test" }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [],
};
test("an email reply is kept with its id and subject, the next draft answers it as Re: in that thread, and the send is a Zoho reply", async () => {
  const s = new Store(":memory:"), d = new Domain(s, fixture);
  let seen = null;
  const e = new Engine(s, d, {
    model: async (task, input) => { seen = input; return { text: "Hi Alex, 20 kg of lot 2 it is; I'll confirm the delivery date tomorrow.", subject: "ignored" }; },
    mailMessages: async () => [{ messageId: "9001", fromAddress: "alex@example.test", subject: "Re: Samples [FT:00000000-0000-4000-8000-000000000000]" }],
    mailContent: async () => "<div>Could we go ahead with 20 kg of lot 2?</div>",
  }, cfg);
  installIntake(e);
  e.classifyIntake = async () => null;
  const loop = d.loop("quote", "r", "q1");
  await e.pollMail();
  const kept = s.get("loops", loop.id).last_inbound_mail;
  assert.equal(kept.message_id, "9001");
  assert.equal(kept.subject, "Re: Samples [FT:00000000-0000-4000-8000-000000000000]");
  assert.equal(s.get("inbound", "mail:9001").subject, "Re: Samples [FT:00000000-0000-4000-8000-000000000000]");
  const a = await e.draft(s.get("loops", loop.id));
  assert.equal(seen.inbound_email.subject, "Re: Samples [FT:00000000-0000-4000-8000-000000000000]");
  assert.match(seen.inbound_email.text, /20 kg of lot 2/);
  assert.equal(a.payload.subject, `Re: Samples [FT:${loop.id}]`);
  assert.equal(a.payload.reply_to, "9001");
  s.close();
});
test("a draft with no inbound email keeps the model's subject and no reply target", async () => {
  const s = new Store(":memory:"), d = new Domain(s, fixture);
  const e = new Engine(s, d, { model: async () => ({ text: "Hi Alex, how did you find the samples?", subject: "Samples" }) }, cfg);
  const a = await e.draft(d.loop("quote", "r", "q2"));
  assert.equal(a.payload.subject, `Samples [FT:${a.loop_id}]`);
  assert.equal(a.payload.reply_to, undefined);
  s.close();
});
test("the mail provider posts a reply to the stored message, and falls back to a new message when that reply is refused", async () => {
  const calls = [], events = [];
  const make = (replyOk) => new Providers({ ...cfg, ZOHO_REGION: "eu", ZOHO_CLIENT_ID: "t", ZOHO_CLIENT_SECRET: "t", ZOHO_REFRESH_TOKEN: "t", ZOHO_MAIL_ACCOUNT_ID: "a" },
    async (u, o) => {
      calls.push([String(u), o]);
      if (String(u).includes("oauth")) return { ok: true, json: async () => ({ access_token: "t" }) };
      if (String(u).endsWith("/messages/9001") && !replyOk) return { ok: false, status: 404, json: async () => ({ status: { code: 404 } }) };
      return { ok: true, json: async () => ({ status: { code: 200 }, data: { messageId: "m2" } }) };
    });
  const p = make(true);
  p.audit = (type, f) => events.push({ type, ...f });
  await p.email({ to: "alex@example.test", text: "Hi", subject: "Re: Samples", reply_to: "9001" });
  assert.ok(calls.at(-1)[0].endsWith("/api/accounts/a/messages/9001"));
  assert.equal(JSON.parse(calls.at(-1)[1].body).action, "reply");
  await p.email({ to: "alex@example.test", text: "Hi", subject: "Samples" });
  assert.ok(calls.at(-1)[0].endsWith("/api/accounts/a/messages"));
  assert.equal(JSON.parse(calls.at(-1)[1].body).action, undefined);
  const q = make(false);
  q.audit = (type, f) => events.push({ type, ...f });
  const r = await q.email({ to: "alex@example.test", text: "Hi", subject: "Re: Samples", reply_to: "9001" });
  assert.equal(r.id, "m2");
  assert.ok(calls.at(-1)[0].endsWith("/api/accounts/a/messages"));
  assert.equal(events.filter((x) => x.type === "reply_fallback").length, 1);
});

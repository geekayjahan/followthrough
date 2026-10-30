import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine, isCoffee } from "../src/engine.mjs";
import { Providers } from "../src/providers.mjs";
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x", DEMO_AGE_DAYS: "3",
  ZOHO_MAIL_FROM: "consulting@example.test", MAIL_FROM_COFFEE: "coffee@example.test",
  VOICE_FILE: new URL("./fixtures/voice-signed.md", import.meta.url).pathname,
};
test("F21: a draft to a coffee counterpart is switched to the coffee alias and the switch is logged", async () => {
  const s = new Store(":memory:"), d = new Domain(s, {
    orgs: [
      { id: "r", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" },
      { id: "m", name: "Clevedon Market", type: "market", status: "customer", website: "https://m.example.test" },
    ],
    people: [{ id: "p", org: "r", email: "a@example.test" }, { id: "q", org: "m", email: "m@example.test" }],
    edges: [], invoices: [], lots: [], orders: [], stall_days: [],
  });
  const e = new Engine(s, d, { model: async () => ({ text: "Hi Alex, how did you find the samples?", subject: "Samples" }) }, cfg);
  const roaster = await e.draft(d.loop("quote", "r", "q"));
  assert.equal(roaster.payload.from, "coffee@example.test");
  assert.equal(roaster.payload.coffee, true);
  const line = s.events().find((x) => x.type === "alias_fixed");
  assert.deepEqual([line.from, line.to, line.loop_id], ["consulting@example.test", "coffee@example.test", roaster.loop_id]);
  const market = await e.draft(d.loop("quote", "m", "q2"));
  assert.equal(market.payload.from, "consulting@example.test");
  assert.equal(s.events().filter((x) => x.type === "alias_fixed").length, 1);
  assert.equal(isCoffee({ type: "cafe" }), true);
  s.close();
});
test("F21: the mail provider sends from the coffee alias and fixes a payload that slipped through from another address", async () => {
  const calls = [], events = [];
  const p = new Providers({ ...cfg, ZOHO_REGION: "eu", ZOHO_CLIENT_ID: "t", ZOHO_CLIENT_SECRET: "t", ZOHO_REFRESH_TOKEN: "t", ZOHO_MAIL_ACCOUNT_ID: "a" },
    async (u, o) => { calls.push([String(u), o]); return { ok: true, json: async () => String(u).includes("oauth") ? { access_token: "t" } : { status: { code: 200 }, data: { messageId: "m1" } } }; });
  p.audit = (type, f) => events.push({ type, ...f });
  await p.email({ to: "a@example.test", text: "Hi", from: "consulting@example.test", coffee: true });
  assert.equal(JSON.parse(calls.at(-1)[1].body).fromAddress, "coffee@example.test");
  assert.equal(events.filter((x) => x.type === "alias_fixed").length, 1);
  await p.email({ to: "a@example.test", text: "Hi", from: "consulting@example.test" });
  assert.equal(JSON.parse(calls.at(-1)[1].body).fromAddress, "consulting@example.test");
  assert.equal(events.filter((x) => x.type === "alias_fixed").length, 1);
});

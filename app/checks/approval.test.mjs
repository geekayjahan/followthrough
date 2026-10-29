import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { Providers } from "../src/providers.mjs";
const data = {
  orgs: [
    {
      id: "o",
      status: "customer",
      name: "Test",
      website: "https://test.example.test",
    },
  ],
  people: [{ org: "o", email: "o@example.test" }],
  edges: [],
  lots: [],
  orders: [],
  stall_days: [],
};
function setup(p = {}) {
  const s = new Store(":memory:"),
    d = new Domain(s, data),
    e = new Engine(s, d, p, {
      SYNTHETIC_DATA_APPROVED: "true",
      OWNER_TEST_EMAILS: "owner@example.test",
    });
  const l = d.loop("quote", "o", "q");
  return { s, d, e, l };
}
test("exact approval completes once; edit invalidates old approval; no approval sends nothing", async () => {
  let sends = 0;
  const { s, e, l } = setup({
    email: async () => {
      sends++;
      return { id: "real-test-contract", to: "owner@example.test" };
    },
  });
  const a = s.action(
    "message",
    { channel: "email", to: "o@example.test", text: "Hi" },
    l.id,
  );
  assert.equal(sends, 0);
  const edited = await e.edit(a.id, { ...a, text: "Changed" });
  await assert.rejects(e.approve(a.id, a));
  await e.approve(edited.id, edited);
  await assert.rejects(e.approve(edited.id, edited));
  assert.equal(sends, 1);
  s.close();
});
test("unknown provider outcome is locked and never retried", async () => {
  let sends = 0;
  const { s, e, l } = setup({
    email: async () => {
      sends++;
      throw Error("network");
    },
  });
  const a = s.action(
    "message",
    { channel: "email", to: "o@example.test", text: "Hi" },
    l.id,
  );
  await assert.rejects(e.approve(a.id, a));
  await assert.rejects(e.approve(a.id, a));
  assert.equal(s.get("actions", a.id).status, "needs_reconciliation");
  assert.equal(sends, 1);
  s.close();
});
test("Zoho OAuth and outbound mail request contract uses test recipient", async () => {
  const calls = [];
  const p = new Providers(
    {
      SYNTHETIC_DATA_APPROVED: "true",
      ZOHO_REGION: "eu",
      ZOHO_CLIENT_ID: "test",
      ZOHO_CLIENT_SECRET: "test",
      ZOHO_REFRESH_TOKEN: "test",
      ZOHO_MAIL_ACCOUNT_ID: "a",
      ZOHO_MAIL_FROM: "owner@example.test",
      OWNER_TEST_EMAILS: "owner@example.test",
    },
    async (u, o) => {
      calls.push([String(u), o]);
      return {
        ok: true,
        json: async () =>
          String(u).includes("oauth")
            ? { access_token: "test-token", expires_in: 3600 }
            : { status: { code: 200 }, data: { messageId: "m1" } },
      };
    },
  );
  await p.email({ to: "other@example.test", text: "Hello" });
  assert.match(calls[0][0], /accounts.zoho.eu\/oauth\/v2\/token/);
  assert.equal(calls[0][1].body.get("grant_type"), "refresh_token");
  assert.equal(JSON.parse(calls[1][1].body).toAddress, "owner@example.test");
  assert.equal(calls[1][1].headers.Authorization, "Zoho-oauthtoken test-token");
});
test("concurrent exact approvals use compare-and-set to send once", async () => {
  let sends = 0;
  const { s, e, l } = setup({
    email: async () => {
      sends++;
      await new Promise((r) => setTimeout(r, 10));
      return { id: "m" };
    },
  });
  const a = s.action(
    "message",
    { channel: "email", to: "o@example.test", text: "Hi" },
    l.id,
  );
  const r = await Promise.allSettled([e.approve(a.id, a), e.approve(a.id, a)]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(sends, 1);
  s.close();
});

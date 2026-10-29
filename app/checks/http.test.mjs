import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { createApplication } from "../src/server.mjs";
const data = {
  provenance: "TEST FIXTURE",
  orgs: [
    {
      id: "o",
      name: "Test",
      status: "customer",
      website: "https://a.example.test",
    },
  ],
  people: [{ id: "p", org: "o", email: "a@example.test", whatsapp: null }],
  edges: [],
  lots: [],
  invoices: [],
  orders: [],
  stall_days: [],
};
test("HTTP owner guard, same-origin login, CSRF, exact approval, replay and fresh state", async () => {
  const s = new Store(":memory:"),
    c = {
      OWNER_PASSWORD: "test-password",
      APP_URL: "http://127.0.0.1",
      OWNER_TEST_EMAILS: "owner@example.test",
      SYNTHETIC_DATA_APPROVED: "true",
    };
  let sends = 0;
  const p = {
    booksSnapshot: async () => ({
      cash: 7,
      invoices: [],
      updated_at: new Date().toISOString(),
    }),
    email: async () => {
      sends++;
      return { id: "TEST-ONLY", to: "owner@example.test" };
    },
  };
  const app = createApplication({
    c,
    data,
    store: s,
    providers: p,
    testLabel: "TEST FIXTURE ONLY",
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  c.APP_URL = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.equal((await fetch(c.APP_URL + "/api/state")).status, 401);
    assert.equal(
      (
        await fetch(c.APP_URL + "/api/login", {
          method: "POST",
          headers: { Origin: "https://evil.invalid" },
          body: JSON.stringify({ password: "test-password" }),
        })
      ).status,
      403,
    );
    const login = await fetch(c.APP_URL + "/api/login", {
      method: "POST",
      headers: { Origin: c.APP_URL },
      body: JSON.stringify({ password: "test-password" }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0],
      headers = { Cookie: cookie, Origin: c.APP_URL };
    let state = await (
      await fetch(c.APP_URL + "/api/state", { headers })
    ).json();
    assert.equal(state.books.cash, 7);
    assert.equal(state.provenance, "TEST FIXTURE ONLY");
    const l = app.domain.loop("quote", "o", "q"),
      a = s.action(
        "message",
        { channel: "email", to: "a@example.test", text: "test" },
        l.id,
      );
    const url = c.APP_URL + `/api/actions/${a.id}/approve`;
    assert.equal(
      (await fetch(url, { method: "POST", headers, body: JSON.stringify(a) }))
        .status,
      400,
    );
    assert.equal(sends, 0);
    headers["X-CSRF-Token"] = state.csrf;
    assert.equal(
      (await fetch(url, { method: "POST", headers, body: JSON.stringify(a) }))
        .status,
      200,
    );
    assert.equal(
      (await fetch(url, { method: "POST", headers, body: JSON.stringify(a) }))
        .status,
      400,
    );
    assert.equal(sends, 1);
  } finally {
    await app.close();
  }
});

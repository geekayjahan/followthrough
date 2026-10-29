// Test-only UI harness. No .env is read, and no external request can be made.
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { createApplication } from "../src/server.mjs";
const data = JSON.parse(
  readFileSync(new URL("../data/synthetic.json", import.meta.url), "utf8"),
);
const dir = mkdtempSync(join(tmpdir(), "followthrough-ui-test-"));
const store = new Store(join(dir, "test.sqlite"));
const config = {
  OWNER_PASSWORD: "test-owner-only",
  APP_URL: "http://127.0.0.1:4311",
  SYNTHETIC_DATA_APPROVED: "true",
  OWNER_TEST_EMAILS: "owner@example.test",
  ENABLE_JOBS: "false",
  ENABLE_POLLING: "false",
};
const providers = {
  booksSnapshot: async () => ({
    cash: 1234,
    invoices: [],
    contacts: [],
    payments: [],
    expenses: [],
    updated_at: new Date().toISOString(),
  }),
  email: async (p) => ({
    id: `TEST-ONLY-${Date.now()}`,
    to: config.OWNER_TEST_EMAILS,
  }),
  sale: async () => ({ id: "TEST-ONLY-SALE" }),
  expense: async () => ({ id: "TEST-ONLY-EXPENSE" }),
  model: async () => {
    throw Error("Model unavailable in test harness");
  },
};
const app = createApplication({
  c: config,
  data,
  store,
  providers,
  testLabel:
    "TEST FIXTURE ONLY — synthetic UI and injected provider responses; no connected proof or external messages.",
});
const loop = app.domain.loop("quote", "org-1", "fixture:quote", {
  last_touch: "2026-10-20T12:00:00Z",
  due_at: "2026-10-23T12:00:00Z",
  next_move: "Review the sample follow-up",
});
store.action(
  "message",
  {
    channel: "email",
    to: "alex@example.test",
    subject: "Fixture quote follow-up",
    text: "Hello Harbour Roasters, would you like to discuss the sample quote?",
    org_id: "org-1",
  },
  loop.id,
);
store.action("expense", {
  supplier: "Rainhill Supplies",
  amount: 24,
  date: "2026-10-29",
  currency: "GBP",
  description: "Test-only receipt",
});
store.action(
  "shipment",
  { org_id: "org-1", description: "Confirm illustrative order has shipped" },
  store.all("loops").find((l) => l.type === "order_to_ship").id,
);
app.server.listen(4311, "127.0.0.1", () =>
  console.log(
    "TEST ONLY UI http://127.0.0.1:4311 password test-owner-only; temp store " +
      dir,
  ),
);

import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain, due } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { fileURLToPath } from "node:url";
const data = () => ({
  orgs: [{ id: "c", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" }],
  people: [{ id: "p", org: "c", email: "a@example.test" }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [],
});
const cfg = {
  SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x", DEMO_AGE_DAYS: "3",
  DEMO_SEND_DELAY_MINUTES: "0", VOICE_FILE: fileURLToPath(new URL("./fixtures/voice-signed.md", import.meta.url)),
  CALENDAR_FILE: fileURLToPath(new URL("./fixtures/calendar-empty.json", import.meta.url)),
};
test("T10: three approved sends with no counterpart touch park the loop; no draft after; one brief line; a touch reopens it", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  let drafts = 0;
  const e = new Engine(s, d, {
    model: async () => { drafts++; return { text: "Hi Alex, how did you find the samples?", subject: "Samples" }; },
    email: async () => ({ id: `M${Date.now()}`, to: "owner@example.test" }),
  }, cfg);
  const loop = d.loop("quote", "c", "q");
  for (let i = 1; i <= 3; i++) {
    const a = await e.draft(s.get("loops", loop.id));
    await e.approve(a.id, a);
    assert.equal(s.get("loops", loop.id).chases, i);
  }
  const parked = s.get("loops", loop.id);
  assert.equal(parked.status, "parked");
  assert.equal(s.events().filter((x) => x.type === "parked").length, 1);
  assert.equal(due(parked, new Date(Date.now() + 10 * 86400000), d.cadence), false, "never cold while parked");
  const draftsBefore = drafts;
  const first = await e.brief(new Date(), { manual: true, send: false });
  assert.equal(drafts, draftsBefore, "no draft after the third send");
  assert.ok(!first.loops.some((l) => l.id === loop.id));
  assert.equal(first.text.split("\n").filter((line) => line.includes("parked, 3 chases unanswered")).length, 1);
  assert.deepEqual(s.events().find((x) => x.type === "brief").parked_ids, [loop.id]);
  const second = await e.brief(new Date(Date.now() + 1000), { manual: true, send: false });
  assert.ok(!second.text.includes("parked"), "said once");
  d.receive("c", "Sorry for the silence, yes please send two bags", "email", "r1", loop.id);
  const reopened = s.get("loops", loop.id);
  assert.equal(reopened.status, "open");
  assert.equal(reopened.chases, 0);
  assert.ok(s.events().some((x) => x.type === "touch" && x.loop_id === loop.id && x.reopened === true));
  s.close();
});

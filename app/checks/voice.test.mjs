import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine, readVoiceFile } from "../src/engine.mjs";
import { Providers } from "../src/providers.mjs";
import { fileURLToPath } from "node:url";
const signed = fileURLToPath(new URL("./fixtures/voice-signed.md", import.meta.url)),
  unsigned = fileURLToPath(new URL("./fixtures/voice-unsigned.md", import.meta.url));
const data = () => ({
  orgs: [{ id: "c", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" }],
  people: [{ id: "p", org: "c", name: "Alex", email: "a@example.test", whatsapp: null }],
  edges: [], invoices: [], lots: [], orders: [], stall_days: [],
});
const cfg = { SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://127.0.0.1:4310", DEMO_AGE_DAYS: "3", CALENDAR_FILE: fileURLToPath(new URL("./fixtures/calendar-empty.json", import.meta.url)) };
test("F17: without a signed-off voice file no customer draft is produced, the brief says so once, loops are still listed", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  let calls = 0;
  const e = new Engine(s, d, { model: async () => { calls++; return { text: "x", subject: "y" }; } }, { ...cfg, VOICE_FILE: unsigned });
  d.loop("quote", "c", "q1");
  d.loop("order_unconfirmed", "c", "o1");
  const brief = await e.brief(new Date(), { manual: true, send: false });
  assert.equal(calls, 0);
  assert.equal(brief.actions.length, 0);
  assert.equal(brief.loops.length, 2);
  assert.equal(brief.text.split("\n").filter((line) => line.startsWith("No customer drafts")).length, 1);
  assert.equal(s.events().filter((x) => x.type === "draft_blocked" && x.reason === "voice_file_unsigned").length, 2);
  assert.equal(readVoiceFile("/nonexistent/voice.md").ok, false);
  s.close();
});
test("T5: with a signed-off file the draft call carries the voice file, the last inbound messages and what the counterpart last asked", async () => {
  const s = new Store(":memory:"), d = new Domain(s, data());
  let seen = null;
  const e = new Engine(s, d, { model: async (task, input, opts) => { seen = { task, input, opts }; return { text: "Hi Alex, the bags are 250 g and 1 kg.", subject: "Bag sizes" }; } }, { ...cfg, VOICE_FILE: signed });
  const l = d.loop("quote", "c", "q1");
  d.receive("c", "Thanks, what sizes do you do?", "email", "m1", l.id);
  d.receive("c", "And what bag sizes are the roasted ones?", "email", "m2", l.id);
  s.put("loops", l.id, { ...s.get("loops", l.id), last_touch: "2026-10-01T00:00:00Z" });
  const a = await e.draft(s.get("loops", l.id));
  assert.ok(a);
  assert.ok(seen.input.voice_file.includes("signed-off: 2026-10-30 Test Owner"));
  assert.equal(seen.input.thread.length, 2);
  assert.equal(seen.input.counterpart_last_asked, "And what bag sizes are the roasted ones?");
  assert.equal(seen.opts.voice_file, true);
  assert.match(seen.task, /voice/i);
  s.close();
});
test("F17: the model_call line records voice_file: true for a draft call", async () => {
  const events = [];
  const p = new Providers({ SYNTHETIC_DATA_APPROVED: "true", MODEL_BASE_URL: "https://model.example.test/v1", MODEL_NAME: "m" }, async () => ({ ok: true, json: async () => ({ model: "m", usage: { prompt_tokens: 1, completion_tokens: 1 }, choices: [{ message: { content: "{\"text\":\"ok\"}" } }] }) }));
  p.audit = (type, f) => events.push({ type, ...f });
  await p.model("Draft", {}, { voice_file: true });
  await p.model("Classify", {});
  const calls = events.filter((x) => x.type === "model_call");
  assert.deepEqual(calls.map((c) => c.voice_file), [true, false]);
  assert.ok(events.some((x) => x.type === "host" && x.host === "model.example.test"));
});

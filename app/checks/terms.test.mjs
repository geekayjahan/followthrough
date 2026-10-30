import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.mjs";
import { Domain } from "../src/domain.mjs";
import { Engine } from "../src/engine.mjs";
import { loadTerms, checkDraft } from "../src/terms.mjs";
const terms = loadTerms();
test("terms.md parses into price rows, bag prices and the owner's cadence", () => {
  const fusion = terms.lots.find((l) => l.name === "Fusion Ferment");
  assert.deepEqual([fusion.list, fusion.floor, fusion.suggested, fusion.ceiling], [[13.6], 10.56, 11.7, 13]);
  const yeast = terms.lots.find((l) => l.name === "Yeast Maceration");
  assert.ok(yeast.explicit.includes(13.5), "agreed price on the row counts");
  assert.deepEqual(terms.bags, { 250: 8, 1000: 28 });
  assert.deepEqual(terms.cadence, { email: 7, sample: 5 });
  assert.equal(terms.signed_off, false);
  assert.ok(terms.never.some((n) => /first-order discount/.test(n)));
});
test("F20: a placeholder or a price on no row blocks; a listed price passes", () => {
  assert.equal(checkDraft("Fusion Ferment is £13.60/kg ex warehouse.", terms), null);
  assert.equal(checkDraft("Fusion Ferment at £12/kg for a pallet.", terms), null, "between floor and ceiling");
  assert.match(checkDraft("Fusion Ferment at £20 per kg.", terms).detail, /£20\/kg is on no price-list row for Fusion Ferment/);
  assert.match(checkDraft("Golden Jack at £9/kg.", terms).detail, /no price-list row/);
  assert.equal(checkDraft("Golden Jack at £15/kg.", terms), null);
  assert.equal(checkDraft("The price is [price per kg] for the lot.", terms).reason, "placeholder");
  assert.equal(checkDraft("Stall bags are £8 per 250g and £28 a 1kg.", terms), null);
  assert.equal(checkDraft("Bags are £6 per 250g.", terms).reason, "price not on price list");
});
test("W7: offers outside the ladder are blocked; the pass example and a pallet discount are allowed", () => {
  assert.equal(checkDraft("Samples are on us; the guest slot runs four to six weeks at list price.", terms), null);
  assert.equal(checkDraft("Take 10% off your first order.", terms).reason, "offer ladder");
  assert.match(checkDraft("I can offer a discount if you order this week.", terms).detail, /discount/);
  assert.equal(checkDraft("If you take a full pallet across the lots, I can discount on the total.", terms), null);
  assert.match(checkDraft("We can supply a grinder free of charge.", terms).detail, /equipment/);
  assert.match(checkDraft("You would have exclusivity in Bath.", terms).detail, /exclusivity/);
  assert.match(checkDraft("I can guarantee availability all year.", terms).detail, /availability/);
});
test("F20: a blocked draft produces no card, a draft_blocked line and an ask naming the missing price; the brief says so", async () => {
  const s = new Store(":memory:"), d = new Domain(s, {
    orgs: [{ id: "c", name: "Harbour Roasters", type: "roaster", status: "customer", website: "https://a.example.test" }],
    people: [{ id: "p", org: "c", email: "a@example.test" }], edges: [], invoices: [], lots: [], orders: [], stall_days: [],
  });
  let text = "Hi Alex, the Fusion Ferment is [price per kg] ex warehouse.";
  const e = new Engine(s, d, { model: async () => ({ text, subject: "Price" }) }, {
    SYNTHETIC_DATA_APPROVED: "true", OWNER_TEST_EMAILS: "owner@example.test", APP_URL: "http://x", DEMO_AGE_DAYS: "3",
    VOICE_FILE: new URL("./fixtures/voice-signed.md", import.meta.url).pathname,
    CALENDAR_FILE: new URL("./fixtures/calendar-empty.json", import.meta.url).pathname,
  });
  d.loop("quote", "c", "q");
  const brief = await e.brief(new Date(), { manual: true, send: false });
  assert.equal(brief.actions.length, 0);
  assert.equal(s.all("actions").length, 0);
  const blocked = s.events().find((x) => x.type === "draft_blocked");
  assert.equal(blocked.reason, "placeholder");
  assert.match(s.events().find((x) => x.type === "ask" && x.reason === "draft_blocked").ask, /price per kg/);
  assert.match(brief.text, /draft held, needs a value for \[price per kg\]/);
  text = "Hi Alex, the Fusion Ferment is £13.60/kg ex warehouse.";
  const next = await e.brief(new Date(Date.now() + 1000), { manual: true, send: false });
  assert.equal(next.actions.length, 1);
  assert.ok(!next.text.includes("draft held"));
  s.close();
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  publicIP,
  qualificationFacts,
  fetchWebsite,
} from "../src/enrichment.mjs";
test("SSRF blocks private, metadata, mapped IPv6 and reserved ranges", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "100.64.1.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "2001:db8::1",
  ])
    assert.equal(publicIP(ip), false, ip);
  assert.equal(publicIP("8.8.8.8"), true);
  await assert.rejects(
    fetchWebsite("https://shop.test", ["shop.test"], {
      resolve: async () => [{ address: "127.0.0.1", family: 4 }],
    }),
  );
  await assert.rejects(fetchWebsite("https://evil.test", ["shop.test"]));
});
test("qualification requires exact numeric and Indian evidence; tier boundaries match spec", () => {
  const page = {
      url: "https://shop.test",
      text: "250g coffee £11. We stock Indian coffee.",
    },
    r = {
      price: 11,
      sells_indian: true,
      sources: {
        price: { url: page.url, quote: "250g coffee £11" },
        sells_indian: { url: page.url, quote: "We stock Indian coffee." },
      },
    };
  assert.equal(qualificationFacts(r, [page]).tier, "mid-shelf");
  assert.throws(() => qualificationFacts({ ...r, price: 6 }, [page]));
  assert.throws(() =>
    qualificationFacts({ ...r, sells_indian: false }, [page]),
  );
  const below = {
    ...r,
    price: 6,
    sources: { ...r.sources, price: { url: page.url, quote: "250g £6" } },
  };
  assert.equal(
    qualificationFacts(below, [{ ...page, text: page.text + " 250g £6" }]).tier,
    "below bar",
  );
});

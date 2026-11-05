import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
// Hard rule (app/CLAUDE.md §2): no phone number and no real email in any checked-in file. UK GDPR.
const repo = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const BINARY = /\.(png|jpe?g|gif|ico|wav|ogg|mp3|m4a|pdf|woff2?|lock)$/i;
// Ofcom's drama range (07700 900000 to 900999) is reserved for fiction; anything else is a real number.
const PHONE = /(?<![\w./-])(?:\+44\s?|0)(?:7\d{3}|[12]\d{2,3})\s?\d{3}\s?\d{3,4}(?!\w)/g;
const FICTIONAL = /^(?:\+44\s?|0)7700\s?900\d{3}$/;
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const ALLOWED_DOMAINS = new Set(["example.test", "test.invalid", "company.invalid", "beanandbloom.invalid", "kamacoffee.co.uk"]);
// Addresses the code itself rejects or names as examples of what is refused.
const ALLOWED_ADDRESSES = new Set(["real@gmail.com"]);
function files() {
  try {
    return execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" }).split("\n").filter((f) => f && !BINARY.test(f));
  } catch {
    return null;
  }
}
test("no checked-in file holds a real phone number or a non-allowlisted email", (t) => {
  const list = files();
  if (!list) return t.skip("not a git checkout");
  const found = [];
  for (const f of list) {
    let text;
    try { text = readFileSync(resolve(repo, f), "utf8"); } catch { continue; }
    const bare = text.replace(/https?:\/\/\S+/g, "");
    for (const m of bare.matchAll(PHONE)) if (!FICTIONAL.test(m[0].replace(/\s/g, ""))) found.push(`${f}: phone ${m[0].slice(0, 4)}…`);
    for (const m of bare.matchAll(EMAIL))
      if (!ALLOWED_DOMAINS.has(m[1].toLowerCase()) && !ALLOWED_ADDRESSES.has(m[0].toLowerCase()) && !/^\d+\.\d+\.\d+$/.test(m[1])) found.push(`${f}: email @${m[1]}`);
  }
  assert.deepEqual(found, []);
});

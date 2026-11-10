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

// The current tree can be clean while an earlier commit still publishes the data, so the same rule runs over history.
const COMMIT_DOMAINS = new Set(["users.noreply.github.com", "anthropic.com", "github.com", "flywheelbygk.com"]);
function git(args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
}
function leaks(text) {
  const out = [];
  const bare = text.replace(/https?:\/\/\S+/g, "");
  for (const m of bare.matchAll(PHONE)) if (!FICTIONAL.test(m[0].replace(/\s/g, ""))) out.push(`phone ${m[0].slice(0, 4)}…`);
  for (const m of bare.matchAll(EMAIL))
    if (!ALLOWED_DOMAINS.has(m[1].toLowerCase()) && !ALLOWED_ADDRESSES.has(m[0].toLowerCase()) && !/^\d+\.\d+\.\d+$/.test(m[1])) out.push(`email @${m[1]}`);
  return out;
}
test("no commit in history adds a real phone number or a non-allowlisted email", (t) => {
  let log, people, messages;
  try {
    if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") return t.skip("shallow clone: history not available");
    log = git(["log", "HEAD", "-p", "--no-color", "--unified=0", "--no-renames", "--format=commit %h"]);
    people = git(["log", "HEAD", "--format=%h %ae %ce"]);
    messages = git(["log", "HEAD", "--format=commit %h%n%B"]);
  } catch {
    return t.skip("not a git checkout");
  }
  const found = new Set();
  let commit = "", file = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7);
    else if (line.startsWith("+++ ")) file = line.slice(6);
    else if (line.startsWith("+") && !BINARY.test(file)) for (const l of leaks(line.slice(1))) found.add(`${commit} ${file}: ${l}`);
  }
  for (const line of people.split("\n").filter(Boolean)) {
    const [hash, ...emails] = line.split(" ");
    for (const e of emails) {
      const domain = e.split("@")[1]?.toLowerCase() || "";
      if (!COMMIT_DOMAINS.has(domain)) found.add(`${hash} commit metadata: email @${domain}`);
    }
  }
  for (const line of messages.split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7);
    else for (const m of line.matchAll(EMAIL)) if (!COMMIT_DOMAINS.has(m[1].toLowerCase()) && !ALLOWED_DOMAINS.has(m[1].toLowerCase())) found.add(`${commit} message: email @${m[1]}`);
  }
  assert.deepEqual([...found], []);
});

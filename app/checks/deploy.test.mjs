import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplication } from "../src/server.mjs";

const origin = "https://followthrough.example.test";

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), "ft-deploy-"));
  const c = { DATA_DIR: dir, TRUST_PROXY: "true", APP_URL: origin, OWNER_PASSWORD: "deploy-check-only" };
  const app = createApplication({ c });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const login = (forwarded, password = "wrong") =>
    fetch(`${base}/api/login`, {
      method: "POST",
      headers: { origin, "x-forwarded-for": forwarded, "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).then(async (r) => ({ status: r.status, body: await r.json(), cookie: r.headers.get("set-cookie") || "" }));
  return { app, dir, base, login };
}

test("T5: DATA_DIR holds the runtime database and action log, outside the committed data folder", async () => {
  const { app, dir, base } = await boot();
  assert.equal((await fetch(`${base}/health`)).status, 200);
  await app.close();
  assert.ok(existsSync(join(dir, "followthrough.sqlite")));
  assert.ok(existsSync(join(dir, "logs/actions.jsonl")));
  rmSync(dir, { recursive: true, force: true });
});

test("T5: behind a proxy one client's failed logins lock out only that client", async () => {
  const { app, dir, login } = await boot();
  for (let i = 0; i < 10; i++) await login("9.9.9.9, 1.1.1.1");
  assert.match((await login("9.9.9.9, 1.1.1.1")).body.error, /Too many/);
  assert.match((await login("8.8.8.8, 1.1.1.1")).body.error, /Too many/, "a forged first hop does not reset the count");
  const other = await login("2.2.2.2", "deploy-check-only");
  assert.equal(other.status, 200);
  assert.match(other.cookie, /Secure/);
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

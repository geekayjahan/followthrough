#!/usr/bin/env node
// The kit's local server: static files + the comment pipe.
//
//   node scripts/serve.mjs          → http://localhost:4000  (4000 so it doesn't clash with the app's dev server on 3000)
//
// Serves the kit root (build-assistant.html, resources/workshop-guide.html, app/ artifacts)
// and adds the endpoints the dashboards use:
//   GET  /comments          → app/comments.json (or [] if none yet)
//   POST /comments          → append {ts, target, text, quote?, status:"new"}
//   GET  /eval-annotations  → app/eval-annotations.json (or [] if none yet)
//   POST /eval-annotations  → upsert one TRACES note {run, item_id, note, ...} by run+item_id
//
// The builder reads app/comments.json before each feature (the comment checkpoint) —
// a comment typed on the Build Assistant or annotated on the spec feeds back here as
// a change request. The eval dashboard's TRACES notes are the human error-analysis
// annotations (not build feedback); they persist to app/eval-annotations.json.
// Node 18+, no dependencies. Binds localhost only.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMMENTS = join(ROOT, "app", "comments.json");
const EVAL_ANN = join(ROOT, "app", "eval-annotations.json");
const PORT = Number(process.env.PORT || 4000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// ── comments file: read + serialized read-modify-write ──────────────────
// The Claude session edits comments.json at the checkpoint while we write too, so
// every server-side mutation re-reads the file inside one lock.
async function readJsonArr(file) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return []; }
}
let lock = Promise.resolve();
function withLock(fn) {
  const p = lock.then(fn, fn);
  lock = p.catch(() => {});
  return p;
}
function mutateJsonArr(file, mutate) {
  return withLock(async () => {
    const all = await readJsonArr(file);
    const out = mutate(all);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(all, null, 2));
    return out;
  });
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body);
}
// Artifact pages are sometimes opened as file:// (double-click) — their comment
// widgets then POST cross-origin to localhost. CORS + OPTIONS makes that work.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};
function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json", ...CORS });
  res.end(JSON.stringify(obj));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

  // -- the comment pipe --------------------------------------------------
  if (url.pathname === "/comments") {
    if (req.method === "GET") return json(res, 200, await readJsonArr(COMMENTS));
    if (req.method === "POST") {
      try {
        const { target, text, quote } = await readBody(req);
        if (!target || !text) throw new Error("target and text required");
        const entry = { ts: new Date().toISOString(), target, text: String(text).slice(0, 2000), status: "new" };
        if (quote) entry.quote = String(quote).slice(0, 600);
        await mutateJsonArr(COMMENTS, (all) => all.push(entry));
        console.log(`comment on ${target}: ${text.slice(0, 60)}`);
        return json(res, 200, { ok: true });
      } catch (e) {
        return json(res, 400, { ok: false, error: String(e.message || e) });
      }
    }
    res.writeHead(405); return res.end();
  }

  // -- the eval-annotations pipe (TRACES-tab error-analysis notes) -------
  // One entry per (run, item_id); POST upserts, an empty note clears it. The
  // dashboard reads this back on load as the source of truth over its localStorage
  // draft. Never feeds the build — these are Pass-2 observations, not change requests.
  if (url.pathname === "/eval-annotations") {
    if (req.method === "GET") return json(res, 200, await readJsonArr(EVAL_ANN));
    if (req.method === "POST") {
      try {
        const { run, item_id, note, kind, check_id, reviewer, verdict } = await readBody(req);
        if (run == null || !item_id) throw new Error("run and item_id required");
        const clean = String(note ?? "").slice(0, 4000);
        await mutateJsonArr(EVAL_ANN, (all) => {
          const i = all.findIndex((e) => String(e.run) === String(run) && e.item_id === item_id);
          if (!clean.trim()) { if (i >= 0) all.splice(i, 1); return; }
          const entry = { ts: new Date().toISOString(), run: String(run), item_id, kind, note: clean };
          if (check_id) entry.check_id = check_id;
          if (reviewer) entry.reviewer = reviewer;
          if (verdict) entry.verdict = verdict;
          if (i >= 0) all[i] = entry; else all.push(entry);
        });
        return json(res, 200, { ok: true });
      } catch (e) {
        return json(res, 400, { ok: false, error: String(e.message || e) });
      }
    }
    res.writeHead(405); return res.end();
  }

  // -- static files ------------------------------------------------------
  // decodeURIComponent throws on malformed escapes (/%zz) — answer 400, never crash.
  let path;
  try { path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, ""); }
  catch { res.writeHead(400); return res.end("bad request"); }
  if (path === "" || path === ".") path = "build-assistant.html";
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  // Dotfiles are never servable — .env holds the student's keys.
  if (path.split(/[/\\]/).some((seg) => seg.startsWith("."))) { res.writeHead(404); return res.end("not found"); }
  if (!existsSync(file)) { res.writeHead(404); return res.end("not found"); }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`kit server → http://localhost:${PORT}`);
  console.log(`  build assistant   http://localhost:${PORT}/build-assistant.html`);
  console.log(`  workshop guide   http://localhost:${PORT}/resources/workshop-guide.html`);
  console.log(`  comments → app/comments.json · eval notes → app/eval-annotations.json`);
});

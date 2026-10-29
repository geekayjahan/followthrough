import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  config,
  ROOT,
  required,
  validateData,
  safeError,
  recipient,
  list,
} from "./config.mjs";
import { Store, hash } from "./store.mjs";
import { Auth, verifySignature } from "./auth.mjs";
import { Domain, london, due, demoNow } from "./domain.mjs";
import { Providers } from "./providers.mjs";
import { Engine } from "./engine.mjs";
import { installBooks } from "./books.mjs";
import { installReceipts } from "./receipts.mjs";
import { installStall } from "./stall.mjs";
import { installStock } from "./stock.mjs";
import { installEnrichment } from "./enrichment.mjs";
import { installIntake } from "./intake.mjs";
async function body(req, limit = 1000000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Error("Invalid request size");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function createApplication({
  c = config(),
  data = JSON.parse(readFileSync(join(ROOT, "data/synthetic.json"), "utf8")),
  store,
  providers,
  testLabel = null,
} = {}) {
  const s =
    store ||
    new Store(
      join(ROOT, "data/followthrough.sqlite"),
      join(ROOT, "logs/actions.jsonl"),
    );
  try {
    validateData(data, c);
  } catch (error) {
    s.audit("data_rejected", { reason: "invalid_synthetic_dataset" });
    throw error;
  }
  const fingerprint = hash(data),
    saved = s.get("meta", "dataset_fingerprint");
  if (saved && saved.hash !== fingerprint) {
    s.audit("data_rejected", { reason: "dataset_fingerprint_changed" });
    throw Error(
      "Invalid dataset change: stop, back up the runtime database, and explicitly reset it before loading revised mappings",
    );
  }
  s.put("meta", "dataset_fingerprint", { hash: fingerprint });
  const d = new Domain(s, data),
    p = providers || new Providers(c),
    e = new Engine(s, d, p, c),
    auth = new Auth(s, c);
  installBooks(e);
  installReceipts(e);
  installStall(e);
  installStock(e);
  installEnrichment(e);
  installIntake(e);
  for (const a of s.all("actions"))
    if (a.status === "executing") {
      a.status = "needs_reconciliation";
      a.error =
        "Runtime restarted during a provider operation; reconcile its outcome before another write";
      s.put("actions", a.id, a);
    }
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  };
  const send = (res, status, value) => {
    res.writeHead(status, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify(value));
  };
  const server = createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return send(res, 400, { error: "Invalid request target" });
    }
    try {
      if (req.method === "GET" && url.pathname === "/health")
        return send(res, 200, { ok: true });
      if (req.method === "GET" && url.pathname === "/favicon.ico") {
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname === "/webhooks/whatsapp") {
        if (req.method === "GET") {
          if (
            !c.WHATSAPP_VERIFY_TOKEN ||
            url.searchParams.get("hub.mode") !== "subscribe" ||
            url.searchParams.get("hub.verify_token") !== c.WHATSAPP_VERIFY_TOKEN
          )
            return send(res, 403, { error: "Webhook verification rejected" });
          res.writeHead(200, { "Content-Type": "text/plain" });
          return res.end(url.searchParams.get("hub.challenge") || "");
        }
        if (req.method !== "POST")
          return send(res, 405, { error: "Method not allowed" });
        const raw = await body(req);
        if (
          !verifySignature(
            raw,
            req.headers["x-hub-signature-256"],
            c.WHATSAPP_APP_SECRET,
          )
        )
          return send(res, 403, { error: "Webhook signature rejected" });
        const payload = JSON.parse(raw);
        for (const entry of payload.entry || [])
          for (const change of entry.changes || [])
            for (const message of change.value?.messages || [])
              await e.inbound(message);
        return send(res, 200, { received: true });
      }
      if (
        req.method === "GET" &&
        ["/styles.css", "/app.js"].includes(url.pathname)
      ) {
        res.writeHead(200, {
          ...headers,
          "Content-Type": url.pathname.endsWith(".css")
            ? "text/css"
            : "text/javascript",
        });
        return res.end(
          readFileSync(join(ROOT, "public", url.pathname.slice(1))),
        );
      }
      if (req.method === "POST" && url.pathname === "/api/login") {
        if (!c.APP_URL || req.headers.origin !== new URL(c.APP_URL).origin)
          return send(res, 403, { error: "Origin rejected" });
        const input = JSON.parse(await body(req, 4096));
        const result = auth.login(input.password, req.socket.remoteAddress);
        res.setHeader("Set-Cookie", auth.cookie(result.token));
        return send(res, 200, { ok: true });
      }
      const session = auth.session(req);
      if (
        req.method === "GET" &&
        (url.pathname === "/" || url.pathname === "/login")
      ) {
        res.writeHead(200, { ...headers, "Content-Type": "text/html" });
        return res.end(
          readFileSync(
            join(ROOT, "public", session ? "index.html" : "login.html"),
          ),
        );
      }
      if (!session) return send(res, 401, { error: "Session required" });
      if (req.method === "GET" && url.pathname === "/api/state") {
        if (c.SYNTHETIC_DATA_APPROVED === "true")
          try {
            await e.syncBooks();
          } catch {}
        e.refreshStock();
        const local = london(),
          missedSlots = (c.ENABLE_JOBS === "true" ? ["08:00", "18:00"] : [])
            .filter(
              (slot) =>
                local.time > slot &&
                !s.get("brief_slots", `${local.date}:${slot}`),
            )
            .map((slot) => ({ date: local.date, slot }));
        return send(res, 200, {
          csrf: session.csrf,
          setup: {
            missing: required.filter((k) => !c[k]),
            approved: c.SYNTHETIC_DATA_APPROVED === "true",
            jobs: c.ENABLE_JOBS === "true",
            polling: c.ENABLE_POLLING === "true",
            demoAgeDays: Number(c.DEMO_AGE_DAYS) || 0,
            whatsapp: Boolean(c.WHATSAPP_TOKEN && list(c.WHATSAPP_OWNER_NUMBERS).length),
            testEmails: list(c.OWNER_TEST_EMAILS),
          },
          provenance: testLabel || data.provenance,
          books: s.get("books", "snapshot") || {
            available: false,
            cash: null,
            owed: null,
            updated_at: null,
          },
          loops: s.all("loops").map((l) => ({ ...l, due_today: due(l, demoNow(c)) })),
          actions: s.all("actions").map((action) => {
            if (action.kind !== "message") return action;
            let effective_recipient = null;
            try {
              effective_recipient = recipient(
                c,
                action.payload.channel,
                action.payload.to,
              );
            } catch {}
            return { ...action, effective_recipient };
          }),
          lots: s.all("lots"),
          orgs: d.orgs(),
          edges: data.edges,
          qualifications: s.all("qualifications"),
          events: s.events(),
          missedSlots,
          inboundFailures: s
            .entries("inbound")
            .filter((event) => event.status !== "completed"),
          briefFailures: s
            .all("brief_slots")
            .filter((slot) => !["completed", "composed"].includes(slot.status)),
          auditError: s.get("meta", "audit_log_error"),
        });
      }
      if (req.method === "POST") {
        auth.mutation(req, session);
        const input = JSON.parse(await body(req, 10000));
        if (url.pathname === "/api/logout") {
          s.del("sessions", session.key);
          res.setHeader(
            "Set-Cookie",
            "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
          );
          return send(res, 200, { ok: true });
        }
        if (url.pathname === "/api/brief") {
          // Owner-initiated brief: composes now; sends to WhatsApp only when asked.
          const brief = await e.brief(new Date(), {
            manual: true,
            send: input.send === true,
          });
          return send(res, 200, brief);
        }
        if (url.pathname === "/api/sync") {
          await e.syncBooks();
          if (c.ENABLE_POLLING === "true") await e.pollMail();
          return send(res, 200, { ok: true });
        }
        const action = url.pathname.match(
          /^\/api\/actions\/([a-f0-9-]{36})\/(approve|edit|drop)$/,
        );
        if (action) return send(res, 200, await e[action[2]](action[1], input));
        const qualify = url.pathname.match(/^\/api\/qualify\/([^/]+)$/);
        if (qualify)
          return send(
            res,
            200,
            await e.qualify(decodeURIComponent(qualify[1])),
          );
      }
      return send(res, 404, { error: "Not found" });
    } catch (error) {
      s.audit("blocked", { reason: "request_failed", path: url.pathname });
      return send(res, 400, { error: safeError(error) });
    }
  });
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      e.refreshStock();
      if (c.ENABLE_POLLING === "true") {
        await e.syncBooks();
        await e.pollMail();
      }
      await e.brief();
    } catch {
      s.audit("blocked", { reason: "scheduled_operation_failed" });
    } finally {
      busy = false;
    }
  };
  let timer;
  return {
    server,
    store: s,
    engine: e,
    domain: d,
    startJobs() {
      if (c.ENABLE_JOBS === "true" || c.ENABLE_POLLING === "true")
        timer = setInterval(tick, 30000);
    },
    async close() {
      clearInterval(timer);
      await new Promise((resolve) => server.close(resolve));
      s.close();
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const app = createApplication(),
      c = config();
    app.server.listen(Number(c.PORT || 4310), c.HOST || "127.0.0.1", () => {
      console.log(
        `Followthrough listening at ${c.APP_URL || "http://127.0.0.1:4310"}; connected verification pending`,
      );
      app.startJobs();
    });
  } catch (error) {
    console.error(safeError(error));
    process.exitCode = 1;
  }
}

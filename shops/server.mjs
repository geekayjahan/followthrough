// Serves the synthetic shop pages from candidate-v1, one hostname per unrelated org (pack README section 6, step 5).
// The first label of the Host header picks the shop; the two Pennine shops share one host and split by path.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = process.env.SHOPS_DIR || new URL("./pages/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SHOPS = {
  harbour: { "/": "org-1-harbour-roasters.html" },
  bloom: { "/": "org-2-bean-and-bloom.html" },
  northbank: { "/": "org-3-northbank-coffee.html" },
  severnwharf: { "/": "org-5-severn-wharf-roastery.html" },
  cliftonpantry: { "/": "org-6-clifton-pantry.html" },
  moorlandroasters: { "/": "org-7-moorland-micro-roasters.html" },
  bargainbean: { "/": "org-8-bargain-bean-mart.html" },
  foghornroastery: { "/": "org-9-foghorn-roastery.html" },
  penninegroup: { "/kiosk": "org-10-pennine-kiosk.html", "/bakehouse": "org-11-pennine-bakehouse.html" },
};

export function pageFor(host, path) {
  const label = String(host || "").toLowerCase().split(":")[0].split(".")[0];
  const clean = String(path || "/").split("?")[0].replace(/\/+$/, "") || "/";
  return SHOPS[label]?.[clean] || null;
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }
  const file = req.method === "GET" ? pageFor(req.headers.host, req.url) : null;
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex",
    "Cache-Control": "no-store",
  });
  res.end(readFileSync(join(DIR, file)));
});

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()))
  server.listen(Number(process.env.PORT || 8080), "0.0.0.0", () => console.log("shops listening"));

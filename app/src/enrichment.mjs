import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";
import http from "node:http";
import { connected, list, requireKeys } from "./config.mjs";
import { warmPath } from "./domain.mjs";
export function publicIP(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || b === 2)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }
  if (isIP(ip) === 6) {
    const n = ip.toLowerCase();
    return (
      /^[23][0-9a-f]{3}:/.test(n) &&
      !n.startsWith("2001:db8:") &&
      !n.startsWith("2001:0:") &&
      !n.startsWith("2002:")
    );
  }
  return false;
}
export async function fetchWebsite(
  url,
  allow,
  { resolve = lookup, request } = {},
) {
  for (let redirects = 0; redirects <= 4; redirects++) {
    const u = new URL(url);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      (u.port && !["80", "443"].includes(u.port)) ||
      !allow.includes(u.hostname.toLowerCase())
    )
      throw Error("Website URL is not owner allowlisted");
    const addresses = await resolve(u.hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !publicIP(a.address)))
      throw Error("Website resolves to a private or reserved address");
    const pinned = addresses[0];
    const result = await new Promise((done, reject) => {
      const req = (
        request || (u.protocol === "https:" ? https.request : http.request)
      )(
        u,
        {
          headers: {
            Accept: "text/html,text/plain",
            "User-Agent": "Followthrough/0.1",
          },
          lookup: (_host, opts, cb) =>
            opts.all
              ? cb(null, [pinned])
              : cb(null, pinned.address, pinned.family),
          timeout: 15000,
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            res.resume();
            return done({ redirect: res.headers.location });
          }
          if (
            res.statusCode !== 200 ||
            !/^(text\/html|text\/plain)/.test(res.headers["content-type"] || "")
          ) {
            res.resume();
            return reject(Error("Website response type or status rejected"));
          }
          let size = 0;
          const chunks = [];
          res.on("data", (chunk) => {
            size += chunk.length;
            if (size > 1000000) {
              req.destroy();
              reject(Error("Website body limit exceeded"));
            } else chunks.push(chunk);
          });
          res.on("end", () =>
            done({ text: Buffer.concat(chunks).toString("utf8") }),
          );
          res.on("error", () => reject(Error("Website read failed")));
        },
      );
      req.on("timeout", () => req.destroy(Error("Website timeout")));
      req.on("error", () => reject(Error("Website request failed")));
      req.end();
    });
    if (result.redirect) {
      url = new URL(result.redirect, u).href;
      continue;
    }
    return {
      url: u.href,
      text: result.text
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&pound;/g, "£")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim(),
    };
  }
  throw Error("Website redirect limit exceeded");
}
// The model sees a focused slice of each page: sentences that mention a price,
// a 250g bag or India first, then the rest, capped so one lead costs a few
// thousand tokens instead of a quarter of a million. Quotes are still checked
// against the full page text.
export function focus(text, limit = 20000) {
  if (text.length <= limit) return text;
  // A period inside a number (£11.50) is not a sentence end.
  const sentences = text.match(/(?:[^.!?]|\.(?=\d))+[.!?]*\s*/g) || [text];
  const key = /£|GBP|\b250\s*g\b|\bindia/i;
  const picked = [];
  let size = 0;
  for (const pass of [true, false])
    for (const sentence of sentences) {
      if (key.test(sentence) !== pass) continue;
      if (size + sentence.length > limit) {
        if (pass) continue;
        break;
      }
      picked.push(sentence);
      size += sentence.length;
    }
  return picked.join("").trim();
}
export function qualificationFacts(r, pages) {
  function evidence(f) {
    return (
      f &&
      typeof f.url === "string" &&
      typeof f.quote === "string" &&
      f.quote.length > 0 &&
      pages.some((p) => p.url === f.url && p.text.includes(f.quote))
    );
  }
  if (
    !Number.isFinite(r.price) ||
    r.price <= 0 ||
    !evidence(r.sources?.price) ||
    !/250\s*g/i.test(r.sources.price.quote)
  )
    throw Error("Qualification price lacks exact 250g shop evidence");
  const prices = [
    ...r.sources.price.quote.matchAll(/(?:£|GBP\s*)(\d+(?:\.\d{1,2})?)/g),
  ].map((m) => Number(m[1]));
  if (!prices.includes(r.price))
    throw Error("Qualification price is not in source quote");
  if (r.price < 8)
    return {
      price: r.price,
      tier: "below bar",
      sells_indian: null,
      sources: { price: r.sources.price },
    };
  if (
    typeof r.sells_indian !== "boolean" ||
    !evidence(r.sources?.sells_indian) ||
    !/\b(india|indian)\b/i.test(r.sources.sells_indian.quote)
  )
    throw Error("Qualification Indian-coffee fact lacks explicit source");
  if (
    r.sells_indian === false &&
    !/\b(no|not|do not|don't|none|without)\b/i.test(
      r.sources.sells_indian.quote,
    )
  )
    throw Error("Qualification negative fact lacks explicit evidence");
  return {
    price: r.price,
    tier: r.price < 8 ? "below bar" : r.price <= 12 ? "mid-shelf" : "premium",
    sells_indian: r.sells_indian,
    sources: r.sources,
  };
}
export function installEnrichment(e, website = fetchWebsite) {
  e.qualify = async (id) => {
    connected(e.c);
    const org = e.s.get("orgs", id);
    if (!org) throw Error("Unknown organization");
    const previous = e.s.get("qualifications", id);
    if (previous?.complete) return previous;
    if (e.d.blocked(id)) throw Error("Qualification suppressed");
    let cached = e.s.get("enrichment_sources", id);
    if (!cached) {
      cached = {
        pages: [await website(org.website, list(e.c.ENRICHMENT_ALLOWED_HOSTS))],
      };
      e.s.put("enrichment_sources", id, cached);
    }
    const pages = [...cached.pages];
    let instagramComplete = !org.instagram;
    if (org.instagram && !cached.instagramComplete) {
      requireKeys(e.c, [
        "INSTAGRAM_USER_ID",
        "INSTAGRAM_ACCESS_TOKEN",
        "GRAPH_API_VERSION",
      ]);
      const username = new URL(org.instagram).pathname
        .split("/")
        .filter(Boolean)[0];
      if (!/^[a-zA-Z0-9_.]+$/.test(username))
        throw Error("Invalid Instagram username");
      const u = new URL(
        `https://graph.facebook.com/${e.c.GRAPH_API_VERSION}/${e.c.INSTAGRAM_USER_ID}`,
      );
      u.searchParams.set(
        "fields",
        `business_discovery.username(${username}){username,biography,website,media.limit(10){caption,permalink}}`,
      );
      const response = await e.p.fetch(u, {
        headers: { Authorization: `Bearer ${e.c.INSTAGRAM_ACCESS_TOKEN}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw Error("Qualification Instagram access unavailable");
      const result = await response.json(),
        profile = result.business_discovery;
      if (!profile) throw Error("Qualification Instagram access incomplete");
      pages.push({ url: org.instagram, text: profile.biography || "" });
      for (const post of profile.media?.data || [])
        if (post.permalink && post.caption)
          pages.push({ url: post.permalink, text: post.caption });
      instagramComplete = true;
      e.s.put("enrichment_sources", id, { pages, instagramComplete: true });
    }
    if (cached.instagramComplete) instagramComplete = true;
    const r = await e.p.model(
      "Extract only source-supported facts. JSON {price:number|null,sells_indian:boolean|null,sources:{price:{url:string,quote:string},sells_indian:{url:string,quote:string}}}. Price must be GBP for 250g from the shop page. Indian status false needs explicit negative wording, not absence. Quotes must be exact.",
      {
        organization: org.name,
        pages: pages.map((p) => ({ url: p.url, text: focus(p.text) })),
      },
      { maxTokens: 500 },
    );
    const facts = qualificationFacts(r, pages);
    if (facts.sources.price.url !== pages[0].url)
      throw Error("Qualification price must come from the lead shop");
    const q = {
      org_id: id,
      ...facts,
      path: warmPath(id, e.d.orgs(), e.d.data.edges),
      complete: instagramComplete,
      checked_at: new Date().toISOString(),
    };
    e.s.put("qualifications", id, q);
    if (q.tier === "below bar") {
      for (const l of e.s
        .all("loops")
        .filter((l) => l.org_id === id && l.status === "open"))
        e.d.close(l.id, "below bar");
      q.complete = true;
    }
    e.s.audit("qualified", { org_id: id, tier: q.tier, sources: q.sources });
    return q;
  };
  e.introduction = async (loop) => {
    const path = warmPath(loop.org_id, e.d.orgs(), e.d.data.edges);
    if (path.length < 2) return null;
    const introducer = e.s.get("orgs", path.at(-1)),
      lead = e.s.get("orgs", loop.org_id),
      person = e.d.data.people.find((p) => p.org === introducer.id);
    if (!person || e.d.blocked(introducer.id)) return null;
    const key = `intro:${loop.id}:${introducer.id}`;
    const existing = e.s
      .all("actions")
      .find((a) => a.payload.intro_key === key && a.status === "pending");
    if (existing) return existing;
    if (e.s.all("actions").some((a) => a.payload.intro_key === key))
      return null;
    const sentence = path.map((id) => e.s.get("orgs", id).name).join(" — ");
    return e.s.action(
      "message",
      {
        channel: person.email ? "email" : "whatsapp",
        to: person.email || person.whatsapp,
        org_id: introducer.id,
        subject: `Introduction to ${lead.name}`,
        text: `Hello ${introducer.name}, our recorded connection is ${sentence}. Would you be comfortable helping with an introduction to ${lead.name}?`,
        intro_key: key,
        path,
        source: "synthetic network",
      },
      null,
    );
  };
}

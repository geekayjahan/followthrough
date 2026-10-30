import { randomUUID } from "node:crypto";
export function london(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
// Demo clock: DEMO_AGE_DAYS shifts the clock used for cold/due checks only.
// Timestamps written to loops, actions and the audit log stay real.
export function demoNow(c = {}, now = new Date()) {
  const days = Number(c.DEMO_AGE_DAYS);
  return Number.isFinite(days) && days > 0
    ? new Date(now.getTime() + days * 86400000)
    : now;
}
export function dayNumber(t) {
  return Date.parse(london(new Date(t)).date) / 86400000;
}
export function calendarDue(timestamp, days = 3, time = "00:00") {
  const date = new Date((dayNumber(timestamp) + days) * 86400000)
    .toISOString()
    .slice(0, 10);
  const target = Date.parse(`${date}T${time}:00Z`);
  // London offset is 0 or +1 hour. Test both rather than assuming DST dates.
  for (const value of [target, target - 3600000]) {
    const local = london(new Date(value));
    if (local.date === date && local.time === time)
      return new Date(value).toISOString();
  }
  return new Date(target).toISOString();
}
export function due(loop, now = new Date()) {
  if (loop.status !== "open") return false;
  if (loop.type === "invoice") return london(now).date > loop.invoice_due;
  if (loop.type === "lot_low") return true;
  if (loop.type === "stall")
    return (
      london(now).date > loop.stall_date ||
      (london(now).date === loop.stall_date && london(now).time >= "21:00")
    );
  return dayNumber(now) - dayNumber(loop.last_touch) >= 3;
}
// Pinned: Stage. One sequence per counterpart type; the next move is the stage after the last completed one.
export const SEQUENCES = {
  roaster: [
    "Researched",
    "Queued",
    "Sent",
    "Replied",
    "Price aligned",
    "Sample sent",
    "Sample delivered",
    "Feedback",
    "Booked",
    "Deposit paid",
    "Delivered",
    "Paid",
    "Repeat",
  ],
  cafe: ["intro", "sample", "guest slot offer", "first order", "second slot"],
  stockist: ["intro", "retail samples", "wholesale list", "first case", "reorder"],
};
// Where a loop of this type starts in its counterpart's sequence.
const ENTRY = {
  roaster: { lead: "Researched", sample_out: "Sample sent", quote: "Price aligned", order_unconfirmed: "Booked", order_to_ship: "Deposit paid" },
  cafe: { lead: "intro", sample_out: "sample", quote: "guest slot offer", order_unconfirmed: "first order", order_to_ship: "first order" },
  stockist: { lead: "intro", sample_out: "retail samples", quote: "wholesale list", order_unconfirmed: "first case", order_to_ship: "first case" },
};
export function sequenceFor(orgType, sequences = SEQUENCES) {
  return sequences[orgType] || null;
}
export function entryStage(loopType, orgType) {
  return ENTRY[orgType]?.[loopType] || null;
}
export function nextStage(stage, orgType, sequences = SEQUENCES) {
  const seq = sequenceFor(orgType, sequences);
  if (!seq || !stage) return null;
  const i = seq.indexOf(stage);
  return i < 0 ? null : seq[i + 1] || null;
}
export function domain(org) {
  try {
    const h = new URL(org.website).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");
    return [
      "gmail.com",
      "outlook.com",
      "hotmail.com",
      "yahoo.com",
      "example.test",
    ].includes(h)
      ? null
      : h;
  } catch {
    return null;
  }
}
export function warmPath(id, orgs, edges) {
  let queue = [[id]];
  while (queue.length) {
    const path = queue.shift();
    const last = path.at(-1);
    const o = orgs.find((x) => x.id === last);
    if (
      path.length > 1 &&
      (o?.status === "customer" || ["supplier", "stockist"].includes(o?.type))
    )
      return path;
    if (path.length === 3) continue;
    for (const e of edges) {
      const next = e.from === last ? e.to : e.to === last ? e.from : null;
      if (next && !path.includes(next)) queue.push([...path, next]);
    }
  }
  return [];
}
export function replyClass(text) {
  if (
    /\b(?:don't|do not) stop (?:contacting|messaging|emailing|calling)\b/i.test(
      text,
    )
  )
    return "reply";
  if (
    /^\s*stop[.!]?\s*$/i.test(text) ||
    /\b(unsubscribe|never (?:buy|order)|stop (?:contacting|messaging|emailing|calling|sending)|do not (?:contact|message|email|call)|don't (?:contact|message|email|call)|remove me (?:from|off))\b/i.test(
      text,
    )
  )
    return "declined";
  if (
    /\b(not now|maybe later|maybe next (?:week|month|quarter|year)|(?:no|not interested|can't|cannot|unable)\b.{0,60}\b(?:for now|later|next (?:week|month|quarter|year))|not\b.{0,30}\buntil)\b/i.test(
      text,
    )
  )
    return "soft_no";
  return "reply";
}
export function affirmative(text) {
  return /^(yes|yes[, ]+send it|yes[, ]+please send)[.!\s]*$/i.test(
    text.trim(),
  );
}
export class Domain {
  constructor(store, data) {
    this.s = store;
    this.data = data;
    if (!store.get("meta", "initialized")) {
      for (const o of data.orgs) store.put("orgs", o.id, o);
      for (const l of data.lots) store.put("lots", l.id, l);
      for (const o of data.orgs)
        if (o.status === "lead")
          this.loop("lead", o.id, `lead:${o.id}`, {
            next_move: "Qualify before drafting",
          });
      for (const o of data.orders)
        if (o.status !== "shipped")
          this.loop(
            o.status === "unconfirmed" ? "order_unconfirmed" : "order_to_ship",
            o.org,
            `order:${o.id}`,
            { order_id: o.id },
          );
      for (const day of data.stall_days)
        if (!day.cashed_up)
          this.loop("stall", null, `stall:${day.date}`, {
            stall_date: day.date,
          });
      store.put("meta", "initialized", { at: new Date().toISOString() });
    }
    for (const o of this.orgs())
      if (o.status === "declined") this.suppress(o.id);
  }
  orgs() {
    return this.s.all("orgs");
  }
  loop(type, org_id, key, extra = {}) {
    const existing = this.s.all("loops").find((l) => l.key === key);
    if (existing) return existing;
    const now = new Date().toISOString();
    const org = org_id ? this.s.get("orgs", org_id) : null;
    const l = {
      id: randomUUID(),
      key,
      type,
      org_id,
      status: "open",
      last_touch: now,
      due_at: calendarDue(now),
      next_move: "Review next move",
      stage: entryStage(type, org?.type),
      chases: 0,
      ...(type.startsWith("order") ? { reserved_kg: 0 } : {}),
      ...extra,
    };
    if (type === "invoice")
      l.due_at = calendarDue(`${l.invoice_due}T12:00:00Z`, 1);
    if (type === "lot_low") l.due_at = now;
    if (type === "stall")
      l.due_at = calendarDue(`${l.stall_date}T12:00:00Z`, 0, "21:00");
    this.s.put("loops", l.id, l);
    this.s.audit("loop_open", {
      loop_id: l.id,
      loop_type: type,
      org_id,
      source: extra.source || "synthetic",
    });
    return l;
  }
  blocked(org_id) {
    const o = this.s.get("orgs", org_id);
    return (
      o?.status === "declined" ||
      (domain(o) && this.s.get("suppression", domain(o)))
    );
  }
  suppress(org_id) {
    const org = this.s.get("orgs", org_id);
    if (!org) return;
    const d = domain(org);
    if (d) this.s.put("suppression", d, { domain: d, org_id });
    for (const o of this.orgs())
      if (o.id === org_id || (d && domain(o) === d)) {
        o.status = "declined";
        this.s.put("orgs", o.id, o);
        for (const l of this.s
          .all("loops")
          .filter((l) => l.org_id === o.id && l.status === "open"))
          this.close(l.id, "declined");
      }
    this.s.audit("suppressed", { org_id, domain: d });
  }
  revoke(loop_id, reason) {
    for (const a of this.s.all("actions"))
      if (a.loop_id === loop_id && a.status === "pending") {
        a.status = "revoked";
        a.reason = reason;
        this.s.put("actions", a.id, a);
        this.s.audit("revoked", { action_id: a.id, loop_id, reason });
      }
  }
  // A counterpart touch resets the unanswered-chase count; an approved send adds to it.
  touch(id, source) {
    const l = this.s.get("loops", id);
    if (!l) return;
    l.last_touch = new Date().toISOString();
    l.due_at = calendarDue(l.last_touch);
    l.chases = source === "approved send" ? (l.chases || 0) + 1 : 0;
    this.s.put("loops", id, l);
    this.revoke(id, "new touch");
    this.s.audit("touch", { loop_id: id, source });
  }
  // The thread on a loop: the last messages either way, read by drafts and capture.
  appendThread(loop_id, message) {
    const t = this.s.get("threads", loop_id) || { loop_id, messages: [] };
    t.messages.push({ at: new Date().toISOString(), ...message });
    t.messages = t.messages.slice(-10);
    this.s.put("threads", loop_id, t);
    return t;
  }
  thread(loop_id, limit = 3) {
    return (this.s.get("threads", loop_id)?.messages || []).slice(-limit);
  }
  // The key intake() would give this item, so capture can tell a duplicate before opening anything.
  loopKey(record, source, event_id) {
    return record.reference
      ? `business:${record.org_id}:${record.reference}`
      : `${source}:${record.org_id}:${event_id}`;
  }
  // Pinned: Stage. Complete the loop's current stage (or a named one) and move to the next.
  complete(id, stage = null, source = "owner") {
    const l = this.s.get("loops", id);
    if (!l) return null;
    const org = l.org_id ? this.s.get("orgs", l.org_id) : null;
    const seq = sequenceFor(org?.type, this.data.sequences);
    if (!seq) return l;
    const done = stage || l.stage;
    if (!seq.includes(done)) throw Error(`Unknown stage ${done} for ${org.type}`);
    const from = l.stage;
    l.stage = nextStage(done, org.type, this.data.sequences) || done;
    l.stage_completed = done;
    this.s.put("loops", id, l);
    this.s.audit("stage", { loop_id: id, from, completed: done, to: l.stage, source });
    return l;
  }
  close(id, reason) {
    const l = this.s.get("loops", id);
    if (!l) return;
    l.status = "closed";
    l.reason = reason;
    l.closed_at = new Date().toISOString();
    this.s.put("loops", id, l);
    this.revoke(id, reason);
    this.s.audit("loop_close", { loop_id: id, reason });
  }
  receive(org_id, text, source, event_id, loop_id) {
    if (!this.s.get("orgs", org_id))
      throw Error("Unknown synthetic organization");
    if (this.blocked(org_id)) {
      this.s.audit("suppressed", { org_id, source });
      return;
    }
    const classification = replyClass(text);
    if (classification === "declined") {
      this.suppress(org_id);
      return;
    }
    const loops = this.s
      .all("loops")
      .filter((loop) => loop.org_id === org_id && loop.status === "open");
    const selected = loop_id
      ? loops.find((loop) => loop.id === loop_id)
      : loops.length === 1
        ? loops[0]
        : null;
    if (!selected) {
      this.s.audit("ask", { org_id, event_id, reason: "ambiguous_reply_loop" });
      // Hold drafts for the org until the reply can be linked, but never close unrelated loops.
      for (const loop of loops)
        this.revoke(loop.id, "unresolved inbound reply");
      this.s.put("reply_holds", org_id, {
        event_id,
        at: new Date().toISOString(),
      });
      return;
    }
    this.s.del("reply_holds", org_id);
    if (classification === "soft_no") this.close(selected.id, "human reply");
    else this.touch(selected.id, source);
    this.s.audit("reply", {
      org_id,
      loop_id: selected.id,
      source,
      event_id,
      classification,
    });
  }
  intake(record, source, event_id) {
    const types = [
      "lead",
      "sample_out",
      "quote",
      "order_unconfirmed",
      "order_to_ship",
    ];
    if (!types.includes(record.type) || !this.s.get("orgs", record.org_id))
      throw Error("Invalid classified loop");
    if (this.blocked(record.org_id)) return null;
    const key = this.loopKey(record, source, event_id);
    const existing = this.s.all("loops").find((loop) => loop.key === key);
    if (existing && existing.status === "open") {
      if (
        record.type === "order_to_ship" &&
        existing.type === "order_unconfirmed"
      )
        existing.type = "order_to_ship";
      existing.channel = source;
      this.s.put("loops", existing.id, existing);
      this.touch(existing.id, source);
      return this.s.get("loops", existing.id);
    }
    return this.loop(record.type, record.org_id, key, {
      source,
      channel: source,
      next_move: record.next_move || "Review next move",
    });
  }
  ship(loop_id) {
    const l = this.s.get("loops", loop_id);
    if (l?.type !== "order_to_ship")
      throw Error("Loop is not awaiting shipment");
    this.close(loop_id, "shipped");
  }
  cold(now = new Date()) {
    const orgs = this.orgs();
    return this.s
      .all("loops")
      .filter((l) => due(l, now) && !this.blocked(l.org_id))
      .sort((a, b) => {
        const ap = warmPath(a.org_id, orgs, this.data.edges),
          bp = warmPath(b.org_id, orgs, this.data.edges);
        return (
          (ap.length || 99) - (bp.length || 99) ||
          a.last_touch.localeCompare(b.last_touch)
        );
      });
  }
}

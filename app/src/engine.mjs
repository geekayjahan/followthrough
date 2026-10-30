import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { hash } from "./store.mjs";
import { connected, recipient, list, safeError, ROOT } from "./config.mjs";
import { london, warmPath, affirmative, demoNow, nextStage, weekday, cadence, dayNumber, unsentDocuments, daysUntil } from "./domain.mjs";
import { loadTerms, checkDraft } from "./terms.mjs";
// Pinned: Voice file. Signed off when the first line reads "signed-off: <date> <name>".
export function readVoiceFile(path) {
  if (!path || !existsSync(path)) return { ok: false, reason: "voice file missing", text: "" };
  const text = readFileSync(path, "utf8");
  const first = text.split(/\r?\n/)[0].trim();
  const m = first.match(/^signed-off:\s*(\d{4}-\d{2}-\d{2}|\d{1,2} \w+ \d{4})\s+(\S.*)$/);
  if (!m) return { ok: false, reason: "voice file needs a signed-off first line", text: "" };
  return { ok: true, signed_off: { date: m[1], by: m[2].trim() }, text };
}
// "Friday 30 October" from an ISO date, the way the owner writes closing dates.
export function longDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });
}
// A coffee counterpart: a roaster, café, stockist or supplier (market organisers are not).
export const isCoffee = (org) => ["roaster", "cafe", "stockist", "supplier"].includes(org?.type) || org?.coffee === true;
export class Engine {
  constructor(store, domain, providers, c) {
    this.s = store;
    this.d = domain;
    this.p = providers;
    this.c = c;
    this.voicePath = c.VOICE_FILE || resolve(ROOT, "data/voice.md");
    this.termsPath = c.TERMS_FILE || resolve(ROOT, "data/terms.md");
    this.calendarPath = c.CALENDAR_FILE || resolve(ROOT, "data/calendar.json");
    // Pinned: Cadence. The owner's day counts come from terms.md, not from code.
    const t = this.terms();
    if (t.ok && domain) domain.cadence = { ...domain.cadence, ...t.cadence };
  }
  // The owner's calendar export: stall days, and shipments with closing dates when present.
  calendar() {
    try {
      return existsSync(this.calendarPath) ? JSON.parse(readFileSync(this.calendarPath, "utf8")) : {};
    } catch {
      return {};
    }
  }
  // Stall days and compliance dates from the owner's calendar export become loops with their own clocks
  // (workflows A8, I1, K10; evals W4, F22, E7). Same keys as the synthetic stall days, so nothing doubles.
  syncCalendar() {
    const cal = this.calendar();
    const orgByName = (name) => this.d.orgs().find((o) => name && o.name.toLowerCase() === String(name).toLowerCase())?.id || null;
    for (const day of cal.stall_days || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date || "") || ["cancelled", "waitlist", "possible"].includes(day.status)) continue;
      const key = `stall:${day.date}`;
      const fields = {
        market: day.market || null,
        documents: Array.isArray(day.documents) ? day.documents : undefined,
        transport_confirmed: typeof day.transport_confirmed === "boolean" ? day.transport_confirmed : undefined,
      };
      // A document the app has already sent stays sent whatever the export says.
      const merge = (loop) => {
        if (!fields.documents) return;
        fields.documents = fields.documents.map((d) => ({ ...d, sent: Boolean(d.sent) || (loop?.documents || []).some((x) => x.name === d.name && x.sent === true) }));
      };
      let loop = this.s.all("loops").find((l) => l.key === key);
      if (!loop) {
        if (day.cashed_up) continue;
        loop = this.d.loop("stall", orgByName(day.market), key, { stall_date: day.date, source: "calendar", ...fields });
      } else if (loop.status === "open") {
        merge(loop);
        for (const [k, v] of Object.entries(fields)) if (v !== undefined) loop[k] = v;
        if (!loop.org_id) loop.org_id = orgByName(day.market);
        this.s.put("loops", loop.id, loop);
      }
    }
    for (const c of cal.compliance || []) {
      if (!c.id || !/^\d{4}-\d{2}-\d{2}$/.test(c.due || "")) continue;
      const key = `compliance:${c.id}`;
      const loop = this.s.all("loops").find((l) => l.key === key);
      if (c.done) {
        if (loop && loop.status === "open") this.d.close(loop.id, "done");
        continue;
      }
      if (!loop) this.d.loop("compliance", null, key, { due_date: c.due, what: c.what || c.id, source: "calendar", next_move: `${c.what || c.id} due ${c.due}` });
    }
  }
  // The next shipment closing date within `days` of now, named in every chase near it (terms.md).
  closingDate(now = new Date(), days = 10) {
    const soon = (this.calendar().shipments || [])
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.closing_date || ""))
      .map((s) => ({ ...s, delta: dayNumber(`${s.closing_date}T12:00:00Z`) - dayNumber(now) }))
      .filter((s) => s.delta >= 0 && s.delta <= days)
      .sort((a, b) => a.delta - b.delta);
    return soon[0] || null;
  }
  terms() {
    return loadTerms(this.termsPath);
  }
  // The From address for an email: the coffee alias for coffee counterparts, logged when it differs from the default.
  mailFrom(coffee, loop_id) {
    const base = this.c.ZOHO_MAIL_FROM || null;
    const alias = this.c.MAIL_FROM_COFFEE || null;
    if (coffee && alias && alias !== base) {
      this.s.audit("alias_fixed", { loop_id, from: base, to: alias, reason: "coffee counterpart" });
      return alias;
    }
    return base;
  }
  voice() {
    return readVoiceFile(this.voicePath);
  }
  async draft(loop) {
    const pending = this.s
      .all("actions")
      .find((a) => a.loop_id === loop.id && a.status === "pending");
    if (pending) return pending;
    if (
      loop.status !== "open" ||
      this.d.blocked(loop.org_id) ||
      this.s.get("reply_holds", loop.org_id)
    )
      return null;
    const org = this.s.get("orgs", loop.org_id),
      person = this.d.data.people.find((p) => p.org === loop.org_id);
    if (!person) return null;
    if (
      org?.status === "lead" &&
      !this.s.get("qualifications", org.id)?.complete
    ) {
      if (this.qualify) await this.qualify(org.id);
      else return null;
    }
    if (this.s.get("loops", loop.id)?.status !== "open") return null;
    const voice = this.voice();
    if (!voice.ok) {
      this.s.audit("draft_blocked", { loop_id: loop.id, reason: "voice_file_unsigned", detail: voice.reason });
      return null;
    }
    const path = warmPath(org.id, this.d.orgs(), this.d.data.edges);
    const names = path.map((id) => this.s.get("orgs", id)?.name);
    const thread = this.d.thread(loop.id, 6);
    const lastAsk = [...thread].reverse().find((m) => m.from === "counterpart")?.text || null;
    const rule = cadence(loop, this.d.cadence);
    const closing = this.closingDate(demoNow(this.c));
    const closingText = closing ? longDate(closing.closing_date) : null;
    const r = await this.p.model(
      "Write the owner's next message to this counterpart in the owner's own voice: use the voice file's samples as examples and obey its rules. Answer what the counterpart last asked, then stop; as long as the moment needs and no longer. JSON {text:string,subject:string}. Every figure, date, organisation and commitment must come from the loop, the thread, the lot or the warm path; keep a [placeholder] for any fact you do not have. Name the shared connection when supplied. Never name another buyer or roaster.",
      {
        voice_file: voice.text,
        loop: { type: loop.type, stage: loop.stage, next_stage: nextStage(loop.stage, org.type), next_move: loop.next_move, last_touch: loop.last_touch, invoice_number: loop.invoice_number, amount: loop.amount, invoice_due: loop.invoice_due, kg: loop.kg, reserved_kg: loop.reserved_kg, lot: loop.lot_id ? this.s.get("lots", loop.lot_id)?.name : null, chases: loop.chases, supplier_shortfall: loop.shortfall || null, stall_date: loop.stall_date || null, market: loop.market || null, documents_to_send: loop.type === "stall" ? unsentDocuments(loop) : null },
        organization: org.name,
        counterpart_name: person.name || null,
        thread,
        counterpart_last_asked: lastAsk,
        path: names,
        cadence: rule.rule,
        shipment_closing_date: closingText ? { date: closingText, note: "Name this closing date in the message." } : null,
      },
      { maxTokens: 900, voice_file: true },
    );
    if (
      typeof r.text !== "string" ||
      !r.text.trim() ||
      r.text.length > 4000 ||
      typeof r.subject !== "string"
    )
      throw Error("Model draft schema invalid");
    if (names.length > 1 && !r.text.includes(names[1]))
      throw Error("Model draft omitted sourced shared connection");
    if (
      loop.type === "invoice" &&
      (!r.text.includes(loop.invoice_number) ||
        !r.text.includes(String(loop.amount)))
    )
      throw Error("Model invoice draft omitted invoice number or amount");
    // A chase near a shipment names the closing date, in the owner's own sentence when the model left it out.
    if (closingText && !r.text.includes(closingText))
      r.text = r.text.replace(/\n\s*(Thank you\.?|Best)\s*$|$/m, `\n\nI'm closing orders for the next shipment on ${closingText}.$&`).replace(/\n{3,}/g, "\n\n");
    // Pinned: Price list, Offer ladder. A placeholder, an off-list price or a forbidden offer never reaches a card.
    const blocked = checkDraft(r.text, this.terms());
    if (blocked) {
      this.s.audit("draft_blocked", { loop_id: loop.id, reason: blocked.reason, detail: blocked.detail });
      this.s.audit("ask", { loop_id: loop.id, reason: "draft_blocked", ask: `${org.name}: ${blocked.detail}. Tell me the number or the line to use.` });
      this.s.put("draft_holds", loop.id, { loop_id: loop.id, reason: blocked.reason, detail: blocked.detail, at: new Date().toISOString() });
      return null;
    }
    this.s.del("draft_holds", loop.id);
    const channel =
        loop.channel === "whatsapp" || person.preferred_channel === "whatsapp"
          ? "whatsapp"
          : "email",
      to = channel === "whatsapp" ? person.whatsapp : person.email;
    if (!to) throw Error("Missing counterpart channel mapping");
    let template = null;
    if (
      channel === "whatsapp" &&
      !(Date.now() - Date.parse(this.s.get("windows", to)?.at) < 86400000)
    )
      template = await this.p.template(
        this.c.WHATSAPP_FOLLOWUP_TEMPLATE,
        r.text,
      );
    // Pinned: Coffee alias. Email to a coffee counterpart always leaves from MAIL_FROM_COFFEE.
    const coffee = isCoffee(org);
    const from = channel === "email" ? this.mailFrom(coffee, loop.id) : null;
    return this.s.action(
      "message",
      {
        channel,
        to,
        ...(from ? { from, coffee } : {}),
        text: template?.text || r.text,
        template,
        subject: `${r.subject} [FT:${loop.id}]`,
        org_id: org.id,
        source: "configured model",
        path,
      },
      loop.id,
      { cadence: rule.rule, cadence_days: rule.days, closing_date: closing?.closing_date || null },
    );
  }
  validateAction(id, input) {
    const a = this.s.get("actions", id);
    if (
      !a ||
      a.status !== "pending" ||
      a.version !== input.version ||
      a.hash !== input.hash ||
      hash(a.payload) !== a.hash
    )
      throw Error("Action changed, already handled, or no longer available");
    if (a.payload.org_id && this.d.blocked(a.payload.org_id))
      throw Error("Action suppressed for organization");
    if (a.payload.org_id && this.s.get("reply_holds", a.payload.org_id))
      throw Error("Action held until ambiguous inbound reply is linked");
    if (a.loop_id) {
      const loop = this.s.get("loops", a.loop_id);
      if (!loop || loop.status !== "open") throw Error("Loop is closed");
      if (this.d.blocked(loop.org_id))
        throw Error("Action suppressed for organization");
    }
    return a;
  }
  async edit(id, input) {
    const a = this.validateAction(id, input);
    if (
      a.kind !== "message" ||
      typeof input.text !== "string" ||
      !input.text.trim() ||
      input.text.length > 4000
    )
      throw Error("Invalid message edit");
    let template = a.payload.template;
    if (template) {
      const [before, after] = template.body.split("{{1}}");
      const suffix = after + (template.footer ? `\n${template.footer}` : "");
      if (!input.text.startsWith(before) || !input.text.endsWith(suffix))
        throw Error(
          "Action template wrapper is fixed; edit only the message inside it",
        );
      const parameter = input.text.slice(
        before.length,
        suffix.length ? -suffix.length : undefined,
      );
      template = await this.p.template(template.name, parameter);
      if (template.text !== input.text)
        throw Error("Action template changed; refresh before editing");
    }
    this.validateAction(id, input);
    a.payload = {
      ...a.payload,
      text: input.text,
      ...(template ? { template } : {}),
    };
    a.version++;
    a.hash = hash(a.payload);
    a.edited_at = new Date().toISOString();
    this.s.put("actions", id, a);
    this.s.audit("edit", { action_id: id, version: a.version, hash: a.hash });
    return a;
  }
  drop(id, input) {
    const a = this.validateAction(id, input);
    a.status = "dropped";
    this.s.put("actions", id, a);
    if (a.loop_id) this.d.close(a.loop_id, "owner dropped");
    this.s.audit("drop", { action_id: id, loop_id: a.loop_id });
    return a;
  }
  async preflight(a) {
    connected(this.c);
    if (this.p.preflight) this.p.preflight(a.kind, a.payload);
    if (a.kind === "message") {
      recipient(this.c, a.payload.channel, a.payload.to);
      if (a.payload.channel === "whatsapp") {
        if (a.payload.template) await this.p.verifyTemplate(a.payload.template);
        else if (
          !(
            Date.now() - Date.parse(this.s.get("windows", a.payload.to)?.at) <
            86400000
          )
        )
          throw Error(
            "Action messaging window expired; regenerate using an approved template",
          );
      }
      const loop = this.s.get("loops", a.loop_id);
      if (loop?.type === "invoice") {
        const invoice = await this.p.invoice(loop.books_invoice_id);
        if (
          invoice.balance === null ||
          invoice.balance === undefined ||
          !Number.isFinite(Number(invoice.balance))
        )
          throw Error("Invalid invoice balance");
        if (invoice.status === "paid" || Number(invoice.balance) === 0) {
          this.d.close(loop.id, "paid");
          throw Error("Loop invoice already paid");
        }
        if (Number(invoice.balance) !== loop.amount)
          throw Error(
            "Action invoice balance changed; sync Books and review a fresh draft",
          );
      }
    }
    if (a.kind === "sale") this.validateSale(a.payload);
  }
  // Pinned: Held. Minutes between approval and send; DEMO_SEND_DELAY_MINUTES=0 removes the hold and is logged on every send.
  sendDelay() {
    const n = Number(this.c.DEMO_SEND_DELAY_MINUTES);
    return Number.isFinite(n) && n >= 0 ? n : 60;
  }
  async approve(id, input, source = "owner UI") {
    const a = this.validateAction(id, input);
    await this.preflight(a);
    if (a.kind === "message") return this.hold(id, input, source);
    return this.execute(id, input, source);
  }
  // A customer message is held, not sent: the owner can undo it until send_at.
  hold(id, input, source) {
    const delay = this.sendDelay();
    const a = this.s.tx(() => {
      const current = this.validateAction(id, input);
      current.status = "held";
      current.approved_at = new Date().toISOString();
      current.approval_source = source;
      current.send_at = new Date(Date.parse(current.approved_at) + delay * 60000).toISOString();
      this.s.put("actions", id, current);
      return current;
    });
    this.s.audit("approve", { action_id: id, loop_id: a.loop_id, hash: a.hash, version: a.version, source });
    this.s.audit("held", { action_id: id, loop_id: a.loop_id, send_at: a.send_at, demo_delay: delay });
    return delay === 0 ? this.release(id) : a;
  }
  // Undo during the hold: the message never sends and the loop is untouched.
  undo(id, input = null, source = "owner UI") {
    const a = this.s.get("actions", id);
    if (!a || a.status !== "held") throw Error("Action is not held; nothing to undo");
    if (input && (a.version !== input.version || a.hash !== input.hash)) throw Error("Action changed; refresh before undoing");
    a.status = "undone";
    a.undone_at = new Date().toISOString();
    this.s.put("actions", id, a);
    this.s.audit("undone", { action_id: id, loop_id: a.loop_id, source });
    return a;
  }
  // Send every held message whose hold has passed. Called by the tick.
  async releaseDue(now = new Date()) {
    const due = this.s.all("actions").filter((a) => a.status === "held" && Date.parse(a.send_at) <= now.getTime());
    const sent = [];
    for (const a of due) {
      try {
        sent.push(await this.release(a.id));
      } catch {}
    }
    return sent;
  }
  async release(id) {
    const a = this.s.get("actions", id);
    if (!a || a.status !== "held") return a;
    const loop = a.loop_id ? this.s.get("loops", a.loop_id) : null;
    const stale =
      (a.payload.org_id && (this.d.blocked(a.payload.org_id) || this.s.get("reply_holds", a.payload.org_id))) ||
      (loop && loop.status !== "open");
    if (stale) {
      a.status = "revoked";
      a.reason = "loop changed during the hold";
      this.s.put("actions", id, a);
      this.s.audit("revoked", { action_id: id, loop_id: a.loop_id, reason: a.reason });
      return a;
    }
    try {
      await this.preflight(a);
    } catch (error) {
      a.status = "revoked";
      a.reason = safeError(error);
      this.s.put("actions", id, a);
      this.s.audit("revoked", { action_id: id, loop_id: a.loop_id, reason: a.reason });
      throw error;
    }
    return this.execute(id, { version: a.version, hash: a.hash }, a.approval_source, "held");
  }
  async execute(id, input, source = "owner UI", from = "pending") {
    const held = from === "held";
    let a = this.s.tx(() => {
      const current = held ? this.s.get("actions", id) : this.validateAction(id, input);
      if (held && (!current || current.status !== "held" || current.hash !== input.hash)) throw Error("Action changed, already handled, or no longer available");
      if (current.kind === "sale") this.validateSale(current.payload);
      current.status = "executing";
      current.approved_at = current.approved_at || new Date().toISOString();
      current.approval_source = source;
      this.s.put("actions", id, current);
      this.s.put("intents", id, {
        action_id: id,
        hash: current.hash,
        status: "started",
        at: current.approved_at,
      });
      return current;
    });
    if (!held)
      this.s.audit("approve", {
        action_id: id,
        loop_id: a.loop_id,
        hash: a.hash,
        version: a.version,
        source,
      });
    try {
      let receipt;
      if (a.kind === "message")
        receipt =
          a.payload.channel === "email"
            ? await this.p.email(a.payload)
            : await this.p.whatsapp(a.payload.to, a.payload.text, {
                lastInbound: this.s.get("windows", a.payload.to)?.at,
                registeredTemplate: a.payload.template,
              });
      else if (a.kind === "expense")
        receipt = await this.p.expense({ ...a.payload, reference: `FT-${id}` });
      else if (a.kind === "sale")
        receipt = await this.p.sale({ ...a.payload, reference: `FT-${id}` });
      else if (a.kind === "shipment") {
        this.d.ship(a.loop_id);
        receipt = { id: `local-${id}` };
      } else throw Error("Unsupported action kind");
      this.s.tx(() => {
        if (a.kind === "sale") this.commitStock(a, receipt);
        a.status = "completed";
        a.receipt = { id: receipt.id, to: receipt.to };
        a.completed_at = new Date().toISOString();
        this.s.put("actions", id, a);
        this.s.put("intents", id, {
          action_id: id,
          status: "confirmed",
          receipt_id: receipt.id,
        });
      });
      if (a.kind === "message" && a.loop_id) {
        this.s.put("message_bindings", receipt.id, { loop_id: a.loop_id });
        this.d.appendThread(a.loop_id, { from: "owner", source: a.payload.channel, text: a.payload.text });
        // The organiser message carries the stall documents, so they count as sent (workflow K8).
        const loop = this.s.get("loops", a.loop_id);
        if (loop?.type === "stall" && unsentDocuments(loop).length) {
          loop.documents = loop.documents.map((d) => ({ ...d, sent: true, sent_action: d.sent ? d.sent_action : id }));
          this.s.put("loops", loop.id, loop);
        }
      }
      this.s.audit(
        a.kind === "message"
          ? "send"
          : a.kind === "shipment"
            ? "shipment"
            : "books_write",
        {
          action_id: id,
          loop_id: a.loop_id,
          kind: a.kind,
          provider_id: receipt.id,
          recipient: receipt.to,
          ...(a.kind === "message" ? { demo_delay: this.sendDelay(), send_at: a.send_at || null } : {}),
        },
      );
      if (a.kind === "sale")
        this.s.audit("stock_move", {
          action_id: id,
          lot_id: a.payload.lot_id,
          kg: -a.payload.kg,
          provider_id: receipt.id,
        });
      if (a.kind === "sale" && this.refreshStock) this.refreshStock();
      if (a.kind === "sale") {
        const seeded = this.s
          .all("loops")
          .find(
            (l) => l.key === `stall:${a.payload.date}` && l.status === "open",
          );
        if (seeded) this.d.close(seeded.id, "cash-up recorded");
      }
      if (a.loop_id) {
        if (a.kind === "message") this.d.touch(a.loop_id, "approved send");
        else this.d.close(a.loop_id, `${a.kind} recorded`);
      }
      return a;
    } catch (e) {
      // A started external operation is never retried automatically, even for an error response.
      a.status = "needs_reconciliation";
      a.error =
        "Provider outcome requires owner reconciliation before another write";
      this.s.put("actions", id, a);
      this.s.put("intents", id, {
        action_id: id,
        status: "unknown",
        at: new Date().toISOString(),
      });
      this.s.audit("blocked", {
        action_id: id,
        reason: "external_outcome_requires_reconciliation",
      });
      throw e;
    }
  }
  async approvalReply(text, contextId, owner) {
    if (!list(this.c.WHATSAPP_OWNER_NUMBERS).includes(owner))
      throw Error("Approval requires owner");
    const binding = contextId && this.s.get("message_bindings", contextId);
    if (!binding || !affirmative(text)) return false;
    await this.approve(binding.action_id, binding, "owner WhatsApp reply");
    return true;
  }
  // What leaked (spec §7, workflow G10, eval W14): loops that went cold twice in the window. A cold
  // episode starts when a brief lists the loop and ends at the next touch line for it; a second
  // listing after a touch is a second episode. Read from loop_open, touch and brief lines only.
  leaked(now = new Date(), days = 7) {
    const since = new Date(now.getTime() - days * 86400000).toISOString();
    const episodes = new Map(), open = new Map();
    for (const event of this.s.eventsSince(since)) {
      if (event.type === "loop_open") episodes.set(event.loop_id, 0);
      else if (event.type === "brief") {
        for (const id of event.loop_ids || [])
          if (!open.get(id)) {
            open.set(id, true);
            episodes.set(id, (episodes.get(id) || 0) + 1);
          }
      } else if (event.type === "touch" && event.source !== "approved send") open.set(event.loop_id, false);
    }
    const loops = [...episodes].filter(([, n]) => n >= 2).map(([loop_id, n]) => ({ loop_id, episodes: n }));
    const briefed = [...episodes].filter(([, n]) => n >= 1).length;
    return { window_days: days, since, count: loops.length, briefed, loops };
  }
  // The owner's name for a loop: the counterpart, the lot, or the stall day.
  title(loop) {
    const org = loop.org_id && this.s.get("orgs", loop.org_id);
    if (org) return org.name;
    if (loop.lot_id) return this.s.get("lots", loop.lot_id)?.name || "Lot";
    if (loop.type === "stall") return `Stall ${loop.stall_date || ""}`.trim();
    return "Business";
  }
  // One line a human would say about why this loop is in the brief.
  why(loop, now = demoNow(this.c)) {
    const org = this.s.get("orgs", loop.org_id);
    const name =
      org?.name ||
      (loop.lot_id ? this.s.get("lots", loop.lot_id)?.name : null) ||
      "Stall";
    const since = loop.last_touch
      ? london(new Date(loop.last_touch)).date
      : "unknown";
    if (loop.type === "invoice")
      return `${name}: invoice ${loop.invoice_number} (GBP ${Number(loop.amount).toFixed(2)}) overdue since ${loop.invoice_due}`;
    if (loop.type === "lot_low") return loop.next_move;
    if (loop.type === "stall") {
      const where = loop.market ? `${loop.market} ${loop.stall_date}` : loop.stall_date;
      const docs = unsentDocuments(loop);
      const until = daysUntil(loop.stall_date, now);
      if (until > 0 && docs.length) return `Stall ${where}: ${docs.join(" and ")} not sent to the organiser, ${until} ${until === 1 ? "day" : "days"} out`;
      if (until > 0 && loop.transport_confirmed === false) return `Stall ${where}: transport unconfirmed, ${until} ${until === 1 ? "day" : "days"} out`;
      return `Stall day ${where}: not cashed up`;
    }
    if (loop.type === "compliance")
      return `${loop.what}: due ${loop.due_date}, ${daysUntil(loop.due_date, now)} days away`;
    if (loop.type === "receipt")
      return `${name}: receipt unbooked since ${since}`;
    if (loop.shortfall)
      return `${name}: ${loop.reserved_kg} kg of ${loop.shortfall.lot} reserved, supplier has ${loop.shortfall.supplier_kg} kg against ${loop.shortfall.reserved_kg} reserved (${loop.shortfall.shortfall_kg} kg short)`;
    if (loop.type.startsWith("order") && loop.reserved_kg)
      return `${name}: ${loop.type.replace(/_/g, " ")}, ${loop.reserved_kg} kg of ${this.s.get("lots", loop.lot_id)?.name || "a lot"} reserved, no touch since ${since}`;
    if (loop.type === "lead") {
      const path = warmPath(loop.org_id, this.d.orgs(), this.d.data.edges);
      const via =
        path.length > 1
          ? ` via ${path
              .slice(1)
              .map((id) => this.s.get("orgs", id)?.name)
              .join(" and ")}`
          : "";
      return `${name}: ${path.length ? "warm lead" + via : "lead"}, no touch since ${since}`;
    }
    return `${name}: ${loop.type.replace(/_/g, " ")}, no touch since ${since}`;
  }
  // The WhatsApp card for one action: who, why now, the exact text, then buttons.
  card(a) {
    const loop = a.loop_id && this.s.get("loops", a.loop_id);
    const who = loop
      ? this.why(loop)
      : a.payload.intro_key
        ? `Introduction request to ${this.s.get("orgs", a.payload.org_id)?.name}`
        : a.kind;
    const how =
      a.kind === "message"
        ? `To ${a.payload.to} by ${a.payload.channel}`
        : a.kind === "shipment"
          ? "Mark as shipped"
          : `Record ${a.kind} in Books`;
    const body = a.payload.text || a.payload.description || "Review pending action";
    const frame = `${who}\n${how}\n\n`;
    const tail = "\n\nApprove, or reply with changes.";
    const room = 1024 - frame.length - tail.length;
    const shown =
      body.length > room
        ? body.slice(0, room - 40) + "… (full text in Where I stand)"
        : body;
    return frame + shown + tail;
  }
  // Compose the brief without sending anything. Drafts are created here.
  async compose(now = new Date(), slot = "manual") {
    const warnings = [];
    if (this.syncBooks)
      try {
        await this.syncBooks();
      } catch {
        warnings.push("Books could not be read; invoice loops may be stale.");
      }
    if (this.pollMail && this.c.ENABLE_POLLING === "true")
      try {
        await this.pollMail();
      } catch {
        warnings.push("Mail could not be read; replies may be missing.");
      }
    const voice = this.voice();
    if (!voice.ok)
      warnings.push(`No customer drafts: app/data/voice.md needs a signed-off first line (${voice.reason}). Loops are listed below.`);
    this.syncCalendar();
    const cold = this.d.cold(demoNow(this.c, now)),
      actions = [];
    for (const loop of cold) {
      // Receipts, compliance dates and low lots are listed; their action, when one exists, is the pending Books write.
      if (["receipt", "compliance", "lot_low"].includes(loop.type)) {
        const existing = this.s.all("actions").find((a) => a.loop_id === loop.id && a.status === "pending");
        if (existing) actions.push(existing);
        continue;
      }
      if (loop.type === "stall" && !(loop.org_id && unsentDocuments(loop).length && daysUntil(loop.stall_date, demoNow(this.c, now)) > 0)) continue;
      if (loop.type === "order_to_ship") {
        const existing = this.s
          .all("actions")
          .find((a) => a.loop_id === loop.id && a.status === "pending");
        actions.push(
          existing ||
            this.s.action(
              "shipment",
              {
                org_id: loop.org_id,
                description: "Confirm this order has shipped",
              },
              loop.id,
            ),
        );
        continue;
      }
      // One failed draft must not sink the whole brief; the loop is still listed.
      let action = null;
      try {
        action = await this.draft(loop);
      } catch (error) {
        this.s.audit("blocked", {
          loop_id: loop.id,
          reason: "draft_failed",
          detail: safeError(error),
        });
        warnings.push(`${this.why(loop, demoNow(this.c, now))}: no draft (${safeError(error)})`);
      }
      if (action) actions.push(action);
      else if (this.s.get("draft_holds", loop.id))
        warnings.push(`${this.why(loop)}: draft held, ${this.s.get("draft_holds", loop.id).detail}. Tell me the number or the line to use.`);
      if (action && loop.type === "lead" && this.introduction) {
        const intro = await this.introduction(loop);
        if (intro) actions.push(intro);
      }
    }
    // Qualification during drafting may have closed a lead (below bar): re-read.
    const loops = cold.filter(
      (l) =>
        this.s.get("loops", l.id)?.status === "open" && !this.d.blocked(l.org_id),
    );
    const liveIds = new Set(loops.map((l) => l.id));
    const kept = actions.filter((a) => !a.loop_id || liveIds.has(a.loop_id));
    // Pinned: Parked. Say it once, then nothing more until a counterpart touch.
    const parked = this.s
      .all("loops")
      .filter((l) => l.status === "parked" && !this.s.get("parked_notice", l.id) && !this.d.blocked(l.org_id));
    for (const l of parked) this.s.put("parked_notice", l.id, { loop_id: l.id, slot, at: now.toISOString() });
    const cards = kept.slice(0, 5);
    const counts = new Map();
    for (const l of loops) {
      const label =
        l.type === "lead"
          ? warmPath(l.org_id, this.d.orgs(), this.d.data.edges).length
            ? "warm lead"
            : "lead"
          : l.type === "invoice"
            ? "overdue invoice"
            : l.type === "lot_low"
              ? "low lot"
              : l.type === "stall"
                ? daysUntil(l.stall_date, demoNow(this.c, now)) > 0 ? "stall day to prepare" : "stall day to cash up"
                : l.type === "compliance"
                  ? "compliance date"
                  : l.type === "receipt"
                    ? "unbooked receipt"
                    : l.type.replace(/_/g, " ");
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    // Workflow C15: the brief names the lot, the shortfall and how many counterparts are affected.
    const shortfalls = this.s.all("shortfalls").filter((d) => d.affected.some((a) => this.s.get("loops", a.loop_id)?.shortfall));
    const line = loops.length
      ? `${loops.length} need you: ${[...counts]
          .map(([k, n]) => `${n} ${n === 1 ? k : k.replace(/lead$|invoice$|lot$|order$|quote$/, "$&s")}`)
          .join(", ")}.`
      : "Nothing needs you right now.";
    const label = slot === "manual" ? london(now).time : slot;
    const text = [
      `Followthrough ${label}`,
      line,
      ...shortfalls.map((d) => `${d.lot} is ${d.shortfall_kg} kg short of what you've promised (${d.supplier_kg} kg at the supplier, ${d.reserved_kg} reserved). ${d.affected.length} ${d.affected.length === 1 ? "counterpart" : "counterparts"} affected; drafts below.`),
      ...loops.map((l) => `• ${this.why(l, demoNow(this.c, now))}`),
      ...parked.map((l) => `• ${this.title(l)}: parked, ${l.chases} chases unanswered`),
      cards.length
        ? `\n${cards.length} to approve below${kept.length > cards.length ? `, ${kept.length - cards.length} more in Where I stand` : ""}.`
        : "",
      ...warnings,
      `Where I stand: ${this.c.APP_URL}`,
    ]
      .filter((x) => x !== "")
      .join("\n");
    return {
      slot,
      text,
      loops,
      parked,
      actions: kept,
      cards: cards.map((a) => ({ id: a.id, text: this.card(a) })),
      warnings,
    };
  }
  // Send a composed brief to every owner number. Cards go only inside the window.
  async deliver(brief) {
    const owners = list(this.c.WHATSAPP_OWNER_NUMBERS);
    if (!owners.length) throw Error("Missing owner WhatsApp recipient");
    const full =
      brief.text +
      (brief.cards.length
        ? "\n\n" + brief.cards.map((c) => c.text).join("\n\n")
        : "");
    const deliveries = [];
    for (const owner of owners) {
      const lastInbound = this.s.get("windows", owner)?.at;
      const within = Date.now() - Date.parse(lastInbound) < 86400000;
      const registeredTemplate = within
        ? null
        : await this.p.template(this.c.WHATSAPP_BRIEF_TEMPLATE, full);
      if (within && brief.text.length > 4096)
        throw Error("Invalid brief length; review available actions in dashboard");
      deliveries.push({ owner, lastInbound, registeredTemplate, within });
    }
    for (const { owner, lastInbound, registeredTemplate, within } of deliveries) {
      await this.p.whatsapp(owner, registeredTemplate?.text || brief.text, {
        lastInbound,
        registeredTemplate,
      });
      if (!within) continue;
      // Separate action messages bind a tap or quoted reply to exactly one immutable payload.
      for (const card of brief.cards) {
        const a = this.s.get("actions", card.id);
        if (!a || a.status !== "pending") continue;
        const r = await this.p.whatsapp(owner, card.text, {
          lastInbound,
          action: a,
        });
        this.s.put("message_bindings", r.id, {
          action_id: a.id,
          version: a.version,
          hash: a.hash,
        });
      }
    }
  }
  // Scheduled (08:00 / 18:00 London, once per slot) or manual (owner asked, any time).
  async brief(now = new Date(), { manual = false, send = true } = {}) {
    let slot, key;
    if (manual) {
      slot = "manual";
      key = `manual:${now.toISOString()}`;
    } else {
      if (this.c.ENABLE_JOBS !== "true") return;
      if (!weekday(now)) return;
      const local = london(now);
      slot =
        local.time.startsWith("08:0") && Number(local.time.slice(3)) <= 2
          ? "08:00"
          : local.time.startsWith("18:0") && Number(local.time.slice(3)) <= 2
            ? "18:00"
            : null;
      if (!slot) return;
      key = `${local.date}:${slot}`;
      if (this.s.get("brief_slots", key)) return;
    }
    connected(this.c);
    // Persist slot before sending: restart may not repeat an uncertain external delivery.
    this.s.put("brief_slots", key, {
      key,
      slot,
      status: "preparing",
      at: now.toISOString(),
    });
    try {
      const brief = await this.compose(now, slot);
      if (send) {
        this.s.put("brief_slots", key, {
          key,
          slot,
          status: "sending",
          at: now.toISOString(),
        });
        await this.deliver(brief);
      }
      this.s.put("brief_slots", key, {
        key,
        slot,
        status: send ? "completed" : "composed",
        at: now.toISOString(),
      });
      this.s.audit("brief", {
        slot,
        key,
        manual,
        sent: send,
        loop_ids: brief.loops.map((l) => l.id),
        parked_ids: brief.parked.map((l) => l.id),
        action_ids: brief.actions.map((a) => a.id),
      });
      return { ...brief, key, sent: send };
    } catch (e) {
      this.s.put("brief_slots", key, {
        key,
        slot,
        status: "failed_no_retry",
        at: now.toISOString(),
      });
      this.s.audit("blocked", { reason: "brief_failed", slot });
      throw e;
    }
  }
}

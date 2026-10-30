import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { hash } from "./store.mjs";
import { connected, recipient, list, safeError, ROOT } from "./config.mjs";
import { london, warmPath, affirmative, demoNow, nextStage } from "./domain.mjs";
// Pinned: Voice file. Signed off when the first line reads "signed-off: <date> <name>".
export function readVoiceFile(path) {
  if (!path || !existsSync(path)) return { ok: false, reason: "voice file missing", text: "" };
  const text = readFileSync(path, "utf8");
  const first = text.split(/\r?\n/)[0].trim();
  const m = first.match(/^signed-off:\s*(\d{4}-\d{2}-\d{2}|\d{1,2} \w+ \d{4})\s+(\S.*)$/);
  if (!m) return { ok: false, reason: "voice file needs a signed-off first line", text: "" };
  return { ok: true, signed_off: { date: m[1], by: m[2].trim() }, text };
}
export class Engine {
  constructor(store, domain, providers, c) {
    this.s = store;
    this.d = domain;
    this.p = providers;
    this.c = c;
    this.voicePath = c.VOICE_FILE || resolve(ROOT, "data/voice.md");
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
    const r = await this.p.model(
      "Write the owner's next message to this counterpart in the owner's own voice: use the voice file's samples as examples and obey its rules. Answer what the counterpart last asked, then stop; as long as the moment needs and no longer. JSON {text:string,subject:string}. Every figure, date, organisation and commitment must come from the loop, the thread, the lot or the warm path; keep a [placeholder] for any fact you do not have. Name the shared connection when supplied. Never name another buyer or roaster.",
      {
        voice_file: voice.text,
        loop: { type: loop.type, stage: loop.stage, next_stage: nextStage(loop.stage, org.type), next_move: loop.next_move, last_touch: loop.last_touch, invoice_number: loop.invoice_number, amount: loop.amount, invoice_due: loop.invoice_due, kg: loop.kg, lot: loop.lot_id ? this.s.get("lots", loop.lot_id)?.name : null, chases: loop.chases },
        organization: org.name,
        counterpart_name: person.name || null,
        thread,
        counterpart_last_asked: lastAsk,
        path: names,
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
    return this.s.action(
      "message",
      {
        channel,
        to,
        text: template?.text || r.text,
        template,
        subject: `${r.subject} [FT:${loop.id}]`,
        org_id: org.id,
        source: "configured model",
        path,
      },
      loop.id,
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
  async approve(id, input, source = "owner UI") {
    let a = this.validateAction(id, input);
    await this.preflight(a);
    a = this.s.tx(() => {
      const current = this.validateAction(id, input);
      if (current.kind === "sale") this.validateSale(current.payload);
      current.status = "executing";
      current.approved_at = new Date().toISOString();
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
  // One line a human would say about why this loop is in the brief.
  why(loop) {
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
    if (loop.type === "stall")
      return `Stall day ${loop.stall_date}: not cashed up`;
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
    const cold = this.d.cold(demoNow(this.c, now)),
      actions = [];
    for (const loop of cold) {
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
        warnings.push(`${this.why(loop)}: no draft (${safeError(error)})`);
      }
      if (action) actions.push(action);
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
    const live = new Set(loops.map((l) => l.id));
    const kept = actions.filter((a) => !a.loop_id || live.has(a.loop_id));
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
                ? "stall day to cash up"
                : l.type.replace(/_/g, " ");
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const line = loops.length
      ? `${loops.length} need you: ${[...counts]
          .map(([k, n]) => `${n} ${n === 1 ? k : k.replace(/lead$|invoice$|lot$|order$|quote$/, "$&s")}`)
          .join(", ")}.`
      : "Nothing needs you right now.";
    const label = slot === "manual" ? london(now).time : slot;
    const text = [
      `Followthrough ${label}`,
      line,
      ...loops.map((l) => `• ${this.why(l)}`),
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

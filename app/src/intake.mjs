import { list } from "./config.mjs";
import { affirmative, london, replyClass, live } from "./domain.mjs";
export function newReplyContent(html) {
  return html
    .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, " ")
    .replace(/<div\b[^>]*(?:gmail_quote|zmail_extra)[^>]*>[\s\S]*$/gi, " ")
    .split(/\r?\n\s*(?:On .+ wrote:|[-]+Original Message[-]+|From:\s)/i)[0]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
export function installIntake(e) {
  e.pollMail = async () => {
    const messages = await e.p.mailMessages();
    for (const m of messages) {
      const from = String(m.fromAddress || m.sender || "").toLowerCase();
      const person = e.d.data.people.find(
        (p) => p.email.toLowerCase() === from,
      );
      const marker = String(m.subject || "").match(
        /\[FT:([a-f0-9-]{36})\]/,
      )?.[1];
      const threaded = marker && e.s.get("loops", marker);
      const owner = list(e.c.OWNER_TEST_EMAILS)
        .map((x) => x.toLowerCase())
        .includes(from);
      if (!person && !(owner && threaded)) continue;
      const id = String(m.messageId),
        seen = e.s.get("inbound", `mail:${id}`);
      if (seen) continue;
      const org_id = person?.org || threaded.org_id;
      e.s.put("inbound", `mail:${id}`, { status: "processing" });
      try {
        const text = newReplyContent(await e.p.mailContent(id));
        e.d.receive(org_id, text, "email", id, threaded?.id, { subject: String(m.subject || "") });
        if (replyClass(`${m.subject || ""}\n${text}`) !== "auto_reply")
          await e.classifyIntake(text, org_id, "email", id);
        e.s.put("inbound", `mail:${id}`, { status: "completed" });
      } catch {
        e.s.put("inbound", `mail:${id}`, {
          status: "failed",
          reason: "mail_processing_failed",
        });
        e.s.audit("blocked", {
          event_id: id,
          reason: "mail_processing_failed",
        });
      }
    }
  };
  e.classifyIntake = async (text, org_id, source, event_id) => {
    const r = await e.p.model(
      'Classify commercial intake only. JSON {type:null|"lead"|"sample_out"|"quote"|"order_unconfirmed"|"order_to_ship",reference:string|null,next_move:string|null,evidence:string|null}. Only create a new item when the text explicitly establishes it; an ordinary reply has null type.',
      { text, organization: e.s.get("orgs", org_id)?.name },
    );
    if (!r.type) return;
    if (typeof r.evidence !== "string" || !text.includes(r.evidence))
      throw Error("Source evidence missing for intake");
    if (r.reference && !text.includes(r.reference))
      throw Error("Source reference missing for intake");
    e.d.intake({ ...r, org_id }, source, event_id);
  };
  e.respond = async (owner, result) => {
    const text = result.ask || result.readback;
    if (!text) return;
    const receipt = await e.p.whatsapp(owner, text, {
      lastInbound: e.s.get("windows", owner)?.at,
      action: result.action,
    });
    if (result.action)
      e.s.put("message_bindings", receipt.id, {
        action_id: result.action.id,
        version: result.action.version,
        hash: result.action.hash,
      });
    e.s.audit("response", {
      provider_id: receipt.id,
      action_id: result.action?.id,
      source: "owner-requested",
    });
  };
  // Keyword routing: the fallback when no model is configured.
  e.routeByKeyword = (text, binding) => {
    if (binding?.action_id) {
      if (affirmative(text)) return { intent: "approve", confidence: 1 };
      if (/^drop[.!\s]*$/i.test(text)) return { intent: "drop", confidence: 1 };
      if (/^undo[.!\s]*$/i.test(text)) return { intent: "undo", confidence: 1 };
      if (/^edit:\s*\S/i.test(text))
        return {
          intent: "edit",
          edited_text: text.replace(/^edit:\s*/i, ""),
          confidence: 1,
        };
      return { intent: "other", confidence: 1 };
    }
    if (/\b(sold|bags?|cash)\b/i.test(text))
      return { intent: "cashup", confidence: 1 };
    if (/\b(receipt|invoice|total|supplier)\b/i.test(text))
      return { intent: "receipt", confidence: 1 };
    return { intent: "other", confidence: 1 };
  };
  // One model call reads what the owner meant, in their own words or a transcript.
  e.intent = async (text, binding) => {
    if (affirmative(text) && binding?.action_id)
      return { intent: "approve", confidence: 1, source: "exact yes" };
    if (/^undo(\s+(it|that|this))?[.!\s]*$/i.test(text) && binding?.action_id)
      return { intent: "undo", confidence: 1, source: "exact undo" };
    if (typeof e.p.model !== "function") return e.routeByKeyword(text, binding);
    const quoted = binding?.action_id && e.s.get("actions", binding.action_id);
    let r;
    try {
      r = await e.p.model(
        'Classify a message from a small-business owner to their back-office assistant. JSON {intent:"approve"|"drop"|"edit"|"undo"|"cashup"|"receipt"|"ask"|"capture"|"other",edited_text:string|null,question:string|null,confidence:number}. undo: they want the message they just approved held back. capture: the owner reports things that happened or need doing (an order, a stall note, a receipt alongside other items, a chase reminder, a new lead, a message forwarded from a customer), one or several in one message. approve: the owner clearly agrees to send or record the quoted action as it stands. drop: they want it dropped. edit: they want the quoted message changed; put the complete revised message in edited_text, keeping every fact they did not change. cashup: they report stall sales (bags, lot, cash). receipt: they report a purchase or expense. ask: they ask a question about their business. other: anything else, including a no or an unclear reply. confidence is 0 to 1.',
        {
          message: text,
          quoted_action: quoted
            ? {
                kind: quoted.kind,
                text: quoted.payload.text || quoted.payload.description || "",
              }
            : null,
          cashup_in_progress: Boolean(
            e.s.get("cashup_pending", binding?.owner || ""),
          ),
        },
        { maxTokens: 400 },
      );
    } catch {
      return e.routeByKeyword(text, binding);
    }
    const intents = ["approve", "drop", "edit", "undo", "cashup", "receipt", "ask", "capture", "other"];
    if (!intents.includes(r.intent)) return { intent: "other", confidence: 0 };
    return {
      intent: r.intent,
      edited_text: typeof r.edited_text === "string" ? r.edited_text : null,
      question: typeof r.question === "string" ? r.question : null,
      confidence: Number.isFinite(r.confidence) ? r.confidence : 0,
      source: "configured model",
    };
  };
  // Ask: answer from loops, Books and stock only. Nothing is sent or written.
  e.answer = async (question) => {
    const books = e.s.get("books", "snapshot");
    const context = {
      question,
      today: london().date,
      open_loops: e.s
        .all("loops")
        .filter(live)
        .map((l) => e.why(l)),
      books: books?.available
        ? {
            cash: books.cash,
            owed: books.owed,
            invoices: (books.invoices || []).map((i) => ({
              org: e.s.get("orgs", i.org_id)?.name,
              number: i.number,
              balance: i.balance,
              due: i.due,
            })),
            read_at: books.updated_at,
          }
        : "Books not available",
      lots: e.s.all("lots").map((l) => ({ name: l.name, left_kg: l.left_kg })),
      pending_approvals: e.s
        .all("actions")
        .filter((a) => a.status === "pending").length,
    };
    const r = await e.p.model(
      "Answer the owner's question from the data only, in two sentences or fewer, GBP amounts with two decimals. JSON {answer:string}. If the data cannot answer, say what is missing. Never invent a figure.",
      context,
      { maxTokens: 300 },
    );
    if (typeof r.answer !== "string" || !r.answer.trim())
      throw Error("Model answer schema invalid");
    return r.answer.trim().slice(0, 1000);
  };
  // Pinned: Capture. One model call splits an owner message into items; each routes to its workflow;
  // one read-back; at most one ask, naming only the fields a Core action needs.
  e.capture = async (text, event_id, owner, { forwarded = false } = {}) => {
    const orgs = e.d.orgs().map((o) => ({ id: o.id, name: o.name, type: o.type }));
    const lots = e.s.all("lots").map((l) => ({ id: l.id, name: l.name }));
    const r = await e.p.model(
      'Split the owner\'s message into the separate items it carries. JSON {items:[{type:"order"|"sample"|"chase"|"lead"|"stall"|"receipt"|"thread"|"question",org_id:string|null,counterpart:string|null,reference:string|null,lot_id:string|null,kg:number|null,amount:number|null,date:"YYYY-MM-DD"|null,text:string,missing:string[]}]}. org_id only from the supplied organisations, else null with counterpart as the owner named them. reference is an order or invoice number quoted verbatim. thread: a message the owner forwarded from a counterpart. missing lists only what is needed to act (for an order: lot, kg; for a receipt: amount, supplier). text is the exact words of that item. Never invent an item.',
      { message: text, forwarded, organisations: orgs, lots },
      { maxTokens: 900 },
    );
    if (!Array.isArray(r.items)) throw Error("Model capture schema invalid");
    const kinds = ["order", "sample", "chase", "lead", "stall", "receipt", "thread", "question"];
    const items = r.items
      .filter((i) => kinds.includes(i.type) && typeof i.text === "string")
      .slice(0, 8);
    if (forwarded && !items.some((i) => i.type === "thread"))
      items.unshift({ type: "thread", org_id: items[0]?.org_id || null, counterpart: items[0]?.counterpart || null, reference: items[0]?.reference || null, text, missing: [] });
    const lines = [], logged = [];
    let ask = null;
    for (const [n, item] of items.entries()) {
      const id = `${event_id}:${n}`;
      if (item.org_id && !e.s.get("orgs", item.org_id)) item.org_id = null;
      if (item.reference && !text.includes(item.reference)) item.reference = null;
      if (item.lot_id && !e.s.get("lots", item.lot_id)) item.lot_id = null;
      const name = item.org_id ? e.s.get("orgs", item.org_id).name : item.counterpart || "unknown counterpart";
      const missing = Array.isArray(item.missing) ? item.missing.filter((m) => typeof m === "string").slice(0, 4) : [];
      const entry = { type: item.type, org_id: item.org_id, reference: item.reference, duplicate: false, loop_id: null, missing };
      if (["order", "sample", "lead", "chase", "thread"].includes(item.type)) {
        const org_id = item.org_id || e.captureOrg(name, item, id);
        const type = { order: "order_unconfirmed", sample: "sample_out", lead: "lead", chase: "sample_out", thread: "lead" }[item.type];
        const record = { type, org_id, reference: item.reference, next_move: item.type === "chase" ? `Chase ${name}: ${item.text}` : undefined };
        const open = e.s.all("loops").filter((l) => l.org_id === org_id && live(l));
        let loop = open.find((l) => l.key === e.d.loopKey(record, "capture", id));
        if (!loop && item.type === "order")
          loop = open.find((l) => l.type === "order_unconfirmed" && (l.kg ?? null) === (item.kg ?? null) && (l.lot_id ?? null) === (item.lot_id ?? null));
        if (!loop && item.type !== "order") loop = open.find((l) => item.type === "thread" ? open.length === 1 || l.type === type : l.type === type);
        if (loop && item.type !== "thread") entry.duplicate = true;
        if (!loop) loop = e.d.intake(record, "capture", id);
        if (!loop) { lines.push(`${name}: suppressed, nothing recorded.`); logged.push(entry); continue; }
        entry.loop_id = loop.id;
        if (item.type === "thread") {
          e.d.appendThread(loop.id, { from: "counterpart", source: "forwarded", text: item.text });
          e.s.audit("thread_append", { loop_id: loop.id, event_id: id, org_id, reference: item.reference });
          lines.push(`${name}: message added to the ${loop.type.replace(/_/g, " ")} thread.`);
        } else if (item.type === "chase") {
          if (!entry.duplicate) lines.push(`${name}: chase noted, new ${loop.type.replace(/_/g, " ")} loop.`);
          else { loop.due_at = new Date().toISOString(); loop.next_move = record.next_move; e.s.put("loops", loop.id, loop); lines.push(`${name}: chase due in the next brief.`); }
        } else if (entry.duplicate) lines.push(`${name}: already have that${item.reference ? ` (${item.reference})` : ""}.`);
        else {
          if (item.type === "order" && (item.kg || item.lot_id)) { loop.kg = item.kg || null; loop.lot_id = item.lot_id || null; e.s.put("loops", loop.id, loop); }
          lines.push(`${name}: ${item.type === "order" ? `order${item.kg ? ` for ${item.kg} kg` : ""}${item.lot_id ? ` of ${e.s.get("lots", item.lot_id).name}` : ""}` : item.type === "sample" ? "sample loop" : "new lead"} opened.`);
        }
      } else if (item.type === "stall") {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : london().date;
        const loop = e.s.all("loops").find((l) => l.key === `stall:${date}`) || e.d.loop("stall", null, `stall:${date}`, { stall_date: date, source: "capture" });
        entry.loop_id = loop.id;
        e.d.appendThread(loop.id, { from: "owner", source: "capture", text: item.text });
        lines.push(`Stall ${date}: note kept${loop.status === "open" ? ", cash-up still open" : ""}.`);
      } else if (item.type === "receipt") {
        // A spoken receipt rarely carries the exact supplier name the validator needs; one failed item must not sink the capture.
        let result = null;
        try { result = await e.receipt({ text: item.text, event_id: id }); } catch { result = null; }
        if (result?.action) { entry.loop_id = result.action.loop_id; lines.push(result.readback); }
        else {
          // Keep the receipt as an open loop so the brief carries it until it is booked.
          const loop = e.d.loop("receipt", item.org_id, `receipt:${id}`, { source: "capture", next_move: `Book receipt: ${item.text.slice(0, 80)}` });
          entry.loop_id = loop.id;
          lines.push(`${name}: receipt "${item.text.slice(0, 80)}" noted, not yet booked.`);
          if (missing.length === 0) missing.push("supplier", "amount");
        }
      } else if (item.type === "question") {
        lines.push(await e.answer(item.text));
      }
      entry.missing = missing;
      if (missing.length && !ask && ["order", "receipt"].includes(item.type)) ask = `For ${name}: which ${missing.join(" and ")}?`;
      logged.push(entry);
    }
    e.s.audit("capture", { event_id, owner, forwarded, count: logged.length, items: logged });
    if (ask) e.s.audit("ask", { event_id, reason: "capture_missing_fields", ask });
    return { readback: lines.length ? `Got ${logged.length} ${logged.length === 1 ? "item" : "items"}:\n${lines.map((l) => `• ${l}`).join("\n")}${ask ? `\n\n${ask}` : ""}` : "I could not find anything to record in that. Tell me what happened and with whom." };
  };
  // A counterpart the owner named but the data does not hold: a stub org so the loop exists (workflow A2).
  e.captureOrg = (name, item, event_id) => {
    const existing = e.d.orgs().find((o) => o.name.toLowerCase() === String(name).toLowerCase());
    if (existing) return existing.id;
    const id = `capture:${event_id}`;
    e.s.put("orgs", id, { id, name: String(name).slice(0, 80), type: /caf[eé]/i.test(name + item.text) ? "cafe" : /roaster/i.test(name + item.text) ? "roaster" : null, website: null, instagram: null, status: "lead", source: "capture", books_contact_id: null });
    return id;
  };
  e.ownerMessage = async (from, text, id, binding, contextId, { forwarded = false } = {}) => {
    if (forwarded) {
      const captured = await e.capture(text, id, from, { forwarded: true });
      e.s.audit("intent", { event_id: id, intent: "capture", confidence: 1, bound: false, source: "forwarded" });
      return e.respond(from, captured);
    }
    const classified = await e.intent(text, binding && { ...binding, owner: from });
    e.s.audit("intent", {
      event_id: id,
      intent: classified.intent,
      confidence: classified.confidence,
      bound: Boolean(binding?.action_id),
      source: classified.source || "keyword",
    });
    const needsCard = async () =>
      e.respond(from, {
        ask: "Which one? Reply to the card you mean, or open Where I stand.",
      });
    if (classified.intent === "approve") {
      if (!binding?.action_id) return needsCard();
      if (classified.confidence < 0.8) {
        e.s.audit("blocked", { event_id: id, reason: "not_affirmative_approval" });
        return e.respond(from, {
          ask: "I read that as not quite a yes. Reply yes to send it as written, or tell me what to change.",
        });
      }
      let a;
      try {
        a = await e.approve(binding.action_id, binding, "owner WhatsApp reply");
      } catch (error) {
        // A card that was undone, edited, revoked or already sent can no longer approve (F16, T7, T7b).
        if (!/Action changed|Loop is closed|suppressed|held until/.test(error.message)) throw error;
        e.s.audit("blocked", { event_id: id, action_id: binding.action_id, reason: "card_no_longer_approvable" });
        return e.respond(from, { ask: "That card is no longer live (undone, changed or already handled). Open Where I stand for the current one." });
      }
      return e.respond(from, {
        ask:
          a.kind === "message"
            ? a.status === "held"
              ? `Held. It goes to ${a.payload.to} by ${a.payload.channel} at ${london(new Date(a.send_at)).time}; reply undo to stop it.`
              : `Sent to ${a.receipt?.to || a.payload.to} by ${a.payload.channel}.`
            : `Recorded: ${a.kind}.`,
      });
    }
    if (classified.intent === "undo") {
      if (!binding?.action_id) return needsCard();
      try {
        e.undo(binding.action_id, null, "owner WhatsApp reply");
      } catch (error) {
        e.s.audit("blocked", { event_id: id, action_id: binding.action_id, reason: "undo_not_held" });
        return e.respond(from, { ask: "Nothing to undo on that card: it is not on hold." });
      }
      return e.respond(from, { ask: "Undone. It will not send." });
    }
    if (classified.intent === "drop") {
      if (!binding?.action_id) return needsCard();
      e.drop(binding.action_id, binding);
      return e.respond(from, { ask: "Dropped." });
    }
    if (classified.intent === "edit") {
      if (!binding?.action_id) return needsCard();
      if (!classified.edited_text?.trim())
        return e.respond(from, {
          ask: "Tell me the change you want, or send the full revised message.",
        });
      const a = await e.edit(binding.action_id, {
        ...binding,
        text: classified.edited_text.trim(),
      });
      return e.respond(from, { action: a, readback: e.card(a) });
    }
    if (classified.intent === "capture")
      return e.respond(from, await e.capture(text, id, from));
    if (classified.intent === "cashup")
      return e.respond(from, await e.cashup(text, id, from));
    if (classified.intent === "receipt")
      return e.respond(from, await e.receipt({ text, event_id: id }));
    if (classified.intent === "ask") {
      const answer = await e.answer(classified.question || text);
      e.s.audit("answer", { event_id: id, question: classified.question || text });
      return e.respond(from, { ask: answer });
    }
    if (binding?.action_id) {
      e.s.audit("blocked", { event_id: id, reason: "not_affirmative_approval" });
      return;
    }
    if (e.s.get("cashup_pending", from))
      return e.respond(from, await e.cashup(text, id, from));
    e.s.audit("ask", { event_id: id, reason: "unbound_owner_message" });
    return e.respond(from, {
      ask: "Reply to a card with yes, a change, or drop. For a receipt or cash-up, give me the details. You can also ask me a question about the business.",
    });
  };
  e.inbound = async (message) => {
    const from = "+" + String(message.from || "").replace(/^\+/, "");
    if (!list(e.c.WHATSAPP_TEST_NUMBERS).includes(from)) {
      e.s.audit("blocked", { reason: "unknown_sender" });
      return;
    }
    const isOwner = list(e.c.WHATSAPP_OWNER_NUMBERS).includes(from);
    const person = e.d.data.people.find((p) => p.whatsapp === from);
    if (!isOwner && !person) {
      e.s.audit("blocked", { reason: "unmapped_sender" });
      return;
    }
    const id = message.id;
    if (typeof id !== "string" || id.length > 256) return;
    if (e.s.get("inbound", id)) return;
    e.s.put("inbound", id, {
      status: "processing",
      at: new Date().toISOString(),
    });
    try {
      const timestamp = Number(message.timestamp) * 1000;
      if (
        !Number.isFinite(timestamp) ||
        timestamp > Date.now() + 300000 ||
        Date.now() - timestamp > 86400000
      )
        throw Error("Stale inbound message");
      e.s.put("windows", from, { at: new Date(timestamp).toISOString() });
      let text = message.text?.body || "";
      if (message.type === "audio") {
        text = await e.p.transcribe(await e.p.media(message.audio.id));
        e.s.audit("transcript", { event_id: id, text, source: "Meta Voice" });
      }
      if (!isOwner) {
        e.d.receive(
          person.org,
          text,
          "whatsapp",
          id,
          e.s.get("message_bindings", message.context?.id)?.loop_id,
        );
        if (text) await e.classifyIntake(text, person.org, "whatsapp", id);
      } else {
        const button =
          message.interactive?.button_reply?.id || message.button?.payload;
        if (button) {
          const match = button.match(
            /^(approve|drop):([a-f0-9-]{36}):(\d+):([a-f0-9]{64})$/,
          );
          if (!match) throw Error("Approval button invalid");
          const input = { version: Number(match[3]), hash: match[4] };
          if (match[1] === "approve")
            await e.approve(match[2], input, "owner WhatsApp tap");
          else e.drop(match[2], input);
        } else if (message.type === "image")
          await e.respond(
            from,
            await e.receipt({
              image: await e.p.media(message.image.id),
              event_id: id,
            }),
          );
        else if (text) {
          const binding = e.s.get(
            "message_bindings",
            message.context?.id || "",
          );
          await e.ownerMessage(from, text, id, binding, message.context?.id, {
            forwarded: Boolean(message.context?.forwarded || message.context?.frequently_forwarded),
          });
        }
      }
      e.s.put("inbound", id, {
        status: "completed",
        at: new Date().toISOString(),
      });
    } catch (error) {
      e.s.put("inbound", id, {
        status: "failed_requires_review",
        at: new Date().toISOString(),
      });
      e.s.audit("blocked", {
        event_id: id,
        reason: "inbound_processing_failed",
      });
      throw error;
    }
  };
}

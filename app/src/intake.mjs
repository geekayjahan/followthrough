import { list } from "./config.mjs";
import { affirmative, london } from "./domain.mjs";
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
        e.d.receive(org_id, text, "email", id, threaded?.id);
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
    if (typeof e.p.model !== "function") return e.routeByKeyword(text, binding);
    const quoted = binding?.action_id && e.s.get("actions", binding.action_id);
    let r;
    try {
      r = await e.p.model(
        'Classify a message from a small-business owner to their back-office assistant. JSON {intent:"approve"|"drop"|"edit"|"cashup"|"receipt"|"ask"|"other",edited_text:string|null,question:string|null,confidence:number}. approve: the owner clearly agrees to send or record the quoted action as it stands. drop: they want it dropped. edit: they want the quoted message changed; put the complete revised message in edited_text, keeping every fact they did not change. cashup: they report stall sales (bags, lot, cash). receipt: they report a purchase or expense. ask: they ask a question about their business. other: anything else, including a no or an unclear reply. confidence is 0 to 1.',
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
    const intents = ["approve", "drop", "edit", "cashup", "receipt", "ask", "other"];
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
        .filter((l) => l.status === "open")
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
  e.ownerMessage = async (from, text, id, binding, contextId) => {
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
      const a = await e.approve(binding.action_id, binding, "owner WhatsApp reply");
      return e.respond(from, {
        ask:
          a.kind === "message"
            ? `Sent to ${a.receipt?.to || a.payload.to} by ${a.payload.channel}.`
            : `Recorded: ${a.kind}.`,
      });
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
          await e.ownerMessage(from, text, id, binding, message.context?.id);
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

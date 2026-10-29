import { list } from "./config.mjs";
import { affirmative } from "./domain.mjs";
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
          if (binding?.action_id) {
            if (affirmative(text))
              await e.approvalReply(text, message.context.id, from);
            else if (/^drop[.!\s]*$/i.test(text))
              e.drop(binding.action_id, binding);
            else if (/^edit:\s*\S/i.test(text))
              await e.edit(binding.action_id, {
                ...binding,
                text: text.replace(/^edit:\s*/i, ""),
              });
            else
              e.s.audit("blocked", {
                event_id: id,
                reason: "not_affirmative_approval",
              });
          } else if (
            /\b(sold|bags?|cash)\b/i.test(text) ||
            e.s.get("cashup_pending", from)
          )
            await e.respond(from, await e.cashup(text, id, from));
          else if (/\b(receipt|invoice|total|supplier)\b/i.test(text))
            await e.respond(from, await e.receipt({ text, event_id: id }));
          else {
            e.s.audit("ask", { event_id: id, reason: "unbound_owner_message" });
            await e.respond(from, {
              ask: "Reply to one specific action with yes, use its Approve button, or review it in the dashboard. For a receipt or cash-up, include the complete details.",
            });
          }
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

/* Same-origin owner interface. Provider outcomes come only from server responses. */
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const list = (value) => (Array.isArray(value) ? value : []);
const human = (value) => String(value ?? "Unknown").replace(/_/g, " ");
const date = (value) => {
  const d = new Date(value);
  return value && Number.isFinite(+d)
    ? d.toLocaleString("en-GB", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not recorded";
};
const money = (value, currency = "GBP") => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  )
    return "Unavailable";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(Number(value));
  } catch {
    return `${Number(value).toFixed(2)} ${currency}`;
  }
};
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
const sourceLink = (url, label) =>
  safeUrl(url)
    ? `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
    : esc(label);
const empty = (title, text) =>
  `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`;
let state, selectedOrg;
function notify(text, kind = "success") {
  const el = $("notice");
  el.className = `banner ${kind}`;
  el.textContent = text;
}
async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers:
      body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            "X-CSRF-Token": state?.csrf ?? "",
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (response.status === 401 && !$("login-form")) {
    location.assign("/login");
    throw new Error("Your session ended. Sign in again.");
  }
  if (!response.ok)
    throw new Error(
      data.error?.message ||
        data.error ||
        data.message ||
        `Request failed (${response.status}). Try refreshing the workspace.`,
    );
  return data;
}
function installContent(id, html) {
  const el = $(id);
  el.classList.remove("loading");
  el.removeAttribute("aria-busy");
  el.innerHTML = html;
}
function orgName(id) {
  return (
    list(state.orgs).find((org) => String(org.id) === String(id))?.name ||
    id ||
    "Business"
  );
}
function pendingActions() {
  return list(state.actions).filter((action) =>
    ["pending", "draft", "awaiting_approval"].includes(action.status),
  );
}
function heldActions() {
  return list(state.actions).filter((action) => action.status === "held");
}
function attentionActions() {
  return list(state.actions).filter((action) =>
    [
      "executing",
      "sending",
      "needs_reconciliation",
      "failed",
      "failed_no_retry",
      "unknown",
    ].includes(action.status),
  );
}
function personName(orgId) {
  return list(state.people).find((p) => String(p.org) === String(orgId))?.name || null;
}
// Owner copy: who it goes to and where it really lands in test mode (build review §3, item 1).
function actionPresentation(action) {
  const p = action.payload || {},
    loop = list(state.loops).find((l) => l.id === action.loop_id),
    lot = list(state.lots).find((l) => l.id === p.lot_id);
  const row = (label, value) =>
    `<div><dt>${esc(label)}</dt><dd>${esc(value ?? "Not supplied")}</dd></div>`;
  const channel = p.channel === "email" ? "email" : p.channel === "whatsapp" ? "WhatsApp" : p.channel || p.provider || "its channel";
  if (action.kind === "message") {
    const who = personName(p.org_id), org = orgName(p.org_id || loop?.org_id);
    const redirected = action.effective_recipient && action.effective_recipient !== p.to;
    return {
      title: "Send follow-up",
      button: "Approve and send",
      target: `To ${who ? `${who} at ${org}` : org} by ${channel}${redirected ? ` · test mode, lands in ${action.effective_recipient}` : ""}`,
      summary: p.subject || "",
      body: `${p.subject ? `<p class="small">Subject: ${esc(p.subject)}</p>` : ""}<div class="draft">${esc(messageText(action))}</div>`,
    };
  }
  if (action.kind === "expense")
    return {
      title: "Record an expense",
      button: "Approve expense",
      target: `${p.supplier || "Receipt"}, ${money(p.amount, p.currency || "GBP")}, into Books`,
      summary: p.description || "",
      body: `<dl class="action-facts">${row("Supplier", p.supplier)}${row("Date", p.date)}${row("Amount", money(p.amount, p.currency || "GBP"))}${row("Description", p.description || "Receipt")}${row("Record in", "Zoho Books expenses")}</dl>`,
    };
  if (action.kind === "sale")
    return {
      title: "Record a stall sale",
      button: "Approve sale",
      target: `${p.count ?? ""} bags of ${lot?.name || p.lot_id}, ${money(p.amount, p.currency || "GBP")} cash, into Books`,
      summary: "",
      body: `<dl class="action-facts">${row("Date", p.date)}${row("Quantity", p.count !== undefined ? `${p.count} bags` : p.quantity)}${row("Coffee lot", lot?.name || p.lot_id)}${row("Stock change", p.kg !== undefined ? `−${p.kg} kg` : null)}${row("Sale total", money(p.amount, p.currency || "GBP"))}${row("Record in", "Zoho Books · cash sale")}</dl>`,
    };
  if (action.kind === "shipment")
    return {
      title: "Confirm an order shipped",
      button: "Confirm shipment",
      target: `Mark the ${orgName(p.org_id || loop?.org_id)} order as shipped`,
      summary: p.description || "",
      body: `<dl class="action-facts">${row("Customer", orgName(p.org_id || loop?.org_id))}${row("Order", p.order_id || loop?.order_id)}${p.lot_id ? row("Coffee lot", lot?.name || p.lot_id) : ""}${p.kg !== undefined ? row("Quantity", `${p.kg} kg`) : ""}${row("Update", "Mark the order shipped and close this loop")}</dl>`,
    };
  return {
    title: human(action.kind),
    button: "Approve action",
    target: p.description || human(action.kind),
    summary: "",
    body: `<p class="action-target">${esc(p.description || "Review the full action details before approving.")}</p><dl class="action-facts">${row("Provider", p.provider || p.channel)}${row("Target", p.to || p.recipient || p.target)}</dl>`,
  };
}
function render() {
  const setup = state.setup || {},
    books = state.books || {},
    lots = list(state.lots),
    actions = pendingActions();
  $("today").textContent = new Date().toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  }) + " · London time";
  const missing = list(setup.missing);
  $("setup").innerHTML =
    !setup.approved || missing.length
      ? `<div class="banner"><strong>Nothing sends yet</strong><p>${!setup.approved ? "The sample data is waiting for your sign-off. " : ""}${missing.length ? "Some accounts are not connected, so drafts stay on this page." : ""}</p><details><summary>What is still to connect</summary><p>Add these to app/.env, restart, then refresh: ${missing.map(esc).join(", ") || "Review the sample data and account mappings, then approve them."}</p><p>Scheduled briefs: ${setup.jobs ? "on" : "off"}. Mail polling: ${setup.polling ? "on" : "off"}.</p></details></div>`
      : `<div class="provenance">Scheduled briefs ${setup.jobs ? "on" : "off"} · Mail polling ${setup.polling ? "on" : "off"}</div>`;
  const provenance = state.provenance;
  $("provenance").textContent =
    typeof provenance === "string"
      ? provenance
      : provenance
        ? JSON.stringify(provenance)
        : "Source provenance has not been supplied. Treat records as unverified.";
  const booksOkay = books.available === true && !books.error;
  $("cash").textContent = booksOkay
    ? money(books.cash, books.currency)
    : "Unavailable";
  $("owed").textContent = booksOkay
    ? money(books.owed, books.currency)
    : "Unavailable";
  const freshness = booksOkay
    ? `Zoho Books · read ${date(books.updated_at)}`
    : books.error
      ? `Books read failed: ${typeof books.error === "string" ? books.error : "provider unavailable"}`
      : "Zoho Books is not connected";
  $("cash-source").textContent = freshness;
  $("owed-source").textContent = freshness;
  const knownLots = lots.filter(
    (l) =>
      Number.isFinite(Number(l.left_kg)) &&
      l.left_kg !== null &&
      l.left_kg !== undefined,
  );
  $("stock-total").textContent = knownLots.length
    ? `${knownLots.reduce((n, l) => n + Number(l.left_kg), 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} kg`
    : "Unavailable";
  $("stock-source").textContent = knownLots.length
    ? `${knownLots.length} lots · current loop-store inventory${knownLots.length !== lots.length ? " · some quantities unknown" : ""}`
    : "No inventory quantities available";
  $("approval-total").textContent = String(actions.length);
  const leaked = state.leaked || {};
  $("leaked-total").textContent = Number.isFinite(leaked.count) ? String(leaked.count) : "—";
  $("leaked-source").textContent = Number.isFinite(leaked.count)
    ? `${leaked.count === 1 ? "loop" : "loops"} that went cold twice in ${leaked.window_days} days · ${leaked.briefed || 0} briefed`
    : "Computed from the action log";
  renderLoops();
  renderActions();
  renderGraph();
  renderLead();
  renderInventory();
  renderActivity();
}
function loopStatus(loop) {
  if (loop.status === "parked") return { label: `Parked, ${loop.chases || 3} chases unanswered`, attention: false };
  if (loop.due_today === true) return { label: "Needs you today", attention: true };
  const days = Math.ceil((Date.parse(loop.due_at) - Date.now()) / 86400000);
  if (!Number.isFinite(days)) return { label: human(loop.status), attention: false };
  return { label: days <= 0 ? "Cold" : days === 1 ? "Cold tomorrow" : `Cold in ${days} days`, attention: days <= 0 };
}
function loopAction(loop) {
  return list(state.actions).find((a) => a.loop_id === loop.id && ["pending", "held"].includes(a.status));
}
// One card per loop: who and why, then its draft with the buttons (build review §3, item 2).
function loopCard(loop) {
  const status = loopStatus(loop), action = loopAction(loop);
  const stage = loop.stage ? `<span class="tag">${esc(loop.stage)}</span>` : "";
  const head = `<div class="loop-head"><div><h3>${esc(loop.title || orgName(loop.org_id))}</h3><span class="tag ${status.attention ? "attention" : ""}">${esc(status.label)}</span> ${stage}</div><span class="small">${esc(human(loop.type))}</span></div><p class="why">${esc(loop.why || loop.next_move || "")}</p>`;
  if (!action) return `<article class="loop-row" data-loop="${esc(loop.id)}">${head}<p class="small">${loop.type === "lead" && !list(state.qualifications).some((q) => String(q.org_id) === String(loop.org_id)) ? "Checking their shop before any draft." : "No draft waiting. The next brief will carry one if it goes cold."}</p></article>`;
  return `<article class="loop-row has-action" data-loop="${esc(loop.id)}" data-action="${esc(action.id)}">${head}${actionBody(action)}</article>`;
}
function actionBody(action) {
  const view = actionPresentation(action);
  if (action.status === "held")
    return `<p class="action-target">${esc(view.target)} · sends ${esc(date(action.send_at))}</p><div class="draft">${esc(messageText(action) || view.summary)}</div><div class="actions"><button class="secondary" data-command="undo">Undo, don't send</button></div>`;
  return `<p class="action-target">${esc(view.target)}</p>${view.body}<div class="edit-slot"></div><div class="actions"><button data-command="approve">${esc(view.button)}</button>${action.kind === "message" ? '<button class="secondary" data-command="edit">Edit message</button>' : ""}<button class="quiet danger" data-command="drop">Drop</button></div>`;
}
function renderLoops() {
  const loops = list(state.loops)
    .filter((l) => !["closed", "done", "cancelled", "declined"].includes(l.status))
    .sort(
      (a, b) =>
        Number(b.due_today === true) - Number(a.due_today === true) ||
        Number(Boolean(loopAction(b))) - Number(Boolean(loopAction(a))) ||
        (Date.parse(a.due_at) || Infinity) - (Date.parse(b.due_at) || Infinity),
    );
  $("loop-count").textContent = `${loops.length} open`;
  $("due-count").textContent = `${loops.filter((loop) => loop.due_today === true).length} due today · ${loops.length} open in total`;
  $("nav-count").textContent = loops.length || "";
  installContent(
    "loop-content",
    loops.length
      ? loops.map(loopCard).join("")
      : empty("Room to breathe.", "Nothing is open. Refresh sources to check for new activity."),
  );
}
function messageText(action) {
  const p = action.payload || {};
  return p.text ?? p.message ?? p.body ?? null;
}
function openLoop(action) {
  return list(state.loops).some((l) => l.id === action.loop_id && !["closed", "done", "cancelled", "declined"].includes(l.status));
}
function renderActions() {
  const pending = pendingActions(),
    attention = attentionActions();
  const technical = (action) =>
    `<details><summary>Technical action details</summary><pre>${esc(JSON.stringify({ id: action.id, kind: action.kind, payload: action.payload, version: action.version, hash: action.hash, status: action.status, receipt: action.receipt }, null, 2))}</pre></details>`;
  const flagged = attention
    .map((action) => {
      const view = actionPresentation(action),
        working = ["executing", "sending"].includes(action.status);
      return `<article class="action attention-action"><div class="action-head"><h3>${esc(view.title)}</h3><span class="tag attention">${working ? "Outcome pending" : "Needs reconciliation"}</span></div><p class="outcome-warning">${working ? "This action has started. Its provider outcome is not yet confirmed." : "The external outcome is unconfirmed. Check the provider record or inbox and reconcile this action before any further write."} Refresh sources to check its current status.</p>${view.body}${action.error ? `<p class="small">${esc(action.error)}</p>` : ""}${technical(action)}</article>`;
    })
    .join("");
  // Pinned: Held. An approved message with no open loop waits here until send_at; Undo stops it.
  const held = heldActions()
    .filter((action) => !openLoop(action))
    .map((action) => {
      const view = actionPresentation(action);
      return `<article class="action held-action" data-action="${esc(action.id)}"><div class="action-head"><h3>${esc(view.title)}</h3><span class="tag">Sends ${esc(date(action.send_at))}</span></div>${actionBody(action)}</article>`;
    })
    .join("");
  // Loop-bound cards live on their loop above; this section carries the rest (introductions, receipts, sales).
  const proposed = pending
    .filter((action) => !openLoop(action))
    .map((action) => {
      const view = actionPresentation(action);
      return `<article class="action" data-action="${esc(action.id)}"><div class="action-head"><h3>${esc(view.title)}</h3><span class="tag attention">Needs approval</span></div>${actionBody(action)}${technical(action)}</article>`;
    })
    .join("");
  installContent(
    "action-content",
    flagged + held + proposed ||
      empty(
        "Nothing else waiting on you.",
        "Drafts sit on their loop above. Introductions, receipts and stall sales appear here.",
      ),
  );
}
function renderGraph() {
  const orgs = list(state.orgs);
  if (!orgs.length) {
    installContent(
      "network-content",
      empty(
        "Start with a connection.",
        "No organisations have been recorded in this workspace.",
      ),
    );
    return;
  }
  if (!orgs.some((o) => String(o.id) === String(selectedOrg)))
    selectedOrg = orgs[0].id;
  const cols = Math.max(
      2,
      Math.min(5, Math.ceil(Math.sqrt(orgs.length * 1.7))),
    ),
    width = Math.max(720, cols * 190 + 60),
    rows = Math.ceil(orgs.length / cols),
    height = Math.max(250, rows * 120 + 70),
    positions = new Map(
      orgs.map((o, i) => [
        String(o.id),
        {
          x: 125 + ((i % cols) * (width - 250)) / (cols - 1),
          y: 70 + Math.floor(i / cols) * 120,
        },
      ]),
    );
  const edges = list(state.edges)
    .map((edge) => {
      const a = positions.get(String(edge.from)),
        b = positions.get(String(edge.to));
      return a && b
        ? `<g><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="edge-label" style="display:${String(edge.from) === String(selectedOrg) || String(edge.to) === String(selectedOrg) ? "block" : "none"}" text-anchor="middle" x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 6}">${esc(human(edge.label || edge.kind || "connection"))}</text></g>`
        : "";
    })
    .join("");
  const nodes = orgs
    .map((o) => {
      const p = positions.get(String(o.id));
      return `<g class="node ${String(o.id) === String(selectedOrg) ? "selected" : ""}" role="button" tabindex="0" aria-label="View ${esc(o.name)} background" data-org="${esc(o.id)}" transform="translate(${p.x},${p.y})"><rect x="-82" y="-25" width="164" height="51" rx="6"/><text text-anchor="middle" y="-3">${esc(String(o.name || o.id).length > 22 ? String(o.name || o.id).slice(0, 21) + "…" : o.name || o.id)}</text><text class="node-status" text-anchor="middle" y="14">${esc(human(o.status))}</text></g>`;
    })
    .join("");
  installContent(
    "network-content",
    `<div class="map-scroll"><svg role="group" aria-label="All ${orgs.length} organisations and their relationships" viewBox="0 0 ${width} ${height}">${edges}${nodes}</svg></div><details class="connection-list"><summary>All connections (${list(state.edges).length})</summary>${list(
      state.edges,
    )
      .map(
        (e) =>
          `<p>${esc(orgName(e.from))} — ${esc(human(e.label || e.kind || "connected to"))} — ${esc(orgName(e.to))}</p>`,
      )
      .join(
        "",
      )}</details><div class="graph-list" aria-label="Select organisation">${orgs.map((o) => `<button data-org="${esc(o.id)}" aria-pressed="${String(o.id) === String(selectedOrg)}">${esc(o.name || o.id)}</button>`).join("")}</div>`,
  );
}
function renderLead() {
  const org = list(state.orgs).find(
    (o) => String(o.id) === String(selectedOrg),
  );
  if (!org) {
    $("lead-content").innerHTML = "";
    return;
  }
  const q = list(state.qualifications).find(
      (q) => String(q.org_id) === String(org.id),
    ),
    sources = q?.sources || {};
  const fact = (label, value, source) =>
    `<div class="fact"><span class="small">${esc(label)}</span><strong>${esc(value ?? "Unknown")}</strong>${source?.quote ? `<blockquote>“${esc(source.quote)}”</blockquote>` : '<p class="small">No supporting quotation recorded.</p>'}${source?.url ? sourceLink(source.url, "View source") : ""}</div>`;
  const path = list(q?.path);
  // Before qualification the panel stays collapsed to one line (build review §3, item 6).
  if (!q) {
    $("lead-content").innerHTML =
      `<details class="lead-panel"><summary>${esc(org.name)}: not checked yet</summary><div class="lead-meta"><span class="tag">${esc(human(org.status))}</span>${org.website ? sourceLink(org.website, "Website") : ""}</div><p class="small">Their shop has not been read, so there is no tier, price or path to show.</p>${org.status === "lead" ? `<button class="secondary" data-qualify="${esc(org.id)}">Qualify this lead</button><p class="small">Reads the approved shop page and public profile once. Anything it cannot source stays unknown.</p>` : ""}</details>`;
    return;
  }
  $("lead-content").innerHTML =
    `<details class="lead-panel" open><summary>${esc(org.name)} background</summary><div class="lead-meta"><span class="tag">${esc(human(org.status))}</span>${org.website ? sourceLink(org.website, "Website") : ""}<span class="small">Checked ${esc(date(q.checked_at))}</span></div><div class="facts">${fact("Shop price per 250g", q?.price === null || q?.price === undefined ? "Unknown" : money(q.price, "GBP") + " per 250g", sources.price)}${fact("Specialty tier", q?.tier, sources.tier || sources.price)}${fact("Sells Indian coffee", q?.sells_indian === true ? "Yes" : q?.sells_indian === false ? "No" : "Unknown", sources.sells_indian)}</div>${path.length ? `<p class="path"><strong>Warm path</strong><br>${path.map((p) => esc(typeof p === "string" ? orgName(p) : p.name || p.label || JSON.stringify(p))).join(" → ")}</p>` : '<p class="small">No warm path into your network yet.</p>'}<button class="secondary" data-qualify="${esc(org.id)}">Check their shop again</button></details>`;
}
function renderInventory() {
  const lots = list(state.lots);
  installContent(
    "stock-content",
    lots.length
      ? `<div class="table-scroll"><table><thead><tr><th scope="col">Lot</th><th scope="col">Remaining</th></tr></thead><tbody>${lots
          .map((lot) => {
            const n = Number(lot.left_kg),
              start = Number(lot.start_kg),
              known =
                lot.left_kg !== null &&
                lot.left_kg !== undefined &&
                Number.isFinite(n),
              pct =
                known && start > 0
                  ? Math.max(0, Math.min(100, (100 * n) / start))
                  : 0;
            return `<tr><td>${esc(lot.name || lot.id)}<small>${esc(lot.id)}</small></td><td class="number">${known ? `${esc(n)} kg` : "Unknown"}${start > 0 ? `<div class="stock-meter ${pct < 20 ? "low" : ""}" aria-label="${Math.round(pct)} percent of starting stock"><span style="width:${pct}%"></span></div>` : ""}</td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : empty(
          "No lots recorded.",
          "Inventory will appear here when the dataset is available.",
        ),
  );
  const books = state.books || {},
    invoices = list(books.invoices ?? state.invoices);
  $("invoice-source").textContent =
    books.available && !books.error
      ? `Zoho Books · read ${date(books.updated_at)}`
      : "Connected invoice read unavailable.";
  installContent(
    "invoice-content",
    invoices.length
      ? `<div class="table-scroll"><table><thead><tr><th scope="col">Customer / invoice</th><th scope="col">Due</th><th scope="col">Amount</th></tr></thead><tbody>${invoices.map((i) => `<tr><td>${esc(i.customer_name || orgName(i.org_id || i.org))}<small>${esc(i.invoice_number || i.id)} · ${esc(i.status || (i.paid_on ? "paid" : "unpaid"))}</small></td><td>${esc(date(i.due_date || i.due))}</td><td class="number">${esc(money(i.balance ?? i.amount ?? i.total, i.currency_code || books.currency))}</td></tr>`).join("")}</tbody></table></div>`
      : empty(
          books.available && !books.error
            ? "No invoices returned."
            : "Invoices unavailable.",
          books.available && !books.error
            ? "The latest Books read returned no invoice records."
            : "Connect Zoho Books and refresh sources for a current read.",
        ),
  );
}
function renderActivity() {
  const events = list(state.events),
    missed = list(state.missedSlots),
    inboundFailures = list(state.inboundFailures),
    briefFailures = list(state.briefFailures);
  const failureRows = [
    ...inboundFailures.map((failure) => ({
      ...failure,
      label: "Inbound event",
      reference: failure.id,
    })),
    ...briefFailures.map((failure) => ({
      ...failure,
      label: "Scheduled brief",
      reference: failure.key,
    })),
  ];
  $("event-count").textContent = `(${events.length})`;
  $("activity-content").innerHTML =
    (failureRows.length
      ? `<div class="banner error"><strong>${failureRows.length} events need review</strong><p>Review the event and provider outcome before recovery; do not resend uncertain actions.</p>${failureRows.map((failure) => `<div class="event"><time>${esc(date(failure.at))}</time><div>${esc(failure.label)}: ${esc(failure.reference)}<br>Status: ${esc(human(failure.status))}</div></div>`).join("")}</div>`
      : "") +
    (missed.length
      ? `<div class="banner"><strong>${missed.length} missed brief ${missed.length === 1 ? "slot" : "slots"}</strong><p>${missed.map((s) => esc(typeof s === "object" ? `${s.date || s.local_date || ""} ${s.slot || s.id || ""}` : s)).join(", ")}</p><p>Missed slots are not automatically sent later.</p></div>`
      : "") +
    (events.length
      ? events
          .slice()
          .sort(
            (a, b) =>
              (Date.parse(b.timestamp || b.created_at || b.at) || 0) -
              (Date.parse(a.timestamp || a.created_at || a.at) || 0),
          )
          .slice(0, 50)
          .map(
            (event) =>
              `<div class="event"><time>${esc(date(event.timestamp || event.created_at || event.at))}</time><div>${esc(human(event.type || event.kind))}${event.message ? `: ${esc(event.message)}` : ""}${event.reason ? `<br>Reason: ${esc(human(event.reason))}` : ""}${event.event_id ? `<br>Event: ${esc(event.event_id)}` : ""}${event.action_id ? `<br>Action: ${esc(event.action_id)}` : ""}${event.provider_id ? ` · receipt ${esc(event.provider_id)}` : ""}</div></div>`,
          )
          .join("")
      : empty(
          "No activity recorded.",
          "Approved actions and provider receipts will appear here.",
        ));
}
async function load() {
  state = await api("/api/state");
  render();
}
async function busy(button, work) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await work();
  } catch (error) {
    notify(error.message, "error");
  } finally {
    button.disabled = false;
  }
}
if ($("login-form")) {
  $("login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    busy(event.submitter, async () => {
      await api("/api/login", { password: $("password").value });
      location.assign("/");
    });
  });
} else {
  $("refresh").addEventListener("click", (event) =>
    busy(event.currentTarget, async () => {
      notify("Refreshing configured sources…");
      await api("/api/sync", {});
      await load();
      notify(
        "Workspace refreshed. Check each source timestamp for availability.",
      );
    }),
  );
  const showBrief = (brief) => {
    const cards = list(brief.cards);
    installContent(
      "brief-content",
      `<pre class="brief-text">${esc(brief.text)}</pre>${cards.length ? `<div class="brief-cards">${cards.map((c) => `<pre class="brief-text card">${esc(c.text)}</pre>`).join("")}</div>` : ""}<p class="small">${brief.sent ? "Sent to your WhatsApp." : "Composed only; nothing was sent."}${brief.demoAgeDays ? ` Demo clock is ${brief.demoAgeDays} days ahead.` : ""}</p>`,
    );
    $("brief-send").hidden = !(state.setup && state.setup.whatsapp);
  };
  $("brief-compose").addEventListener("click", (event) =>
    busy(event.currentTarget, async () => {
      notify("Composing your brief…");
      const brief = await api("/api/brief", { send: false });
      await load();
      showBrief({ ...brief, demoAgeDays: state.setup.demoAgeDays });
      notify("Brief composed. Drafts are waiting for your approval.");
    }),
  );
  $("brief-send").addEventListener("click", (event) =>
    busy(event.currentTarget, async () => {
      notify("Sending your brief to WhatsApp…");
      const brief = await api("/api/brief", { send: true });
      await load();
      showBrief(brief);
      notify("Brief sent.");
    }),
  );
  $("logout").addEventListener("click", (event) =>
    busy(event.currentTarget, async () => {
      await api("/api/logout", {});
      location.assign("/login");
    }),
  );
  document.addEventListener("click", (event) => {
    const org = event.target.closest("[data-org]");
    if (org) {
      selectedOrg = org.dataset.org;
      renderGraph();
      renderLead();
      return;
    }
    const qualify = event.target.closest("[data-qualify]");
    if (qualify) {
      busy(qualify, async () => {
        await api(
          `/api/qualify/${encodeURIComponent(qualify.dataset.qualify)}`,
          {},
        );
        await load();
        notify(
          "Qualification request finished. Review the supporting sources below.",
        );
      });
      return;
    }
    const button = event.target.closest("[data-command]");
    if (!button) return;
    const article = button.closest("[data-action]"),
      action = list(state.actions).find(
        (a) => String(a.id) === article.dataset.action,
      );
    if (!action) return;
    const command = button.dataset.command;
    if (command === "edit") {
      const slot = article.querySelector(".edit-slot");
      if (slot.childElementCount) {
        slot.innerHTML = "";
        return;
      }
      slot.innerHTML = `<form class="edit-form"><label for="edit-${esc(action.id)}">Message text only</label><textarea id="edit-${esc(action.id)}" required>${esc(messageText(action))}</textarea><button type="submit" class="secondary">Save revised draft</button><p class="small">Saving creates a revised action for review. It does not send the message.</p></form>`;
      slot.querySelector("textarea").focus();
      slot.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        busy(e.submitter, async () => {
          await api(`/api/actions/${encodeURIComponent(action.id)}/edit`, {
            version: action.version,
            hash: action.hash,
            text: slot.querySelector("textarea").value,
          });
          await load();
          notify(
            "Revised draft saved. Review its exact action before approval.",
          );
        });
      });
      return;
    }
    busy(button, async () => {
      const buttons = article.querySelectorAll("button");
      buttons.forEach((b) => (b.disabled = true));
      try {
        const result = await api(
          `/api/actions/${encodeURIComponent(action.id)}/${command}`,
          { version: action.version, hash: action.hash },
        );
        await load();
        const outcome = result.status || result.action?.status;
        notify(
          command === "drop"
            ? "Action dropped."
            : command === "undo"
              ? "Undone. The message will not send."
              : outcome === "held"
                ? `Approved. It sends at ${date(result.send_at)}; Undo is available until then.`
                : `Approval request completed${outcome ? `: ${human(outcome)}` : ". Review activity for the provider outcome."}`,
        );
      } catch (error) {
        action.status = "needs_reconciliation";
        action.error =
          "The request did not return a confirmed outcome. Refresh and check the provider before another write.";
        renderActions();
        try {
          await load();
        } catch {}
        throw error;
      } finally {
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  });
  document.addEventListener("keydown", (event) => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches("g[data-org]")
    ) {
      event.preventDefault();
      selectedOrg = event.target.dataset.org;
      renderGraph();
      renderLead();
    }
  });
  load().catch((error) => {
    notify(error.message, "error");
    [
      "loop-content",
      "action-content",
      "network-content",
      "stock-content",
      "invoice-content",
    ].forEach((id) =>
      installContent(
        id,
        empty(
          "Workspace could not load.",
          "Check the local server, then use Refresh sources to try again.",
        ),
      ),
    );
  });
}

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const list = (value) =>
  (value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export const emailPattern = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
export const phonePattern = /^\+[1-9]\d{6,14}$/;
export function config(envFile = resolve(ROOT, ".env")) {
  const result = {};
  if (existsSync(envFile))
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match)
        result[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  return result;
}
export function requireKeys(c, keys) {
  const missing = keys.filter((key) => !c[key]);
  if (missing.length) throw new Error(`Setup required: ${missing.join(", ")}`);
}
export function connected(c) {
  if (c.SYNTHETIC_DATA_APPROVED !== "true")
    throw new Error("Owner review and mapping of synthetic data required");
}
export const required = [
  "OWNER_PASSWORD",
  "APP_URL",
  "OWNER_TEST_EMAILS",
  "WHATSAPP_TEST_NUMBERS",
  "WHATSAPP_OWNER_NUMBERS",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_TOKEN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "GRAPH_API_VERSION",
  "ZOHO_REGION",
  "ZOHO_CLIENT_ID",
  "ZOHO_CLIENT_SECRET",
  "ZOHO_REFRESH_TOKEN",
  "ZOHO_MAIL_ACCOUNT_ID",
  "ZOHO_MAIL_FROM",
  "ZOHO_BOOKS_ORG_ID",
  "EXPENSE_ACCOUNT_ID",
  "CASH_ACCOUNT_ID",
  "STALL_CUSTOMER_ID",
  "MODEL_BASE_URL",
  "MODEL_NAME",
  "VOICE_TRANSCRIBE_KEY",
];
export function validateData(data, c) {
  const names = [
    "orgs",
    "people",
    "edges",
    "invoices",
    "lots",
    "orders",
    "stall_days",
  ];
  for (const name of names)
    if (!Array.isArray(data[name]))
      throw Error(`Invalid dataset: requires ${name}`);
  const collections = {};
  for (const name of ["orgs", "people", "invoices", "lots", "orders"]) {
    const ids = data[name].map((item) => item.id);
    if (
      ids.some((id) => typeof id !== "string" || !id.trim()) ||
      new Set(ids).size !== ids.length
    )
      throw Error(`Invalid dataset: missing or duplicate ${name} ID`);
    collections[name] = new Set(ids);
  }
  const numbers = list(c.WHATSAPP_TEST_NUMBERS),
    owners = list(c.WHATSAPP_OWNER_NUMBERS),
    emails = list(c.OWNER_TEST_EMAILS);
  if (
    numbers.length > 5 ||
    numbers.some((n) => !phonePattern.test(n)) ||
    owners.some((n) => !numbers.includes(n)) ||
    emails.some((email) => !emailPattern.test(email))
  )
    throw Error("Invalid owner/test recipient mapping");
  for (const person of data.people) {
    if (
      !collections.orgs.has(person.org) ||
      !/^[^\s@]+@example\.test$/i.test(person.email || "") ||
      (person.whatsapp && !numbers.includes(person.whatsapp))
    )
      throw Error("Invalid synthetic identity boundary");
  }
  for (const edge of data.edges)
    if (!collections.orgs.has(edge.from) || !collections.orgs.has(edge.to))
      throw Error("Invalid edge organization");
  for (const lot of data.lots)
    if (
      !Number.isFinite(lot.start_kg) ||
      !Number.isFinite(lot.left_kg) ||
      !(lot.start_kg > 0) ||
      lot.left_kg < 0 ||
      lot.left_kg > lot.start_kg
    )
      throw Error("Invalid lot quantity");
  for (const order of data.orders)
    if (
      !collections.orgs.has(order.org) ||
      !collections.lots.has(order.lot) ||
      !Number.isFinite(order.kg) ||
      order.kg <= 0
    )
      throw Error("Invalid order reference or quantity");
  for (const invoice of data.invoices)
    if (
      !collections.orgs.has(invoice.org) ||
      !Number.isFinite(invoice.amount) ||
      invoice.amount < 0
    )
      throw Error("Invalid invoice reference or amount");
  const dates = data.stall_days.map((day) => day.date);
  if (
    new Set(dates).size !== dates.length ||
    dates.some(
      (date) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date,
    )
  )
    throw Error("Invalid stall date");
  return data;
}
export function recipient(c, channel, to) {
  if (channel === "email") {
    requireKeys(c, ["OWNER_TEST_EMAILS"]);
    if (
      !emailPattern.test(to) ||
      list(c.OWNER_TEST_EMAILS).some((email) => !emailPattern.test(email))
    )
      throw Error("Invalid email recipient");
    return c.APP_LIVE === "true" ? to : list(c.OWNER_TEST_EMAILS).join(",");
  }
  if (!phonePattern.test(to) || !list(c.WHATSAPP_TEST_NUMBERS).includes(to))
    throw Error("WhatsApp recipient is not on verified test list");
  return to;
}
export function safeError(error) {
  if (error?.code && /^(network|http_\d{3}|[a-z_]+)$/.test(error.code))
    return `Provider operation failed (${error.code}); check configuration or reconcile a started write`;
  const message = String(error?.message || "");
  // Only application-authored error categories are exposed; provider response bodies are never propagated.
  if (
    /^(Setup required:|Owner review|WhatsApp recipient|Invalid |Unknown |Action |Approval |Loop |Insufficient |Missing |No |Receipt |Cash-up |Qualification |Media |Website |Source |Model |Please |Stale |Session |Origin |CSRF |Password |Too |Unsupported)/.test(
      message,
    )
  )
    return message.slice(0, 300);
  return "Operation failed; check configuration and provider access";
}

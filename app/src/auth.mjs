import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { hash } from "./store.mjs";
export class Auth {
  constructor(store, c) {
    this.store = store;
    this.c = c;
    this.salt = randomBytes(16);
    this.verifier = c.OWNER_PASSWORD
      ? scryptSync(c.OWNER_PASSWORD, this.salt, 64)
      : null;
    this.attempts = new Map();
  }
  login(password, ip, now = Date.now()) {
    const a = this.attempts.get(ip) || { count: 0, start: now };
    if (now - a.start > 900000) {
      a.count = 0;
      a.start = now;
    }
    a.count++;
    this.attempts.set(ip, a);
    if (a.count > 10) throw Error("Too many login attempts; wait 15 minutes");
    if (
      !this.verifier ||
      typeof password !== "string" ||
      password.length > 1024 ||
      !timingSafeEqual(scryptSync(password, this.salt, 64), this.verifier)
    )
      throw Error("Password rejected or owner setup incomplete");
    const token = randomBytes(32).toString("hex");
    const session = {
      csrf: randomBytes(24).toString("hex"),
      expires: now + 12 * 3600000,
    };
    this.store.put("sessions", hash(token), session);
    return { token, session };
  }
  session(req) {
    const token = (req.headers.cookie || "").match(
      /(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    const s = token && this.store.get("sessions", hash(token));
    if (!s || s.expires < Date.now()) return null;
    return { ...s, key: hash(token) };
  }
  mutation(req, s) {
    if (req.headers.origin !== new URL(this.c.APP_URL).origin)
      throw Error("Origin rejected");
    if (!s || req.headers["x-csrf-token"] !== s.csrf)
      throw Error("CSRF rejected");
  }
  cookie(token) {
    return `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${this.c.APP_URL?.startsWith("https:") ? "; Secure" : ""}`;
  }
}
export function verifySignature(raw, header, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(header || "")) return false;
  const got = Buffer.from(header.slice(7), "hex"),
    want = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(got, want);
}

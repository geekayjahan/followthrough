import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
export const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
export class Store {
  constructor(path, logPath) {
    this.logPath = logPath;
    this.pendingLogs = null;
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    if (logPath) mkdirSync(dirname(logPath), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,json TEXT NOT NULL,PRIMARY KEY(kind,id));
   CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,json TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS claims(kind TEXT,id TEXT,PRIMARY KEY(kind,id));`);
  }
  all(kind) {
    return this.db
      .prepare("SELECT json FROM records WHERE kind=?")
      .all(kind)
      .map((row) => JSON.parse(row.json));
  }
  get(kind, id) {
    const row = this.db
      .prepare("SELECT json FROM records WHERE kind=? AND id=?")
      .get(kind, String(id));
    return row ? JSON.parse(row.json) : null;
  }
  entries(kind) {
    return this.db
      .prepare("SELECT id,json FROM records WHERE kind=?")
      .all(kind)
      .map((row) => ({ id: row.id, ...JSON.parse(row.json) }));
  }
  put(kind, id, value) {
    this.db
      .prepare(
        "INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json",
      )
      .run(kind, String(id), JSON.stringify(value));
    return value;
  }
  del(kind, id) {
    this.db
      .prepare("DELETE FROM records WHERE kind=? AND id=?")
      .run(kind, String(id));
  }
  claim(kind, id) {
    return (
      this.db
        .prepare("INSERT OR IGNORE INTO claims VALUES(?,?)")
        .run(kind, String(id)).changes === 1
    );
  }
  tx(fn) {
    if (this.pendingLogs) throw Error("Invalid nested transaction");
    this.db.exec("BEGIN IMMEDIATE");
    this.pendingLogs = [];
    let result, logs;
    try {
      result = fn();
      this.db.exec("COMMIT");
      logs = this.pendingLogs;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.pendingLogs = null;
    }
    for (const event of logs) this.appendLog(event);
    return result;
  }
  appendLog(event) {
    if (!this.logPath) return;
    try {
      appendFileSync(this.logPath, JSON.stringify(event) + "\n");
    } catch {
      this.put("meta", "audit_log_error", {
        at: new Date().toISOString(),
        reason: "JSONL append failed; SQLite event evidence retained",
      });
    }
  }
  audit(type, fields = {}) {
    const event = { at: new Date().toISOString(), type, ...fields };
    this.db
      .prepare("INSERT INTO events(json) VALUES(?)")
      .run(JSON.stringify(event));
    if (this.pendingLogs) this.pendingLogs.push(event);
    else this.appendLog(event);
    return event;
  }
  events() {
    return this.db
      .prepare("SELECT json FROM events ORDER BY id DESC LIMIT 100")
      .all()
      .map((row) => JSON.parse(row.json));
  }
  close() {
    this.db.close();
  }
  action(kind, payload, loop_id = null) {
    const action = {
      id: randomUUID(),
      kind,
      payload,
      loop_id,
      version: 1,
      hash: hash(payload),
      status: "pending",
      created_at: new Date().toISOString(),
    };
    this.put("actions", action.id, action);
    this.audit("draft", {
      action_id: action.id,
      loop_id,
      kind,
      text: payload.text || payload.description || "",
      hash: action.hash,
      version: 1,
    });
    return action;
  }
}

import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {appendFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export class Store {
 constructor(path,logPath){this.logPath=logPath;if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});if(logPath)mkdirSync(dirname(logPath),{recursive:true});this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,json TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS claims(kind TEXT,id TEXT,PRIMARY KEY(kind,id));`);}
 all(kind){return this.db.prepare('SELECT json FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.json));}
 get(kind,id){const r=this.db.prepare('SELECT json FROM records WHERE kind=? AND id=?').get(kind,String(id));return r?JSON.parse(r.json):null;}
 put(kind,id,v){this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json').run(kind,String(id),JSON.stringify(v));return v;}
 del(kind,id){this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,String(id));}
 claim(kind,id){return this.db.prepare('INSERT OR IGNORE INTO claims VALUES(?,?)').run(kind,String(id)).changes===1;}
 tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const x=fn();this.db.exec('COMMIT');return x;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 audit(type,fields={}){const e={at:new Date().toISOString(),type,...fields};this.db.prepare('INSERT INTO events(json) VALUES(?)').run(JSON.stringify(e));if(this.logPath)appendFileSync(this.logPath,JSON.stringify(e)+'\n');return e;}
 events(){return this.db.prepare('SELECT json FROM events ORDER BY id DESC LIMIT 100').all().map(r=>JSON.parse(r.json));}
 close(){this.db.close();}
 action(kind,payload,loop_id=null){const a={id:randomUUID(),kind,payload,loop_id,version:1,hash:hash(payload),status:'pending',created_at:new Date().toISOString()};this.put('actions',a.id,a);this.audit('draft',{action_id:a.id,loop_id,kind,text:payload.text||payload.description||'',hash:a.hash,version:1});return a;}
}

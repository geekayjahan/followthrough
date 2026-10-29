// Scan publishable source only. Never read ignored credentials or print a match.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const patterns = [
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{30,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
];
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repo, encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
let scanned = 0;
for (const file of new Set(files)) {
  if (/(^|\/)\.env(?:$|\.)/.test(file) && !file.endsWith('.env.example')) {
    findings.push({ file, reason: 'Credential file is publishable; contents not read' });
    continue;
  }
  const bytes = readFileSync(resolve(repo, file));
  if (bytes.includes(0)) continue;
  scanned++;
  for (const [index, line] of bytes.toString('utf8').split(/\r?\n/).entries()) {
    if (patterns.some(pattern => pattern.test(line))) findings.push({ file, line: index + 1, reason: 'Possible credential, value redacted' });
  }
}
console.log(JSON.stringify({ check: 'publishable-source secret patterns', files_scanned: scanned, findings, limits: 'High-confidence token and private-key patterns; not a comprehensive security audit.' }, null, 2));
process.exitCode = findings.length ? 1 : 0;

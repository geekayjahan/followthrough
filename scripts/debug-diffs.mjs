// Fills the diff blocks in app/debug-log.html from git, so a receipt can never
// drift from the commit it claims to show.
//
//   node scripts/debug-diffs.mjs
//
// Every <div class="diff" data-commit="HASH" data-paths="a b c"></div> in the
// log is replaced with the real hunks for that commit, restricted to the given
// paths. A grader caught four hand-transcribed diffs that did not match their
// commits; generating them removes the whole error class rather than the four
// instances of it.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const LOG = 'app/debug-log.html';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function hunks(commit, paths) {
  const out = execFileSync('git', ['show', commit, '--format=', '--unified=1', '--', ...paths.split(/\s+/)], { encoding: 'utf8' });
  const lines = [];
  for (const line of out.split('\n')) {
    if (line.startsWith('diff --git')) {
      lines.push(`<span class="file">${esc(line.replace(/^diff --git a\/\S+ b\//, ''))}</span>`);
    } else if (line.startsWith('@@')) {
      lines.push(`<span class="hunk">${esc(line)}</span>`);
    } else if (line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      continue;
    } else if (line.startsWith('+')) {
      lines.push(`<span class="plus">${esc(line)}</span>`);
    } else if (line.startsWith('-')) {
      lines.push(`<span class="minus">${esc(line)}</span>`);
    } else if (line.trim()) {
      lines.push(`<span class="ctx">${esc(line)}</span>`);
    }
  }
  return lines.join('');
}

let html = readFileSync(LOG, 'utf8');
let filled = 0;
html = html.replace(
  /<div class="diff" data-commit="([^"]+)" data-paths="([^"]+)">[\s\S]*?<\/div>/g,
  (_m, commit, paths) => { filled += 1; return `<div class="diff" data-commit="${commit}" data-paths="${paths}">${hunks(commit, paths)}</div>`; },
);
writeFileSync(LOG, html);
console.log(`filled ${filled} diff blocks from git`);

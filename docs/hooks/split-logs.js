#!/usr/bin/env node
// Cleaner for a Rosetta live-hook run → a committable excerpt of ~/.rosetta/hooks.log.
// Usage: node docs/hooks/split-logs.js <session_id> <src-log> <out-file>
//
// RULES (see docs/hooks-verify.md "Live-log cleaning"):
//  1. CLEAN BY session_id — keep only invocation blocks whose input carries the given session_id.
//     Do NOT filter by timestamp/pid. session_id is the single robust key. KISS.
//  2. Redact ONLY TRUE SECRETS — a value is redacted iff its env-var NAME looks like a credential
//     OR its VALUE matches a known credential format (JWT/gh_/AWS/sk-/Slack/Google/PEM). EVERYTHING
//     ELSE STAYS: PATH, HOME, JAVA_HOME, SSH_AUTH_SOCK (a socket path, not a secret), CLAUDE_*,
//     AI_AGENT, … — the full env IS the runtime signature, that is the point of the dump.
//  3. Trim the huge `compact_summary` (PostCompact) — conversation text, not the hook contract.
//  4. De-interleave by pid (concurrent hooks append to one file) so each block reads cleanly.
//  5. Assert no unredacted credential-shaped value survived.
'use strict';
const fs = require('fs');

const SESSION_ID = process.argv[2];
const SRC = process.argv[3];
const OUT = process.argv[4];
if (!SESSION_ID || !SRC || !OUT) { console.error('usage: split-logs.js <session_id> <src-log> <out-file>'); process.exit(1); }

const MARK = '===== hook invocation =====';
const lines = fs.readFileSync(SRC, 'utf8').split('\n');

// De-interleave: group each line under the open block for ITS pid.
const blocks = [];
const openByPid = {};
for (const line of lines) {
  const m = line.match(/^\[[^\]]*\]\s\[([0-9]+)\]/);
  const pid = m ? m[1] : null;
  if (pid && line.includes(MARK)) { const b = [line]; blocks.push(b); openByPid[pid] = b; }
  else if (pid && openByPid[pid]) openByPid[pid].push(line);
  else if (!pid && blocks.length) blocks[blocks.length - 1].push(line);
}

const stripPrefix = (l) => l.replace(/^\[[^\]]*\]\s\[[0-9]+\]\s?/, '');

// --- TRUE-SECRET detection: redact iff the NAME looks secret (and the value isn't a path/short)
//     OR the VALUE itself matches a known credential format. Keep first 5 chars, truncate the rest. ---
const looksSecretName = (k) => /(TOKEN|SECRET|PASSWORD|PASSWD|PASSPHRASE|CREDENTIAL|PRIVATE|API_?KEY|ACCESS_?KEY|SECRET_?KEY|BEARER|REFRESH|COOKIE|SALT|SIGNING|SIGNATURE|_KEY$|^KEY$)/i.test(k);
const looksSecretValue = (v) =>
  /eyJ[A-Za-z0-9_-]{10,}/.test(v) ||                 // JWT
  /gh[posu]_[A-Za-z0-9]{20,}/.test(v) ||             // GitHub token
  /github_pat_[A-Za-z0-9_]{20,}/.test(v) ||
  /AKIA[0-9A-Z]{16}/.test(v) ||                      // AWS access key id
  /sk-[A-Za-z0-9]{16,}/.test(v) ||                   // OpenAI-style
  /xox[baprs]-[A-Za-z0-9-]{10,}/.test(v) ||          // Slack
  /AIza[0-9A-Za-z_-]{20,}/.test(v) ||                // Google
  /-----BEGIN/.test(v);                              // PEM
// NOTE: deliberately NO generic high-entropy catch-all — it false-flags paths/IDs (PWD, *_DIR, session ids).
const isPathOrSimple = (v) => /^\//.test(v) || v.length <= 8 || /^[0-9.]+$/.test(v) || /^(true|false)$/i.test(v);
const redactNeeded = (k, v) => looksSecretValue(v) || (looksSecretName(k) && !isPathOrSimple(v));
const redactVal = (v) => (v.length <= 8 ? '[REDACTED]' : v.slice(0, 5) + '…[REDACTED]');

// Keep env, redacting only true-secret values. Handles multiline env values. Trims compact_summary.
function processBlock(block) {
  const out = [];
  let inEnv = false, lastRedacted = false;
  for (let l of block) {
    l = l.replace(/("compact_summary":")(?:.*)$/, '$1…[summary text trimmed for excerpt]"}');
    const msg = stripPrefix(l);
    const prefix = l.slice(0, l.length - msg.length);
    if (/^ENV:\s*$/.test(msg)) { inEnv = true; lastRedacted = false; out.push(l); continue; }
    if (inEnv) {
      if (/^(PARSED INPUT:|PARSE ERROR:|PROCESSOR:|RESULT:|UNKNOWN FLAG|===== )/.test(msg)) { inEnv = false; lastRedacted = false; out.push(l); continue; }
      const m = msg.match(/^(\s{2,})([^=]+)=(.*)$/);
      if (m) {
        const [, indent, key, val] = m;
        if (redactNeeded(key, val)) { out.push(prefix + indent + key + '=' + redactVal(val)); lastRedacted = true; }
        else { out.push(l); lastRedacted = false; }
      } else if (!lastRedacted) out.push(l); // continuation of a non-secret value; else drop (secret remainder)
      continue;
    }
    out.push(l);
  }
  return out.join('\n').replace(/\n+$/, '');
}

// Match the session key in the input. Most agents emit `"session_id"`; Windsurf/Devin emits
// `"trajectory_id"` instead — accept either so the ID arg works regardless of the agent.
const kept = blocks.filter((b) => {
  const t = b.join('\n');
  return t.includes(`"session_id":"${SESSION_ID}"`) || t.includes(`"trajectory_id":"${SESSION_ID}"`);
}).map(processBlock);

const header =
  `# Rosetta live-hook log excerpt — session ${SESSION_ID}\n` +
  `# Cleaned export of ~/.rosetta/hooks.log (docs/hooks/split-logs.js). Kept ONLY this session's blocks.\n` +
  `# ENV kept; only TRUE-SECRET values redacted (first 5 chars + […REDACTED]); compact_summary trimmed.\n` +
  `# One block per hook invocation (de-interleaved by pid). (!) grep what you need; don't read wholesale.\n\n`;
fs.writeFileSync(OUT, header + kept.join('\n\n') + '\n');
console.log(`kept ${kept.length} invocation blocks for session ${SESSION_ID} → ${OUT}`);

// Safety: assert no UNREDACTED credential-shaped value survived.
const danger = /eyJ[A-Za-z0-9_-]{20,}|gh[posu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{15,}|AIza[0-9A-Za-z_-]{25,}|-----BEGIN/;
const hits = fs.readFileSync(OUT, 'utf8').split('\n').filter((l) => danger.test(l) && !/\[REDACTED\]/.test(l));
console.log(OUT, '->', hits.length ? 'POSSIBLE UNREDACTED (' + hits.length + '): ' + hits.slice(0, 3).map((h) => h.slice(0, 80)).join(' || ') : 'no unredacted credential-shaped values');

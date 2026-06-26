/**
 * capture-probe.ts — self-contained proof/diagnostic of Curiocity's interactive
 * trajectory-capture mechanism for Claude Code. Run it to confirm, on a given
 * machine/version, that:
 *   - an interactive (NON-headless) `claude` launched via node-pty persists a
 *     transcript, and
 *   - our injected SessionStart/Stop hooks deliver `transcript_path` and
 *     `last_assistant_message`.
 *
 * REQUIREMENTS (validated 2026-06-23, see idea.md "Findings & Decisions"):
 *   1. Run UNSANDBOXED — a sandboxed process can't write to ~/.claude.
 *   2. Strip CLAUDECODE + CLAUDE_CODE* from the child env (else nested-child
 *      session → no transcript).
 *   3. Fresh session-id per run (collision → "Session ID already in use").
 *   No API key is needed here (claude uses the local profile; this probe makes
 *   no LLM calls of its own).
 *
 * Usage:  npx tsx capture-probe.ts      (must be unsandboxed)
 */
import * as pty from 'node-pty';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const SID = randomUUID();
const ctrl = fs.mkdtempSync(path.join(os.tmpdir(), 'curion-probe-'));
const startFile = path.join(ctrl, 'session-start.json');
const stopFile = path.join(ctrl, 'stop.jsonl');

// Our two basic, cross-agent hooks (verified shape).
const settings = {
  hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${startFile}` }] }],
    Stop: [{ hooks: [{ type: 'command', command: `cat >> ${stopFile}` }] }],
  },
};
const settingsFile = path.join(ctrl, 'settings.json');
fs.writeFileSync(settingsFile, JSON.stringify(settings));

// Fresh top-level session: drop inherited Claude-Code child-session markers.
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (v === undefined) continue;
  if (k === 'CLAUDECODE' || k.startsWith('CLAUDE_CODE')) continue;
  env[k] = v;
}

const args = ['hi', '--session-id', SID, '--permission-mode', 'auto', '--settings', settingsFile];
console.log('cmd : claude ' + args.join(' '));
console.log('ctrl:', ctrl);

const t0 = Date.now();
const term = pty.spawn('claude', args, { name: 'xterm-256color', cols: 200, rows: 50, cwd: process.cwd(), env });
term.onData(() => { /* drain */ });

let transcriptPath = '';
let firstSeen = 0;
const iv = setInterval(() => {
  const ms = Date.now() - t0;
  if (!transcriptPath && fs.existsSync(startFile)) {
    try {
      const p = JSON.parse(fs.readFileSync(startFile, 'utf8'));
      transcriptPath = p.transcript_path;
      console.log(`[${ms}ms] SessionStart → transcript_path = ${transcriptPath}`);
    } catch { /* partial write */ }
  }
  if (transcriptPath && fs.existsSync(transcriptPath)) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean).length;
    if (!firstSeen) { firstSeen = ms; console.log(`[${ms}ms] transcript first present (${lines} lines)`); }
    else console.log(`[${ms}ms] transcript ${lines} lines`);
  }
}, 1000);

setTimeout(() => {
  clearInterval(iv);
  console.log('\n=== RESULT ===');
  console.log('transcript first appeared at:', firstSeen ? firstSeen + 'ms' : 'NEVER');
  if (fs.existsSync(stopFile)) {
    const stop = JSON.parse(fs.readFileSync(stopFile, 'utf8').trim().split('\n').pop()!);
    console.log('Stop hook fired. last_assistant_message:', JSON.stringify(stop.last_assistant_message)?.slice(0, 300));
  } else {
    console.log('Stop hook did NOT fire within the window.');
  }
  try { term.write('/exit\r'); } catch {}
  setTimeout(() => { try { term.kill(); } catch {} fs.rmSync(ctrl, { recursive: true, force: true }); process.exit(0); }, 2500);
}, 25000);

#!/usr/bin/env node
// Rosetta hooks diagnostics — a dump-first tester usable with ANY hook.
// Reads stdin, then IMMEDIATELY (before parsing) appends a full dump — full invocation string,
// argv, cwd, script dir, raw stdin, every env var — to ~/.rosetta/hooks.log, one
// `[<ISO-ms-timestamp>] [<pid>] <message>` line each.
// Then it JSON-parses the input and runs flag-selected processors. Each `--flag` maps to ONE
// processor fn(input, argValue, output, flags) that mutates `output` ({ text, stderr, exitCode }); the
// runner writes output.text to stdout, output.stderr to stderr, and exits with output.exitCode.
// (!) STDERR channel: a processor may put text on STDERR instead of (or alongside) stdout. Used by the
// windsurf mode, where there is NO stdout-JSON contract — a pre-hook BLOCKS by writing the reason to
// STDERR and exiting 2 ("The Cascade agent will see the error message from stderr").
// Usage: <hook stdin> | node tester.js [--exit-code <n>] [--output <text>] [--tag <label>]
//        [--deny-on-match <substr>] [--rewrite-command <match>::<newCmd>] [--block-stop-once]
//        [--mode <copilot|codex|claude|cursor|gemini|windsurf|devin|...>]
//        [--copilot-rewrite-result <match>::<newText>]
//        [--exit-code-on-match <substr>] [--cursor-ask-on-match <substr>] [--cursor-crash-on-match <substr>]
// tester.js is UNIVERSAL. Commands whose OUTPUT SHAPE differs per IDE take a `--mode <ide>` PARAMETER
// (default: copilot) and emit THAT IDE's EXACT shape: Copilot emits fields at BOTH top-level AND nested
// hookSpecificOutput; Codex validates STRICTLY and accepts only the documented per-event shape (nested
// for deny/rewrite, top-level for Stop), so any extra/misplaced field FAILS the whole hook. Commands
// that exist for ONLY one IDE are named for it (e.g. --copilot-rewrite-result = Copilot `modifiedResult`;
// Codex has no equivalent). Add IDEs by extending the `--mode` switch; add IDE-only behavior as its own
// `--<ide>-<verb>` command — one processor fn + one PROCESSORS entry, nothing else.
// (!) The env dump WILL capture secrets/tokens present in the hook environment. The log lives at
//     ~/.rosetta/hooks.log (outside any repo) — do not share or commit it.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const LOG_DIR = path.join(os.homedir(), '.rosetta');
const LOG_FILE = path.join(LOG_DIR, 'hooks.log');

// Append `message` to the log; every physical line is prefixed `[<ms-timestamp>] [<pid>] `.
// Never throws — diagnostics must not break the host hook.
function log(message) {
  const prefix = `[${new Date().toISOString()}] [${process.pid}] `;
  const body = String(message).split('\n').map((line) => prefix + line).join('\n');
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, body + '\n');
  } catch (_) {
    /* swallow: a failed log must never abort the hook */
  }
}

// Read all of stdin synchronously (fd 0). Returns '' if stdin is absent or unreadable.
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_) {
    return '';
  }
}

// Minimal flag parser. Supports `--flag value` and `--flag=value`; a flag with no value -> true.
function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flags[arg.slice(0, eq)] = arg.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[arg] = next;
        i++;
      } else {
        flags[arg] = true;
      }
    }
  }
  return flags;
}

// Split a "<match>::<payload>" processor argument into [match, payload].
function splitMatchPayload(value) {
  const i = typeof value === 'string' ? value.indexOf('::') : -1;
  return i === -1 ? [String(value), ''] : [value.slice(0, i), value.slice(i + 2)];
}

// Parse the JSON currently staged in output.text (so processors can compose), or {} if none/invalid.
function stagedJson(output) {
  if (!output.text) return {};
  try { return JSON.parse(output.text); } catch (_) { return {}; }
}

// IDE output mode for shape-divergent commands, from the `--mode <ide>` parameter. Default 'copilot'
// (back-compat: existing configs that pass no --mode keep the Copilot shape).
function modeOf(flags) {
  return String((flags && flags['--mode']) || 'copilot').toLowerCase();
}

// Processors: (input, argValue, output, flags) => void. Each mutates `output`. Keyed by flag.
const PROCESSORS = {
  // Parameter only — read by shape-divergent commands via modeOf(flags); no output of its own.
  '--mode': () => {},
  // Set the process exit code to the provided value.
  '--exit-code': (input, value, output) => {
    const n = Number(value);
    if (Number.isFinite(n)) output.exitCode = n;
  },
  // Write the provided text to stdout (the hook return channel).
  '--output': (input, value, output) => {
    output.text = typeof value === 'string' ? value : '';
  },
  // Label only — does nothing to output. Surfaces in the log's INVOCATION/ARGV so you can tell
  // which registered hook key fired (e.g. distinguish camelCase `preToolUse` from `PreToolUse`).
  '--tag': () => {},
  // Conditional prevention test: if the (serialized) input contains <substr>, emit a PreToolUse
  // deny carrying a hook-test reason that asks the AI to report the block and then continue.
  // No match => leaves output untouched (tool proceeds normally). Shape per --mode.
  '--deny-on-match': (input, value, output, flags) => {
    if (typeof value !== 'string' || !input) return;
    if (!JSON.stringify(input).includes(value)) return;
    const reason =
      'HOOK TEST (Rosetta diagnostic): this tool call was intentionally DENIED by a PreToolUse hook ' +
      'because the request matched the test target. This is only a test of hook-based prevention. ' +
      'Please (1) tell the user verbatim that a hook blocked this action and quote this reason, ' +
      'then (2) continue with the rest of the task normally.';
    const nested = { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason };
    switch (modeOf(flags)) {
      case 'windsurf': { // Windsurf/Cascade: NO stdout-JSON contract. A pre-hook BLOCKS by writing the
        // reason to STDERR and exiting 2 — "The Cascade agent will see the error message from stderr."
        // stdout is NOT parsed, so there is no permissionDecision/JSON to emit.
        output.stderr =
          'HOOK TEST (Rosetta diagnostic): this action was intentionally BLOCKED by a Cascade pre-hook ' +
          '(exit code 2) because the request matched the test target. This is only a test of hook-based ' +
          'prevention. Please (1) tell the user verbatim that a hook blocked this action and quote this ' +
          'message, then (2) continue with the rest of the task normally.';
        output.exitCode = 2;
        break;
      }
      case 'devin': // Devin `.devin/hooks.v1.json` (Claude-Code-style): stdout IS parsed. Deny via
        // TOP-LEVEL {decision:"block", reason} at exit 0 — Devin docs use `decision`, not
        // `permissionDecision`. (If the run shows PreToolUse needs exit 2 instead, flip here.)
        output.text = JSON.stringify({ decision: 'block', reason: reason });
        break;
      case 'claude': // Claude Code: canonical = nested hookSpecificOutput (no top-level copy). Deny at exit 0.
      case 'codex': // STRICT: nested hookSpecificOutput ONLY (top-level keys fail the whole hook).
        output.text = JSON.stringify({ hookSpecificOutput: nested });
        break;
      case 'cursor': // Cursor: FLAT snake_case, NO wrapper. permission:"deny" + two reason channels —
        // user_message (USER/UI) and agent_message (AGENT/model). Distinct markers reveal which reaches
        // the model. Same shape serves preToolUse / beforeReadFile / beforeShellExecution.
        output.text = JSON.stringify({
          permission: 'deny',
          user_message: 'HOOK TEST (Rosetta diagnostic): user-facing deny channel marker CURSOR-DENY-USER (shown in the Cursor UI).',
          agent_message: reason + ' [agent-channel marker CURSOR-DENY-AGENT; Report DA1]',
        });
        break;
      case 'copilot':
      default: // Copilot: emit BOTH top-level AND nested (each runtime reads the one it honors).
        output.text = JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: reason, hookSpecificOutput: nested });
    }
  },
  // PreToolUse arg-rewrite test. Arg: "<matchSubstr>::<newCommand>". If the input contains
  // <matchSubstr>, rewrite the command so we can see whether the runtime substitutes tool args
  // before execution. Shape per --mode.
  '--rewrite-command': (input, value, output, flags) => {
    if (typeof value !== 'string' || !input) return;
    const [match, newCmd] = splitMatchPayload(value);
    if (!match || !JSON.stringify(input).includes(match)) return;
    const obj = stagedJson(output);
    switch (modeOf(flags)) {
      case 'windsurf': // Windsurf/Cascade has NO arg-rewrite mechanism (stdout not parsed) — no-op.
      case 'devin':    // Devin documents no PreToolUse arg-rewrite — no-op.
        return;
      case 'claude': // Claude Code: allow + nested hookSpecificOutput.updatedInput (canonical; no top-level modifiedArgs).
      case 'codex': // allow + rewrite via hookSpecificOutput.updatedInput ONLY (no top-level modifiedArgs).
        obj.hookSpecificOutput = Object.assign({ hookEventName: 'PreToolUse' }, obj.hookSpecificOutput, { permissionDecision: 'allow', updatedInput: { command: newCmd } });
        break;
      case 'cursor': // Cursor: FLAT permission:"allow" + updated_input (preToolUse only; no wrapper).
        obj.permission = 'allow';
        obj.updated_input = { command: newCmd };
        break;
      case 'copilot':
      default: // Copilot: modifiedArgs (top-level) + hookSpecificOutput.updatedInput.
        obj.modifiedArgs = { command: newCmd };
        obj.hookSpecificOutput = Object.assign({ hookEventName: 'PreToolUse' }, obj.hookSpecificOutput, { updatedInput: { command: newCmd } });
    }
    output.text = JSON.stringify(obj);
  },
  // COPILOT-ONLY. PostToolUse result-rewrite (`modifiedResult`, Copilot/CLI). Arg: "<match>::<newText>".
  // Codex has NO equivalent (PostToolUse cannot replace the result), so this is named for Copilot.
  '--copilot-rewrite-result': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    const [match, newText] = splitMatchPayload(value);
    if (!match || !JSON.stringify(input).includes(match)) return;
    const obj = stagedJson(output);
    obj.modifiedResult = { resultType: 'success', textResultForLlm: newText };
    output.text = JSON.stringify(obj);
  },
  // Pure exit-code block test: if matched, set ONLY the exit code (no stdout body at all) — isolates
  // whether a non-zero/2 exit blocks the action WITHOUT any JSON, vs the JSON-deny path tested by
  // --deny-on-match. No match => untouched.
  '--exit-code-on-match': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    if (!JSON.stringify(input).includes(value)) return;
    output.exitCode = 2;
  },
  // CURSOR-ONLY. Combined JSON-deny + exit-2 test (what Action 2's real fix would actually produce):
  // if matched, emit the SAME flat deny body as --deny-on-match's cursor case AND set exit code 2 —
  // isolates whether pairing exit-2 with the JSON body still delivers user_message/agent_message,
  // vs the bare exit-0+JSON path already confirmed in Runs 1+3. No match => untouched.
  '--cursor-deny-and-exit2-on-match': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    if (!JSON.stringify(input).includes(value)) return;
    output.text = JSON.stringify({
      permission: 'deny',
      user_message: 'HOOK TEST (Rosetta diagnostic): user-facing deny channel marker CURSOR-EXIT2-USER (exit-2 + JSON combined test).',
      agent_message: 'HOOK TEST (Rosetta diagnostic): agent-facing deny channel marker CURSOR-EXIT2-AGENT; Report DE1 (exit-2 + JSON combined test).',
    });
    output.exitCode = 2;
  },
  // CURSOR-ONLY. `ask` permission test (R1: accepted+enforced on beforeShellExecution/
  // beforeMCPExecution, schema-accepted-but-NOT-enforced on preToolUse). Flat shape, no wrapper.
  '--cursor-ask-on-match': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    if (!JSON.stringify(input).includes(value)) return;
    output.text = JSON.stringify({
      permission: 'ask',
      user_message: 'HOOK TEST (Rosetta diagnostic): this action requires explicit approval (permission:"ask") — marker CURSOR-ASK-1.',
    });
  },
  // CURSOR-ONLY. failClosed test: if matched, CRASH (uncaught throw -> non-zero exit, no valid JSON) to
  // simulate a hook failure. Pair one handler with `"failClosed": false`/omitted (expect fail-OPEN: the
  // action proceeds) and one with `"failClosed": true` on the SAME event (expect fail-CLOSED: blocked).
  '--cursor-crash-on-match': (input, value) => {
    if (typeof value !== 'string' || !input) return;
    if (!JSON.stringify(input).includes(value)) return;
    throw new Error('HOOK TEST (Rosetta diagnostic): intentional crash to test failClosed behavior.');
  },
  // Stop block test — blocks the turn-stop EXACTLY ONCE per session, then allows. Uses an atomic
  // marker file (keyed by session id) so it can NEVER loop. Reset: delete the marker file. Shape per --mode.
  '--block-stop-once': (input, value, output, flags) => {
    if (!input) return;
    if (modeOf(flags) === 'windsurf') return; // Windsurf has NO Stop event; post-hooks cannot block — no-op.
    const sid = String(input.session_id || input.sessionId || 'global').replace(/[^A-Za-z0-9_.-]/g, '_');
    const marker = path.join(LOG_DIR, `.block-stop-once-${sid}`);
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.closeSync(fs.openSync(marker, 'wx')); // atomic create; throws if it already exists
    } catch (_) {
      return; // marker already present → not the first stop → allow
    }
    const obj = stagedJson(output);
    if (modeOf(flags) === 'cursor') {
      // Cursor `stop` has NO block mechanism; it auto-submits `followup_message` as the next user turn.
      // Once-marker prevents an infinite auto-submit loop. Flat snake_case, no wrapper.
      obj.followup_message =
        'HOOK TEST (Rosetta diagnostic): one-time auto-submitted follow-up from a Cursor `stop` hook ' +
        '(continuation test). Reply with exactly: STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1 — then stop. ' +
        'It will NOT trigger again this session.';
      output.text = JSON.stringify(obj);
      return;
    }
    const reason =
      'HOOK TEST (Rosetta diagnostic): your turn-stop was blocked ONE TIME by a Stop hook to test ' +
      'prevention. Please tell the user verbatim that the Stop hook blocked once and quote this reason, ' +
      'then finish normally — it will NOT block again this session.';
    obj.decision = 'block';
    obj.reason = reason;
    // Codex / Claude Code / Devin: top-level {decision, reason} ONLY (Devin's Stop output is
    // top-level {decision:"block", reason} per its hooks reference; no nested wrapper).
    // Copilot: also mirror into hookSpecificOutput.
    if (modeOf(flags) !== 'codex' && modeOf(flags) !== 'claude' && modeOf(flags) !== 'devin') {
      obj.hookSpecificOutput = Object.assign({ hookEventName: 'Stop' }, obj.hookSpecificOutput, { decision: 'block', reason: reason });
    }
    output.text = JSON.stringify(obj);
  },
};

function main() {
  const raw = readStdin();
  const argv = process.argv.slice(2);

  // 1) DUMP FIRST — before any parsing, so a malformed payload is still fully captured.
  log('===== hook invocation =====');
  log('INVOCATION: ' + process.argv.join(' '));
  log('ARGV: ' + JSON.stringify(argv));
  log('CWD: ' + process.cwd());
  log('SCRIPT DIR (__dirname): ' + __dirname);
  log('RAW STDIN:');
  log(raw.length ? raw : '<empty>');
  log('ENV:');
  for (const key of Object.keys(process.env).sort()) {
    log(`  ${key}=${process.env[key]}`);
  }

  // 2) Parse input (best-effort) and record the outcome.
  let input = null;
  if (raw.trim().length) {
    try {
      input = JSON.parse(raw);
      log('PARSED INPUT: ' + JSON.stringify(input));
    } catch (e) {
      log('PARSE ERROR: ' + e.message);
    }
  } else {
    log('PARSED INPUT: <no stdin>');
  }

  // 3) Run flag-selected processors over a mutable output accumulator.
  const flags = parseFlags(argv);
  const output = { text: '', stderr: '', exitCode: 0 };
  for (const flag of Object.keys(flags)) {
    const proc = PROCESSORS[flag];
    if (!proc) {
      log('UNKNOWN FLAG (ignored): ' + flag);
      continue;
    }
    log(`PROCESSOR: ${flag} (value=${JSON.stringify(flags[flag])})`);
    proc(input, flags[flag], output, flags);
  }

  // 4) Emit: text -> stdout, stderr -> stderr (e.g. Windsurf/Cascade block reason), then exit.
  if (output.text) process.stdout.write(output.text);
  if (output.stderr) process.stderr.write(output.stderr);
  log(`RESULT: exitCode=${output.exitCode} textLen=${output.text.length} stderrLen=${output.stderr.length}`);
  log('');
  process.exit(output.exitCode);
}

main();

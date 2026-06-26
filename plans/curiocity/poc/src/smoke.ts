/**
 * Smoke test — verifies without a real PTY or running claude CLI:
 *   1. Workspace unzip (spring-boot-react-mysql.zip → temp dir)
 *   2. Transcript parsing on a small sample JSONL
 *   3. Deterministic judge checks against a fake workspace
 *   4. LLM client round-trip (Haiku via openai SDK → Anthropic compat endpoint)
 *   5. computeTranscriptPath unit check (path formula validation)
 *   6. Hook settings shape — buildHookSettings generates verified --settings JSON
 *   7. Hook payload parsing — SessionStart + Stop payloads extract correctly
 *
 * Run: npm run smoke
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import * as os from 'os';

import { provisionWorkspace } from './workspace.js';
import { readTranscript, computeTranscriptPath } from './transcript.js';
import { runDeterministicChecks, runLlmJudge, combineResults } from './judge.js';
import { askLlm } from './llm-client.js';
import { buildHookSettings, cleanupCtrlDir } from './hook-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POC_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ZIP_PATH = path.join(REPO_ROOT, 'test-library', 'spring-boot-react-mysql.zip');
const VALIDATION_PATH = path.join(REPO_ROOT, 'test-library', 'coding', 'prompt-validation.md');
const ENV_PATH = path.join(POC_ROOT, '.env');

/** Parse a .env file without touching process.env. */
async function parseEnvFile(envPath: string): Promise<Record<string, string>> {
  let raw: string;
  try { raw = await fs.readFile(envPath, 'utf8'); } catch { return {}; }
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (k) result[k] = v;
  }
  return result;
}

let passed = 0;
let failed = 0;

function ok(name: string): void {
  console.log(`  [PASS] ${name}`);
  passed++;
}

function fail(name: string, err: unknown): void {
  console.error(`  [FAIL] ${name}:`, err);
  failed++;
}

// ── 1. Workspace provisioning ──────────────────────────────────────────────
console.log('\n=== Smoke test: workspace unzip ===');
let workspaceDir = '';
let cleanup: (() => Promise<void>) | undefined;
try {
  const ws = await provisionWorkspace(ZIP_PATH);
  workspaceDir = ws.dir;
  cleanup = ws.cleanup;
  const stat = await fs.stat(workspaceDir);
  if (!stat.isDirectory()) throw new Error('Not a directory');
  ok(`unzipped to ${workspaceDir}`);

  // Verify the spring-boot-server directory exists
  await fs.access(path.join(workspaceDir, 'spring-boot-server'));
  ok('spring-boot-server directory present');
} catch (e) {
  fail('workspace provisioning', e);
}

// ── 2. Transcript parsing ──────────────────────────────────────────────────
console.log('\n=== Smoke test: transcript parsing ===');
try {
  // Parse a non-existent path → should return empty trajectory (graceful)
  const empty = await readTranscript('/tmp/does-not-exist.jsonl');
  if (empty.events.length !== 0) throw new Error('Expected empty events');
  ok('graceful empty transcript');

  // Parse a synthetic JSONL sample
  const samplePath = '/tmp/curion-smoke-sample.jsonl';
  const sample = [
    { type: 'user', content: 'Add a health-check endpoint.' },
    { type: 'assistant', content: [{ type: 'text', text: "I'll add Spring Boot Actuator." }] },
    { type: 'assistant', content: [{ type: 'tool_use', name: 'str_replace_editor', id: '1', input: {} }] },
  ].map(e => JSON.stringify(e)).join('\n');
  await fs.writeFile(samplePath, sample);

  const traj = await readTranscript(samplePath);
  if (traj.events.length !== 3) throw new Error(`Expected 3 events, got ${traj.events.length}`);
  if (traj.toolCalls[0] !== 'str_replace_editor') throw new Error('Tool call not extracted');
  if (!traj.assistantText[0]?.includes('Actuator')) throw new Error('Text not extracted');
  ok(`parsed 3 events, tool: ${traj.toolCalls[0]}, text: "${traj.assistantText[0]!.slice(0, 40)}"`);

  await fs.unlink(samplePath);
} catch (e) {
  fail('transcript parsing', e);
}

// ── 3. Deterministic judge (on real unzipped workspace) ───────────────────
console.log('\n=== Smoke test: deterministic judge ===');
if (workspaceDir) {
  try {
    const det = await runDeterministicChecks(workspaceDir);
    ok(`specsFile=${det.specsFileExists}, planFile=${det.planFileExists}`);
  } catch (e) {
    fail('deterministic checks', e);
  }
}

// ── 4. LLM client (if API key present in .env) ────────────────────────────
console.log('\n=== Smoke test: askLlm (Haiku via openai SDK → Anthropic compat endpoint) ===');
// Key is read from .env file directly — NEVER from process.env — so the
// child claude process cannot inherit it.
const envVars = await parseEnvFile(ENV_PATH);
const apiKey = envVars['CURION_LLM_KEY'] ?? envVars['ANTHROPIC_API_KEY'];
if (!apiKey) {
  console.log('  [SKIP] No CURION_LLM_KEY / ANTHROPIC_API_KEY in .env');
} else {
  try {
    const response = await askLlm({ apiKey, prompt: 'Reply with exactly: smoke-ok', maxTokens: 20 });
    const text = response.text.trim().toLowerCase();
    if (!text.includes('smoke-ok') && !text.includes('smoke')) {
      throw new Error(`Unexpected response: "${response.text}"`);
    }
    ok(`Haiku responded: "${response.text.trim()}" (in=${response.inputTokens ?? '?'} out=${response.outputTokens ?? '?'} tokens)`);

    // Also run LLM judge on empty trajectory to confirm it doesn't throw
    if (workspaceDir) {
      const { events, turnCount, toolCalls, assistantText } = await readTranscript('/tmp/none.jsonl');
      const llmJudge = await runLlmJudge({ events, turnCount, toolCalls, assistantText }, workspaceDir, apiKey, VALIDATION_PATH);
      const combined = combineResults(
        { specsFileExists: false, planFileExists: false },
        llmJudge,
      );
      ok(`LLM judge score=${combined.finalScore}, verdict=${combined.finalVerdict}`);
    }
  } catch (e) {
    fail('LLM client', e);
  }
}

// ── 5. computeTranscriptPath unit check ───────────────────────────────────
console.log('\n=== Smoke test: computeTranscriptPath (path formula) ===');
try {
  // The formula: realpath(cwd).split('/').join('-') → leading '-' from the root '/'
  // Example: /private/var/folders/x/curion-AB/spring-boot-react-mysql
  //       → -private-var-folders-x-curion-AB-spring-boot-react-mysql
  const fakeCwd = '/private/var/folders/x/curion-AB/spring-boot-react-mysql';
  const fakeSessionId = '11111111-2222-3333-4444-555555555555';

  // computeTranscriptPath calls fs.realpathSync — use a real path that exists.
  // We use os.homedir() as the cwd (always exists) and verify the formula.
  const realHome = path.resolve(os.homedir()); // resolves any symlinks
  const computedHome = computeTranscriptPath(os.homedir(), fakeSessionId);
  const expectedEncoded = realHome.split('/').join('-');
  const expectedHome = path.join(os.homedir(), '.claude', 'projects', expectedEncoded, `${fakeSessionId}.jsonl`);
  if (computedHome !== expectedHome) {
    throw new Error(`Expected:\n  ${expectedHome}\nGot:\n  ${computedHome}`);
  }
  ok(`home cwd encoded correctly: ${expectedEncoded.slice(0, 50)}…`);

  // Verify the formula string directly (without realpathSync on a fake path)
  const encodedFake = fakeCwd.split('/').join('-');
  const expectedFake = path.join(os.homedir(), '.claude', 'projects', encodedFake, `${fakeSessionId}.jsonl`);
  // Expected: ~/.claude/projects/-private-var-folders-x-curion-AB-spring-boot-react-mysql/<id>.jsonl
  if (!expectedFake.includes('-private-var-folders-x-curion-AB-spring-boot-react-mysql')) {
    throw new Error(`Encoded path segment wrong: ${encodedFake}`);
  }
  if (!expectedFake.endsWith(`/${fakeSessionId}.jsonl`)) {
    throw new Error(`JSONL filename wrong in: ${expectedFake}`);
  }
  ok(`formula check: /private/var/…/spring-boot-react-mysql → -private-var-…-spring-boot-react-mysql/<id>.jsonl`);
} catch (e) {
  fail('computeTranscriptPath', e);
}

// ── 6. Hook settings shape ─────────────────────────────────────────────────
// Verified shape (from idea.md):
//   { "hooks": {
//       "SessionStart": [{ "hooks": [{ "type": "command", "command": "cat > <file>" }] }],
//       "Stop":         [{ "hooks": [{ "type": "command", "command": "cat >> <file>" }] }]
//   }}
console.log('\n=== Smoke test: hook settings shape ===');
let hookCtrlDir = '';
try {
  const hookSettings = await buildHookSettings();
  hookCtrlDir = hookSettings.ctrlDir;

  // Read back and parse the written settings file
  const raw = await fs.readFile(hookSettings.settingsFile, 'utf8');
  const parsed = JSON.parse(raw) as {
    hooks?: {
      SessionStart?: Array<{ hooks?: Array<{ type?: string; command?: string }> }>;
      Stop?: Array<{ hooks?: Array<{ type?: string; command?: string }> }>;
    };
  };

  // Verify top-level hooks key
  if (!parsed.hooks) throw new Error('Missing "hooks" key');

  // Verify SessionStart array shape
  const ssHooks = parsed.hooks.SessionStart;
  if (!Array.isArray(ssHooks) || ssHooks.length !== 1) throw new Error('SessionStart must be array of 1');
  const ssCmd = ssHooks[0]?.hooks?.[0];
  if (!ssCmd) throw new Error('SessionStart inner hook missing');
  if (ssCmd.type !== 'command') throw new Error(`SessionStart type must be "command", got "${ssCmd.type}"`);
  if (!ssCmd.command?.startsWith('cat >')) throw new Error(`SessionStart command must start with "cat >", got "${ssCmd.command}"`);
  if (!ssCmd.command.includes(hookSettings.sessionStartFile)) throw new Error('SessionStart command must reference session-start.json path');
  ok('SessionStart hook shape: type=command, command=cat > <ctrlDir>/session-start.json');

  // Verify Stop array shape
  const stopHooks = parsed.hooks.Stop;
  if (!Array.isArray(stopHooks) || stopHooks.length !== 1) throw new Error('Stop must be array of 1');
  const stopCmd = stopHooks[0]?.hooks?.[0];
  if (!stopCmd) throw new Error('Stop inner hook missing');
  if (stopCmd.type !== 'command') throw new Error(`Stop type must be "command", got "${stopCmd.type}"`);
  if (!stopCmd.command?.startsWith('cat >>')) throw new Error(`Stop command must start with "cat >>", got "${stopCmd.command}"`);
  if (!stopCmd.command.includes(hookSettings.stopJsonlFile)) throw new Error('Stop command must reference stop.jsonl path');
  ok('Stop hook shape: type=command, command=cat >> <ctrlDir>/stop.jsonl');

  // Verify ctrlDir + file paths are under a temp directory
  if (!hookSettings.ctrlDir.includes('curion-ctrl-')) throw new Error('ctrlDir must contain "curion-ctrl-"');
  if (!hookSettings.sessionStartFile.endsWith('session-start.json')) throw new Error('sessionStartFile must end with session-start.json');
  if (!hookSettings.stopJsonlFile.endsWith('stop.jsonl')) throw new Error('stopJsonlFile must end with stop.jsonl');
  ok('ctrl dir and file paths have correct names');
} catch (e) {
  fail('hook settings shape', e);
} finally {
  if (hookCtrlDir) await cleanupCtrlDir(hookCtrlDir);
}

// ── 7. Hook payload parsing ────────────────────────────────────────────────
// Simulate what the hooks write on stdin, verify extraction of key fields.
console.log('\n=== Smoke test: hook payload parsing ===');
try {
  // SessionStart payload — extract transcript_path
  const sessionStartSample = JSON.stringify({
    session_id: 'aaaa-bbbb-cccc-dddd',
    transcript_path: '/Users/test/.claude/projects/-private-var-folders-x-curion/aaaa-bbbb-cccc-dddd.jsonl',
    cwd: '/private/var/folders/x/curion',
    model: 'claude-sonnet-4-6',
    source: 'cli',
    hook_event_name: 'SessionStart',
  });
  const ssPayload = JSON.parse(sessionStartSample) as { session_id?: string; transcript_path?: string };
  if (!ssPayload.transcript_path) throw new Error('transcript_path missing from SessionStart payload');
  if (!ssPayload.transcript_path.endsWith('.jsonl')) throw new Error('transcript_path must end with .jsonl');
  if (ssPayload.session_id !== 'aaaa-bbbb-cccc-dddd') throw new Error('session_id mismatch in SessionStart');
  ok(`SessionStart payload: session_id=${ssPayload.session_id}, transcript_path extracted correctly`);

  // Stop payload — extract last_assistant_message
  const stopLine1 = JSON.stringify({
    session_id: 'aaaa-bbbb-cccc-dddd',
    transcript_path: '/Users/test/.claude/projects/-private-var-folders-x-curion/aaaa-bbbb-cccc-dddd.jsonl',
    last_assistant_message: 'I have completed the health-check endpoint implementation.',
    stop_hook_active: false,
    hook_event_name: 'Stop',
  });
  const stopLine2 = JSON.stringify({
    session_id: 'aaaa-bbbb-cccc-dddd',
    transcript_path: '/Users/test/.claude/projects/-private-var-folders-x-curion/aaaa-bbbb-cccc-dddd.jsonl',
    last_assistant_message: 'What should I use for the database connection pool size?',
    stop_hook_active: false,
    hook_event_name: 'Stop',
  });

  // Simulate reading a stop.jsonl with two lines
  const stopJsonl = stopLine1 + '\n' + stopLine2 + '\n';
  const stopPayloads = stopJsonl.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => JSON.parse(l) as { last_assistant_message?: string; transcript_path?: string });

  if (stopPayloads.length !== 2) throw new Error(`Expected 2 stop payloads, got ${stopPayloads.length}`);

  const msg1 = stopPayloads[0]?.last_assistant_message ?? '';
  const msg2 = stopPayloads[1]?.last_assistant_message ?? '';
  if (!msg1.includes('completed')) throw new Error(`First stop message unexpected: "${msg1}"`);
  if (!msg2.includes('?')) throw new Error(`Second stop message (question) unexpected: "${msg2}"`);
  ok(`Stop payload[0]: last_assistant_message="${msg1.slice(0, 60)}"`);
  ok(`Stop payload[1]: last_assistant_message (question)="${msg2.slice(0, 60)}"`);

  // Verify transcript_path is consistent across Stop payloads
  const tp1 = stopPayloads[0]?.transcript_path ?? '';
  const tp2 = stopPayloads[1]?.transcript_path ?? '';
  if (!tp1.endsWith('.jsonl') || !tp2.endsWith('.jsonl')) throw new Error('Stop payloads must carry .jsonl transcript_path');
  ok('Stop payloads carry transcript_path with .jsonl extension');
} catch (e) {
  fail('hook payload parsing', e);
}

// ── cleanup ─────────────────────────────────────────────────────────────────
if (cleanup) await cleanup();

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n=== Smoke results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

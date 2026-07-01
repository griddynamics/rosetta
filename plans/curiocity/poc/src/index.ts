/**
 * Curiocity PoC — Curion worker entry point.
 *
 * Hardcoded single case: spring-boot-react-mysql × health-check coding task.
 *
 * Run:
 *   npm run dev          (tsx, no build needed)
 *   npm run build && npm start
 *
 * Requires:
 *   - CURION_LLM_KEY (or ANTHROPIC_API_KEY) in plans/curiocity/poc/.env
 *     The key is read directly from the file — NEVER placed in process.env —
 *     so the `claude` child process cannot inherit it and bill the org account.
 *   - claude CLI installed and authenticated (https://code.claude.com)
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { provisionWorkspace } from './workspace.js';
import { installRosettaPlugin } from './provisioner.js';
import { runClaude } from './pty-runner.js';
import {
  computeTranscriptPath,
  locateTranscript,
  tailTranscriptUntilDone,
  readTranscripts,
} from './transcript.js';
import { runDeterministicChecks, runLlmJudge, combineResults } from './judge.js';

// ── paths (relative to this file's location) ─────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POC_ROOT = path.resolve(__dirname, '..'); // plans/curiocity/poc/
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..'); // rosetta-manual-branch root

const ENV_PATH = path.join(POC_ROOT, '.env');
const ZIP_PATH = path.join(REPO_ROOT, 'test-library', 'spring-boot-react-mysql.zip');
const PROMPT_PATH = path.join(REPO_ROOT, 'test-library', 'coding', 'prompt-request.md');
const VALIDATION_PATH = path.join(REPO_ROOT, 'test-library', 'coding', 'prompt-validation.md');

/**
 * Parse a .env file and return its key=value pairs as a plain object.
 * Does NOT write anything into process.env.
 */
async function parseEnvFile(envPath: string): Promise<Record<string, string>> {
  let raw: string;
  try {
    raw = await fs.readFile(envPath, 'utf8');
  } catch {
    return {};
  }
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

async function main(): Promise<void> {
  console.log('=== Curiocity PoC — Curion worker ===\n');

  // ── read key from .env WITHOUT touching process.env ────────────────────
  const envVars = await parseEnvFile(ENV_PATH);
  // Accept CURION_LLM_KEY (preferred) or ANTHROPIC_API_KEY as fallback — read
  // only from the file, never from process.env, so claude never sees it.
  const CURION_LLM_KEY = envVars['CURION_LLM_KEY'] ?? envVars['ANTHROPIC_API_KEY'];
  if (!CURION_LLM_KEY) {
    console.error(
      `ERROR: No LLM key found in ${ENV_PATH}.\n` +
      'Add CURION_LLM_KEY=<your-key> (preferred) or ANTHROPIC_API_KEY=<key> to that file.',
    );
    process.exit(1);
  }

  // Safety guard: ensure the key was NOT leaked into this process's env.
  if (process.env['ANTHROPIC_API_KEY'] || process.env['ANTHROPIC_AUTH_TOKEN']) {
    console.warn(
      '[WARN] ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is already in process.env. ' +
      'The claude child process will inherit it and may bill the org account. ' +
      'Unset the variable from your shell before running this tool.',
    );
  }

  console.log('LLM: claude-sonnet-4-6 (judge) + claude-haiku-4-5 (QNA) via openai SDK → Anthropic compat endpoint');
  console.log('PTY: interactive claude TUI (no --print / --output-format)\n');

  // ── read prompt — submit raw, no autonomy prefix ────────────────────────
  const rawPrompt = (await fs.readFile(PROMPT_PATH, 'utf8')).trim();
  console.log(`Task prompt: ${rawPrompt.slice(0, 120)}${rawPrompt.length > 120 ? '...' : ''}\n`);

  // ── provision workspace ─────────────────────────────────────────────────
  console.log(`[1/5] Provisioning workspace from ${path.basename(ZIP_PATH)}...`);
  const workspace = await provisionWorkspace(ZIP_PATH);
  console.log(`      Workspace: ${workspace.dir}\n`);

  try {
    // ── check Rosetta plugin ────────────────────────────────────────────
    console.log('[2/5] Checking Rosetta plugin (default profile)...');
    await installRosettaPlugin('');
    console.log();

    // ── launch Claude Code via interactive PTY ──────────────────────────
    console.log('[3/5] Launching Claude Code (interactive TUI via node-pty)...');
    console.log('      No --print, no --output-format, no autonomy prefix.');
    console.log('      Trajectory from ~/.claude/projects/<cwd>/<session-id>.jsonl');
    console.log('      Turn state driven by JSONL events (not timers). No unsolicited input.\n');

    // Fresh UUID per run — reuse causes "Session ID already in use" and instant exit.
    const sessionId = uuidv4();

    // Compute JSONL path deterministically — no find/scan/poll needed.
    const jsonlPath = computeTranscriptPath(workspace.dir, sessionId);
    console.log(`      Session ID   : ${sessionId}`);
    console.log(`      JSONL path   : ${jsonlPath}`);

    // Gate promise that resolves when the PTY session exits.
    let resolveSessionDone!: () => void;
    const sessionDonePromise = new Promise<void>(r => { resolveSessionDone = r; });

    // Start PTY run (non-blocking — we await it below).
    const ptyRunPromise = runClaude({
      workspaceDir: workspace.dir,
      prompt: rawPrompt,
      sessionId,
      qnaContext: 'Health-check API endpoint task. Answer questions about project structure and Spring Boot.',
      apiKey: CURION_LLM_KEY,
    }).then(result => {
      resolveSessionDone();
      return result;
    });

    // Live-tail the JSONL (fs.watch-based; file appears within ~1s of claude start).
    console.log('      Tailing JSONL live (fs.watch, ~1s latency until first event)...');
    const tailedEvents = await tailTranscriptUntilDone(
      jsonlPath,
      sessionDonePromise,
      (evt) => {
        if (evt.type && evt.type !== 'system') {
          process.stdout.write('.');
        }
      },
    );
    process.stdout.write('\n');
    console.log(`      Live-tailed ${tailedEvents.length} events\n`);

    // Wait for PTY to fully complete.
    console.log('      Waiting for PTY session to complete (JSONL-driven, 30 min safety cap)...');
    const runResult = await ptyRunPromise;

    console.log(`\n      Duration     : ${(runResult.durationMs / 1000).toFixed(1)}s`);
    console.log(`      Exit code    : ${runResult.exitCode}`);
    console.log(`      Q&A entries  : ${runResult.qaLog.length}\n`);

    // ── locate and read trajectory JSONL ───────────────────────────────
    console.log('[4/5] Reading final trajectory from JSONL...');

    // locateTranscript tries the computed path first, then falls back to subagent scan.
    const transcriptPaths = await locateTranscript(jsonlPath, sessionId);
    let trajectory;
    if (transcriptPaths.length > 0) {
      trajectory = await readTranscripts(transcriptPaths);
    } else {
      console.warn('      JSONL not found — using empty trajectory');
      trajectory = { events: [], turnCount: 0, toolCalls: [], assistantText: [] };
    }

    console.log(`      Events     : ${trajectory.events.length}`);
    console.log(`      Turns      : ${trajectory.turnCount}`);
    console.log(`      Tool calls : ${trajectory.toolCalls.slice(0, 8).join(', ') || 'none'}\n`);

    // ── judge ───────────────────────────────────────────────────────────
    console.log('[5/5] Judging result...');
    const det = await runDeterministicChecks(workspace.dir);
    console.log(`      Specs file : ${det.specsFileExists}`);
    console.log(`      Plan file  : ${det.planFileExists}`);
    console.log(`      Validation : ${VALIDATION_PATH}`);

    const llmJudge = await runLlmJudge(
      trajectory,
      workspace.dir,
      CURION_LLM_KEY,
      VALIDATION_PATH,
      runResult.qaLog,
    );
    const result = combineResults(det, llmJudge);

    console.log('\n=== VERDICT ===');
    console.log(`  Score   : ${result.finalScore}/100`);
    console.log(`  Verdict : ${result.finalVerdict.toUpperCase()}`);
    console.log(`  Reason  : ${result.llmJudge.rationale}`);

    // ── emit JSON result ────────────────────────────────────────────────
    const jsonResult = {
      sessionId: runResult.sessionId,
      durationMs: runResult.durationMs,
      exitCode: runResult.exitCode,
      trajectory: {
        events: trajectory.events.length,
        toolCalls: trajectory.toolCalls,
      },
      qaLog: runResult.qaLog,
      deterministic: result.deterministic,
      llmJudge: result.llmJudge,
      finalScore: result.finalScore,
      finalVerdict: result.finalVerdict,
    };

    const resultPath = `/tmp/curion-result-${runResult.sessionId}.json`;
    await fs.writeFile(resultPath, JSON.stringify(jsonResult, null, 2));
    console.log(`\n  Full result written to: ${resultPath}`);
    console.log('\n--- JSON RESULT ---');
    console.log(JSON.stringify(jsonResult, null, 2));

  } finally {
    await workspace.cleanup();
    console.log('\n[done] Workspace cleaned up.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

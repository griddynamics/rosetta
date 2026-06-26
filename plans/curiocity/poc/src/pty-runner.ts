/**
 * PTY runner: spawns Claude Code in its real interactive TUI over a node-pty
 * pseudo-terminal.
 *
 * Hook-driven capture (verified 2026-06-23):
 *   - SessionStart hook → session-start.json → authoritative transcript_path
 *   - Stop hook → stop.jsonl (one line per turn) → last_assistant_message + turn signal
 *
 * Key design points:
 *   - Launch: claude "<prompt>" --permission-mode auto --session-id <uuid> --settings <file>
 *   - --settings JSON injects SessionStart + Stop hooks alongside existing hooks
 *   - Default profile (~/.claude) — no CLAUDE_CONFIG_DIR override
 *   - Transcript tailed from transcript_path given by SessionStart (authoritative)
 *   - Fallback: computeTranscriptPath if SessionStart never fires
 *   - Turn loop: driven by Stop hook signals, NOT by quiet timers or JSONL parsing
 *   - NEVER inject unsolicited input; each reply only on a Stop-hook turn signal
 *   - Safety cap (CURION_MAX_SESSION_MS) guards true infinite hangs — logs + exits cleanly
 *   - CLAUDECODE + all CLAUDE_CODE* stripped from env (avoids nested-child-session suppression)
 *   - API key never in env — passed only to LLM client via CURION_LLM_KEY
 */

import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { askLlm } from './llm-client.js';
import { computeTranscriptPath } from './transcript.js';
import {
  buildHookSettings,
  watchSessionStart,
  watchStopSignals,
  cleanupCtrlDir,
  type StopPayload,
} from './hook-runner.js';

export interface QnaEntry {
  type: 'tool' | 'text';
  question: string;
  answer: string;
  timestamp: string;
}

export interface RunOptions {
  workspaceDir: string;
  prompt: string;
  qnaContext: string;
  apiKey: string;
  /**
   * Optional pre-generated session ID (UUID). When provided, callers can start
   * tailing the JSONL concurrently with the PTY run. When omitted, a new UUID
   * is generated internally.
   */
  sessionId?: string;
  /**
   * Optional safety cap in ms. If set and fires, a warning is logged and the
   * session is closed cleanly. Default: 30 min.
   * Configurable via env CURION_MAX_SESSION_MS.
   */
  safetyCapMs?: number;
}

export interface RunResult {
  sessionId: string;
  transcriptPath: string;
  exitCode: number;
  durationMs: number;
  qaLog: QnaEntry[];
  rawScreenLog: string;
}

// ── Deterministic dialog patterns (screen-based, handled without LLM) ─────────
// Claude Code 2.1.x collapses whitespace after ANSI stripping — match both forms.
const TRUST_DIALOG_RE = /do\s*you\s*trust|files?\s*in\s*this\s*folder|you\s*trust\s*this|safety\s*check.*trust|i\s*trust\s*this\s*folder|Itrustthisfolder/i;
const MCP_TRUST_RE = /new mcp server|trust this server/i;
const PLUGIN_TRUST_RE = /install plugin|trust.*plugin/i;
const THEME_SELECT_RE = /choose.*text.*style|choosethetextstyle|text.*style.*terminal|Let.{0,2}s get started|Letsgetstarted|1\..*Auto.*terminal|1\.Auto/i;
const AUTO_MODE_RE = /enter auto mode|auto mode|enable auto mode/i;
const PRESS_ENTER_RE = /press enter|press return/i;

/** Strip ANSI escape codes from a string. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b[()][012AB]/g, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runClaude(opts: RunOptions): Promise<RunResult> {
  const { workspaceDir, prompt, qnaContext, apiKey } = opts;

  const safetyCapMs = opts.safetyCapMs ?? (
    process.env.CURION_MAX_SESSION_MS
      ? parseInt(process.env.CURION_MAX_SESSION_MS, 10)
      : 30 * 60 * 1000
  );
  console.log(`[pty] Safety cap: ${safetyCapMs / 1000}s`);

  // Fresh UUID per run — reuse causes "Session ID already in use" and instant exit.
  const sessionId = opts.sessionId ?? uuidv4();

  // ── Build --settings JSON with SessionStart + Stop hooks ──────────────────
  const hookSettings = await buildHookSettings();
  console.log(`[hooks] Ctrl dir      : ${hookSettings.ctrlDir}`);
  console.log(`[hooks] Settings file : ${hookSettings.settingsFile}`);

  const args = [
    prompt,
    '--permission-mode', 'auto',
    '--session-id', sessionId,
    '--settings', hookSettings.settingsFile,
  ];

  // Strip vars that would make claude run as a nested child session (no transcript written)
  // and API key vars so claude uses the user's stored auth (not API billing).
  //   CLAUDECODE=1          → marks this process as Claude Code → child skips transcript
  //   CLAUDE_CODE_*         → child-session markers, session ID, etc.
  //   ANTHROPIC_API_KEY     → must not be present; use stored auth only
  //   ANTHROPIC_AUTH_TOKEN  → same
  //   ANTHROPIC_BASE_URL    → same
  const STRIP_EXACT = new Set(['CLAUDECODE', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']);
  const ptyEnv: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env)
        .filter(([k, v]) =>
          v !== undefined &&
          !STRIP_EXACT.has(k) &&
          !k.startsWith('CLAUDE_CODE')
        ) as [string, string][]
    ),
    TERM: 'xterm-256color',
    DISABLE_AUTOUPDATER: '1',
    DISABLE_AUTO_COMPACT: '1',
  };

  const terminal = pty.spawn('claude', args, {
    name: 'xterm-256color',
    cols: 220,
    rows: 50,
    cwd: workspaceDir,
    env: ptyEnv,
  });

  const qaLog: QnaEntry[] = [];
  let rawOutput = '';
  let lastOutputTime = Date.now();
  let exitCode = 0;
  const startTime = Date.now();

  terminal.onData((data: string) => {
    rawOutput += data;
    lastOutputTime = Date.now();
  });

  // Gate promise that resolves when the PTY exits.
  let resolveSessionDone!: () => void;
  const sessionDonePromise = new Promise<void>(r => { resolveSessionDone = r; });
  const exitPromise = new Promise<number>(resolve => {
    terminal.onExit(({ exitCode: code }) => {
      exitCode = code ?? 0;
      resolveSessionDone();
      resolve(code ?? 0);
    });
  });

  // ── Resolve authoritative transcript_path from SessionStart hook ──────────
  console.log('[hooks] Waiting for SessionStart hook (timeout 10s)...');
  const sessionStartPayload = await watchSessionStart(hookSettings.sessionStartFile, 10_000);

  let transcriptPath: string;
  if (sessionStartPayload?.transcript_path) {
    transcriptPath = sessionStartPayload.transcript_path;
    console.log(`[hooks] transcript_path from SessionStart: ${transcriptPath}`);
  } else {
    // Fallback: compute path deterministically (documented fallback only)
    transcriptPath = computeTranscriptPath(workspaceDir, sessionId);
    console.log(`[hooks] SessionStart not received — fallback transcript path: ${transcriptPath}`);
  }

  // ── Screen dialog handler loop (deterministic, screen-based) ──────────────
  // Handles trust/theme/MCP dialogs that appear before the agent begins work.
  // Runs concurrently with the Stop-hook turn loop below.
  const screenDialogLoop = async (): Promise<void> => {
    let screenHandledAt = 0;

    while (true) {
      // Check if PTY exited
      const exited = await Promise.race([
        exitPromise.then(() => true),
        sleep(500).then(() => false),
      ]);
      if (exited) break;

      if ((Date.now() - startTime) > safetyCapMs) break;

      const rawScreen = rawOutput.slice(-4000);
      const screen = stripAnsi(rawScreen).slice(-2000);
      const now = Date.now();
      const quietMs = now - lastOutputTime;

      // Only act when screen has been stable >= 1200ms; 3s cooldown between actions.
      if (quietMs >= 1200 && (now - screenHandledAt) > 3000) {
        if (TRUST_DIALOG_RE.test(screen)) {
          console.log('[pty] answering workspace trust dialog → y');
          terminal.write('y\r');
          screenHandledAt = now;
          lastOutputTime = now;
          continue;
        }
        if (THEME_SELECT_RE.test(screen)) {
          console.log('[pty] answering theme/style selection dialog → Enter');
          terminal.write('\r');
          screenHandledAt = now;
          lastOutputTime = now;
          continue;
        }
        if (MCP_TRUST_RE.test(screen) || PLUGIN_TRUST_RE.test(screen)) {
          console.log('[pty] answering MCP/plugin trust dialog → 1');
          terminal.write('1\r');
          screenHandledAt = now;
          lastOutputTime = now;
          continue;
        }
        if (AUTO_MODE_RE.test(screen)) {
          console.log('[pty] accepting auto mode dialog → 1');
          terminal.write('1\r');
          screenHandledAt = now;
          lastOutputTime = now;
          continue;
        }
        if (PRESS_ENTER_RE.test(screen)) {
          console.log('[pty] pressing Enter for "press enter to continue"');
          terminal.write('\r');
          screenHandledAt = now;
          lastOutputTime = now;
          continue;
        }
      }
    }
  };

  // ── Stop-hook turn loop ────────────────────────────────────────────────────
  // Each Stop line = agent finished a turn and is idle awaiting input.
  // Classify last_assistant_message: question → answer it; done → send /exit.
  let sessionEnded = false;

  const stopHookLoop = watchStopSignals(
    hookSettings.stopJsonlFile,
    sessionDonePromise,
    async (payload: StopPayload) => {
      if (sessionEnded) return;

      if ((Date.now() - startTime) > safetyCapMs) {
        console.warn('[hooks] Safety cap reached inside Stop loop — sending /exit');
        sessionEnded = true;
        try { terminal.write('/exit\r'); } catch { /* ignore */ }
        return;
      }

      const lastMsg = payload.last_assistant_message?.trim() ?? '';
      console.log(`[hooks] Stop signal received. last_assistant_message: "${lastMsg.slice(0, 120)}"`);

      if (lastMsg && looksLikeQuestion(lastMsg)) {
        console.log('[hooks] Detected question — classifying with Haiku...');
        const answer = await classifyAndAnswer(lastMsg, qnaContext, apiKey);
        if (answer) {
          console.log(`[hooks] Answering question → "${answer.slice(0, 80)}"`);
          qaLog.push({
            type: 'text',
            question: lastMsg,
            answer,
            timestamp: new Date().toISOString(),
          });
          terminal.write(answer + '\r');
          lastOutputTime = Date.now();
        } else {
          // Could not answer — treat as done
          console.log('[hooks] No answer generated — sending /exit');
          sessionEnded = true;
          terminal.write('/exit\r');
        }
      } else {
        // No question → task complete
        console.log('[hooks] Turn complete, no question → sending /exit');
        sessionEnded = true;
        terminal.write('/exit\r');
      }
    },
    safetyCapMs,
  );

  // Run screen dialog handler + stop hook loop concurrently; wait for PTY exit.
  await Promise.all([
    screenDialogLoop(),
    stopHookLoop,
    exitPromise,
  ]);

  // Allow brief clean shutdown time after /exit
  await sleep(3000);

  const durationMs = Date.now() - startTime;

  // Clean up control dir
  await cleanupCtrlDir(hookSettings.ctrlDir);

  return {
    sessionId,
    transcriptPath,
    exitCode,
    durationMs,
    qaLog,
    rawScreenLog: stripAnsi(rawOutput),
  };
}

/**
 * Ask Haiku to generate a reply to a detected question.
 */
async function classifyAndAnswer(
  question: string,
  qnaContext: string,
  apiKey: string,
): Promise<string> {
  const result = await askLlm({
    apiKey,
    model: 'claude-haiku-4-5',
    maxTokens: 256,
    system: `You are a coding agent harness controller. An AI coding agent has asked a question.
Provide a short, direct answer based on the QNA context below.

QNA context:
${qnaContext}

Rules:
- If the agent is asking about its task, the project, or needs clarification: answer directly and concisely.
- If you cannot answer confidently: respond with a brief "Use your best judgment."
- Output the answer text ONLY. No preamble, no explanation.`,
    prompt: `Question: ${question}\n\nAnswer:`,
  });

  return result.text.trim();
}

/**
 * Heuristic: does this assistant text look like it's waiting for user input?
 */
function looksLikeQuestion(text: string): boolean {
  return /\?|please (provide|clarify|confirm|specify|tell|let me know)|what (should|do|is)|which (option|approach)|how should|do you want|should i/i.test(text);
}

/**
 * Hook-driven capture for Claude Code interactive sessions.
 *
 * Uses two basic Claude Code hooks injected via --settings <file>:
 *   SessionStart — fired once at session start; stdin payload:
 *     { session_id, transcript_path, cwd, model, source, hook_event_name, ... }
 *     Gives us the authoritative transcript_path without path-encoding.
 *   Stop — fired at the end of each turn when the agent is idle:
 *     { session_id, transcript_path, last_assistant_message, stop_hook_active, hook_event_name, ... }
 *     Signals turn completion + carries last_assistant_message for Q&A classification.
 *
 * Per-run lifecycle:
 *   1. buildHookSettings(ctrlDir) → write settings JSON + return its path.
 *   2. Launch claude with --settings <settingsFile>.
 *   3. watchSessionStart(ctrlDir) → resolves with { transcript_path } once SessionStart fires.
 *   4. watchStopSignals(ctrlDir, ...) → per-turn callback until /exit is sent or safety cap.
 *
 * Verified --settings shape:
 *   { "hooks": {
 *       "SessionStart": [{ "hooks": [{ "type": "command", "command": "cat > <file>" }] }],
 *       "Stop":         [{ "hooks": [{ "type": "command", "command": "cat >> <file>" }] }]
 *   }}
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HookSettings {
  /** Absolute path to the written settings JSON file — pass to --settings. */
  settingsFile: string;
  /** Control dir where hook output files land. */
  ctrlDir: string;
  /** Path written by SessionStart hook. */
  sessionStartFile: string;
  /** Path appended by Stop hook (one JSON line per turn). */
  stopJsonlFile: string;
}

export interface SessionStartPayload {
  session_id: string;
  transcript_path: string;
  cwd?: string;
  model?: string;
  source?: string;
  hook_event_name?: string;
  [key: string]: unknown;
}

export interface StopPayload {
  session_id?: string;
  transcript_path?: string;
  last_assistant_message?: string;
  stop_hook_active?: boolean;
  hook_event_name?: string;
  [key: string]: unknown;
}

/**
 * Create a per-run control directory, generate the --settings JSON, and write it.
 * Returns paths needed for watchSessionStart / watchStopSignals.
 */
export async function buildHookSettings(): Promise<HookSettings> {
  const ctrlDir = await fs.mkdtemp(path.join(os.tmpdir(), 'curion-ctrl-'));
  const sessionStartFile = path.join(ctrlDir, 'session-start.json');
  const stopJsonlFile = path.join(ctrlDir, 'stop.jsonl');
  const settingsFile = path.join(ctrlDir, 'settings.json');

  const settings = {
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              type: 'command',
              command: `cat > ${sessionStartFile}`,
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: `cat >> ${stopJsonlFile}`,
            },
          ],
        },
      ],
    },
  };

  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
  return { settingsFile, ctrlDir, sessionStartFile, stopJsonlFile };
}

/**
 * Wait for the SessionStart hook to fire (i.e. sessionStartFile to be written).
 * Polls every 200 ms up to timeoutMs (default 10 s).
 * Returns the parsed payload with the authoritative transcript_path.
 * Falls back to null if the file never appears — caller uses computeTranscriptPath.
 */
export async function watchSessionStart(
  sessionStartFile: string,
  timeoutMs = 10_000,
): Promise<SessionStartPayload | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const raw = await fs.readFile(sessionStartFile, 'utf8');
      const trimmed = raw.trim();
      if (trimmed) {
        const parsed = JSON.parse(trimmed) as SessionStartPayload;
        if (parsed.transcript_path) return parsed;
      }
    } catch {
      // file not yet written — keep polling
    }
    await sleep(200);
  }
  return null;
}

/**
 * Watch stop.jsonl for new Stop-hook lines. Each new line = agent finished a turn.
 * Calls onStop(payload) for each new turn completion.
 * Resolves when sessionDone resolves (PTY exited) or safety cap fires.
 *
 * The file is appended by the hook — we track byte offset and read new lines.
 */
export async function watchStopSignals(
  stopJsonlFile: string,
  sessionDone: Promise<void>,
  onStop: (payload: StopPayload) => Promise<void>,
  safetyCapMs: number,
): Promise<void> {
  let offset = 0;
  let done = false;
  const startTime = Date.now();

  sessionDone.then(() => { done = true; });

  const readNewLines = async (): Promise<StopPayload[]> => {
    const payloads: StopPayload[] = [];
    try {
      const stat = fsSync.statSync(stopJsonlFile);
      if (stat.size <= offset) return payloads;
      const fd = fsSync.openSync(stopJsonlFile, 'r');
      const buf = Buffer.alloc(stat.size - offset);
      fsSync.readSync(fd, buf, 0, buf.length, offset);
      fsSync.closeSync(fd);
      offset = stat.size;
      for (const line of buf.toString('utf8').split('\n')) {
        const t = line.trim();
        if (!t) continue;
        try { payloads.push(JSON.parse(t) as StopPayload); } catch { /* skip */ }
      }
    } catch {
      // file not yet written — normal during startup
    }
    return payloads;
  };

  while (true) {
    if (done) {
      // Drain any final Stop lines written just before exit
      const finalPayloads = await readNewLines();
      for (const p of finalPayloads) await onStop(p);
      break;
    }

    if ((Date.now() - startTime) > safetyCapMs) {
      console.warn(`[hooks] Safety cap of ${safetyCapMs / 1000}s reached — watchStopSignals exiting`);
      break;
    }

    const payloads = await readNewLines();
    for (const p of payloads) await onStop(p);

    await sleep(300);
  }
}

/** Clean up the control directory after a run. */
export async function cleanupCtrlDir(ctrlDir: string): Promise<void> {
  try {
    await fs.rm(ctrlDir, { recursive: true, force: true });
  } catch {
    // non-fatal
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

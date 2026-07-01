/**
 * Trajectory reader: parse the on-disk JSONL transcript written by Claude Code.
 *
 * Transcript path: ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
 * Written automatically during interactive sessions (no special flag needed).
 *
 * Path is COMPUTED — no find/scan/poll. Formula:
 *   encoded-cwd = fs.realpathSync(workspaceCwd).split('/').join('-')
 *   (macOS: /var/folders/… resolves to /private/var/folders/… → -private-var-…)
 *
 * Each line is a JSON event with a `type` field:
 *   "user"      — user turn (prompt or typed reply)
 *   "assistant" — assistant turn (text + tool_use blocks)
 *   tool results, metadata, etc.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TrajectoryEvent {
  type: string;
  role?: string;
  content?: unknown;
  message?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

export interface Trajectory {
  events: TrajectoryEvent[];
  turnCount: number;
  toolCalls: string[];
  assistantText: string[];
}

/**
 * Compute the JSONL transcript path from workspace cwd and session id.
 *
 * Formula (validated by experiment, 2026-06-23):
 *   realpath(workspaceCwd) → resolves macOS symlinks (/var → /private/var)
 *   encoded = realpath.split('/').join('-')   → leading '-' from the initial '/'
 *   path = ~/.claude/projects/<encoded>/<sessionId>.jsonl
 *
 * This is deterministic — no find/scan/poll needed.
 */
export function computeTranscriptPath(workspaceCwd: string, sessionId: string): string {
  const realCwd = fsSync.realpathSync(workspaceCwd);
  const encoded = realCwd.split('/').join('-');
  return path.join(os.homedir(), '.claude', 'projects', encoded, `${sessionId}.jsonl`);
}

/**
 * Incrementally read new lines from the JSONL file as claude appends them,
 * using fs.watch for efficient notification rather than polling.
 *
 * Resolves once the PTY exit promise resolves (session done), then does a
 * final drain read to capture any lines flushed at exit.
 *
 * @param jsonlPath     Absolute path to the JSONL file (must exist or appear within ~2s)
 * @param sessionDone   Promise that resolves when the PTY session exits
 * @param onEvent       Called for each parsed event as it arrives
 */
export async function tailTranscriptUntilDone(
  jsonlPath: string,
  sessionDone: Promise<void>,
  onEvent?: (event: TrajectoryEvent) => void,
): Promise<TrajectoryEvent[]> {
  const allEvents: TrajectoryEvent[] = [];
  let offset = 0;
  let done = false;

  sessionDone.then(() => { done = true; });

  const readNewLines = (): void => {
    try {
      const stat = fsSync.statSync(jsonlPath);
      if (stat.size <= offset) return;
      const fd = fsSync.openSync(jsonlPath, 'r');
      const buf = Buffer.alloc(stat.size - offset);
      fsSync.readSync(fd, buf, 0, buf.length, offset);
      fsSync.closeSync(fd);
      offset = stat.size;
      const raw = buf.toString('utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed) as TrajectoryEvent;
          allEvents.push(event);
          onEvent?.(event);
        } catch { /* skip malformed */ }
      }
    } catch {
      return;
    }
  };

  // Wait up to 2s for the file to appear before starting fs.watch
  const waitForFile = async (): Promise<boolean> => {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      try { fsSync.accessSync(jsonlPath); return true; } catch { /* not yet */ }
      await sleep(100);
    }
    return false;
  };

  const fileExists = await waitForFile();

  if (fileExists) {
    // Drain any lines already written before we started watching
    readNewLines();
  }

  // Use fs.watch for live notifications; fall back to 500ms poll if watcher errors
  await new Promise<void>((resolve) => {
    let watcher: ReturnType<typeof fsSync.watch> | null = null;

    const onWatchEvent = (): void => {
      readNewLines();
      if (done) {
        cleanup();
        resolve();
      }
    };

    const cleanup = (): void => {
      try { watcher?.close(); } catch { /* ignore */ }
    };

    // Check done flag periodically (in case sessionDone resolves without a watch event)
    const interval = setInterval(() => {
      if (done) {
        clearInterval(interval);
        cleanup();
        resolve();
      }
    }, 200);

    try {
      if (fileExists) {
        watcher = fsSync.watch(jsonlPath, { persistent: false }, onWatchEvent);
        watcher.on('error', () => { /* watcher errors are non-fatal */ });
      } else {
        // File never appeared — just wait for session done
      }
    } catch {
      // fs.watch not available — interval will drain
    }
  });

  // Final drain after session exits (capture any lines flushed after exit)
  await sleep(500);
  readNewLines();

  return allEvents;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Locate one or more JSONL files for the session.
 *
 * Claude Code writes:
 *   - A flat  <projects>/<encoded-cwd>/<session-id>.jsonl  for the main session
 *   - Under   <projects>/<encoded-cwd>/<session-id>/subagents/<name>.jsonl  for sub-agents
 *
 * When the main flat JSONL is absent (e.g. PTY sessions that exit before flush)
 * we fall back to aggregating all subagent JSONLs for the session.
 *
 * Returns an array of JSONL file paths to read. Empty when nothing is found.
 */
export async function locateTranscript(predictedPath: string, sessionId: string): Promise<string[]> {
  // 1. Try the predicted path as a flat JSONL
  try {
    await fs.access(predictedPath);
    console.log(`[transcript] Found at predicted path: ${predictedPath}`);
    return [predictedPath];
  } catch { /* fall through */ }

  const projectsDir = path.join(os.homedir(), '.claude', 'projects');

  // 2. Scan all project dirs for a flat JSONL or a session subdir with subagent JSONLs
  let foundPaths: string[] = [];
  try {
    const projectDirs = await fs.readdir(projectsDir);
    for (const dir of projectDirs) {
      const projectDir = path.join(projectsDir, dir);

      // 2a. Flat JSONL at project-dir level
      const flatCandidate = path.join(projectDir, `${sessionId}.jsonl`);
      try {
        await fs.access(flatCandidate);
        console.log(`[transcript] Found flat JSONL via scan: ${flatCandidate}`);
        return [flatCandidate];
      } catch { /* continue */ }

      // 2b. Session subdir → subagents/*.jsonl
      const subagentsDir = path.join(projectDir, sessionId, 'subagents');
      try {
        const subFiles = await fs.readdir(subagentsDir);
        const subJsonls = subFiles
          .filter(f => f.endsWith('.jsonl'))
          .map(f => path.join(subagentsDir, f));
        if (subJsonls.length > 0) {
          console.log(`[transcript] Found ${subJsonls.length} subagent JSONL(s) under ${subagentsDir}`);
          foundPaths = subJsonls;
          break;
        }
      } catch { /* continue */ }
    }
  } catch { /* projects dir doesn't exist */ }

  if (foundPaths.length > 0) return foundPaths;

  // 3. Nothing found — return predicted path so caller gets a graceful empty result
  return [predictedPath];
}

/** Read and merge trajectory from one or more JSONL paths. */
export async function readTranscripts(paths: string[]): Promise<Trajectory> {
  const allEvents: TrajectoryEvent[] = [];
  for (const p of paths) {
    const t = await readTranscript(p);
    allEvents.push(...t.events);
  }
  const turnCount = allEvents.filter(e => isAssistantEvent(e)).length;
  const toolCalls = extractToolCalls(allEvents);
  const assistantText = extractAssistantText(allEvents);
  return { events: allEvents, turnCount, toolCalls, assistantText };
}

export async function readTranscript(transcriptPath: string): Promise<Trajectory> {
  let raw: string;
  try {
    raw = await fs.readFile(transcriptPath, 'utf8');
  } catch {
    // Transcript may not exist if the agent never started (e.g. claude not installed)
    return { events: [], turnCount: 0, toolCalls: [], assistantText: [] };
  }

  const events: TrajectoryEvent[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as TrajectoryEvent);
    } catch {
      // Skip malformed lines
    }
  }

  const turnCount = events.filter(e => isAssistantEvent(e)).length;
  const toolCalls = extractToolCalls(events);
  const assistantText = extractAssistantText(events);

  return { events, turnCount, toolCalls, assistantText };
}

/**
 * Two event schemas exist:
 *   Main session:  { type: 'assistant', content: [...] }  OR  { type: 'assistant', message: { content: [...] } }
 *   Subagent:      { message: { role: 'assistant', content: [...] } }  (no top-level type)
 */
function isAssistantEvent(event: TrajectoryEvent): boolean {
  if (event.type === 'assistant' || event.role === 'assistant') return true;
  const msg = event.message as { role?: string } | undefined;
  return msg?.role === 'assistant';
}

function getEventContent(event: TrajectoryEvent): unknown {
  // Prefer top-level content; fall back to message.content
  return event.content ?? (event.message as { content?: unknown } | undefined)?.content;
}

function extractToolCalls(events: TrajectoryEvent[]): string[] {
  const calls: string[] = [];
  for (const event of events) {
    const content = getEventContent(event);
    if (!Array.isArray(content)) continue;
    for (const block of content as unknown[]) {
      if (
        typeof block === 'object' &&
        block !== null &&
        (block as { type?: string }).type === 'tool_use' &&
        typeof (block as { name?: string }).name === 'string'
      ) {
        calls.push((block as { name: string }).name);
      }
    }
  }
  return calls;
}

function extractAssistantText(events: TrajectoryEvent[]): string[] {
  const texts: string[] = [];
  for (const event of events) {
    if (!isAssistantEvent(event)) continue;
    const content = getEventContent(event);
    if (typeof content === 'string') {
      texts.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content as unknown[]) {
        if (
          typeof block === 'object' &&
          block !== null &&
          (block as { type?: string }).type === 'text' &&
          typeof (block as { text?: string }).text === 'string'
        ) {
          texts.push((block as { text: string }).text);
        }
      }
    }
  }
  return texts;
}

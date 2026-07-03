import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CuriocityError } from '../../shared/errors';
import type { ProvisionSpec } from '../../config/schema';
import { addUsage, makeUsage, zeroUsage, type TrajectoryEvent, type Usage } from '../../shared/trajectory';
import type { TerminalSession } from '../../terminal/session';
import { applyTemplate, composeLaunchPlan, filterAgentEnv, templateVars } from '../launch';
import type {
  AgentAdapter,
  AgentUsage,
  CanonicalHookSpec,
  CanonicalStopSignal,
  LaunchFragment,
  LaunchPlan,
  StructuredQuestion,
  TranscriptSource,
  TrialContext,
} from '../types';
import { computeTranscriptPath } from './transcript-path';
import { CLAUDE_CODE_DEFAULT_PROFILE } from './profile';

/**
 * `ClaudeCodeAdapter` (§10.1) — renders the canonical control protocol (§5.2) into
 * Claude Code's native shape and normalizes its session-JSONL transcript dialect
 * back into `TrajectoryEvent`s. Mechanics validated by the live experiment (2026-06-23)
 * and grounded against real transcripts + `docs/hooks/claude-code.md` (BINDING for
 * hook payloads/registration).
 *
 * The launch flow is the CORE-owned standard pipeline (`composeLaunchPlan`); only the
 * per-step rendering below is agent-specific. Structure follows the reference
 * `MockAdapter` (§10.3).
 */

/** Filename of the `--settings` layer written into the ctrl dir (see `renderHooks`). */
const SETTINGS_FILENAME = 'settings.json';

function currentEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

// --- Claude session-JSONL dialect (grounded in real transcripts) ------------
// Each line is one JSON object. Lines of interest:
//   { type:'user',      message:{ role, content: string | ContentItem[] }, timestamp, … }
//   { type:'assistant', message:{ role, content: ContentItem[], usage }, timestamp, … }
// ContentItem: { type:'text', text } | { type:'thinking', … } |
//              { type:'tool_use', id, name, input } | { type:'tool_result', tool_use_id, content }
// Assistant `message.usage` carries `input_tokens`/`output_tokens` (+ cache fields).
// All other line types (mode, permission-mode, system, summary, file-history-snapshot,
// attachment, last-prompt, ai-title, queue-operation, …) are non-trajectory noise.
interface ClaudeContentItem {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
}
interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}
interface ClaudeMessage {
  role?: string;
  content?: string | ClaudeContentItem[];
  usage?: ClaudeUsage;
}
interface ClaudeLine {
  type?: string;
  timestamp?: string;
  message?: ClaudeMessage;
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code';

  /** D13 defaults layer (§5.2): the validated live-experiment profile (§10.1). A
   *  top-level `codingagents["claude-code"]` config entry overrides it per-field. */
  readonly defaultProfile = CLAUDE_CODE_DEFAULT_PROFILE;

  prepare(ctx: TrialContext, hookSpec: CanonicalHookSpec): Promise<LaunchPlan> {
    return composeLaunchPlan(this, ctx, hookSpec);
  }

  /**
   * Step 1 — render the canonical hook spec into a Claude `--settings` file (§10.1).
   * This settings layer MERGES alongside existing user/project/plugin hooks (the
   * hook-coexistence contract, §5.2): the harness capture hooks are ADDITIVE, never a
   * replacement, so the plugin-under-test's own hooks still fire in the same session.
   *
   * The two commands are exactly the validated shape: `SessionStart` overwrites the
   * session-start payload, `Stop` appends one JSON line per turn. The `--settings`
   * flag itself is supplied by the profile args template (`{ctrlDir}/settings.json`);
   * here we only materialize the file content at that same path.
   *
   * (R1, orchestrator ruling — multi-turn `stop.jsonl` integrity) `Stop` fires once
   * per turn and is meant to produce ONE JSON line per firing. A plain `cat >>` is
   * only newline-safe if the hook's stdin itself always ends in `\n` — that is an
   * observed-not-guaranteed property of Claude Code's hook payload delivery. If a
   * future/edge-case invocation ever omits the trailing newline, two consecutive
   * turns' payloads would land on ONE physical line with no separator
   * (`{...turn1...}{...turn2...}`), and the engine's line-split stop-signal reader
   * would silently drop both — breaking multi-turn cases with no error surfaced.
   * `sh -c 'cat; echo'` reads stdin verbatim then unconditionally emits a newline,
   * so every append is line-terminated regardless of what the hook stdin looked
   * like; `>>` outside the subshell keeps the shell-form single-string command
   * (docs/hooks/claude-code.md: `args` omitted → shell form) and stays POSIX-only.
   */
  async renderHooks(spec: CanonicalHookSpec, ctx: TrialContext): Promise<LaunchFragment> {
    const settings = {
      hooks: {
        SessionStart: [
          { hooks: [{ type: 'command', command: `cat > '${spec.sessionStart.writeTo}'` }] },
        ],
        Stop: [
          { hooks: [{ type: 'command', command: `sh -c 'cat; echo' >> '${spec.stop.appendTo}'` }] },
        ],
      },
    };
    return {
      files: [{ path: join(ctx.ctrlDir, SETTINGS_FILENAME), content: JSON.stringify(settings, null, 2) }],
    };
  }

  /**
   * Step 2 — materialize provisioning workspace-scoped ONLY (P11). MCPs go into a
   * workspace `.mcp.json`; nothing under `~/.claude` is ever touched. A ProvisionSpec
   * item that cannot be satisfied workspace-scoped (Claude plugins install into the
   * user's global `~/.claude`) fails the provision step with a clear message rather
   * than mutating global agent state.
   */
  async renderProvisioning(spec: ProvisionSpec, ctx: TrialContext): Promise<LaunchFragment> {
    if (spec.plugins.length > 0) {
      const names = spec.plugins.map((p) => p.name).join(', ');
      throw new CuriocityError(
        `claude-code adapter cannot provision plugins workspace-scoped (P11): [${names}]. ` +
          'Claude plugins install into the user’s global ~/.claude, which the harness must ' +
          'never mutate. Pre-install the plugin in the agent’s environment, or express the ' +
          'capability as a workspace MCP under `provision.mcps` instead.',
        'PROVISION_UNSUPPORTED',
      );
    }
    if (spec.mcps.length === 0) return {};
    const mcpServers: Record<string, unknown> = {};
    for (const item of spec.mcps) {
      const { name, ...rest } = item;
      mcpServers[name] = rest;
    }
    return {
      files: [
        {
          path: join(ctx.workspace, '.mcp.json'),
          content: JSON.stringify({ mcpServers }, null, 2),
        },
      ],
    };
  }

  /** Step 3 — command/args/env from profile templates (envRemove filtering, session id).
   *  Renders the resolved `agentModel` (§5.2) as Claude's `--model <id>` flag and the
   *  resolved `agentEffort` as `--effort <v>` (the installed CLI's effort surface — verified
   *  on claude 2.1.199: `--effort <level>` accepts low|medium|high|xhigh|max), each only
   *  when set. Observed effort is read back from the Stop-hook payload's `effort.level`. */
  buildLaunch(ctx: TrialContext): LaunchFragment {
    const vars = templateVars(ctx);
    const modelArgs = ctx.profile.agentModel ? ['--model', ctx.profile.agentModel] : [];
    const effortArgs = ctx.profile.agentEffort ? ['--effort', ctx.profile.agentEffort] : [];
    return {
      args: [...ctx.profile.args.map((a) => applyTemplate(a, vars)), ...modelArgs, ...effortArgs],
      // Read the LIVE process env (not the ctx): stripping CLAUDECODE/CLAUDE_CODE* here
      // is exactly what lets a claude launched from inside a Claude Code session persist
      // its own transcript instead of running as a nested child (§10.1).
      env: filterAgentEnv(currentEnv(), ctx.profile.envRemove, ctx.profile.envSet),
    };
  }

  /**
   * Resolve the transcript source: the `SessionStart` payload's `transcript_path` is
   * authoritative (§10.1); the computed `~/.claude/projects/<encoded-cwd>/<sid>.jsonl`
   * is the fallback (used when the ctrl file never appeared).
   */
  async locateTranscript(ctx: TrialContext): Promise<TranscriptSource> {
    const startPath = join(ctx.ctrlDir, 'session-start.json');
    if (existsSync(startPath)) {
      try {
        const payload = JSON.parse(readFileSync(startPath, 'utf8')) as { transcript_path?: string };
        if (payload.transcript_path) {
          return { path: payload.transcript_path, kind: 'authoritative' };
        }
      } catch {
        // fall through to the computed fallback
      }
    }
    return { path: computeTranscriptPath(homedir(), ctx.workspace, ctx.sessionId), kind: 'fallback' };
  }

  parseEvents(raw: string): TrajectoryEvent[] {
    const events: TrajectoryEvent[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      let obj: ClaudeLine;
      try {
        obj = JSON.parse(trimmed) as ClaudeLine;
      } catch {
        continue;
      }
      const ts: string | number = typeof obj.timestamp === 'string' ? obj.timestamp : Date.now();
      const msg = obj.message;
      if (!msg || typeof msg !== 'object') continue;

      if (obj.type === 'assistant') {
        const content = msg.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (!item || typeof item !== 'object') continue;
            if (item.type === 'text' && typeof item.text === 'string') {
              events.push({ ts, kind: 'assistant', payload: { text: item.text } });
            } else if (item.type === 'tool_use') {
              events.push({
                ts,
                kind: 'tool_call',
                name: item.name ?? '',
                payload: { id: item.id, input: item.input },
              });
            }
            // 'thinking' and other item types carry no trajectory signal — skipped.
          }
        } else if (typeof content === 'string') {
          events.push({ ts, kind: 'assistant', payload: { text: content } });
        }
        if (msg.usage && typeof msg.usage === 'object') {
          const u = msg.usage;
          // Anthropic native accounting (§12): `input_tokens` already EXCLUDES the
          // cache tiers (cache read/creation are reported separately), and thinking
          // is folded INTO `output_tokens` (no separate reasoning class). So the
          // classes are already disjoint — map straight across; `raw` keeps the
          // native object.
          events.push({
            ts,
            kind: 'usage',
            payload: makeUsage({
              input: num(u.input_tokens),
              output: num(u.output_tokens),
              cacheRead: num(u.cache_read_input_tokens),
              cacheWrite: num(u.cache_creation_input_tokens),
              raw: u,
            }),
          });
        }
      } else if (obj.type === 'user') {
        const content = msg.content;
        if (typeof content === 'string') {
          events.push({ ts, kind: 'user', payload: { text: content } });
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (!item || typeof item !== 'object') continue;
            if (item.type === 'tool_result') {
              events.push({
                ts,
                kind: 'tool_result',
                payload: { tool_use_id: item.tool_use_id, content: item.content },
              });
            } else if (item.type === 'text' && typeof item.text === 'string') {
              events.push({ ts, kind: 'user', payload: { text: item.text } });
            }
          }
        }
      }
      // Non-message line types (mode, system, summary, snapshots, …) are ignored.
    }
    return events;
  }

  /** Normalize one `Stop` hook JSONL line → CanonicalStopSignal (docs/hooks/claude-code.md). */
  parseStopSignal(raw: string): CanonicalStopSignal | null {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    let obj: {
      session_id?: string;
      transcript_path?: string;
      last_assistant_message?: string | null;
      effort?: { level?: unknown };
    };
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return null;
    }
    // The Stop payload reports the effort the CLI ran at as `effort: { level }` (verified
    // live on claude 2.1.199, docs/hooks/claude-code.md) — the observed-truth source for
    // the trial's `agentEffort` record (§5.2), mirroring SessionStart `model`.
    const level = obj.effort?.level;
    const effort = typeof level === 'string' && level !== '' ? level : undefined;
    return {
      sessionId: obj.session_id ?? '',
      ...(obj.transcript_path !== undefined ? { transcriptPath: obj.transcript_path } : {}),
      lastAssistantMessage: obj.last_assistant_message ?? null,
      ...(effort !== undefined ? { effort } : {}),
    };
  }

  /**
   * Deterministic pre-gate (§6, P4): no final message yet → continuation (keep
   * waiting, no LLM). A present final message escalates to the fast model, which the
   * engine invokes on the `'question'` return to classify question / done / working.
   */
  classifyTurn(signal: CanonicalStopSignal): 'question' | 'done' | 'working' {
    const msg = signal.lastAssistantMessage;
    if (msg === null || msg.trim() === '') return 'working';
    return 'question';
  }

  /**
   * Detect a pending `AskUserQuestion` in the trajectory tail (§10.1). Returns null
   * once it has been answered — Claude delivers the answer as a `tool_result` bearing
   * the question's `tool_use_id`.
   */
  detectStructuredQuestion(events: TrajectoryEvent[]): StructuredQuestion | null {
    let qIdx = -1;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i]!.kind === 'tool_call' && events[i]!.name === 'AskUserQuestion') {
        qIdx = i;
        break;
      }
    }
    if (qIdx === -1) return null;

    const qPayload = events[qIdx]!.payload as { id?: string; input?: unknown };
    const toolId = qPayload.id;
    for (let i = qIdx + 1; i < events.length; i += 1) {
      const e = events[i]!;
      if (e.kind === 'tool_result') {
        const rp = e.payload as { tool_use_id?: string };
        // Only a `tool_result` that matches THIS question's id counts as "answered".
        // An unmatched id (or a missing `toolId`, which real Claude transcripts never
        // omit) must never be treated as an answer — that would spuriously clear a
        // still-pending AskUserQuestion on the arrival of some unrelated tool result.
        if (toolId !== undefined && rp.tool_use_id === toolId) return null; // answered
      }
      if (e.kind === 'user') return null; // conversation moved on
    }

    const input = qPayload.input as
      | { questions?: Array<{ question?: string; options?: Array<string | { label?: string }> }> }
      | undefined;
    const first = input?.questions?.[0];
    const question = first?.question ?? '';
    const options = Array.isArray(first?.options)
      ? first.options
          .map((o) => (typeof o === 'string' ? o : (o?.label ?? '')))
          .filter((s): s is string => s !== '')
      : undefined;
    return {
      question,
      ...(options && options.length > 0 ? { options } : {}),
      raw: input,
    };
  }

  /**
   * SCREEN-based detection of a pending `AskUserQuestion` (§6 row 1). Verified live
   * (Claude Code 2.1.199): the `AskUserQuestion` tool_use is NOT written to the session
   * transcript while the question is pending — it is flushed (with its answer
   * `tool_result`) only AFTER the user selects. So while pending, the transcript shows
   * nothing and the only signal is the rendered menu. We parse that menu here.
   *
   * The menu is anchored on Claude's fixed footer hint ("↑/↓ to navigate" / "Enter to
   * select"); options are the numbered lines (`N. Label`); the question is the last
   * line ending in `?` above the first option. Anchoring on the footer avoids false
   * positives on ordinary numbered prose in assistant output.
   */
  detectScreenQuestion(snapshot: string): StructuredQuestion | null {
    if (!/to navigate|Enter to select|Esc to cancel/.test(snapshot)) return null;
    const lines = snapshot.split('\n');
    const options: string[] = [];
    let firstOptionLine = -1;
    for (let i = 0; i < lines.length; i += 1) {
      // e.g. "❯ 1. English" or "  2. Spanish"; ignore indented sub-descriptions.
      const m = /^\s*[❯>]?\s*(\d+)\.\s+(\S.*?)\s*$/.exec(lines[i]!);
      if (m && m[2]) {
        options.push(m[2].trim());
        if (firstOptionLine === -1) firstOptionLine = i;
      }
    }
    if (options.length < 2) return null; // not a real choice menu
    // Question = the last '?'-terminated line above the first option (fallback '').
    let question = '';
    for (let i = firstOptionLine - 1; i >= 0; i -= 1) {
      const t = lines[i]!.trim();
      if (t.endsWith('?')) {
        question = t;
        break;
      }
    }
    return { question, options, raw: { screen: true } };
  }

  /**
   * Answer a screen menu (`AskUserQuestion`) by NAVIGATION, not by typing a line: the
   * menu highlights option 1 initially and is driven with ↑/↓ + Enter (per Claude's own
   * footer hint). Map the composed answer to an option index, send that many Down
   * arrows from the top, then Enter. Falls back to the highlighted default on no match.
   */
  async submitStructuredAnswer(
    session: TerminalSession,
    question: StructuredQuestion,
    answer: string,
  ): Promise<void> {
    const options = question.options ?? [];
    const a = answer.trim().toLowerCase();
    let index = options.findIndex(
      (o) => o.toLowerCase() === a || o.toLowerCase().includes(a) || a.includes(o.toLowerCase()),
    );
    if (index < 0) {
      const asNum = Number.parseInt(a, 10);
      if (Number.isInteger(asNum) && asNum >= 1 && asNum <= options.length) index = asNum - 1;
    }
    if (index < 0) index = 0; // default to the highlighted first option
    for (let k = 0; k < index; k += 1) {
      await session.write('\x1b[B'); // Down arrow
      await new Promise((r) => setTimeout(r, 60));
    }
    await session.write('\r'); // Enter selects the highlighted option
  }

  extractUsage(events: TrajectoryEvent[]): AgentUsage {
    const usage = zeroUsage();
    for (const e of events) {
      if (e.kind === 'usage') addUsage(usage, makeUsage(e.payload as Partial<Usage>));
    }
    return usage;
  }

  /** End the session cleanly (§10.1): type the `/exit` slash command. */
  async terminate(session: TerminalSession): Promise<void> {
    await session.write('/exit\r');
  }
}

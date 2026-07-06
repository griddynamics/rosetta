import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CuriocityError } from '../../shared/errors';
import type { ProvisionItem, ProvisionSpec } from '../../config/schema';
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
import { CODEX_DEFAULT_PROFILE } from './profile';
import { findFallbackRollout } from './transcript';

/**
 * `CodexAdapter` (§10.2) — renders the canonical control protocol (§5.2) into
 * Codex's native shape (workspace `.codex/hooks.json` + launch flags) and normalizes
 * its rollout-JSONL transcript dialect back into `TrajectoryEvent`s. Hook wire format
 * is BINDING per docs/hooks/codex.md; the rollout dialect is grounded in the real
 * sample `docs/hooks/codex-019f0634-transcript.jsonl`.
 *
 * The launch flow is the CORE-owned standard pipeline (`composeLaunchPlan`); only the
 * per-step rendering here is agent-specific. Structure mirrors `MockAdapter` (§10.3).
 */

const HOOKS_FILENAME = 'hooks.json';

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

// --- Codex rollout-JSONL dialect (grounded in the real sample) ---------------
// Each line is one JSON object `{ timestamp, type, payload }`. Record types:
//   session_meta                                  → session id + cwd (locator anchor)
//   turn_context                                  → per-turn context (lifecycle)
//   response_item.message   (role, content[])     → developer/user/assistant text
//   response_item.reasoning (encrypted)           → no plaintext, skipped
//   response_item.function_call  (name, args)     → tool_call
//   response_item.function_call_output (output)   → tool_result
//   event_msg.task_started                        → lifecycle
//   event_msg.user_message  (message)             → the real user prompt
//   event_msg.agent_message (message, phase)      → assistant text (duplicate of the
//                                                   response_item.message assistant —
//                                                   we take assistant text from the
//                                                   response_item to avoid doubling)
//   event_msg.token_count   (info.last_token_usage) → usage (per-turn delta)
//   event_msg.task_complete (last_agent_message)  → lifecycle marker (detectCompletion)
//   event_msg.context_compacted / compacted       → lifecycle
interface CodexContentItem {
  type?: string;
  text?: string;
}
interface CodexTokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  reasoning_output_tokens?: number;
}
interface CodexPayload {
  type?: string;
  role?: string;
  content?: CodexContentItem[];
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: unknown;
  message?: string;
  turn_id?: string;
  last_agent_message?: string;
  info?: { last_token_usage?: CodexTokenUsage; total_token_usage?: CodexTokenUsage };
}
interface CodexLine {
  timestamp?: string;
  type?: string;
  payload?: CodexPayload;
}

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex';

  /** D13 defaults layer (§5.2, Part A): the observed-live 0.142.2 launch profile
   *  (§10.2). A top-level `codingagents["codex"]` entry overrides it per-field. */
  readonly defaultProfile = CODEX_DEFAULT_PROFILE;

  prepare(ctx: TrialContext, hookSpec: CanonicalHookSpec): Promise<LaunchPlan> {
    return composeLaunchPlan(this, ctx, hookSpec);
  }

  /**
   * Step 1 — render the canonical hook spec into a workspace `.codex/hooks.json`
   * (docs/hooks/codex.md registration format). This file is a DISTINCT config
   * location from any plugin-bundled hooks, so the harness capture hooks are ADDITIVE
   * to the plugin-under-test's hooks (hook-coexistence contract, §5.2).
   *
   * (!) STRICT output validation (docs/hooks/codex.md conclusion #1): Codex validates
   * each hook's stdout against the event schema; ANY extra field invalidates the whole
   * output and the hook runs UNHOOKED. Our hooks therefore emit NOTHING on stdout:
   *   - SessionStart `cat > <file>` consumes stdin and prints nothing.
   *   - Stop `sh -c 'cat; echo' >> <file>` — the `>>` redirects the WHOLE sh command's
   *     stdout (cat's copy of stdin + echo's newline) into the file, so Codex sees an
   *     empty stdout. The trailing `echo` guarantees each appended Stop payload is
   *     newline-terminated even if the hook stdin omits its own newline (the M4-review
   *     stop.jsonl integrity fix), so the line-split stop reader never merges two turns.
   * Empty stdout is valid (no directives). No matcher is set (Stop's matcher is
   * ignored anyway per the doc; SessionStart fires on every start source).
   */
  async renderHooks(spec: CanonicalHookSpec, ctx: TrialContext): Promise<LaunchFragment> {
    const hooks = {
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
      files: [
        {
          path: join(ctx.workspace, '.codex', HOOKS_FILENAME),
          content: JSON.stringify(hooks, null, 2),
        },
      ],
    };
  }

  /**
   * Step 2 — provisioning, workspace-scoped / per-invocation ONLY (P11). MCP servers
   * become per-invocation `-c` dotted-path TOML overrides (`mcp_servers.<name>.<field>`);
   * NOTHING under the user's global `~/.codex` is mutated. `codex mcp add` /
   * `codex plugin add` mutate `~/.codex` and are forbidden — a plugin ProvisionSpec
   * item fails the provision step with a clear message rather than mutating global
   * state.
   */
  async renderProvisioning(spec: ProvisionSpec, _ctx: TrialContext): Promise<LaunchFragment> {
    if (spec.plugins.length > 0) {
      const names = spec.plugins.map((p) => p.name).join(', ');
      throw new CuriocityError(
        `codex adapter cannot provision plugins workspace-scoped (P11): [${names}]. ` +
          '`codex plugin add` mutates the user’s global ~/.codex, which the harness must never ' +
          'touch. Pre-install the plugin in the agent’s environment, or express the capability ' +
          'as a workspace MCP under `provision.mcps` (rendered as per-invocation `-c` overrides).',
        'PROVISION_UNSUPPORTED',
      );
    }
    if (spec.mcps.length === 0) return {};
    const args: string[] = [];
    for (const mcp of spec.mcps) {
      args.push(...mcpToConfigArgs(mcp));
    }
    return { args };
  }

  /**
   * Step 3 — command/args/env from profile templates (envRemove filtering, session id).
   * No `--session-id` exists for codex; the id comes from session_meta / SessionStart.
   *
   * (!) P11 non-mutation — CODEX_HOME isolation. On codex-cli 0.142.2 the documented
   * `-c projects."<ws>".trust_level="trusted"` seeding both FAILS to suppress the
   * folder-trust dialog AND persists a `[projects.…]` entry to the user's global
   * `~/.codex/config.toml`, and trusting the folder (any way) is persisted. To keep
   * the harness from EVER writing to the user's real home, we point `CODEX_HOME` at a
   * throwaway per-trial dir and symlink the user's `auth.json` into it (never reading
   * its contents), so codex authenticates as the user while every write (trust state,
   * rollout, config) lands in the throwaway home. This is the §18 per-trial agent-home
   * isolation, validated live (real config.toml byte-unchanged; auth + transcript +
   * hooks all work). The trust dialog is cleared by the profile's `dialogPatterns`.
   *
   * (m5-review R1) Conditional `OPENAI_API_KEY`/`OPENAI_BASE_URL` strip: when a real
   * `auth.json` exists (so it is about to be symlinked into the isolated home), an
   * ambient key in the CURRENT process env — the case for `contract:codex` / any
   * direct invocation that bypasses §4's Curion-fork allow-list — would otherwise
   * silently redirect the launched codex off the ChatGPT-plan credits and onto
   * whatever the ambient key bills, mirroring the harness-key-leak class §10.1
   * documents for `ANTHROPIC_API_KEY`. This is conditional (not a static
   * `envRemove` entry) because `OPENAI_API_KEY` is ALSO the documented auth path for
   * a user with no `auth.json` (§10.2) — stripping it unconditionally would break
   * that path entirely. The strip happens on the BASE env, BEFORE `envRemove`/
   * `envSet` are applied, so an explicit `envSet.OPENAI_API_KEY` (a deliberate config
   * override, not an ambient leak) still wins, exactly like every other var.
   */
  buildLaunch(ctx: TrialContext): LaunchFragment {
    const vars = templateVars(ctx);
    const base = currentEnv();
    const realAuth = join(homedir(), '.codex', 'auth.json');
    if (existsSync(realAuth)) {
      delete base.OPENAI_API_KEY;
      delete base.OPENAI_BASE_URL;
    }
    const env = filterAgentEnv(base, ctx.profile.envRemove, ctx.profile.envSet);
    const codexHome = this.codexHome(ctx);
    env.CODEX_HOME = codexHome;
    // Render the resolved `agentModel` (§5.2) as codex's `-m <id>` flag when set, and the
    // resolved `agentEffort` as codex's `-c model_reasoning_effort="<v>"` config override.
    const modelArgs = ctx.profile.agentModel ? ['-m', ctx.profile.agentModel] : [];
    const effortArgs = ctx.profile.agentEffort
      ? ['-c', `model_reasoning_effort="${ctx.profile.agentEffort}"`]
      : [];
    return {
      args: [...ctx.profile.args.map((a) => applyTemplate(a, vars)), ...modelArgs, ...effortArgs],
      env,
      // Seed the isolated home before launch: create it and (if the user is logged in
      // via auth.json) symlink their credential in so codex authenticates as them
      // WITHOUT us reading the secret. `ln -sf` + the `[ -f ]` guard are idempotent
      // and safe when the user authenticates via OPENAI_API_KEY instead (no auth.json).
      commands: [
        `mkdir -p '${codexHome}'`,
        `[ -f '${realAuth}' ] && ln -sf '${realAuth}' '${codexHome}/auth.json' || true`,
      ],
    };
  }

  /** Per-trial isolated `CODEX_HOME` (under the ctrl dir): keeps every codex write off
   *  the user's real `~/.codex` (P11). */
  private codexHome(ctx: TrialContext): string {
    return join(ctx.ctrlDir, 'codex-home');
  }

  /**
   * Resolve the transcript source (§10.2): the SessionStart ctrl payload's
   * `transcript_path` is authoritative when present; otherwise scan
   * `~/.codex/sessions` for the rollout whose `session_meta.cwd == workspace` and
   * `mtime >= trial start` (never newest-alone). "Ctrl file never appeared" is a
   * FIRST-CLASS path (strict hook validation may disable the hook), so a missing
   * SessionStart is expected, not an error.
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
    const codexHome = this.codexHome(ctx);
    const fallback = findFallbackRollout(codexHome, ctx.workspace, ctx.startedAt);
    // When nothing matches yet (rollout not written), return a non-existent sentinel
    // in the sessions tree; the engine reads 0 events and the freeze watchdog is the
    // deterministic backstop. A later poll re-locates it once it appears.
    return {
      path: fallback?.path ?? join(codexHome, 'sessions', `pending-${ctx.sessionId}.jsonl`),
      kind: 'fallback',
    };
  }

  parseEvents(raw: string): TrajectoryEvent[] {
    const events: TrajectoryEvent[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      let obj: CodexLine;
      try {
        obj = JSON.parse(trimmed) as CodexLine;
      } catch {
        continue;
      }
      const ts: string | number = typeof obj.timestamp === 'string' ? obj.timestamp : Date.now();
      const p = obj.payload;
      if (!p || typeof p !== 'object') continue;

      switch (obj.type) {
        case 'session_meta':
          events.push({ ts, kind: 'lifecycle', name: 'session_meta', payload: {} });
          break;
        case 'turn_context':
          events.push({ ts, kind: 'lifecycle', name: 'turn_context', payload: {} });
          break;
        case 'compacted':
          events.push({ ts, kind: 'lifecycle', name: 'compacted', payload: {} });
          break;
        case 'response_item':
          this.parseResponseItem(p, ts, events);
          break;
        case 'event_msg':
          this.parseEventMsg(p, ts, events);
          break;
        default:
          break;
      }
    }
    return events;
  }

  private parseResponseItem(p: CodexPayload, ts: string | number, events: TrajectoryEvent[]): void {
    switch (p.type) {
      case 'message': {
        // Assistant text is the canonical conversation source (matches the Claude
        // adapter parsing transcript records). developer/user roles here are the
        // permissions / environment-context injections — noise; the REAL user prompt
        // arrives via event_msg.user_message, so we skip non-assistant roles.
        if (p.role !== 'assistant') break;
        const text = Array.isArray(p.content)
          ? p.content
              .filter((c) => c && (c.type === 'output_text' || c.type === 'text'))
              .map((c) => c.text ?? '')
              .join('')
          : '';
        if (text !== '') events.push({ ts, kind: 'assistant', payload: { text } });
        break;
      }
      case 'reasoning':
        // Encrypted, no plaintext summary in practice → carries no trajectory signal.
        break;
      case 'function_call': {
        let input: unknown = p.arguments;
        if (typeof p.arguments === 'string') {
          try {
            input = JSON.parse(p.arguments);
          } catch {
            input = p.arguments;
          }
        }
        events.push({
          ts,
          kind: 'tool_call',
          name: p.name ?? '',
          payload: { id: p.call_id, input },
        });
        break;
      }
      case 'function_call_output':
        events.push({
          ts,
          kind: 'tool_result',
          payload: { call_id: p.call_id, content: p.output },
        });
        break;
      default:
        break;
    }
  }

  private parseEventMsg(p: CodexPayload, ts: string | number, events: TrajectoryEvent[]): void {
    switch (p.type) {
      case 'user_message':
        // The real user prompt (response_item.message role=user is env-context noise).
        events.push({ ts, kind: 'user', payload: { text: p.message ?? '' } });
        break;
      case 'agent_message':
        // Duplicate of the response_item.message assistant text → skip to avoid
        // doubling assistant events.
        break;
      case 'token_count': {
        // `last_token_usage` is the per-turn DELTA; summing deltas across events gives
        // the session total (`total_token_usage` is cumulative — summing it double-counts).
        //
        // COMPACTION SEMANTICS (decided, §12): after a context compaction Codex emits a
        // `token_count` whose `last_token_usage` deltas are all ZERO while
        // `total_token_usage` is NONZERO (the running cumulative). We DELIBERATELY key off
        // the delta only, so such an event contributes zero — the cumulative total is
        // already accounted for by the prior per-turn deltas, and folding it in here would
        // double-count. The native object is still preserved verbatim on `raw`, so nothing
        // is lost for downstream inspection. (When `last_token_usage` is absent entirely we
        // emit no usage event at all — same zero contribution, no synthesized numbers.)
        const last = p.info?.last_token_usage;
        if (last) {
          // Codex native accounting (§12): `input_tokens` INCLUDES the cached subset
          // and `output_tokens` INCLUDES reasoning. Decompose into DISJOINT classes so
          // `total` and priced $ never double-count, while preserving the verified
          // per-turn delta sums (input == input + cacheRead; output == output +
          // reasoning). `raw` keeps the native object.
          const cacheRead = num(last.cached_input_tokens);
          const reasoning = num(last.reasoning_output_tokens);
          events.push({
            ts,
            kind: 'usage',
            payload: makeUsage({
              input: Math.max(0, num(last.input_tokens) - cacheRead),
              output: Math.max(0, num(last.output_tokens) - reasoning),
              reasoning,
              cacheRead,
              raw: last,
            }),
          });
        }
        break;
      }
      case 'task_started':
        events.push({ ts, kind: 'lifecycle', name: 'task_started', payload: {} });
        break;
      case 'task_complete':
        events.push({
          ts,
          kind: 'lifecycle',
          name: 'task_complete',
          payload: { last_agent_message: p.last_agent_message ?? null },
        });
        break;
      case 'context_compacted':
        events.push({ ts, kind: 'lifecycle', name: 'compacted', payload: {} });
        break;
      default:
        break;
    }
  }

  /**
   * Normalize one Codex `Stop` hook JSONL line → CanonicalStopSignal
   * (docs/hooks/codex.md Stop input: session_id, turn_id, transcript_path,
   * last_assistant_message).
   */
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
    // codex's Stop payload does not currently report reasoning effort; read it
    // defensively (same `{ level }` shape as claude) so a future version that does is
    // captured automatically. Undefined → the trial's agentEffort omits `observed`.
    const level = obj.effort?.level;
    const effort = typeof level === 'string' && level !== '' ? level : undefined;
    return {
      sessionId: obj.session_id ?? '',
      ...(obj.transcript_path ? { transcriptPath: obj.transcript_path } : {}),
      lastAssistantMessage: obj.last_assistant_message ?? null,
      ...(effort !== undefined ? { effort } : {}),
    };
  }

  /**
   * Deterministic pre-gate (§6, P4): no final message yet → keep waiting (no LLM); a
   * present final message escalates to the fast model (returned as 'question').
   */
  classifyTurn(signal: CanonicalStopSignal): 'question' | 'done' | 'working' {
    const msg = signal.lastAssistantMessage;
    if (msg === null || msg.trim() === '') return 'working';
    return 'question';
  }

  /**
   * Deterministic completion corroboration (P4, §10.2): an `event_msg:task_complete`
   * after the last user turn means the turn finished — terminate without an LLM call.
   */
  detectCompletion(events: TrajectoryEvent[]): boolean {
    let lastUser = -1;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i]!.kind === 'user') {
        lastUser = i;
        break;
      }
    }
    for (let i = events.length - 1; i > lastUser; i -= 1) {
      if (events[i]!.kind === 'lifecycle' && events[i]!.name === 'task_complete') return true;
    }
    return false;
  }

  /** Codex has no structured-question tool (§10.2) — questions arrive as free-text
   *  via `Stop.last_assistant_message`, handled by the Stop turn loop. */
  detectStructuredQuestion(_events: TrajectoryEvent[]): StructuredQuestion | null {
    return null;
  }

  extractUsage(events: TrajectoryEvent[]): AgentUsage {
    const usage = zeroUsage();
    for (const e of events) {
      if (e.kind === 'usage') addUsage(usage, makeUsage(e.payload as Partial<Usage>));
    }
    return usage;
  }

  /**
   * End the session cleanly (§10.2). Verified empirically on codex-cli 0.142.2
   * (interactive TUI): two Ctrl-C presses exit the TUI cleanly (the first requests
   * confirmation / interrupts the turn, the second quits). We send Ctrl-C, pause,
   * then Ctrl-C again; the engine then awaits PTY exit within its terminate grace and
   * hard-kills if the process is still alive.
   */
  async terminate(session: TerminalSession): Promise<void> {
    await session.write('\x03');
    await new Promise((r) => setTimeout(r, 300));
    await session.write('\x03');
  }
}

// --- MCP → per-invocation `-c` TOML overrides (P11) --------------------------

/** Render one MCP ProvisionItem as `-c mcp_servers.<name>.<field>=<toml>` args. Every
 *  field of the item (except `name`) is emitted; values are TOML-encoded. */
function mcpToConfigArgs(mcp: ProvisionItem): string[] {
  const { name, ...fields } = mcp;
  const args: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    args.push('-c', `mcp_servers.${tomlKey(name)}.${key}=${tomlValue(value)}`);
  }
  return args;
}

/** Quote a dotted-path key segment if it is not a bare TOML key (letters/digits/_/-). */
function tomlKey(k: string): string {
  return /^[A-Za-z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
}

/** TOML value encoding for a `-c` override (JSON string syntax is valid TOML for the
 *  scalar/array/inline-table shapes we emit). */
function tomlValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(tomlValue).join(', ')}]`;
  if (v && typeof v === 'object') {
    const parts = Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .map(([k, val]) => `${tomlKey(k)} = ${tomlValue(val)}`);
    return `{ ${parts.join(', ')} }`;
  }
  return JSON.stringify(String(v));
}

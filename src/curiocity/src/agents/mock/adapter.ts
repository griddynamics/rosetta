import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * `MockAdapter` (§10.3, D10) — the reference `AgentAdapter` and the integration-test
 * vehicle. It renders the SAME canonical control protocol (§5.2) as the real
 * adapters: `renderHooks` tells the mock TUI (via env) where the ctrl files live,
 * and the TUI itself writes `session-start.json` and appends `stop.jsonl` exactly
 * like real hooks would. Its transcript is a tiny JSONL dialect this adapter parses.
 */

function currentEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

interface MockTranscriptLine {
  ts: string;
  type: 'user' | 'assistant' | 'tool_call' | 'usage' | 'lifecycle';
  name?: string;
  text?: string;
  question?: string;
  options?: string[];
  inputTokens?: number;
  outputTokens?: number;
}

export class MockAdapter implements AgentAdapter {
  readonly id = 'mock';

  prepare(ctx: TrialContext, hookSpec: CanonicalHookSpec): Promise<LaunchPlan> {
    return composeLaunchPlan(this, ctx, hookSpec);
  }

  async renderHooks(spec: CanonicalHookSpec, ctx: TrialContext): Promise<LaunchFragment> {
    // The mock TUI plays the role of the hooks: it writes these files itself. We
    // only tell it where (canonical paths) + where its transcript + session id are.
    return {
      env: {
        MOCK_SESSION_START: spec.sessionStart.writeTo,
        MOCK_STOP: spec.stop.appendTo,
        MOCK_TRANSCRIPT: this.transcriptPath(ctx),
        MOCK_SESSION_ID: ctx.sessionId,
      },
    };
  }

  async renderProvisioning(_spec: ProvisionSpec, _ctx: TrialContext): Promise<LaunchFragment> {
    // The mock has no MCPs/plugins to provision.
    return {};
  }

  buildLaunch(ctx: TrialContext): LaunchFragment {
    const vars = templateVars(ctx);
    // `agentModel` and `agentEffort` (§5.2) are accepted + recorded (they ride
    // `ctx.profile` and are captured as the requested values) but a NO-OP for the mock:
    // the scripted TUI has no real model/effort surface, so nothing is appended to argv.
    // An adapter with no effort surface warns + omits (never fails) — the mock simply
    // omits, and observed effort stays undefined unless the scene emits it in `stop.jsonl`.
    return {
      args: ctx.profile.args.map((a) => applyTemplate(a, vars)),
      env: filterAgentEnv(currentEnv(), ctx.profile.envRemove, ctx.profile.envSet),
    };
  }

  private transcriptPath(ctx: TrialContext): string {
    return join(ctx.ctrlDir, 'transcript.jsonl');
  }

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
    return { path: this.transcriptPath(ctx), kind: 'fallback' };
  }

  parseEvents(raw: string): TrajectoryEvent[] {
    const events: TrajectoryEvent[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      let obj: MockTranscriptLine;
      try {
        obj = JSON.parse(trimmed) as MockTranscriptLine;
      } catch {
        continue;
      }
      switch (obj.type) {
        case 'user':
          events.push({ ts: obj.ts, kind: 'user', payload: { text: obj.text ?? '' } });
          break;
        case 'assistant':
          events.push({ ts: obj.ts, kind: 'assistant', payload: { text: obj.text ?? '' } });
          break;
        case 'tool_call':
          events.push({
            ts: obj.ts,
            kind: 'tool_call',
            ...(obj.name !== undefined ? { name: obj.name } : {}),
            payload:
              obj.name === 'AskUserQuestion'
                ? { question: obj.question ?? '', options: obj.options ?? [] }
                : { text: obj.text ?? '' },
          });
          break;
        case 'usage':
          events.push({
            ts: obj.ts,
            kind: 'usage',
            payload: makeUsage({ input: obj.inputTokens ?? 0, output: obj.outputTokens ?? 0 }),
          });
          break;
        case 'lifecycle':
          events.push({
            ts: obj.ts,
            kind: 'lifecycle',
            ...(obj.name !== undefined ? { name: obj.name } : {}),
            payload: {},
          });
          break;
        default:
          break;
      }
    }
    return events;
  }

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
    // Mirror the claude Stop shape (`effort: { level }`) so a scene can exercise the
    // observed-effort path (§5.2); undefined when the scene doesn't emit it.
    const level = obj.effort?.level;
    const effort = typeof level === 'string' && level !== '' ? level : undefined;
    return {
      sessionId: obj.session_id ?? '',
      ...(obj.transcript_path !== undefined ? { transcriptPath: obj.transcript_path } : {}),
      lastAssistantMessage: obj.last_assistant_message ?? null,
      ...(effort !== undefined ? { effort } : {}),
    };
  }

  classifyTurn(signal: CanonicalStopSignal): 'question' | 'done' | 'working' {
    // Deterministic pre-gate (P4): no final message yet → continuation (keep
    // waiting, no LLM). A present final message escalates to the fast model, which
    // decides question / done / working (§6 rows 2-4) — signalled by 'question'.
    const msg = signal.lastAssistantMessage;
    if (msg === null || msg.trim() === '') return 'working';
    return 'question';
  }

  detectCompletion(events: TrajectoryEvent[]): boolean {
    // A `task_complete` lifecycle marker after the last user turn corroborates a
    // done turn deterministically (mirrors Codex `event_msg:task_complete`, §10.2).
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

  detectStructuredQuestion(events: TrajectoryEvent[]): StructuredQuestion | null {
    let qIdx = -1;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i]!.kind === 'tool_call' && events[i]!.name === 'AskUserQuestion') {
        qIdx = i;
        break;
      }
    }
    if (qIdx === -1) return null;
    // A later user event means the question was already answered.
    for (let i = qIdx + 1; i < events.length; i += 1) {
      if (events[i]!.kind === 'user') return null;
    }
    const payload = events[qIdx]!.payload as { question?: string; options?: string[] };
    return {
      question: payload.question ?? '',
      ...(payload.options !== undefined ? { options: payload.options } : {}),
      raw: payload,
    };
  }

  extractUsage(events: TrajectoryEvent[]): AgentUsage {
    const usage = zeroUsage();
    for (const e of events) {
      if (e.kind === 'usage') addUsage(usage, makeUsage(e.payload as Partial<Usage>));
    }
    return usage;
  }

  async terminate(session: TerminalSession): Promise<void> {
    // The mock idles on stdin after its scene; `/exit` makes it exit 0 cleanly.
    await session.write('/exit\r');
  }
}

import type { AgentProfile, ProvisionSpec } from '../config/schema';
import type { TrajectoryEvent, Usage } from '../shared/trajectory';
import type { TerminalSession } from '../terminal/session';

/**
 * Agent adapter contract (§5.2). Lives with the agent layer (not `shared/`) so the
 * adapter contract and its registry stay in one place; adapters translate to/from
 * each agent's native shape while the control protocol, ctrl-dir layout and signal
 * shapes below are CORE-owned and identical for every agent.
 *
 * `AgentProfile` / `ProvisionSpec` are imported type-only from `config/` (erased at
 * runtime) — no runtime coupling is introduced.
 */

// --- Canonical control protocol (core-owned) --------------------------------

export interface CanonicalHookSpec {
  /** → `<ctrlDir>/session-start.json`; payload must include transcript_path, session_id. */
  sessionStart: { writeTo: string };
  /** → `<ctrlDir>/stop.jsonl`; payload must include last_assistant_message. */
  stop: { appendTo: string };
}

export interface CanonicalStopSignal {
  sessionId: string;
  transcriptPath?: string;
  lastAssistantMessage: string | null;
  /** Observed reasoning effort the agent CLI actually ran at, when the native stop
   *  payload reports it (§5.2). Claude's Stop hook carries `effort: { level }` (verified
   *  live, docs/hooks/claude-code.md); adapters without it leave this undefined. Recorded
   *  as `agentEffort.observed` and compared against the requested value like agentModel. */
  effort?: string;
}

export interface FileToWrite {
  path: string;
  content: string;
  /** Optional unix mode (e.g. 0o755 for a generated script). */
  mode?: number;
}

export type LaunchFragment = {
  args?: string[];
  env?: Record<string, string>;
  files?: FileToWrite[];
  commands?: string[];
};

/** Ordered merge of the three fragments + the resolved command (§5.2). */
export interface LaunchPlan {
  command: string;
  args: string[];
  env: Record<string, string>;
  files: FileToWrite[];
  commands: string[];
}

/** Where a transcript is read from, and whether the location was authoritative. */
export interface TranscriptSource {
  path: string;
  kind: 'authoritative' | 'fallback';
}

/** A pending structured question detected in the trajectory tail (§5.2). */
export interface StructuredQuestion {
  question: string;
  /** Optional preset choices (e.g. Claude `AskUserQuestion` options). */
  options?: string[];
  /** Raw payload for the audit trail. */
  raw?: unknown;
}

export type AgentUsage = Usage;

/** Everything an adapter needs to render specs + launch + locate the transcript. */
export interface TrialContext {
  agentId: string;
  caseName: string;
  repeat: number;
  workspace: string;
  ctrlDir: string;
  sessionId: string;
  prompt: string;
  profile: AgentProfile;
  provision: ProvisionSpec;
  /** Trial start time (epoch ms) — used by fallback transcript location. */
  startedAt: number;
}

export interface AgentAdapter {
  readonly id: string;

  /**
   * Optional built-in default `AgentProfile` (D13 defaults layer, §5.2). When
   * present it is the LOWEST-precedence profile source: the orchestrator/spec seam
   * merges it per-field UNDER `topLevel.codingagents[id]` so an out-of-the-box run
   * (no config file) still reaches the adapter's cells instead of skipping them.
   * The `mock` adapter ships none (its command points at a test fixture, so it
   * always requires an explicit config profile).
   */
  readonly defaultProfile?: AgentProfile;

  /** Pre-spawn orchestration point: composes the three standard steps in order. */
  prepare(ctx: TrialContext, hookSpec: CanonicalHookSpec): Promise<LaunchPlan>;

  /** Step 1 — render the canonical hook spec into agent-native registration. */
  renderHooks(spec: CanonicalHookSpec, ctx: TrialContext): Promise<LaunchFragment>;
  /** Step 2 — materialize the merged ProvisionSpec natively, workspace-scoped (P11). */
  renderProvisioning(spec: ProvisionSpec, ctx: TrialContext): Promise<LaunchFragment>;
  /** Step 3 — command/args/env from profile templates (envRemove filtering, session id). */
  buildLaunch(ctx: TrialContext): LaunchFragment;

  /** Resolve transcript source: ctrl-dir session-start payload (authoritative) or fallback. */
  locateTranscript(ctx: TrialContext): Promise<TranscriptSource>;
  /** Normalize a raw transcript chunk → internal TrajectoryEvent[] (dialect adapter). */
  parseEvents(raw: string): TrajectoryEvent[];
  /** Normalize a native stop payload → CanonicalStopSignal, then classify the turn. */
  classifyTurn(signal: CanonicalStopSignal): 'question' | 'done' | 'working';
  /**
   * Optional deterministic completion detector (P4): a trajectory marker that
   * corroborates a done turn without an LLM call — e.g. Codex's `task_complete`
   * event (§10.2). When it returns true on a Stop whose message needs semantic
   * classification, the engine treats the turn as `done` and skips the fast model.
   */
  detectCompletion?(events: TrajectoryEvent[]): boolean;
  /** Normalize a raw native stop payload line → CanonicalStopSignal. */
  parseStopSignal(raw: string): CanonicalStopSignal | null;
  /** Detect a pending structured question in the trajectory tail (null if none). */
  detectStructuredQuestion(events: TrajectoryEvent[]): StructuredQuestion | null;
  /**
   * Optional SCREEN-based structured-question detection (§6 row 1). Some CLIs buffer a
   * pending structured question and only write its `tool_use` to the transcript AFTER
   * it is answered (verified live: Claude Code 2.1.199 `AskUserQuestion`), so while it
   * is pending the only signal is the rendered menu. Adapters that face this implement
   * this from the snapshot; the engine falls back to it when `detectStructuredQuestion`
   * (transcript) finds nothing. Returns null when no on-screen menu is present.
   */
  detectScreenQuestion?(snapshot: string): StructuredQuestion | null;
  /**
   * Optional adapter-native submission of a structured answer (§6). Menu-style
   * questions are answered by navigation keystrokes (arrows + Enter), not free text —
   * so an adapter with a screen menu implements this; the engine uses it instead of
   * typing the answer as a line. `answer` is the composed choice (an option label).
   */
  submitStructuredAnswer?(
    session: TerminalSession,
    question: StructuredQuestion,
    answer: string,
  ): Promise<void>;
  /** Extract the agent's own token usage from the trajectory (cost accounting). */
  extractUsage(events: TrajectoryEvent[]): AgentUsage;
  /** End the session cleanly (e.g. type `/exit`, send key). */
  terminate(session: TerminalSession): Promise<void>;
}

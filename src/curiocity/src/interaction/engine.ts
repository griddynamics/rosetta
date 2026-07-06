import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentProfile } from '../config/schema';
import type { ModelRouter } from '../shared/model-router';
import type { QnaEntry, TrajectoryEvent, Usage } from '../shared/trajectory';
import type { AgentAdapter, CanonicalStopSignal, TrialContext } from '../agents/types';
import type { TerminalSession } from '../terminal/session';
import { ChangeMonitor } from './change-monitor';
import {
  classifyScreen,
  classifyStopMessage,
  composeFreeTextAnswer,
  composeStructuredAnswer,
} from './classify';
import { extractJsonObjectStrings } from './stop-reader';

/**
 * Interaction engine (§6) — the Curion-side turn loop / state machine
 * `launching → ready → submitted → working ⇄ answering → completing → done`
 * (+ terminal `timeout`, `agent-crash`, `agent-hung`).
 *
 * It implements the §6 QnA trigger decision table EXACTLY, row by row. P3 is the
 * prime directive: typed input is injected ONLY for (a) a pending structured
 * question, (b) a Stop-classified free-text question, (c) a screen-reader
 * input-prompt classification, and (d) deterministic startup `dialogPatterns` /
 * session termination. Ordinary tool activity NEVER causes input (the last table
 * row) — the loop simply keeps waiting.
 */

export type InteractionOutcome = 'done' | 'agent-hung' | 'agent-crash' | 'timeout';

/** One turn's raw timeline (§12): submitted → Stop signal → harness reply typed.
 *  `question` marks a turn where the harness answered ≥1 question (drives turn metrics). */
export interface TurnTiming {
  turnStart: number;
  stopAt: number;
  reactionDoneAt: number;
  question: boolean;
}

export interface InteractionResult {
  outcome: InteractionOutcome;
  turnCount: number;
  qna: QnaEntry[];
  events: TrajectoryEvent[];
  usage: Usage;
  /** Rendered snapshots captured at key moments (evidence, §7 collect). */
  screens: string[];
  transcriptPath: string;
  transcriptSource: 'authoritative' | 'fallback';
  /** Raw per-turn timeline (§12); persisted so stats re-derive retroactively (D8). */
  timeline: TurnTiming[];
  /** MEASURED agent execution time = Σ(stopAt − turnStart) — never subtraction (§12). */
  agentPureMs: number;
  /** MEASURED harness reaction time = Σ(reactionDoneAt − stopAt). */
  harnessReactMs: number;
  /** Readiness wall-clock (launching → ready), so lifecycle can bill launchMs vs interactMs. */
  readyMs: number;
  /** Agent model id where the CLI reported one (SessionStart payload), for per-model keying. */
  agentModel?: string;
  /** Reasoning effort the CLI reported running at (latest Stop-hook `effort`), when any
   *  turn's stop payload carried it (§5.2). Undefined for adapters with no effort surface. */
  agentEffort?: string;
}

export interface EngineDeps {
  session: TerminalSession;
  adapter: AgentAdapter;
  ctx: TrialContext;
  profile: AgentProfile;
  router: ModelRouter;
  qnaPolicy: string;
  maxTurns?: number;
  maxWallClockMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  onQna?: (entry: QnaEntry) => void;
  log?: (msg: string, fields?: Record<string, unknown>) => void;
  /** (R2, orchestrator ruling) Wall-clock instant the agent process was spawned WITH
   *  the prompt already in its launch args (D15). Since the prompt is a launch
   *  argument, the agent starts working at spawn, not at readiness-settle — turn 1's
   *  `turnStart` anchors here so `agentPureMs` reflects real agent execution time
   *  instead of being swallowed into `launchMs`. Falls back to `now()` at the top of
   *  `run()` when the caller doesn't know a precise spawn instant (e.g. a bare unit
   *  test constructing the engine directly). */
  spawnedAt?: number;
}

const DEFAULT_POLL_MS = 25;
const DEFAULT_MAX_TURNS = 100;
const TERMINATE_GRACE_MS = 2000;

type CheckAction = { action: 'answered' | 'terminate' | 'none' };

/** Deterministic "the turn ended by asking" heuristic: the final message ends with a
 *  question mark. Used to stop a completion marker (e.g. Codex `task_complete`) from
 *  swallowing a genuine turn-final question without an LLM call. */
function endsWithQuestion(msg: string | null): boolean {
  return msg !== null && msg.trim().endsWith('?');
}

export class InteractionEngine {
  private readonly session: TerminalSession;
  private readonly adapter: AgentAdapter;
  private readonly ctx: TrialContext;
  private readonly profile: AgentProfile;
  private readonly router: ModelRouter;
  private readonly qnaPolicy: string;
  private readonly maxTurns: number;
  private readonly maxWallClockMs: number;
  private readonly pollMs: number;
  private readonly now: () => number;
  private readonly onQna: ((entry: QnaEntry) => void) | undefined;
  private readonly log: (msg: string, fields?: Record<string, unknown>) => void;
  private readonly spawnedAt: number | undefined;

  private readonly qna: QnaEntry[] = [];
  private readonly screens: string[] = [];
  private readonly firedDialogs = new Set<string>();
  private readonly stopPath: string;

  private transcriptPath = '';
  private transcriptSource: 'authoritative' | 'fallback' = 'fallback';
  private agentModel: string | undefined;
  private agentEffort: string | undefined;
  private cachedEvents: TrajectoryEvent[] = [];
  private lastTranscriptSize = -1;
  private processedStopCount = 0;
  private turnCount = 0;
  private structuredAnswered = false;
  private readyMs = 0;

  // --- Per-turn timeline (§12) -----------------------------------------------
  private readonly timeline: TurnTiming[] = [];
  /** When the current turn started (prompt/answer submitted); set at ready + after each reply. */
  private currentTurnStart = 0;

  /** Record one completed turn's timeline; advance the next turn's start when we replied.
   *  `answered` (we typed a reply to a question) both marks this a question turn (§12
   *  turn metrics) and advances the next turn's start — the two always coincide. */
  private recordTurn(stopAt: number, reactionDoneAt: number, answered: boolean): void {
    this.timeline.push({ turnStart: this.currentTurnStart, stopAt, reactionDoneAt, question: answered });
    if (answered) this.currentTurnStart = reactionDoneAt;
  }

  constructor(deps: EngineDeps) {
    this.session = deps.session;
    this.adapter = deps.adapter;
    this.ctx = deps.ctx;
    this.profile = deps.profile;
    this.router = deps.router;
    this.qnaPolicy = deps.qnaPolicy;
    this.maxTurns = deps.maxTurns ?? DEFAULT_MAX_TURNS;
    this.maxWallClockMs = deps.maxWallClockMs ?? 10 * 60_000;
    this.pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS;
    this.now = deps.now ?? Date.now;
    this.onQna = deps.onQna;
    this.log = deps.log ?? (() => {});
    this.spawnedAt = deps.spawnedAt;
    this.stopPath = join(this.ctx.ctrlDir, 'stop.jsonl');
  }

  get qnaLog(): QnaEntry[] {
    return this.qna;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private recordQna(type: 'structured' | 'free-text', question: string, answer: string): void {
    const entry: QnaEntry = { type, question, answer, ts: new Date().toISOString() };
    this.qna.push(entry);
    this.onQna?.(entry);
  }

  /** Best-effort agent model id from the SessionStart ctrl payload (per-model keying,
   *  §12). Claude/mock report `model`; Codex may not — undefined then. */
  private readAgentModel(): string | undefined {
    const startPath = join(this.ctx.ctrlDir, 'session-start.json');
    if (!existsSync(startPath)) return undefined;
    try {
      const payload = JSON.parse(readFileSync(startPath, 'utf8')) as { model?: unknown };
      return typeof payload.model === 'string' && payload.model !== '' ? payload.model : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Re-locate the transcript while the current path does not exist yet. Codex has no
   * `--session-id`, so on the fallback path its rollout file may not exist at t0 (the
   * adapter returns a non-existent sentinel); `locateTranscript` is idempotent and
   * cheap, so we retry it until a real file appears (otherwise the trajectory stays
   * empty forever and the agent flies blind). Once the file exists we stop re-locating.
   */
  private async ensureTranscript(): Promise<void> {
    if (this.transcriptPath !== '' && existsSync(this.transcriptPath)) return;
    try {
      const located = await this.adapter.locateTranscript(this.ctx);
      if (located.path !== this.transcriptPath) {
        this.transcriptPath = located.path;
        this.transcriptSource = located.kind;
        this.lastTranscriptSize = -1; // force a re-read
        if (existsSync(located.path)) this.agentModel = this.readAgentModel();
      }
    } catch {
      // keep the current (sentinel) path; try again next tick
    }
  }

  private transcriptSize(): number {
    if (!existsSync(this.transcriptPath)) return 0;
    try {
      return statSync(this.transcriptPath).size;
    } catch {
      return 0;
    }
  }

  private readEvents(): TrajectoryEvent[] {
    const size = this.transcriptSize();
    if (size === this.lastTranscriptSize) return this.cachedEvents;
    this.lastTranscriptSize = size;
    if (size === 0 || !existsSync(this.transcriptPath)) {
      this.cachedEvents = [];
      return this.cachedEvents;
    }
    try {
      this.cachedEvents = this.adapter.parseEvents(readFileSync(this.transcriptPath, 'utf8'));
    } catch {
      // leave cache as-is on a transient read error
    }
    return this.cachedEvents;
  }

  /**
   * (R1, orchestrator ruling) Blank lines are dropped and any line carrying more
   * than one concatenated JSON object (the newline-loss failure mode) is
   * defensively re-split — see `stop-reader.ts`. `processedStopCount` counts
   * extracted JSON items, not raw lines, so it stays correct under either shape.
   */
  private readNewStopSignals(): CanonicalStopSignal[] {
    if (!existsSync(this.stopPath)) return [];
    let content: string;
    try {
      content = readFileSync(this.stopPath, 'utf8');
    } catch {
      return [];
    }
    const items = extractJsonObjectStrings(content);
    if (items.length <= this.processedStopCount) return [];
    const fresh = items.slice(this.processedStopCount);
    this.processedStopCount = items.length;
    const signals: CanonicalStopSignal[] = [];
    for (const item of fresh) {
      const sig = this.adapter.parseStopSignal(item);
      if (sig) signals.push(sig);
    }
    return signals;
  }

  private processDialogPatterns(snapshot: string): void {
    for (const rule of this.profile.dialogPatterns ?? []) {
      if (this.firedDialogs.has(rule.pattern)) continue;
      let re: RegExp;
      try {
        re = new RegExp(rule.pattern);
      } catch {
        continue;
      }
      if (re.test(snapshot)) {
        this.firedDialogs.add(rule.pattern);
        // Deterministic dialog clearing — NOT P3 input injection.
        void this.session.write(rule.send);
      }
    }
  }

  /** Await PTY exit up to a grace, then hard-kill. */
  private async awaitExit(graceMs: number): Promise<void> {
    const deadline = this.now() + graceMs;
    while (!this.session.hasExited && this.now() < deadline) {
      await this.sleep(this.pollMs);
    }
    if (!this.session.hasExited) this.session.kill();
  }

  // --- Readiness (launching → ready) -----------------------------------------
  private async waitForReadiness(): Promise<'ready' | 'agent-crash'> {
    const monitor = new ChangeMonitor();
    const banner = this.profile.readiness.bannerPattern;
    const bannerRe = banner ? new RegExp(banner) : null;
    const start = this.now();
    for (;;) {
      if (this.session.hasExited) return 'agent-crash';
      if (this.now() - start > this.maxWallClockMs) return 'agent-crash';
      const snapshot = this.session.snapshot();
      this.processDialogPatterns(snapshot);
      if (bannerRe && bannerRe.test(snapshot)) {
        this.screens.push(snapshot);
        return 'ready';
      }
      if (!bannerRe && snapshot.trim() !== '') {
        const now = this.now();
        monitor.update({ screen: snapshot, transcriptSize: 0 }, now);
        if (monitor.unchangedMs(now) >= this.profile.readiness.quietMs) {
          this.screens.push(snapshot);
          return 'ready';
        }
      }
      await this.sleep(this.pollMs);
    }
  }

  // --- Turn handling (§6 rows 2/3/4) -----------------------------------------
  private async handleStop(
    signal: CanonicalStopSignal,
    snapshot: string,
    events: TrajectoryEvent[],
  ): Promise<'answered' | 'terminate' | 'keep-waiting'> {
    this.turnCount += 1;
    // Capture the observed reasoning effort the CLI ran at (§5.2): the Stop payload
    // reports it (claude: `effort.level`), so keep the latest non-empty value across
    // turns — this is the observed truth compared against the requested effort.
    if (signal.effort !== undefined && signal.effort !== '') this.agentEffort = signal.effort;
    // stopAt: the Stop signal marks the end of the agent's own execution for this turn.
    const stopAt = this.now();
    const base = this.adapter.classifyTurn(signal); // deterministic pre-gate (P4)
    // row 4 (deterministic): a `working` continuation is NOT a turn boundary — the
    // agent is still executing, so we don't close the turn (currentTurnStart holds).
    if (base === 'working') return 'keep-waiting';
    if (base === 'done') {
      this.recordTurn(stopAt, this.now(), false); // row 3 (deterministic)
      return 'terminate';
    }

    // Deterministic completion marker in the trajectory corroborates done (P4, §10.2)
    // → terminate without an LLM call — BUT only when the turn-final message is not a
    // question. Codex emits `task_complete` at the END OF EVERY turn, including a turn
    // that ended by ASKING (verified live: it asks free-text when `request_user_input`
    // is unavailable, then task_completes). Treating that as done swallowed the question
    // and never answered it. A message ending in '?' is a genuine question → fall
    // through to classification/answer; anything else keeps the cheap deterministic
    // done-path (preserves the no-LLM done shortcut for real completions).
    if (this.adapter.detectCompletion?.(events) && !endsWithQuestion(signal.lastAssistantMessage)) {
      this.recordTurn(stopAt, this.now(), false); // row 3 (deterministic)
      return 'terminate';
    }

    // base === 'question': a final message is present; the fast model classifies it.
    const cls = await classifyStopMessage(this.router, signal.lastAssistantMessage);
    if (cls === 'done') {
      this.recordTurn(stopAt, this.now(), false); // row 3
      return 'terminate';
    }
    if (cls === 'working') return 'keep-waiting'; // row 4

    // row 2: genuine free-text question → workhorse composes the answer → typed reply.
    const question = signal.lastAssistantMessage ?? '';
    const answer = await composeFreeTextAnswer(this.router, this.qnaPolicy, question, snapshot);
    this.recordQna('free-text', question, answer);
    await this.session.submitLine(answer);
    this.recordTurn(stopAt, this.now(), true); // reply typed → next turn starts now
    return 'answered';
  }

  /**
   * The escalation check set shared by the stall detector (row 1 & row 5) and the
   * freeze watchdog's first window (row 6): structured question first, then — only
   * for screen-reader/hybrid profiles and only when no Stop/structured question is
   * pending — a screen classification.
   */
  private async runChecks(snapshot: string, events: TrajectoryEvent[]): Promise<CheckAction> {
    // The stall/freeze that triggered these checks is itself the "agent stopped"
    // moment for timeline accounting (a structured question may fire no Stop hook).
    const stopAt = this.now();
    // Row 1: pending structured question (stall/freeze confirms the TUI is waiting).
    // Prefer the transcript signal; fall back to the SCREEN for CLIs that buffer the
    // pending question out of the transcript (e.g. Claude Code AskUserQuestion).
    if (!this.structuredAnswered) {
      let sq = this.adapter.detectStructuredQuestion(events);
      let fromScreen = false;
      if (!sq && this.adapter.detectScreenQuestion) {
        sq = this.adapter.detectScreenQuestion(snapshot);
        fromScreen = sq !== null;
      }
      if (sq) {
        const answer = await composeStructuredAnswer(this.router, this.qnaPolicy, sq);
        this.recordQna('structured', sq.question, answer);
        // A screen menu is answered by navigation keystrokes (adapter-native), not by
        // typing a line; the transcript path uses the ordinary typed reply.
        if (fromScreen && this.adapter.submitStructuredAnswer) {
          await this.adapter.submitStructuredAnswer(this.session, sq, answer);
        } else {
          await this.session.submitLine(answer);
        }
        this.structuredAnswered = true;
        this.turnCount += 1;
        this.recordTurn(stopAt, this.now(), true); // reply sent → next turn starts now
        return { action: 'answered' };
      }
    }
    // Row 5: screen-reader/hybrid only — classify the settled screen.
    if (this.profile.strategy === 'screen-reader' || this.profile.strategy === 'hybrid') {
      const kind = await classifyScreen(this.router, snapshot);
      if (kind === 'input-prompt') {
        const answer = await composeFreeTextAnswer(this.router, this.qnaPolicy, snapshot, snapshot);
        this.recordQna('free-text', snapshot, answer);
        await this.session.submitLine(answer);
        this.turnCount += 1;
        this.recordTurn(stopAt, this.now(), true);
        return { action: 'answered' };
      }
      if (kind === 'finished') {
        this.recordTurn(stopAt, this.now(), false);
        return { action: 'terminate' };
      }
      // 'thinking' → keep waiting
    }
    return { action: 'none' };
  }

  private buildResult(outcome: InteractionOutcome): InteractionResult {
    const events = this.readEvents();
    let agentPureMs = 0;
    let harnessReactMs = 0;
    for (const t of this.timeline) {
      agentPureMs += Math.max(0, t.stopAt - t.turnStart);
      harnessReactMs += Math.max(0, t.reactionDoneAt - t.stopAt);
    }
    return {
      outcome,
      turnCount: this.turnCount,
      qna: this.qna,
      events,
      usage: this.adapter.extractUsage(events),
      screens: this.screens,
      transcriptPath: this.transcriptPath,
      transcriptSource: this.transcriptSource,
      timeline: this.timeline,
      agentPureMs,
      harnessReactMs,
      readyMs: this.readyMs,
      ...(this.agentModel !== undefined ? { agentModel: this.agentModel } : {}),
      ...(this.agentEffort !== undefined ? { agentEffort: this.agentEffort } : {}),
    };
  }

  async run(): Promise<InteractionResult> {
    const readyStart = this.now();
    // (R2, orchestrator ruling) The prompt is a launch argument (D15) — the agent
    // starts working the instant its process is spawned WITH that prompt, not when
    // the harness's readiness detector later settles (banner/quiet). Anchoring turn
    // 1's `turnStart` at readiness-settle instead of spawn misattributes the agent's
    // real think time (which happens WHILE the screen is still busy, i.e. exactly
    // the window readiness is waiting out) into `launchMs`, leaving `agentPureMs`
    // near-zero for single-turn trials. `spawnedAt` (measured by the caller at the
    // actual PTY spawn instant) is the correct anchor; fall back to `readyStart`
    // (this method's own entry, still earlier than ready-settle) when the caller
    // doesn't supply one.
    this.currentTurnStart = this.spawnedAt ?? readyStart;
    const ready = await this.waitForReadiness();
    this.readyMs = Math.max(0, this.now() - readyStart);
    if (ready === 'agent-crash') return this.buildResult('agent-crash');

    const located = await this.adapter.locateTranscript(this.ctx);
    this.transcriptPath = located.path;
    this.transcriptSource = located.kind;
    this.agentModel = this.readAgentModel();

    const monitor = new ChangeMonitor();
    let lastKey: string | null = null;
    let checksRanThisEpisode = false;
    let freezeWindow1Logged = false;
    const start = this.now();
    const windowMs = this.profile.freeze.windowMs;

    for (;;) {
      if (this.session.hasExited) {
        // PTY died before we asked it to (no terminate in flight) → crash.
        return this.buildResult('agent-crash');
      }
      const now = this.now();
      if (now - start > this.maxWallClockMs) {
        this.screens.push(this.session.snapshot());
        await this.adapter.terminate(this.session);
        await this.awaitExit(TERMINATE_GRACE_MS);
        return this.buildResult('timeout');
      }
      if (this.turnCount > this.maxTurns) {
        await this.adapter.terminate(this.session);
        await this.awaitExit(TERMINATE_GRACE_MS);
        return this.buildResult('timeout');
      }

      // Codex fallback: the rollout may appear after t0 — keep trying to locate it
      // until a real transcript file exists (otherwise events stay empty forever).
      await this.ensureTranscript();

      const snapshot = this.session.snapshot();
      const events = this.readEvents();
      const size = this.transcriptSize();

      this.processDialogPatterns(snapshot);

      monitor.update({ screen: snapshot, transcriptSize: size }, now);
      if (monitor.key !== lastKey) {
        lastKey = monitor.key;
        checksRanThisEpisode = false;
        freezeWindow1Logged = false;
      }

      // (1) Turn loop — Stop signals drive everything first (§6).
      const stops = this.readNewStopSignals();
      if (stops.length > 0) {
        let terminate = false;
        for (const sig of stops) {
          const action = await this.handleStop(sig, snapshot, events);
          if (action === 'terminate') {
            terminate = true;
            break;
          }
        }
        if (terminate) {
          this.screens.push(this.session.snapshot());
          await this.adapter.terminate(this.session);
          await this.awaitExit(TERMINATE_GRACE_MS);
          return this.buildResult('done');
        }
        monitor.reset();
        lastKey = null;
        continue;
      }

      const unchanged = monitor.unchangedMs(now);

      // (2) Freeze watchdog (zero change; stricter than stall).
      if (unchanged >= 2 * windowMs) {
        // Second consecutive identical window → deterministic fail-safe (row 7).
        this.log('freeze watchdog: agent-hung', { unchangedMs: unchanged });
        this.screens.push(snapshot);
        await this.adapter.terminate(this.session);
        await this.awaitExit(TERMINATE_GRACE_MS);
        return this.buildResult('agent-hung');
      }
      if (unchanged >= windowMs && !freezeWindow1Logged) {
        freezeWindow1Logged = true;
        this.log('freeze watchdog: first window', { unchangedMs: unchanged });
        // Row 6: run the checks once. Unified with the stall escalation below via
        // `checksRanThisEpisode` so the same static screen is never checked twice.
        if (!checksRanThisEpisode) {
          checksRanThisEpisode = true;
          const res = await this.runChecks(snapshot, events);
          if (res.action === 'terminate') {
            await this.adapter.terminate(this.session);
            await this.awaitExit(TERMINATE_GRACE_MS);
            return this.buildResult('done');
          }
          if (res.action === 'answered') {
            monitor.reset();
            lastKey = null;
          }
        }
        continue;
      }

      // (3) Stall detector (output settled) → escalate once per episode (rows 1 & 5).
      if (unchanged >= this.profile.stall.quietMs && !checksRanThisEpisode) {
        checksRanThisEpisode = true;
        const res = await this.runChecks(snapshot, events);
        if (res.action === 'terminate') {
          await this.adapter.terminate(this.session);
          await this.awaitExit(TERMINATE_GRACE_MS);
          return this.buildResult('done');
        }
        if (res.action === 'answered') {
          monitor.reset();
          lastKey = null;
        }
        continue;
      }

      await this.sleep(this.pollMs);
    }
  }
}

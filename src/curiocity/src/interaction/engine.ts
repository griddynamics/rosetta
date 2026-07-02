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
}

const DEFAULT_POLL_MS = 25;
const DEFAULT_MAX_TURNS = 100;
const TERMINATE_GRACE_MS = 2000;

type CheckAction = { action: 'answered' | 'terminate' | 'none' };

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

  private readonly qna: QnaEntry[] = [];
  private readonly screens: string[] = [];
  private readonly firedDialogs = new Set<string>();
  private readonly stopPath: string;

  private transcriptPath = '';
  private transcriptSource: 'authoritative' | 'fallback' = 'fallback';
  private cachedEvents: TrajectoryEvent[] = [];
  private lastTranscriptSize = -1;
  private processedStopCount = 0;
  private turnCount = 0;
  private structuredAnswered = false;

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

  private readNewStopSignals(): CanonicalStopSignal[] {
    if (!existsSync(this.stopPath)) return [];
    let content: string;
    try {
      content = readFileSync(this.stopPath, 'utf8');
    } catch {
      return [];
    }
    const lines = content.split('\n').filter((l) => l.trim() !== '');
    if (lines.length <= this.processedStopCount) return [];
    const fresh = lines.slice(this.processedStopCount);
    this.processedStopCount = lines.length;
    const signals: CanonicalStopSignal[] = [];
    for (const line of fresh) {
      const sig = this.adapter.parseStopSignal(line);
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
    const base = this.adapter.classifyTurn(signal); // deterministic pre-gate (P4)
    if (base === 'working') return 'keep-waiting'; // row 4 (deterministic)
    if (base === 'done') return 'terminate'; // row 3 (deterministic)

    // Deterministic completion marker in the trajectory corroborates done (P4, §10.2)
    // → terminate without an LLM call.
    if (this.adapter.detectCompletion?.(events)) return 'terminate'; // row 3 (deterministic)

    // base === 'question': a final message is present; the fast model classifies it.
    const cls = await classifyStopMessage(this.router, signal.lastAssistantMessage);
    if (cls === 'done') return 'terminate'; // row 3
    if (cls === 'working') return 'keep-waiting'; // row 4

    // row 2: genuine free-text question → workhorse composes the answer → typed reply.
    const question = signal.lastAssistantMessage ?? '';
    const answer = await composeFreeTextAnswer(this.router, this.qnaPolicy, question, snapshot);
    this.recordQna('free-text', question, answer);
    await this.session.submitLine(answer);
    return 'answered';
  }

  /**
   * The escalation check set shared by the stall detector (row 1 & row 5) and the
   * freeze watchdog's first window (row 6): structured question first, then — only
   * for screen-reader/hybrid profiles and only when no Stop/structured question is
   * pending — a screen classification.
   */
  private async runChecks(snapshot: string, events: TrajectoryEvent[]): Promise<CheckAction> {
    // Row 1: pending structured question (stall/freeze confirms the TUI is waiting).
    if (!this.structuredAnswered) {
      const sq = this.adapter.detectStructuredQuestion(events);
      if (sq) {
        const answer = await composeStructuredAnswer(this.router, this.qnaPolicy, sq);
        this.recordQna('structured', sq.question, answer);
        await this.session.submitLine(answer);
        this.structuredAnswered = true;
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
        return { action: 'answered' };
      }
      if (kind === 'finished') return { action: 'terminate' };
      // 'thinking' → keep waiting
    }
    return { action: 'none' };
  }

  private buildResult(outcome: InteractionOutcome): InteractionResult {
    const events = this.readEvents();
    return {
      outcome,
      turnCount: this.turnCount,
      qna: this.qna,
      events,
      usage: this.adapter.extractUsage(events),
      screens: this.screens,
      transcriptPath: this.transcriptPath,
      transcriptSource: this.transcriptSource,
    };
  }

  async run(): Promise<InteractionResult> {
    const ready = await this.waitForReadiness();
    if (ready === 'agent-crash') return this.buildResult('agent-crash');

    // Prompt was submitted as a launch argument (D15) → straight to the working loop.
    const located = await this.adapter.locateTranscript(this.ctx);
    this.transcriptPath = located.path;
    this.transcriptSource = located.kind;

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

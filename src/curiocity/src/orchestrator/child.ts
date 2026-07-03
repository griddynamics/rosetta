import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { childToParentSchema, type TrialSpec } from '../shared/ipc';
import type { QnaEntry } from '../shared/trajectory';
import { SCHEMA_VERSION, trialResultSchema, type TrialResult } from '../results/schema';
import { writeTrial } from '../results/store';

/**
 * Parent-side child runner (§4). Forks one Curion (`curion/main`) with the
 * allow-listed env, ships the `TrialSpec` over IPC, streams events, and enforces
 * the per-trial timeout with a process-TREE kill → status `timeout`. The child
 * writes its own trial artifacts on normal completion; the parent writes a minimal
 * `trial.json` for parent-synthesized outcomes (timeout / unexpected death).
 */

/**
 * Resolve the Curion child entry from the URL of THIS module — correct in BOTH run modes:
 *  - source/tests (tsx): this file is `src/orchestrator/child.ts`, so the sibling is
 *    `../curion/main.ts` and the child needs `--import tsx` to run TypeScript.
 *  - built dist: the bundle collapses the tree — this code lives in a dist-root file
 *    (`dist/cli.js` or a shared chunk), and tsup emits the child entry at
 *    `dist/curion/main.js`, so the sibling is `./curion/main.js` (NOT `../`, which would
 *    escape dist).
 * Getting this wrong makes every trial fail to load the child → `agent-crash` (the class
 * of bug this pure function is unit-tested against; see tsup.config.ts). Exported for that
 * test so both the .ts and simulated-.js layouts are pinned.
 */
export function resolveCurionEntry(moduleUrl: string): { path: string; execArgv: string[] } {
  const isTs = moduleUrl.endsWith('.ts');
  return {
    path: fileURLToPath(new URL(isTs ? '../curion/main.ts' : './curion/main.js', moduleUrl)),
    execArgv: isTs ? ['--import', 'tsx'] : [],
  };
}

const { path: CURION_MAIN, execArgv: EXEC_ARGV } = resolveCurionEntry(import.meta.url);

export interface RunChildOptions {
  spec: TrialSpec;
  childEnv: Record<string, string>;
  /** Per-trial wall-clock cap (ms); on expiry the parent process-tree-kills → timeout. */
  timeoutMs: number;
  onLog?: (msg: string, fields?: Record<string, unknown>) => void;
  onQna?: (entry: QnaEntry) => void;
  onMirror?: (data: string) => void;
}

export interface ChildTrialResult {
  result: TrialResult;
  /** True when the child already wrote its trial.json + artifacts (§14). */
  wroteArtifacts: boolean;
}

function synthResult(spec: TrialSpec, status: TrialResult['status'], totalMs: number): TrialResult {
  return trialResultSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    agent: spec.agentId,
    case: spec.caseName,
    repeat: spec.repeat,
    status,
    evaluators: [],
    turnCount: 0,
    qna: [],
    timings: { totalMs },
  });
}

export function runChildTrial(opts: RunChildOptions): Promise<ChildTrialResult> {
  const { spec, childEnv, timeoutMs } = opts;
  return new Promise((resolve) => {
    const started = Date.now();
    const child = fork(CURION_MAIN, [], {
      env: childEnv,
      execArgv: EXEC_ARGV,
      detached: true, // own process group → whole tree (curion + PTY) killable
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    let settled = false;
    let resultMsg: TrialResult | null = null;
    let fatal: string | null = null;

    const killTree = (signal: NodeJS.Signals): void => {
      try {
        if (child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        try {
          child.kill(signal);
        } catch {
          /* already gone */
        }
      }
    };

    const finish = (res: ChildTrialResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    };

    const timer = setTimeout(() => {
      killTree('SIGKILL');
      finish({ result: synthResult(spec, 'timeout', Date.now() - started), wroteArtifacts: false });
    }, timeoutMs);

    child.on('message', (raw) => {
      const parsed = childToParentSchema.safeParse(raw);
      if (!parsed.success) return;
      const msg = parsed.data;
      switch (msg.type) {
        case 'log':
          opts.onLog?.(msg.msg, msg.fields);
          break;
        case 'qna':
          opts.onQna?.(msg.entry);
          break;
        case 'mirror':
          opts.onMirror?.(msg.data);
          break;
        case 'result': {
          const rp = trialResultSchema.safeParse(msg.result);
          if (rp.success) resultMsg = rp.data;
          break;
        }
        case 'fatal':
          fatal = msg.error;
          break;
        case 'status':
        default:
          break;
      }
    });

    child.on('error', (err) => {
      fatal = err.message;
    });

    child.on('exit', () => {
      if (resultMsg) {
        finish({ result: resultMsg, wroteArtifacts: true });
        return;
      }
      // No result: fatal (harness error → launch-error) or the child died (crash).
      const status = fatal ? 'launch-error' : 'agent-crash';
      finish({ result: synthResult(spec, status, Date.now() - started), wroteArtifacts: false });
    });

    child.send({ type: 'spec', spec });
  });
}

/** Ensure a trial.json exists for a parent-synthesized outcome (§14). */
export function writeSynthesizedTrial(runDir: string, result: TrialResult): void {
  writeTrial(runDir, result);
}

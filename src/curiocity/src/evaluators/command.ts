import { execFile } from 'node:child_process';
import { z } from 'zod';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `command` (§11): run a build/test/lint command via execa in the workspace and
 * assert its exit code (default 0). Typically `gate:true`.
 *
 * TRUST MODEL (shell:true — deliberate, see also curion/setup.ts and evaluators/external.ts):
 * `run` is a single command STRING authored by the case author in `config.json` (e.g.
 * `"npm test && ./check.sh"`). It is inherently shell syntax — pipes, `&&`, globs, env
 * expansion are the point — so we execute it with `shell:true`. The input is trusted at
 * the same level as the case source and evaluation rubric (the case author already
 * controls what the harness runs); NO agent output or other untrusted data is ever
 * interpolated into this string. Contrast `external`, which invokes a PROGRAM with an
 * explicit argv (`command` + `args[]`) and therefore uses execa's array form (no shell),
 * because there the arguments are discrete values, not a shell expression.
 */
export const commandParamsSchema = z.object({
  run: z.string().min(1),
  /** Expected exit code (default 0). */
  expectExitCode: z.number().int().default(0),
  /** Wall-clock cap; exceeding it fails the evaluator (default 60s). */
  timeoutSec: z.number().positive().default(60),
});

/** Tail length (chars) of captured command output appended to failure `details`. */
const OUTPUT_TAIL_CHARS = 1500;

/** Extra time allowed for Execa to report after the process tree is killed. */
const PROCESS_TREE_KILL_GRACE_MS = 1000;

export const command: Evaluator = {
  id: 'command',
  paramsSchema: commandParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = commandParamsSchema.parse(params);
    const timeoutMs = Math.max(1, Math.round(p.timeoutSec * 1000));
    let exitCode: number;
    let details: string;
    let timedOut = false;
    let processTreeKillTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      // With shell:true, Execa's timeout can terminate only the shell while a
      // nested child keeps inherited output handles open. Give the fallback a
      // short grace period while the process-tree kill below enforces the actual
      // configured deadline. On POSIX, detached creates the process group that
      // lets the fallback terminate the shell and its descendants together.
      const subprocess = ctx.exec(p.run, {
        shell: true,
        cwd: ctx.workspace,
        reject: false,
        timeout: timeoutMs + PROCESS_TREE_KILL_GRACE_MS,
        ...(process.platform !== 'win32' ? { detached: true } : {}),
        all: true,
      });
      if (typeof subprocess.once === 'function') {
        subprocess.once('spawn', () => {
          processTreeKillTimer = setTimeout(() => {
            const pid = subprocess.pid;
            if (pid === undefined) return;
            timedOut = true;
            if (process.platform === 'win32') {
              execFile('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true }, () => {});
              return;
            }
            try {
              process.kill(-pid, 'SIGKILL');
            } catch {
              // The shell may have exited between the timer and the group kill.
            }
          }, timeoutMs);
        });
      }
      const res = await subprocess;
      if (res.timedOut || timedOut) {
        timedOut = true;
        exitCode = -1;
        details = `\`${p.run}\` timed out after ${p.timeoutSec}s`;
      } else {
        exitCode = typeof res.exitCode === 'number' ? res.exitCode : (res.failed ? 1 : 0);
        details = `\`${p.run}\` exited ${exitCode} (expected ${p.expectExitCode})`;
      }
      if (timedOut || exitCode !== p.expectExitCode) {
        const output = (res.all ?? res.stdout ?? res.stderr ?? '').toString();
        const tail = output.slice(-OUTPUT_TAIL_CHARS);
        if (tail.length > 0) {
          details += `\n--- output (last ${OUTPUT_TAIL_CHARS} chars) ---\n${tail}`;
        }
      }
    } catch (err) {
      exitCode = -1;
      details = `\`${p.run}\` failed to run: ${(err as Error).message}`;
    } finally {
      if (processTreeKillTimer !== undefined) clearTimeout(processTreeKillTimer);
    }
    return { pass: exitCode === p.expectExitCode && !timedOut, gate: false, details };
  },
};

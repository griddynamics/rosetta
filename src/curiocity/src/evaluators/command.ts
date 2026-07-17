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
});

/** Tail length (chars) of captured command output appended to failure `details`. */
const OUTPUT_TAIL_CHARS = 1500;

export const command: Evaluator = {
  id: 'command',
  paramsSchema: commandParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = commandParamsSchema.parse(params);
    let exitCode: number;
    let details: string;
    try {
      const res = await ctx.exec(p.run, {
        shell: true,
        cwd: ctx.workspace,
        reject: false,
        all: true,
      });
      exitCode = typeof res.exitCode === 'number' ? res.exitCode : (res.failed ? 1 : 0);
      details = `\`${p.run}\` exited ${exitCode} (expected ${p.expectExitCode})`;
      if (exitCode !== p.expectExitCode) {
        const output = (res.all ?? res.stdout ?? res.stderr ?? '').toString();
        const tail = output.slice(-OUTPUT_TAIL_CHARS);
        if (tail.length > 0) {
          details += `\n--- output (last ${OUTPUT_TAIL_CHARS} chars) ---\n${tail}`;
        }
      }
    } catch (err) {
      exitCode = -1;
      details = `\`${p.run}\` failed to run: ${(err as Error).message}`;
    }
    return { pass: exitCode === p.expectExitCode, gate: false, details };
  },
};

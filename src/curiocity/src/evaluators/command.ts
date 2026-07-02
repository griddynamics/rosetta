import { z } from 'zod';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `command` (§11): run a build/test/lint command via execa in the workspace and
 * assert its exit code (default 0). Typically `gate:true`.
 */
export const commandParamsSchema = z.object({
  run: z.string().min(1),
  /** Expected exit code (default 0). */
  expectExitCode: z.number().int().default(0),
});

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
    } catch (err) {
      exitCode = -1;
      details = `\`${p.run}\` failed to run: ${(err as Error).message}`;
    }
    return { pass: exitCode === p.expectExitCode, gate: false, details };
  },
};

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { CuriocityError } from '../shared/errors';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `external` (§11): a pluggable deterministic evaluator with a hook-style contract.
 * The harness runs `command` (+ optional `args`) with a JSON OBJECT STRING on stdin
 * carrying PATHS (not blobs, like hooks) plus identity:
 *
 *   { workspacePath, workspaceDiffPath, trajectoryPath, rawTranscriptPath,
 *     qnaLogPath, caseDir, agentId, agentModel, sessionId }
 *
 * The command prints a JSON object on stdout: `{"values":[{"name","value"}]}` with each
 * `value` normalized to 0-100. Each value is recorded as a named metric on the trial and
 * rolled up per metric name (mean/min/max/stddev, the `metrics` stat). Scoring is all
 * OPTIONAL: `scoreMetric` designates one value as this evaluator's score; `passThreshold`
 * derives pass from it; `gate`/`weight` behave as for any evaluator (owned by the config
 * entry). With none set, the metrics are informational only (pass=true, no score).
 *
 * Error handling (gate-aware): non-zero exit / invalid JSON / a value out of 0-100 /
 * timeout all THROW here → the pipeline records the evaluator as failed (pass:false) and
 * applies the config `gate` flag, so a gated `external` failure fails the suite.
 *
 * TRUST MODEL (array-args, NO shell — deliberate, contrast evaluators/command.ts and
 * curion/setup.ts): `external` invokes a PROGRAM (`command`) with a discrete argv
 * (`args[]`), so it uses execa's array form with shell:false. Unlike the shell-line
 * evaluators, there is no shell expression to interpret here — the command and each
 * argument are separate values — so bypassing the shell is both correct and the safer
 * default (no accidental word-splitting/globbing of an arg). All inputs remain case-author
 * trusted; the contract passes PATHS on stdin, never blobs, exactly like a hook.
 */
export const externalParamsSchema = z.object({
  /** Command to run (resolved on PATH, or an absolute path). */
  command: z.string().min(1),
  /** Extra argv passed to the command. */
  args: z.array(z.string()).default([]),
  /** Wall-clock cap; exceeding it is an evaluator error (default 60s). */
  timeoutSec: z.number().positive().default(60),
  /** Optional: the metric name whose value becomes this evaluator's score (0-100). */
  scoreMetric: z.string().min(1).optional(),
  /** Optional: derive pass from the score (`score >= passThreshold`). */
  passThreshold: z.number().optional(),
});

/** Expected stdout shape. */
const externalOutputSchema = z.object({
  values: z.array(z.object({ name: z.string().min(1), value: z.number() })).default([]),
});

export const external: Evaluator = {
  id: 'external',
  paramsSchema: externalParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = externalParamsSchema.parse(params);

    // Materialize the in-memory artifacts to files so the command receives PATHS (like
    // hooks). The raw transcript already lives on disk — pass its path straight through.
    const work = mkdtempSync(join(tmpdir(), 'curiocity-external-'));
    try {
      const workspaceDiffPath = join(work, 'workspace.diff');
      const trajectoryPath = join(work, 'trajectory.jsonl');
      const qnaLogPath = join(work, 'qna.json');
      const rawTranscriptPath = ctx.rawTranscriptPath ?? join(work, 'raw-transcript.jsonl');
      writeFileSync(workspaceDiffPath, ctx.workspaceDiff ?? '');
      writeFileSync(trajectoryPath, ctx.events.map((e) => JSON.stringify(e)).join('\n'));
      writeFileSync(qnaLogPath, JSON.stringify(ctx.qnaLog));
      if (ctx.rawTranscriptPath === undefined) writeFileSync(rawTranscriptPath, '');

      const input = JSON.stringify({
        workspacePath: ctx.workspace,
        workspaceDiffPath,
        trajectoryPath,
        rawTranscriptPath,
        qnaLogPath,
        caseDir: ctx.caseDir ?? '',
        agentId: ctx.agentId,
        agentModel: ctx.agentModel ?? '',
        sessionId: ctx.sessionId ?? '',
      });

      const res = await ctx.exec(p.command, p.args, {
        // Case-relative commands (the common case: a script shipped with the case)
        // resolve from the case folder, like setup scripts; fall back to the workspace.
        cwd: ctx.caseDir ?? ctx.workspace,
        input,
        reject: false,
        timeout: Math.round(p.timeoutSec * 1000),
        all: true,
      });

      if (res.timedOut) {
        throw new CuriocityError(
          `external evaluator "${p.command}" timed out after ${p.timeoutSec}s`,
          'EXTERNAL_TIMEOUT',
        );
      }
      const exitCode = typeof res.exitCode === 'number' ? res.exitCode : res.failed ? 1 : 0;
      if (exitCode !== 0) {
        const tail = (res.all ?? res.stderr ?? '').toString().slice(-300);
        throw new CuriocityError(
          `external evaluator "${p.command}" exited ${exitCode}: ${tail}`,
          'EXTERNAL_NONZERO',
        );
      }

      let parsedOut: z.infer<typeof externalOutputSchema>;
      try {
        parsedOut = externalOutputSchema.parse(JSON.parse((res.stdout ?? '').toString()));
      } catch (err) {
        throw new CuriocityError(
          `external evaluator "${p.command}" produced invalid JSON stdout: ${(err as Error).message}`,
          'EXTERNAL_BAD_JSON',
        );
      }

      const metrics = parsedOut.values;
      for (const m of metrics) {
        if (!Number.isFinite(m.value) || m.value < 0 || m.value > 100) {
          throw new CuriocityError(
            `external evaluator "${p.command}" metric "${m.name}" value ${m.value} is out of range 0-100`,
            'EXTERNAL_OUT_OF_RANGE',
          );
        }
      }

      // Scoring integration (all optional). scoreMetric → score; passThreshold → pass.
      let score: number | undefined;
      let pass = true;
      let details = `external "${p.command}" → ${metrics.map((m) => `${m.name}=${m.value}`).join(', ') || 'no metrics'}`;
      if (p.scoreMetric !== undefined) {
        const found = metrics.find((m) => m.name === p.scoreMetric);
        if (!found) {
          throw new CuriocityError(
            `external evaluator "${p.command}" did not emit scoreMetric "${p.scoreMetric}"`,
            'EXTERNAL_NO_SCORE_METRIC',
          );
        }
        score = found.value;
        if (p.passThreshold !== undefined) {
          pass = score >= p.passThreshold;
          details += ` | score ${score} ${pass ? '≥' : '<'} passThreshold ${p.passThreshold}`;
        }
      }

      return {
        pass,
        ...(score !== undefined ? { score } : {}),
        gate: false, // authoritative gate flag is applied by the pipeline from config
        details,
        ...(metrics.length > 0 ? { metrics } : {}),
      };
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  },
};

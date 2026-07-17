import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { createLogger } from '../shared/logger';
import type { TrajectoryEvent } from '../shared/trajectory';
import { listFiles, matchGlob } from './glob';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `llm-judge` (§11): the judge-role model scores 0–100 with a rationale via
 * `generateObject`. The input is a FIXED contract — the harness interprets no
 * criteria:
 *
 *   [1] `evaluation.md` verbatim (the rubric)
 *   [2] distilled trajectory (tool steps, trimmed results, assistant text)
 *   [3] produced artifacts — `workspaceDiff` PLUS only files matching `artifacts`
 *       globs, each size-capped with an explicit truncation marker (never the
 *       unbounded workspace)
 *   [4] QnA log
 */

export const llmJudgeParamsSchema = z.object({
  /** Rubric pointer (informational; the verbatim text comes from evaluation.md). */
  rubric: z.string().optional(),
  /** Globs selecting produced files to include (each size-capped). */
  artifacts: z.array(z.string()).default([]),
});

/** Judge output contract (§11): score 0–100, pass, rationale, self-reported confidence. */
export const judgeOutputSchema = z.object({
  score: z.number().min(0).max(100),
  pass: z.boolean(),
  rationale: z.string(),
  confidenceLevel: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Your own confidence, 0–100, that this verdict is solid — i.e. that a fresh ' +
        're-run of this same evaluation would reach the same pass/fail conclusion. ' +
        '0 = a coin toss, 100 = certain. Report your honest self-assessment.',
    ),
});
export type JudgeOutput = z.infer<typeof judgeOutputSchema>;

/** Per-file / per-diff character caps (bounding; never the unbounded workspace). */
export const MAX_FILE_CHARS = 4000;
export const MAX_DIFF_CHARS = 12000;
export const MAX_TRAJECTORY_CHARS = 16000;
const MAX_TOOL_RESULT_CHARS = 500;

function capText(text: string, max: number, label: string): string {
  if (text.length <= max) return text;
  const kept = text.slice(0, max);
  return `${kept}\n...[truncated: ${label} showed ${max} of ${text.length} chars]...`;
}

/**
 * Head+tail cap for the trajectory. A long run's shape lives at BOTH ends — the
 * discovery / design / planning up front and the implementation / delivery / live
 * validation at the close. Head-only truncation (`capText`) silently drops the tail,
 * which under-credits exactly the thorough-workflow dimensions (discovery & design,
 * validation) a judge is meant to reward. Keep the first and last halves with an
 * explicit middle-elision marker. Files/diffs/tool-results keep the cheaper head cap.
 */
export function capTextHeadTail(text: string, max: number, label: string): string {
  if (text.length <= max) return text;
  const half = Math.floor(max / 2);
  const head = text.slice(0, half);
  const tail = text.slice(text.length - half);
  const omitted = text.length - 2 * half;
  return `${head}\n...[truncated: ${label} — omitted ${omitted} chars from the middle; showed first ${half} + last ${half} of ${text.length}]...\n${tail}`;
}

/** [2] Distill the trajectory to compact text: tool steps, trimmed results, prose. */
export function distillTrajectory(events: TrajectoryEvent[]): string {
  const lines: string[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'assistant': {
        const text = (e.payload as { text?: string }).text ?? '';
        if (text.trim() !== '') lines.push(`assistant: ${text}`);
        break;
      }
      case 'user': {
        const text = (e.payload as { text?: string }).text ?? '';
        if (text.trim() !== '') lines.push(`user: ${text}`);
        break;
      }
      case 'tool_call':
        lines.push(`tool_call ${e.name ?? '?'}: ${summarizePayload(e.payload)}`);
        break;
      case 'tool_result':
        lines.push(
          `tool_result ${e.name ?? ''}: ${capText(summarizePayload(e.payload), MAX_TOOL_RESULT_CHARS, 'tool_result')}`,
        );
        break;
      default:
        break;
    }
  }
  return capTextHeadTail(lines.join('\n'), MAX_TRAJECTORY_CHARS, 'trajectory');
}

function summarizePayload(payload: unknown): string {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  const p = payload as { text?: string; question?: string };
  if (typeof p.text === 'string') return p.text;
  if (typeof p.question === 'string') return p.question;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

/** [3] Assemble the produced-artifacts section: diff + capped matching files. */
export function assembleArtifacts(
  workspace: string,
  workspaceDiff: string,
  globs: string[],
): string {
  const sections: string[] = [];
  sections.push(`## Workspace diff\n${capText(workspaceDiff, MAX_DIFF_CHARS, 'workspace diff')}`);

  if (globs.length > 0) {
    const files = listFiles(workspace);
    const selected = new Set<string>();
    for (const glob of globs) for (const f of matchGlob(files, glob)) selected.add(f);
    const ordered = [...selected].sort();
    if (ordered.length === 0) {
      sections.push(`## Artifact files\n(no files matched: ${globs.join(', ')})`);
    } else {
      for (const rel of ordered) {
        let content: string;
        try {
          content = readFileSync(join(workspace, rel), 'utf8');
        } catch {
          content = '(unreadable)';
        }
        sections.push(`## Artifact file: ${rel}\n${capText(content, MAX_FILE_CHARS, rel)}`);
      }
    }
  }
  return sections.join('\n\n');
}

/** Assemble the full judge user prompt from the fixed [1]-[4] contract (§11). */
export function assembleJudgePrompt(ctx: EvalContext, globs: string[]): string {
  const rubric = ctx.caseFiles.evaluationMd ?? '(no rubric provided)';
  const qna =
    ctx.qnaLog.length === 0
      ? '(no questions were answered)'
      : ctx.qnaLog
          .map((q, i) => `${i + 1}. [${q.type}] Q: ${q.question}\n   A: ${q.answer}`)
          .join('\n');

  return [
    '# [1] Evaluation rubric (verbatim)',
    rubric,
    '',
    '# [2] Agent trajectory (distilled)',
    distillTrajectory(ctx.events),
    '',
    '# [3] Produced artifacts',
    assembleArtifacts(ctx.workspace, ctx.workspaceDiff, globs),
    '',
    '# [4] QnA log',
    qna,
  ].join('\n');
}

const JUDGE_SYSTEM =
  'You are an impartial evaluator of a coding-agent run. Apply the rubric in section [1] ' +
  'EXACTLY as written — do not invent criteria. Produce: `score` (0–100), `pass` (per the ' +
  'rubric), `rationale` (brief, grounded in the provided trajectory and artifacts), and ' +
  '`confidenceLevel` (0–100 — your own confidence that a re-run would reach the same verdict).';

/** One-time-per-model warning (§P7 posture): perplexity is unmeasurable for providers that
 *  expose no logprobs (e.g. Anthropic). Warn once per model id per process — never abort.
 *  Exported so tests can spy on the exact `warn` call deterministically. */
export const judgeLogger = createLogger('llm-judge');
const perplexityWarned = new Set<string>();
function warnPerplexityUnavailable(
  model: string | undefined,
  log?: (msg: string, fields?: Record<string, unknown>) => void,
): void {
  const key = model ?? '(unknown model)';
  if (perplexityWarned.has(key)) return;
  perplexityWarned.add(key);
  const message =
    `llm-judge: perplexityLevel unavailable for "${key}" (provider exposes no token ` +
    'logprobs) — confidenceLevel is still reported. This warning fires once per model per run.';
  judgeLogger.warn({ model: key }, message);
  // Also surface through the trial's IPC log sink (when present): the child's pino
  // stdout is not read by the parent, so without this the warning never reaches the
  // run logs in a real forked trial (§16). `once: true` asks the orchestrator to
  // dedupe across trials — each trial is its own forked process, so this module's
  // per-process Set cannot span the run on its own.
  log?.(message, { model: key, once: true });
}

export const llmJudge: Evaluator = {
  id: 'llm-judge',
  paramsSchema: llmJudgeParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = llmJudgeParamsSchema.parse(params);
    const prompt = assembleJudgePrompt(ctx, p.artifacts);
    const { object, usage, perplexityLevel, model } = await ctx.models.generateObject(
      'judge',
      { system: JUDGE_SYSTEM, prompt },
      judgeOutputSchema,
    );
    if (perplexityLevel === undefined) warnPerplexityUnavailable(model, ctx.log);
    return {
      pass: object.pass,
      score: object.score,
      gate: false,
      details: object.rationale,
      cost: usage,
      // Self-reported (always present in the judge schema) and measured (present only when
      // the provider exposed logprobs) — §5.4.
      confidenceLevel: object.confidenceLevel,
      ...(perplexityLevel !== undefined ? { perplexityLevel } : {}),
    };
  },
};

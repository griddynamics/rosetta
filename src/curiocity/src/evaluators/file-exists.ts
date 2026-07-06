import { z } from 'zod';
import { listFiles, matchGlob } from './glob';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `file-exists` (§11): globs that MUST exist and globs that MUST NOT exist in the
 * final workspace. Typically `gate:true`. Both `mustNot` and the config-friendly
 * `must-not` spelling are accepted.
 */
export const fileExistsParamsSchema = z
  .object({
    must: z.array(z.string()).default([]),
    mustNot: z.array(z.string()).default([]),
    'must-not': z.array(z.string()).optional(),
  })
  .transform((p) => ({
    must: p.must,
    mustNot: [...p.mustNot, ...(p['must-not'] ?? [])],
  }));

export const fileExists: Evaluator = {
  id: 'file-exists',
  paramsSchema: fileExistsParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = fileExistsParamsSchema.parse(params);
    const files = listFiles(ctx.workspace);

    const missing: string[] = [];
    for (const glob of p.must) {
      if (matchGlob(files, glob).length === 0) missing.push(glob);
    }
    const present: string[] = [];
    for (const glob of p.mustNot) {
      if (matchGlob(files, glob).length > 0) present.push(glob);
    }

    const pass = missing.length === 0 && present.length === 0;
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing required: ${missing.join(', ')}`);
    if (present.length > 0) parts.push(`forbidden present: ${present.join(', ')}`);
    return {
      pass,
      gate: false,
      details: pass ? 'all file-exists constraints satisfied' : parts.join('; '),
    };
  },
};

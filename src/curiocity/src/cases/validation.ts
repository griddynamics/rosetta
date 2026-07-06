import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { caseConfigSchema } from '../config/schema';
import type { CaseDefinition } from './types';

/**
 * Case validation (§8). A subfolder is a valid, runnable case ONLY when all five
 * files are present AND `config.json` parses and validates. Anything else yields a
 * skip reason (surfaced by `curiocity validate`).
 */
export const REQUIRED_FILES = [
  'prompt.md',
  'config.json',
  'qna.md',
  'evaluation.md',
  'src.zip',
] as const;

export type ValidateCaseResult =
  | { ok: true; case: CaseDefinition }
  | { ok: false; reason: string };

export function validateCase(dir: string, name: string): ValidateCaseResult {
  const missing = REQUIRED_FILES.filter((f) => !existsSync(join(dir, f)));
  if (missing.length > 0) {
    return { ok: false, reason: `missing files: ${missing.join(', ')}` };
  }

  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  } catch (err) {
    return { ok: false, reason: `invalid config.json: ${(err as Error).message}` };
  }

  const parsed = caseConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue && issue.path.length > 0 ? ` at "${issue.path.join('.')}"` : '';
    const msg = issue ? issue.message : parsed.error.message;
    return { ok: false, reason: `invalid config.json${where}: ${msg}` };
  }

  return {
    ok: true,
    case: {
      name,
      ephemeral: false,
      dir,
      prompt: readFileSync(join(dir, 'prompt.md'), 'utf8'),
      qna: readFileSync(join(dir, 'qna.md'), 'utf8'),
      evaluation: readFileSync(join(dir, 'evaluation.md'), 'utf8'),
      srcZipPath: join(dir, 'src.zip'),
      config: parsed.data,
    },
  };
}

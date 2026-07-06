import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigError } from '../shared/errors';
import { caseConfigSchema } from '../config/schema';
import type { EvaluatorEntry } from '../config/schema';
import type { CaseDefinition } from './types';

/**
 * Inline (ephemeral) case builder (D7, §8). `--prompt` (+ optional `--qna`,
 * `--eval`, `--src`) synthesizes an in-memory case flowing through the identical
 * pipeline. Missing pieces get neutral defaults: empty workspace, permissive QnA
 * policy WITH the hard abort fallback, and NO evaluators unless both `--evaluate`
 * and `--eval` are supplied.
 */

/** Permissive default QnA policy — always includes the "if unsure, abort" fallback (§6). */
export const DEFAULT_INLINE_QNA = `# Inline QnA policy (permissive default)

Answer the agent's genuine questions so the task can proceed.

- Approvals: proceed with reasonable, non-destructive defaults.
- Denials: never approve destructive actions (deleting data, force-push, dropping databases, etc.).
- If unsure, abort: state that you cannot safely proceed and end the session.
`;

export interface EphemeralCaseInput {
  /** `--prompt <file|text>` — required. */
  prompt: string;
  /** `--qna <file|text>`. */
  qna?: string;
  /** `--eval <file>` (rubric). */
  eval?: string;
  /** `--src <zip|dir>`. */
  src?: string;
  /** Agents to run (from `--agent`, or top-level `codingagents` keys). */
  agents: string[];
  /** `--evaluate` toggle (inline defaults OFF per D9). */
  evaluate?: boolean;
  /** Synthetic case name. */
  name?: string;
}

/** If `value` is a path to an existing file, read it; otherwise treat it as literal text. */
function resolveFileOrText(value: string): string {
  const abs = resolve(value);
  if (existsSync(abs) && statSync(abs).isFile()) {
    return readFileSync(abs, 'utf8');
  }
  return value;
}

export function buildEphemeralCase(input: EphemeralCaseInput): CaseDefinition {
  if (!input.prompt || input.prompt.trim() === '') {
    throw new ConfigError('Inline case requires --prompt (a file path or literal text).');
  }
  if (input.agents.length === 0) {
    throw new ConfigError(
      'Inline case has no agents: pass --agent <id> (or configure `codingagents` in the top-level config).',
    );
  }

  const evaluateOn = input.evaluate === true && input.eval !== undefined;

  let evaluation: string | undefined;
  const evaluators: EvaluatorEntry[] = [];
  if (evaluateOn && input.eval) {
    evaluation = resolveFileOrText(input.eval);
    evaluators.push({ use: 'llm-judge', weight: 1.0 });
  }

  // Resolve inline source: directory vs zip archive.
  let srcDir: string | undefined;
  let srcZipPath: string | undefined;
  if (input.src) {
    const abs = resolve(input.src);
    if (existsSync(abs) && statSync(abs).isDirectory()) {
      srcDir = abs;
    } else {
      srcZipPath = abs;
    }
  }

  const config = caseConfigSchema.parse({
    agents: input.agents,
    evaluators,
  });

  return {
    name: input.name ?? 'inline',
    ephemeral: true,
    prompt: resolveFileOrText(input.prompt),
    qna: input.qna !== undefined ? resolveFileOrText(input.qna) : DEFAULT_INLINE_QNA,
    ...(evaluation !== undefined ? { evaluation } : {}),
    ...(srcDir !== undefined ? { srcDir } : {}),
    ...(srcZipPath !== undefined ? { srcZipPath } : {}),
    config,
  };
}

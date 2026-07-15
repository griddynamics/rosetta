import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { BenchConfig } from './types.js';

function formatZodError(err: z.ZodError): string {
  const issues = err.issues
    .map((issue) => `  - ${issue.path.length ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('\n');
  return `Config is invalid:\n${issues}`;
}

const thinkingSchema = z.object({
  enabled: z.boolean().default(true),
  // 'adaptive' is required by current-gen models (claude-sonnet-5, claude-opus-4-7/4-8, ...);
  // 'manual' (budget_tokens) is deprecated/unsupported on those and only works on older models.
  mode: z.enum(['adaptive', 'manual']).default('adaptive'),
  // Anthropic requires budget_tokens >= 1024 and < max_tokens. Only used when mode === 'manual'.
  budgetTokens: z.number().int().min(1024).default(8192),
  // Only used when mode === 'adaptive'.
  effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('high'),
  // 'summarized' is required to get thinkingText back; adaptive thinking omits it by default.
  display: z.enum(['summarized', 'omitted']).default('summarized'),
});

const variantSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  systemPrompt: z.string().nullable().optional(),
  turns: z.array(z.string().min(1)).min(1),
});

const evalAssertionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  rubric: z.string().min(1).optional(),
});

const evalSchema = z.object({
  judgePrompt: z.string().min(1).optional(),
  // Per-suite judge mode override; falls back to the global judgeMode, then 'combined'.
  mode: z.enum(['combined', 'individual']).optional(),
  assertions: z.array(evalAssertionSchema).min(1),
});

const suiteSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  model: z.string().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  thinking: thinkingSchema.optional(),
  repetitions: z.number().int().positive().optional(),
  eval: evalSchema.optional(),
  variants: z.array(variantSchema).min(1),
});

const pricingSchema = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
});

const benchConfigSchema = z.object({
  model: z.string().min(1).default('claude-sonnet-5'),
  maxOutputTokens: z.number().int().positive().default(16_384),
  thinking: thinkingSchema.default({
    enabled: true,
    mode: 'adaptive',
    budgetTokens: 8192,
    effort: 'high',
    display: 'summarized',
  }),
  repetitions: z.number().int().positive().default(5),
  // Each (suite, variant, repetition) is a fully isolated conversation with its own
  // history, so they're all independent and safe to fire off concurrently. Default is
  // generous since the whole point is not idling on sequential round-trips; lower it if
  // you hit rate limits.
  concurrency: z.number().int().positive().default(10),
  pricingOverrides: z.record(z.string(), pricingSchema).optional(),
  // Extra context text appended to every variant's system prompt. CLI --additional appends more.
  additional: z.array(z.string().min(1)).default([]),
  // Supporting file paths (resolved relative to this config file by loadConfig) injected, context-only,
  // into every variant's system prompt. CLI --supporting appends more (resolved relative to cwd).
  supporting: z.array(z.string().min(1)).default([]),
  // Global default judge mode; per-suite eval.mode overrides it, CLI --judge-mode overrides both.
  judgeMode: z.enum(['combined', 'individual']).default('combined'),
  suites: z.array(suiteSchema).min(1),
});

export function parseConfig(raw: unknown): BenchConfig {
  const result = benchConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  const parsed = result.data;
  for (const suite of parsed.suites) {
    const maxOut = suite.maxOutputTokens ?? parsed.maxOutputTokens;
    const thinking = suite.thinking ?? parsed.thinking;
    if (thinking.enabled && thinking.mode === 'manual' && thinking.budgetTokens >= maxOut) {
      throw new Error(
        `Suite "${suite.id}": thinking.budgetTokens (${thinking.budgetTokens}) must be less than maxOutputTokens (${maxOut}).`,
      );
    }
    const ids = new Set<string>();
    for (const variant of suite.variants) {
      if (ids.has(variant.id)) {
        throw new Error(`Suite "${suite.id}": duplicate variant id "${variant.id}".`);
      }
      ids.add(variant.id);
    }
    const evalIds = new Set<string>();
    for (const assertion of suite.eval?.assertions ?? []) {
      if (evalIds.has(assertion.id)) {
        throw new Error(`Suite "${suite.id}": duplicate eval assertion id "${assertion.id}".`);
      }
      evalIds.add(assertion.id);
    }
  }
  return parsed;
}

export function loadConfig(configPath: string): BenchConfig {
  let text: string;
  try {
    text = readFileSync(configPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Config file not found: ${configPath}\n` +
          'Pass --evals <path>, or create an evals.json in the current directory.',
      );
    }
    throw new Error(`Could not read config file ${configPath}: ${(err as Error).message}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`Config file is not valid JSON: ${configPath}\n  ${(err as Error).message}`);
  }

  const config = parseConfig(raw);

  // Resolve config-declared supporting files relative to the config file's directory and read them
  // now, so the runner receives contents (not paths). The CLI appends its own --supporting on top.
  const configDir = path.dirname(path.resolve(configPath));
  config.supportingFiles = (config.supporting ?? []).map((supportingPath) => {
    const absolute = path.isAbsolute(supportingPath) ? supportingPath : path.join(configDir, supportingPath);
    try {
      return { path: absolute, content: readFileSync(absolute, 'utf-8') };
    } catch (err) {
      throw new Error(`Could not read supporting file "${supportingPath}" (resolved to ${absolute}): ${(err as Error).message}`);
    }
  });

  return config;
}

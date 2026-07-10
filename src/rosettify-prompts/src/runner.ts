import type Anthropic from '@anthropic-ai/sdk';
import type {
  BenchConfig,
  EvalAssertionConfig,
  EvalResultItem,
  RunResult,
  SuiteConfig,
  TextMetrics,
  TurnResult,
  VariantConfig,
} from './types.js';
import { computeCostUsd } from './pricing.js';

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeTextMetrics(text: string): TextMetrics {
  const trimmed = text.trim();
  const chars = text.length;
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  let unicodeSymbols = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // Rough proxy for "unicode/symbol-dense" style: code points beyond
    // extended Latin punctuation, excluding whitespace.
    if (code > 0x2000 && !/\s/.test(ch)) unicodeSymbols++;
  }
  return { chars, words, unicodeSymbols };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = (err as { status?: number } | undefined)?.status;
      if (attempt > retries || (status !== undefined && !RETRYABLE_STATUS.has(status))) {
        throw err;
      }
      const backoffMs = Math.min(1000 * 2 ** attempt, 15_000) + Math.random() * 250;
      await sleep(backoffMs);
    }
  }
}

/** Fallback used because the real Anthropic API never reports thinking tokens separately in
 * `usage` (see optimize.ts's deriveReasoningTokens for the same technique). output_tokens is the
 * exact billed total for the turn; subtracting a countTokens() measurement of the visible
 * assistant text (same tokenizer) leaves the exact thinking-token count as the remainder. This is
 * more accurate than counting the summarized `thinking` block text, which Anthropic's own docs
 * say does not match the billed thinking-token count. Works regardless of `thinking.display`. */
async function deriveThinkingTokens(
  client: Anthropic,
  model: string,
  assistantText: string,
  outputTokens: number,
): Promise<number | null> {
  if (typeof client.messages.countTokens !== 'function') return null;
  try {
    const result = await withRetry(() =>
      client.messages.countTokens({
        model,
        messages: [{ role: 'user', content: assistantText }],
      }),
    );
    const derived = outputTokens - result.input_tokens;
    return derived >= 0 ? derived : null;
  } catch {
    return null;
  }
}

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('eval judge did not return a JSON object');
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function validateEvalResultItem(raw: unknown): EvalResultItem {
  const item = raw as Partial<EvalResultItem> | undefined;
  if (!item || typeof item !== 'object') {
    throw new Error('eval judge result must be an object');
  }
  if (typeof item.text !== 'string' || item.text.length === 0) {
    throw new Error('eval judge result.text must be a non-empty string');
  }
  if (item.passed !== 'pass' && item.passed !== 'partial' && item.passed !== 'fail') {
    throw new Error('eval judge result.passed must be "pass", "partial", or "fail"');
  }
  if (typeof item.reasons !== 'string') {
    throw new Error('eval judge result.reasons must be a string');
  }
  if (typeof item.suggestions !== 'string') {
    throw new Error('eval judge result.suggestions must be a string');
  }
  if (typeof item.confidence !== 'number' || !Number.isFinite(item.confidence)) {
    throw new Error('eval judge result.confidence must be a number');
  }
  if (item.confidence < 0 || item.confidence > 100) {
    throw new Error('eval judge result.confidence must be between 0 and 100');
  }
  return {
    text: item.text,
    passed: item.passed,
    reasons: item.reasons,
    suggestions: item.suggestions,
    confidence: item.confidence,
  };
}

function buildEvalPrompt(assertion: EvalAssertionConfig, judgePrompt: string | undefined, turns: TurnResult[]): string {
  const final = turns[turns.length - 1]?.assistantText ?? '';
  return [
    'Evaluate an LLM prompt benchmark response against one assertion.',
    'Return ONLY a JSON object with this exact shape:',
    '{"text":"<assertion id or short assertion text>","passed":"pass|partial|fail","reasons":"<why>","suggestions":"<specific fix or empty>","confidence":0}',
    'confidence is your self-reported confidence from 0 to 100.',
    judgePrompt ? `Additional judge instruction:\n${judgePrompt}` : '',
    `Assertion id: ${assertion.id}`,
    `Assertion text:\n${assertion.text}`,
    assertion.rubric ? `Assertion rubric:\n${assertion.rubric}` : '',
    `Assistant final response:\n${final}`,
    `Full conversation turns:\n${JSON.stringify(
      turns.map((t) => ({ user: t.userMessage, assistant: t.assistantText })),
    )}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function runEvalAssertions(
  client: Anthropic,
  model: string,
  suite: SuiteConfig,
  turns: TurnResult[],
): Promise<{ evalResult?: EvalResultItem[]; evalError?: string }> {
  if (!suite.eval) return {};
  const results: EvalResultItem[] = [];
  for (const assertion of suite.eval.assertions) {
    try {
      const response = await withRetry(() =>
        client.messages.create({
          model,
          max_tokens: 2048,
          messages: [{ role: 'user', content: buildEvalPrompt(assertion, suite.eval?.judgePrompt, turns) }],
        }),
      );
      results.push(validateEvalResultItem(extractJsonObject(extractText(response))));
    } catch (err) {
      return {
        ...(results.length > 0 ? { evalResult: results } : {}),
        evalError: `Eval assertion "${assertion.id}" failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }
  return { evalResult: results };
}

async function runVariantOnce(
  client: Anthropic,
  config: BenchConfig,
  suite: SuiteConfig,
  variant: VariantConfig,
  repetition: number,
): Promise<RunResult> {
  const model = suite.model ?? config.model;
  const maxTokens = suite.maxOutputTokens ?? config.maxOutputTokens;
  const thinking = suite.thinking ?? config.thinking;

  // Fresh, isolated history per (variant, repetition) — no state is shared
  // across runs, which is what makes them safe to execute concurrently.
  const history: Anthropic.MessageParam[] = [];
  const turns: TurnResult[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let totalThinking = 0;
  let hasThinking = false;

  try {
    for (let i = 0; i < variant.turns.length; i++) {
      const userMessage = variant.turns[i];
      history.push({ role: 'user', content: userMessage });

      const thinkingParam: Anthropic.ThinkingConfigParam | undefined = !thinking.enabled
        ? undefined
        : thinking.mode === 'adaptive'
          ? { type: 'adaptive', display: thinking.display }
          : { type: 'enabled', budget_tokens: thinking.budgetTokens, display: thinking.display };

      const start = Date.now();
      const response = await withRetry(() =>
        client.messages.create({
          model,
          max_tokens: maxTokens,
          ...(thinkingParam ? { thinking: thinkingParam } : {}),
          ...(thinking.enabled && thinking.mode === 'adaptive'
            ? { output_config: { effort: thinking.effort } }
            : {}),
          ...(variant.systemPrompt ? { system: variant.systemPrompt } : {}),
          messages: history,
        }),
      );
      const latencyMs = Date.now() - start;

      const thinkingBlock = response.content.find(
        (b): b is Anthropic.ThinkingBlock => b.type === 'thinking',
      );
      const assistantText = extractText(response);
      const thinkingText = thinkingBlock?.thinking ?? null;

      history.push({ role: 'assistant', content: response.content });

      let thinkingTokens = response.usage.output_tokens_details?.thinking_tokens ?? null;
      let thinkingTokensSource: TurnResult['thinkingTokensSource'] =
        thinkingTokens !== null ? 'usage' : null;
      if (thinkingTokens === null && thinking.enabled && assistantText) {
        thinkingTokens = await deriveThinkingTokens(client, model, assistantText, response.usage.output_tokens);
        thinkingTokensSource = thinkingTokens !== null ? 'derived' : null;
      }

      totalInput += response.usage.input_tokens;
      totalOutput += response.usage.output_tokens;
      if (thinkingTokens !== null) {
        totalThinking += thinkingTokens;
        hasThinking = true;
      }

      turns.push({
        turnIndex: i,
        userMessage,
        assistantText,
        thinkingText,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        thinkingTokens,
        thinkingTokensSource,
        latencyMs,
        stopReason: response.stop_reason,
        textMetrics: computeTextMetrics(assistantText),
      });
    }

    const { evalResult, evalError } = await runEvalAssertions(client, model, suite, turns);
    const costUsd = computeCostUsd(totalInput, totalOutput, model, config.pricingOverrides);
    const totalLatencyMs = turns.reduce((acc, t) => acc + t.latencyMs, 0);

    return {
      suiteId: suite.id,
      variantId: variant.id,
      repetition,
      model,
      turns,
      ...(evalResult ? { evalResult } : {}),
      ...(evalError ? { evalError } : {}),
      totals: {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        thinkingTokens: hasThinking ? totalThinking : null,
        costUsd,
        latencyMs: totalLatencyMs,
      },
    };
  } catch (err) {
    const totalLatencyMs = turns.reduce((acc, t) => acc + t.latencyMs, 0);
    return {
      suiteId: suite.id,
      variantId: variant.id,
      repetition,
      model,
      turns,
      totals: {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        thinkingTokens: hasThinking ? totalThinking : null,
        costUsd: null,
        latencyMs: totalLatencyMs,
      },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface Job {
  suite: SuiteConfig;
  variant: VariantConfig;
  repetition: number;
}

function buildJobs(config: BenchConfig): Job[] {
  const jobs: Job[] = [];
  for (const suite of config.suites) {
    const reps = suite.repetitions ?? config.repetitions;
    for (const variant of suite.variants) {
      for (let r = 0; r < reps; r++) {
        jobs.push({ suite, variant, repetition: r });
      }
    }
  }
  return jobs;
}

export type ProgressCallback = (done: number, total: number, result: RunResult) => void;

/** Runs every (suite, variant, repetition) job as an independent conversation.
 * Jobs share no state, so up to `config.concurrency` of them run in parallel. */
export async function runBenchSuite(
  client: Anthropic,
  config: BenchConfig,
  onProgress?: ProgressCallback,
): Promise<RunResult[]> {
  const jobs = buildJobs(config);
  const results: RunResult[] = new Array(jobs.length);
  let cursor = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const idx = cursor++;
      if (idx >= jobs.length) return;
      const job = jobs[idx];
      const result = await runVariantOnce(client, config, job.suite, job.variant, job.repetition);
      results[idx] = result;
      completed++;
      onProgress?.(completed, jobs.length, result);
    }
  }

  const workerCount = Math.max(1, Math.min(config.concurrency, jobs.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

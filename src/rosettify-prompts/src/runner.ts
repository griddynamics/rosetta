import type Anthropic from '@anthropic-ai/sdk';
import type {
  BenchConfig,
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

/** Fallback used only when the API response doesn't include
 * `usage.output_tokens_details.thinking_tokens` (older API versions/models). */
async function estimateThinkingTokens(
  client: Anthropic,
  model: string,
  thinkingText: string,
): Promise<number | null> {
  try {
    const result = await withRetry(() =>
      client.messages.countTokens({
        model,
        messages: [{ role: 'user', content: thinkingText }],
      }),
    );
    return result.input_tokens;
  } catch {
    return null;
  }
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
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      );
      const assistantText = textBlocks.map((b) => b.text).join('\n');
      const thinkingText = thinkingBlock?.thinking ?? null;

      history.push({ role: 'assistant', content: response.content });

      let thinkingTokens = response.usage.output_tokens_details?.thinking_tokens ?? null;
      let thinkingTokensSource: TurnResult['thinkingTokensSource'] =
        thinkingTokens !== null ? 'usage' : null;
      if (thinkingTokens === null && thinkingText) {
        thinkingTokens = await estimateThinkingTokens(client, model, thinkingText);
        thinkingTokensSource = thinkingTokens !== null ? 'estimated' : null;
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

    const costUsd = computeCostUsd(totalInput, totalOutput, model, config.pricingOverrides);
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

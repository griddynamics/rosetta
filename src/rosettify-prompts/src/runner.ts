import type Anthropic from '@anthropic-ai/sdk';
import type {
  BenchConfig,
  EvalAssertionConfig,
  EvalResultItem,
  JudgeMode,
  RunResult,
  SuiteConfig,
  TextMetrics,
  TurnResult,
  VariantConfig,
} from './types.js';
import { computeCostUsd } from './pricing.js';
import { renderDataBlock } from './delimiters.js';

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
/** Retry a transient API failure up to this many times (exponential backoff) before giving up. */
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bounded-concurrency gate shared by ALL API work (variant conversations AND judge calls), so the
 * whole batch respects `concurrency` while groups pipeline independently — a repetition whose
 * variants finish early gets judged while other repetitions are still generating. */
type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;

function createLimiter(max: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];
  const pump = (): void => {
    while (active < max && queue.length > 0) {
      active++;
      const start = queue.shift()!;
      start();
    }
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          });
      });
      pump();
    });
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

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
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

/** CLI override > per-suite eval.mode > config default > 'combined'. */
function resolveJudgeMode(config: BenchConfig, suite: SuiteConfig): JudgeMode {
  return config.judgeModeOverride ?? suite.eval?.mode ?? config.judgeMode ?? 'combined';
}

/** Effective system prompt for a variant: its own prompt (if any), then the run-wide --additional
 * text, then --supporting files as delimited untrusted-data blocks. Applied to VARIANTS ONLY — the
 * judge never sees this augmentation. An empty base prompt just means the system becomes the
 * injected context alone; returns undefined only when there is nothing at all to send. */
function buildVariantSystem(config: BenchConfig, variant: VariantConfig): string | undefined {
  const parts: string[] = [];
  if (variant.systemPrompt) parts.push(variant.systemPrompt);
  if (config.additional?.length) parts.push(config.additional.join('\n\n'));
  if (config.supportingFiles?.length) {
    parts.push(
      config.supportingFiles
        .map((file, index) =>
          renderDataBlock(
            `SUPPORTING_FILE ${index + 1}: ${file.path}`,
            `SUPPORTING_FILE_${index + 1}_${file.path}`,
            file.content,
            'supporting file content',
          ),
        )
        .join('\n\n'),
    );
  }
  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

// ---- individual-mode judge (one answer, judged alone) --------------------------------------------

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

async function runIndividualEval(
  client: Anthropic,
  model: string,
  suite: SuiteConfig,
  turns: TurnResult[],
  limit: Limiter,
): Promise<{ evalResult?: EvalResultItem[]; evalError?: string }> {
  if (!suite.eval) return {};
  const results: EvalResultItem[] = [];
  for (const assertion of suite.eval.assertions) {
    try {
      const response = await limit(() =>
        withRetry(() =>
          client.messages.create({
            model,
            max_tokens: 2048,
            // Judges score, they don't deliberate — disabling thinking keeps the JSON verdict
            // deterministic and leaves the whole token budget for the output (no truncation).
            thinking: { type: 'disabled' },
            messages: [{ role: 'user', content: buildEvalPrompt(assertion, suite.eval?.judgePrompt, turns) }],
          }),
        ),
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

// ---- combined-mode judge (all variants of one repetition judged together) ------------------------

interface CombinedCandidate {
  variantId: string;
  finalText: string;
}

function buildCombinedEvalPrompt(
  assertion: EvalAssertionConfig,
  judgePrompt: string | undefined,
  candidates: CombinedCandidate[],
): string {
  return [
    'Evaluate multiple candidate responses to the same task against ONE assertion.',
    'Each candidate is a different prompt variant answering the same task. Give an absolute score for EACH candidate (pass/partial/fail on its own merits). You are shown all candidates together so you can notice when one omits or gets wrong something the others handle — use that as context, not as a forced ranking.',
    'Return ONLY a JSON object with this exact shape:',
    '{"scores":[{"variantId":"<exact id given>","text":"<assertion id or short text>","passed":"pass|partial|fail","reasons":"<why>","suggestions":"<fix or empty>","confidence":0}]}',
    'Include exactly one entry per candidate, using the exact variantId provided. confidence is 0 to 100.',
    judgePrompt ? `Additional judge instruction:\n${judgePrompt}` : '',
    `Assertion id: ${assertion.id}`,
    `Assertion text:\n${assertion.text}`,
    assertion.rubric ? `Assertion rubric:\n${assertion.rubric}` : '',
    'Candidate responses:',
    ...candidates.map((c) => `--- variantId: ${c.variantId} ---\nFinal response:\n${c.finalText}`),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Judges all successful variants of one (suite, repetition) together, per assertion, and mutates
 * each variant's RunResult with its per-assertion evalResult (or evalError). Never throws — a judge
 * failure is isolated to the affected variant(s) so the batch keeps going. */
async function runCombinedEval(
  client: Anthropic,
  model: string,
  suite: SuiteConfig,
  results: RunResult[],
  limit: Limiter,
): Promise<void> {
  if (!suite.eval) return;
  const active = results.filter((r) => !r.error);
  if (active.length === 0) return;

  const perVariant = new Map<string, EvalResultItem[]>();
  const failed = new Set<string>();
  const byVariantId = new Map(active.map((r) => [r.variantId, r]));
  const setEvalError = (variantId: string, assertion: EvalAssertionConfig, err: unknown): void => {
    const result = byVariantId.get(variantId);
    if (result && !result.evalError) {
      result.evalError = `Eval assertion "${assertion.id}" failed: ${err instanceof Error ? err.message : String(err)}`;
    }
    failed.add(variantId);
  };

  for (const assertion of suite.eval.assertions) {
    const candidates = active.filter((r) => !failed.has(r.variantId));
    if (candidates.length === 0) break;
    let scores: unknown;
    try {
      // Scale the token budget with the candidate count (each candidate needs its own verdict
      // object) so more variants don't truncate the JSON; thinking disabled for the same reason
      // as individual mode.
      const response = await limit(() =>
        withRetry(() =>
          client.messages.create({
            model,
            max_tokens: 2048 + candidates.length * 1024,
            thinking: { type: 'disabled' },
            messages: [
              {
                role: 'user',
                content: buildCombinedEvalPrompt(
                  assertion,
                  suite.eval?.judgePrompt,
                  candidates.map((c) => ({ variantId: c.variantId, finalText: c.turns[c.turns.length - 1]?.assistantText ?? '' })),
                ),
              },
            ],
          }),
        ),
      );
      // Accept either the requested {"scores":[...]} envelope or a bare top-level array, which
      // models frequently return when asked for "scores".
      const parsed = extractJsonObject(extractText(response)) as unknown;
      scores = Array.isArray(parsed) ? parsed : (parsed as { scores?: unknown })?.scores;
      if (!Array.isArray(scores)) throw new Error('combined judge did not return a "scores" array');
    } catch (err) {
      // Group-level judge failure for this assertion: mark every current candidate and stop
      // (prior assertions' results are retained per variant below).
      for (const c of candidates) setEvalError(c.variantId, assertion, err);
      break;
    }

    const byId = new Map<string, unknown>();
    for (const score of scores) {
      const variantId = (score as { variantId?: unknown })?.variantId;
      if (typeof variantId === 'string') byId.set(variantId, score);
    }
    for (const c of candidates) {
      try {
        const raw = byId.get(c.variantId);
        if (!raw) throw new Error('combined judge returned no score for this variant');
        const item = validateEvalResultItem(raw);
        const list = perVariant.get(c.variantId) ?? [];
        list.push(item);
        perVariant.set(c.variantId, list);
      } catch (err) {
        setEvalError(c.variantId, assertion, err);
      }
    }
  }

  for (const result of active) {
    const items = perVariant.get(result.variantId);
    if (items && items.length > 0) result.evalResult = items;
  }
}

// ---- variant conversation (turns only; eval is attached by the group) ----------------------------

async function runVariantConversation(
  client: Anthropic,
  config: BenchConfig,
  suite: SuiteConfig,
  variant: VariantConfig,
  repetition: number,
): Promise<RunResult> {
  const model = suite.model ?? config.model;
  const maxTokens = suite.maxOutputTokens ?? config.maxOutputTokens;
  const thinking = suite.thinking ?? config.thinking;
  const system = buildVariantSystem(config, variant);

  // Fresh, isolated history per (variant, repetition) — no state is shared across runs.
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
          ...(system ? { system } : {}),
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

/** One (suite, repetition) pipeline. Never rejects — variant and judge failures are isolated so a
 * single failed API call marks only that variant-repetition and never fails the batch. */
async function runGroup(
  client: Anthropic,
  config: BenchConfig,
  suite: SuiteConfig,
  repetition: number,
  limit: Limiter,
  report: (result: RunResult) => void,
): Promise<RunResult[]> {
  const model = suite.model ?? config.model;
  const mode = resolveJudgeMode(config, suite);

  // Launch every variant's conversation for this repetition concurrently (bounded by the limiter).
  const conversationPromises = suite.variants.map((variant) =>
    limit(() => runVariantConversation(client, config, suite, variant, repetition)),
  );

  // Individual mode: judge each variant as soon as ITS conversation resolves — no group barrier.
  if (suite.eval && mode === 'individual') {
    return Promise.all(
      conversationPromises.map(async (conversation) => {
        const result = await conversation;
        if (result.error) {
          report(result);
          return result;
        }
        const { evalResult, evalError } = await runIndividualEval(client, model, suite, result.turns, limit);
        const finalResult: RunResult = {
          ...result,
          ...(evalResult ? { evalResult } : {}),
          ...(evalError ? { evalError } : {}),
        };
        report(finalResult);
        return finalResult;
      }),
    );
  }

  // Combined mode (or no eval): await all this repetition's variants, then judge them together.
  const results = await Promise.all(conversationPromises);
  if (suite.eval && mode === 'combined') {
    await runCombinedEval(client, model, suite, results, limit);
  }
  for (const result of results) report(result);
  return results;
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

/** Runs every (suite, variant, repetition) as an independent conversation under one shared
 * concurrency limit. Repetition groups pipeline independently: each fires its judge (combined) or
 * per-variant judges (individual) as soon as its own conversations resolve — no global barrier, no
 * sequential passes. A failed variant-repetition (after retries) is recorded with `error` and the
 * batch continues. */
export async function runBenchSuite(
  client: Anthropic,
  config: BenchConfig,
  onProgress?: ProgressCallback,
): Promise<RunResult[]> {
  const total = buildJobs(config).length;
  const limit = createLimiter(Math.max(1, config.concurrency));
  let completed = 0;
  const report = (result: RunResult): void => {
    completed++;
    onProgress?.(completed, total, result);
  };

  const groupPromises: Array<Promise<RunResult[]>> = [];
  for (const suite of config.suites) {
    const reps = suite.repetitions ?? config.repetitions;
    for (let r = 0; r < reps; r++) {
      groupPromises.push(runGroup(client, config, suite, r, limit, report));
    }
  }

  const grouped = await Promise.all(groupPromises);
  return grouped.flat();
}

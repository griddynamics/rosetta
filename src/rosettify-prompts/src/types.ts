export type ThinkingEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ThinkingConfig {
  enabled: boolean;
  /** 'adaptive' (recommended, required by current-gen models like claude-sonnet-5,
   * claude-opus-4-7/4-8: depth is controlled by `effort`) vs 'manual' (legacy
   * `budget_tokens`-based control; deprecated/unsupported on newer models). */
  mode: 'adaptive' | 'manual';
  /** Used when mode === 'manual'. Must be >=1024 and < maxOutputTokens. */
  budgetTokens: number;
  /** Used when mode === 'adaptive'. */
  effort: ThinkingEffort;
  /** 'summarized' returns a (possibly summarized) thinking block; 'omitted' redacts it. */
  display: 'summarized' | 'omitted';
}

export interface VariantConfig {
  id: string;
  label?: string;
  /** Optional system prompt for this variant. Omit/null for no system prompt. */
  systemPrompt?: string | null;
  /** Ordered user turns. Sent one at a time; the model's real reply is used as
   * conversation history before the next turn is sent. */
  turns: string[];
}

export interface SuiteConfig {
  id: string;
  description?: string;
  /** Per-suite overrides of the global defaults below. */
  model?: string;
  maxOutputTokens?: number;
  thinking?: ThinkingConfig;
  repetitions?: number;
  variants: VariantConfig[];
}

export interface ModelPricing {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens (thinking tokens are billed at this rate too). */
  output: number;
}

export interface BenchConfig {
  model: string;
  maxOutputTokens: number;
  thinking: ThinkingConfig;
  repetitions: number;
  /** Max concurrent (suite, variant, repetition) conversations in flight. Each
   * repetition is a fully isolated conversation (its own message history), so
   * repetitions and variants all run independently in parallel up to this limit. */
  concurrency: number;
  /** Optional overrides/additions merged over the built-in pricing table. */
  pricingOverrides?: Record<string, ModelPricing>;
  suites: SuiteConfig[];
}

export interface TextMetrics {
  chars: number;
  words: number;
  /** Count of non-ASCII "symbol-ish" unicode code points (proxy for compressed/unicode style). */
  unicodeSymbols: number;
}

export interface TurnResult {
  turnIndex: number;
  userMessage: string;
  assistantText: string;
  thinkingText: string | null;
  inputTokens: number;
  /** Billed output tokens; includes thinking tokens per Anthropic's billing model. */
  outputTokens: number;
  /** Portion of outputTokens spent on internal reasoning. */
  thinkingTokens: number | null;
  /** 'usage' = reported directly by the API (`usage.output_tokens_details.thinking_tokens`);
   * 'estimated' = derived via countTokens on the extracted thinking block, used only as a
   * fallback when the API doesn't report it. */
  thinkingTokensSource: 'usage' | 'estimated' | null;
  latencyMs: number;
  stopReason: string | null;
  textMetrics: TextMetrics;
}

export interface RunTotals {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number | null;
  costUsd: number | null;
  latencyMs: number;
}

export interface RunResult {
  suiteId: string;
  variantId: string;
  repetition: number;
  model: string;
  turns: TurnResult[];
  totals: RunTotals;
  error?: string;
}

export interface FieldStats {
  n: number;
  mean: number;
  median: number;
  stdev: number;
  min: number;
  max: number;
}

export interface VariantSummary {
  suiteId: string;
  variantId: string;
  label?: string;
  successes: number;
  failures: number;
  inputTokens: FieldStats | null;
  outputTokens: FieldStats | null;
  thinkingTokens: FieldStats | null;
  costUsd: FieldStats | null;
  latencyMs: FieldStats | null;
}

export interface BenchReport {
  generatedAt: string;
  config: BenchConfig;
  runs: RunResult[];
  summaries: VariantSummary[];
}

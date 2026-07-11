import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { computeCostUsd } from './pricing.js';
import { hashText, renderDataBlock } from './delimiters.js';
import type { ThinkingEffort } from './types.js';
import {
  COMMON_CONTEXT,
  FINAL_FILES_JSON,
  OPTIMIZE_INVARIANT,
  OPTIMIZE_SESSION,
  OPTIMIZE_STEPS,
  STEP_CHANGES_JSON,
  STEP_REFERENCE_SECTIONS,
  type OptimizePhaseId,
  type OptimizeStepId,
  type OptimizeSubStepId,
} from './optimize-prompts.js';

export {
  COMMON_CONTEXT,
  FINAL_FILES_JSON,
  OPTIMIZE_INVARIANT,
  OPTIMIZE_SESSION,
  OPTIMIZE_STEPS,
  STEP_CHANGES_JSON,
  STEP_REFERENCE_SECTIONS,
  type OptimizePhaseId,
  type OptimizeStepId,
  type OptimizeSubStepId,
} from './optimize-prompts.js';

const DEFAULT_OPTIMIZE_ANTHROPIC_BETAS = ['thinking-token-count-2026-05-13'];
const DEFAULT_EFFORT: ThinkingEffort = 'high';

/** In-conversation labels for the non-content operations of the single-session pipeline. */
const VALUE_LOST_MID = 'value-lost-mid';
const FINALIZE_DRAFT = 'finalize-draft';
const FINAL_VALUE_LOST = 'final-value-lost';

export interface OptimizeClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      betas?: string[];
      thinking?: { type: string; display?: string };
      output_config?: { effort?: ThinkingEffort };
      system?: OptimizeContent;
      messages: Array<{ role: 'user' | 'assistant'; content: OptimizeContent }>;
    }): Promise<OptimizeResponse>;
    /** Used only to derive reasoning-token counts (see extractUsageStats/complete) when the
     * response doesn't report them directly, which is the case for the real Anthropic API. */
    countTokens?(params: {
      model: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    }): Promise<{ input_tokens: number }>;
  };
}

/** A message content block. Text blocks carry `text`; passthrough blocks (thinking,
 * redacted_thinking, …) are echoed back verbatim to preserve same-model thinking continuity. */
export interface OptimizeContentBlock {
  type: string;
  text?: string;
  cache_control?: { type: 'ephemeral' };
  [key: string]: unknown;
}

/** Kept as an alias for callers that constructed simple text blocks. */
export type OptimizeTextBlock = OptimizeContentBlock;

export type OptimizeContent = string | OptimizeContentBlock[];

interface OptimizeMessage {
  role: 'user' | 'assistant';
  content: OptimizeContent;
}

export interface OptimizeResponse {
  content?: unknown;
  stop_reason?: string | null;
  stopReason?: string | null;
  usage?: unknown;
}

export interface OptimizeOptions {
  targetPaths: string[];
  outDir: string;
  model: string;
  maxOutputTokens: number;
  /** Run only the first N content steps, then always finalize + final value-lost + serialize. */
  stepLimit?: number;
  anthropicBetas?: string[];
  traceRaw?: boolean;
  supportingPaths?: string[];
  additional?: string[];
  traceFullPrompts?: boolean;
  dryRun?: boolean;
  /** Adaptive-thinking depth passed as output_config.effort. Defaults to 'high'. */
  effort?: ThinkingEffort;
}

export interface OptimizeFileTrace {
  role: 'target' | 'supporting';
  path: string;
  relativePath: string;
  content: string;
  chars: number;
  words: number;
}

export interface OptimizedFile {
  path: string;
  content: string;
}

export interface OptimizeContentStats {
  chars: number;
  words: number;
  blocks: number;
  cacheableBlocks: number;
  hash: string;
}

export interface OptimizeRequestStats {
  maxOutputTokens: number;
  system: OptimizeContentStats | null;
  messages: {
    count: number;
    userCount: number;
    assistantCount: number;
    chars: number;
    words: number;
    cacheableBlocks: number;
  };
  appendedMessages: {
    count: number;
    chars: number;
    words: number;
    cacheableBlocks: number;
  };
}

export interface OptimizeUsageStats {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheReadInputTokens: number | null;
  cachedInputTokens: number | null;
  /** Normalized internal-reasoning tokens from any provider-specific location. */
  reasoningTokens: number | null;
  /** 'usage' = reported directly by the API; 'derived' = output_tokens minus a
   * countTokens() measurement of the visible response text (see complete()), used because the
   * real Anthropic API does not currently report thinking tokens separately in `usage`.
   * Omitted on aggregated (summed-across-calls) usage objects. */
  reasoningTokensSource?: 'usage' | 'derived' | null;
  standardCostUsd: number | null;
  rawUsage?: unknown;
}

export interface OptimizeCallStats {
  label: string;
  durationMs: number;
  stopReason: string | null;
  request: OptimizeRequestStats;
  response: {
    chars: number;
    words: number;
    usage: OptimizeUsageStats;
  };
}

/** Non-content operations recorded in the trace alongside the content steps. */
export type OptimizePromptStep = OptimizeStepId | 'session-setup' | typeof VALUE_LOST_MID | typeof FINALIZE_DRAFT;

export interface OptimizePhaseTrace {
  phase: OptimizePhaseId;
  label: string;
  steps: readonly OptimizeStepId[];
  prompts: Array<{
    step: OptimizePromptStep;
    promptHash: string;
    promptStats: OptimizeContentStats;
    prompt?: string;
    output: string;
    durationMs: number;
    callStats?: OptimizeCallStats;
  }>;
  beforeLength: { chars: number; words: number };
  afterLength: { chars: number; words: number };
  durationMs: number;
}

export interface OptimizeTrace {
  generatedAt: string;
  targetPaths: string[];
  supportingPaths: string[];
  additional: string[];
  model: string;
  maxOutputTokens: number;
  anthropicBetas: string[];
  effort: ThinkingEffort;
  stepLimit: number;
  totalSteps: number;
  targetFiles: OptimizeFileTrace[];
  supportingFiles: OptimizeFileTrace[];
  phases: OptimizePhaseTrace[];
  traceFullPrompts: boolean;
  finalAudit?: {
    promptHash: string;
    promptStats: OptimizeContentStats;
    prompt?: string;
    output: string;
    durationMs: number;
    callStats: OptimizeCallStats;
  };
  finalLength: { chars: number; words: number };
}

export interface OptimizeResult {
  optimizedFiles: OptimizedFile[];
  trace: OptimizeTrace;
  files?: {
    optimizedPaths: string[];
    tracePath: string;
    reportPath: string;
    rawTracePath?: string;
  };
}

export type OptimizeProgressEvent =
  | {
      type: 'call';
      phase?: OptimizePhaseId;
      phaseLabel?: string;
      step: OptimizeStepId | typeof VALUE_LOST_MID | typeof FINALIZE_DRAFT | typeof FINAL_VALUE_LOST;
      doneSteps: number;
      totalSteps: number;
      callStats: OptimizeCallStats;
    }
  | {
      type: 'phase';
      doneSteps: number;
      totalSteps: number;
      phase: OptimizePhaseTrace;
    };

export type OptimizeProgressCallback = (event: OptimizeProgressEvent) => void;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function filesWordCount(files: OptimizedFile[]): number {
  return wordCount(files.map((file) => file.content).join('\n\n'));
}

function filesCharCount(files: OptimizedFile[]): number {
  return files.reduce((sum, file) => sum + file.content.length, 0);
}

function contentText(content: OptimizeContent): string {
  if (typeof content === 'string') return content;
  return content
    .filter((block): block is OptimizeContentBlock & { text: string } => typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function contentStats(content: OptimizeContent): OptimizeContentStats {
  const text = contentText(content);
  const blocks = typeof content === 'string' ? 1 : content.length;
  const cacheableBlocks = typeof content === 'string'
    ? 0
    : content.filter((block) => block.cache_control?.type === 'ephemeral').length;
  return {
    chars: text.length,
    words: wordCount(text),
    blocks,
    cacheableBlocks,
    hash: hashText(text),
  };
}

function cacheableText(text: string): OptimizeContentBlock[] {
  return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
}

function textBlocks(text: string): OptimizeContentBlock[] {
  return [{ type: 'text', text }];
}

/** Multi-turn caching: add a cache breakpoint on the last block of the last (user) message so the
 * growing history — including replayed thinking — is read from cache on the next call. The stable
 * system + setup breakpoints plus this moving one stay within the 4-breakpoint limit. */
function withMovingCacheBreakpoint(messages: OptimizeMessage[]): OptimizeMessage[] {
  if (messages.length === 0) return messages;
  const result = messages.map((message) => ({ role: message.role, content: message.content }));
  const last = result[result.length - 1];
  const blocks = (Array.isArray(last.content) ? last.content : textBlocks(String(last.content))).map(
    (block) => ({ ...block }),
  );
  blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: { type: 'ephemeral' } };
  last.content = blocks;
  return result;
}

function extractText(response: unknown): string {
  const content = (response as { content?: unknown })?.content;
  if (!Array.isArray(content)) throw new Error('Optimizer response did not include a content array');
  return content
    .filter((block): block is { type: string; text: string } => (
      typeof block === 'object' &&
      block !== null &&
      (block as { type?: unknown }).type === 'text' &&
      typeof (block as { text?: unknown }).text === 'string'
    ))
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** The full content blocks (thinking + text) of a response, echoed back verbatim as the assistant
 * turn so later steps see prior reasoning. Blocks are passed back unchanged; do not reconstruct. */
function extractContentBlocks(response: unknown): OptimizeContentBlock[] {
  const content = (response as { content?: unknown })?.content;
  if (!Array.isArray(content)) throw new Error('Optimizer response did not include a content array');
  return content as OptimizeContentBlock[];
}

function assertNotTruncated(response: OptimizeResponse, label: string): void {
  const stopReason = response.stop_reason ?? response.stopReason ?? null;
  if (stopReason === 'max_tokens') {
    throw new Error(`${label} stopped because max output tokens were reached; refusing to feed truncated output forward`);
  }
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('optimizer did not return a JSON object');
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function commonAncestor(paths: string[]): string {
  if (paths.length === 0) throw new Error('At least one --target file is required');
  const splitPaths = paths.map((filePath) => path.resolve(filePath).split(path.sep));
  const first = splitPaths[0];
  let index = 0;
  while (index < first.length && splitPaths.every((parts) => parts[index] === first[index])) index++;
  const common = first.slice(0, index).join(path.sep) || path.sep;
  return common.endsWith(path.sep) ? common : `${common}${path.sep}`;
}

function safeRelative(baseDir: string, filePath: string): string {
  const relative = path.relative(baseDir, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return path.basename(filePath);
  return relative;
}

async function readFiles(paths: string[], role: OptimizeFileTrace['role'], baseDir: string): Promise<OptimizeFileTrace[]> {
  const seen = new Set<string>();
  const files: OptimizeFileTrace[] = [];
  for (const inputPath of paths) {
    const resolved = path.resolve(inputPath);
    if (seen.has(resolved)) throw new Error(`Duplicate ${role} file: ${resolved}`);
    seen.add(resolved);
    const content = await readFile(resolved, 'utf-8');
    files.push({
      role,
      path: resolved,
      relativePath: safeRelative(baseDir, resolved),
      content,
      chars: content.length,
      words: wordCount(content),
    });
  }
  return files;
}

function renderFileBlocks(files: OptimizeFileTrace[] | OptimizedFile[], role: string): string[] {
  return files.map((file, index) => {
    const filePath = 'relativePath' in file ? file.relativePath : file.path;
    return renderDataBlock(
      `${role} ${index + 1}: ${filePath}`,
      `${role}_${index + 1}_${filePath}`,
      file.content,
      `${role.toLowerCase()} file content`,
    );
  });
}

function renderAdditional(additional: string[]): string {
  if (additional.length === 0) return 'Additional user optimization goals: (none)';
  return [
    'Additional user optimization goals:',
    ...additional.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

function buildRunSetup(options: {
  additional: string[];
  supportingFiles: OptimizeFileTrace[];
}): string {
  return [
    'RUN SETUP: cache this stable optimizer context. The entire optimization runs as ONE conversation.',
    COMMON_CONTEXT,
    OPTIMIZE_INVARIANT,
    renderAdditional(options.additional),
    'Schemas are named STEP_CHANGES_JSON and FINAL_FILES_JSON. Later messages may reference those names.',
    STEP_CHANGES_JSON,
    FINAL_FILES_JSON,
    'Supporting files are context only. Do not output rewritten supporting files unless the same path is also a target.',
    ...renderFileBlocks(options.supportingFiles, 'SUPPORTING_FILE'),
  ].join('\n\n');
}

function buildSessionSetup(originalFiles: OptimizedFile[]): string {
  return [
    'SESSION SETUP: cache these ORIGINAL_TARGET_FILES. They are the source of truth and the start state for the whole run.',
    'Every step proposes surgical changes against THESE originals. Do not treat later proposals as the new baseline.',
    'One combined step arrives per message with exact references/issues. Do not work ahead. Accumulate proposals; a later finalize step materializes them into complete files.',
    ...renderFileBlocks(originalFiles, 'ORIGINAL_TARGET_FILE'),
  ].join('\n\n');
}

// ============================================================================
// EXTREMELY IMPORTANT — INTENTIONAL DESIGN. DO NOT "OPTIMIZE" THIS AWAY.
// Each combined step's instructions are delivered as their OWN fresh user
// message, one step at a time (see the per-step loop in runPromptOptimization).
// They are deliberately NOT concatenated into a single up-front prompt and NOT
// folded into the cached system/setup blocks.
// WHY: progressive disclosure. If every step's rubric is dumped at once (or
// parked in a static cached block), the model skims the wall of instructions
// and only actually addresses a fraction of the concerns (~20%). Delivering one
// focused concern per turn forces the model to work each concern in turn.
// Keep step instructions fresh, separate, and just-in-time.
// ============================================================================
function buildStepPrompt(step: (typeof OPTIMIZE_STEPS)[number]): string {
  const refs = STEP_REFERENCE_SECTIONS[step.id];
  const checklist = refs.objectives.map((objective, index) => `${index + 1}. ${objective}`).join('\n');
  return [
    `Combined step: ${step.label} (${step.id})`,
    `Do all of these sub-objectives; do not skip any:\n${checklist}`,
    refs.hardening ? `Rules to apply:\n${refs.hardening}` : '',
    refs.patterns ? `Patterns to apply:\n${refs.patterns}` : '',
    refs.aiIssues ? `Failure modes to prevent:\n${refs.aiIssues}` : '',
    'Do this step as a surgical change proposal over all target files. Preserve cross-file relationships and supporting-file references.',
    'Think through the line-purpose lens before changing anything. Keep concrete anchors and model-weight-sensitive wording unless a safer compact equivalent preserves the same behavior.',
    'Propose changes against the original target files. Return STEP_CHANGES_JSON only.',
  ].filter(Boolean).join('\n\n');
}

function buildMidValueLostPrompt(): string {
  return [
    'Mid-run value-lost reviewer/fixer.',
    OPTIMIZE_INVARIANT,
    'Review every step proposal made so far in this conversation against the original target files provided at the start.',
    'Internally create a concise loss ledger: lost value, weakened constraint, broken file relationship, removed mental hook, deleted concrete anchor, actor confusion, missing validation, changed scope, or prompt-injection obedience.',
    'Propose ONLY restoration changes that recover lost value or fix a broken proposal. Do not materialize files yet. Do not add nice-to-haves.',
    'Return STEP_CHANGES_JSON only.',
  ].join('\n\n');
}

function buildFinalizePrompt(): string {
  return [
    'Finalize draft: materialize all accepted proposals into complete target files.',
    OPTIMIZE_INVARIANT,
    'Apply the useful accepted proposals from this conversation to the original target files. Reject additive proposals unless they replace weaker/duplicated text or are mandatory failure prevention.',
    'Keep the rest of each file verbatim except accepted changes.',
    'Return FINAL_FILES_JSON.',
  ].join('\n\n');
}

function buildFinalValueLostPrompt(): string {
  return [
    'Final global preservation audit/fix.',
    OPTIMIZE_INVARIANT,
    'Compare the original target files (provided at the start of this conversation) against the draft target files you just produced (the previous message). Both are already in this conversation; do not expect them re-pasted.',
    'Restore any remaining lost value, concrete anchor, mental hook, strategy, trick, unusual pattern, model-weight-sensitive wording, schema/format contract, cross-file reference, or validation obligation.',
    'Keep final edits minimal. Keep the rest of each file verbatim except loss-restoration edits. Do not add commentary.',
    'Return FINAL_FILES_JSON.',
  ].join('\n\n');
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function usageNumber(usage: Record<string, unknown>, paths: string[]): number | null {
  for (const pathParts of paths) {
    let current: unknown = usage;
    for (const part of pathParts.split('.')) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    const value = readNumber(current);
    if (value !== null) return value;
  }
  return null;
}

function extractUsageStats(response: OptimizeResponse, model: string): OptimizeUsageStats {
  const rawUsage = response.usage;
  const usage = typeof rawUsage === 'object' && rawUsage !== null
    ? rawUsage as Record<string, unknown>
    : {};
  const inputTokens = usageNumber(usage, ['input_tokens']);
  const outputTokens = usageNumber(usage, ['output_tokens']);
  const cacheCreationInputTokens = usageNumber(usage, [
    'cache_creation_input_tokens',
    'input_tokens_details.cache_creation_input_tokens',
  ]);
  const cacheReadInputTokens = usageNumber(usage, [
    'cache_read_input_tokens',
    'input_tokens_details.cache_read_input_tokens',
  ]);
  const cachedInputTokens = usageNumber(usage, [
    'cached_input_tokens',
    'input_tokens_details.cached_tokens',
  ]);
  const reasoningTokens = usageNumber(usage, [
    'output_tokens_details.thinking_tokens',
    'thinking_tokens',
    'output_tokens_details.reasoning_tokens',
    'reasoning_tokens',
  ]);
  return {
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    cachedInputTokens,
    reasoningTokens,
    reasoningTokensSource: reasoningTokens !== null ? 'usage' : null,
    standardCostUsd: inputTokens !== null && outputTokens !== null
      ? computeCostUsd(inputTokens, outputTokens, model)
      : null,
    ...(rawUsage === undefined ? {} : { rawUsage }),
  };
}

function countCacheableBlocks(content: OptimizeContent): number {
  return typeof content === 'string'
    ? 0
    : content.filter((block) => block.cache_control?.type === 'ephemeral').length;
}

function requestStats(options: {
  maxOutputTokens: number;
  system?: OptimizeContent;
  messages: OptimizeMessage[];
  appendedMessages: OptimizeMessage[];
}): OptimizeRequestStats {
  const messageTexts = options.messages.map((message) => contentText(message.content));
  const appendedTexts = options.appendedMessages.map((message) => contentText(message.content));
  return {
    maxOutputTokens: options.maxOutputTokens,
    system: options.system ? contentStats(options.system) : null,
    messages: {
      count: options.messages.length,
      userCount: options.messages.filter((message) => message.role === 'user').length,
      assistantCount: options.messages.filter((message) => message.role === 'assistant').length,
      chars: messageTexts.reduce((sum, text) => sum + text.length, 0),
      words: wordCount(messageTexts.join('\n\n')),
      cacheableBlocks: options.messages.reduce((sum, message) => sum + countCacheableBlocks(message.content), 0),
    },
    appendedMessages: {
      count: options.appendedMessages.length,
      chars: appendedTexts.reduce((sum, text) => sum + text.length, 0),
      words: wordCount(appendedTexts.join('\n\n')),
      cacheableBlocks: options.appendedMessages.reduce((sum, message) => sum + countCacheableBlocks(message.content), 0),
    },
  };
}

async function deriveReasoningTokens(
  client: OptimizeClient,
  model: string,
  usage: OptimizeUsageStats,
  visibleText: string,
): Promise<void> {
  if (usage.reasoningTokens !== null || usage.outputTokens === null || !client.messages.countTokens) return;
  try {
    const counted = await client.messages.countTokens({
      model,
      messages: [{ role: 'user', content: visibleText }],
    });
    const derived = usage.outputTokens - counted.input_tokens;
    if (derived >= 0) {
      usage.reasoningTokens = derived;
      usage.reasoningTokensSource = 'derived';
    }
  } catch {
    // best-effort only; leave reasoningTokens null on failure
  }
}

async function complete(
  client: OptimizeClient,
  model: string,
  maxOutputTokens: number,
  anthropicBetas: string[],
  effort: ThinkingEffort,
  system: OptimizeContent,
  messages: OptimizeMessage[],
  previousRequestMessageCount: number,
  label: string,
  rawTracePath?: string,
): Promise<{ text: string; content: OptimizeContentBlock[]; durationMs: number; callStats: OptimizeCallStats }> {
  const startedAt = Date.now();
  const reqMessages = withMovingCacheBreakpoint(messages);
  const appendedMessages = reqMessages.slice(previousRequestMessageCount);
  const request = {
    model,
    max_tokens: maxOutputTokens,
    ...(anthropicBetas.length > 0 ? { betas: anthropicBetas } : {}),
    thinking: { type: 'adaptive', display: 'summarized' },
    output_config: { effort },
    system,
    messages: reqMessages,
  };
  const response = await client.messages.create(request);
  const durationMs = Date.now() - startedAt;
  assertNotTruncated(response, label);
  const text = extractText(response);
  if (!text) throw new Error(`${label} response was empty`);
  const content = extractContentBlocks(response);
  const usage = extractUsageStats(response, model);
  await deriveReasoningTokens(client, model, usage, text);
  const callStats: OptimizeCallStats = {
      label,
      durationMs,
      stopReason: response.stop_reason ?? response.stopReason ?? null,
      request: requestStats({ maxOutputTokens, system, messages: reqMessages, appendedMessages }),
      response: {
        chars: text.length,
        words: wordCount(text),
        usage,
      },
  };
  if (rawTracePath) {
    await appendFile(
      rawTracePath,
      `${JSON.stringify({
        label,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        request,
        response,
        callStats,
      })}\n`,
      'utf-8',
    );
  }
  return { text, content, durationMs, callStats };
}

function tracePrompt(
  content: OptimizeContent,
  traceFullPrompts: boolean,
): { promptHash: string; promptStats: OptimizeContentStats; prompt?: string } {
  const prompt = contentText(content);
  return {
    promptHash: hashText(prompt),
    promptStats: contentStats(content),
    ...(traceFullPrompts ? { prompt } : {}),
  };
}

function parseOptimizedFiles(output: string, targetPaths: string[]): OptimizedFile[] {
  const parsed = extractJsonObject(output) as { files?: unknown };
  if (!Array.isArray(parsed.files)) throw new Error('optimizer JSON must include a files array');
  const allowed = new Set(targetPaths);
  const seen = new Set<string>();
  const files: OptimizedFile[] = [];

  for (const rawFile of parsed.files) {
    const file = rawFile as { path?: unknown; content?: unknown };
    if (typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new Error('optimizer files must include string path and content');
    }
    const normalized = path.posix.normalize(file.path.replaceAll(path.sep, '/'));
    if (normalized.startsWith('../') || normalized === '..' || path.isAbsolute(normalized)) {
      throw new Error(`optimizer returned unsafe path: ${file.path}`);
    }
    if (!allowed.has(normalized)) throw new Error(`optimizer returned non-target file: ${file.path}`);
    if (seen.has(normalized)) throw new Error(`optimizer returned duplicate target file: ${file.path}`);
    seen.add(normalized);
    files.push({ path: normalized, content: file.content });
  }

  const missing = targetPaths.filter((targetPath) => !seen.has(targetPath));
  if (missing.length > 0) throw new Error(`optimizer omitted target file(s): ${missing.join(', ')}`);
  return targetPaths.map((targetPath) => files.find((file) => file.path === targetPath)!);
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return present.length === 0 ? null : present.reduce((sum, value) => sum + value, 0);
}

function formatNullable(value: number | null | undefined, digits = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return digits > 0 ? value.toFixed(digits) : String(value);
}

function formatReasoningTokens(usage: OptimizeUsageStats): string {
  const value = formatNullable(usage.reasoningTokens);
  if (!value) return '';
  return usage.reasoningTokensSource === 'derived' ? `${value} (derived)` : value;
}

function phaseCallStats(phase: OptimizePhaseTrace): OptimizeCallStats[] {
  return phase.prompts.flatMap((prompt) => prompt.callStats ? [prompt.callStats] : []);
}

function allCallStats(trace: OptimizeTrace): OptimizeCallStats[] {
  return [
    ...trace.phases.flatMap((phase) => phaseCallStats(phase)),
    ...(trace.finalAudit ? [trace.finalAudit.callStats] : []),
  ];
}

function totalUsage(calls: OptimizeCallStats[]): OptimizeUsageStats {
  const inputTokens = sumNullable(calls.map((call) => call.response.usage.inputTokens));
  const outputTokens = sumNullable(calls.map((call) => call.response.usage.outputTokens));
  return {
    inputTokens,
    outputTokens,
    cacheCreationInputTokens: sumNullable(calls.map((call) => call.response.usage.cacheCreationInputTokens)),
    cacheReadInputTokens: sumNullable(calls.map((call) => call.response.usage.cacheReadInputTokens)),
    cachedInputTokens: sumNullable(calls.map((call) => call.response.usage.cachedInputTokens)),
    reasoningTokens: sumNullable(calls.map((call) => call.response.usage.reasoningTokens)),
    standardCostUsd: sumNullable(calls.map((call) => call.response.usage.standardCostUsd)),
  };
}

export function renderOptimizeReport(trace: OptimizeTrace): string {
  const phaseRows = trace.phases
    .map((phase, index) => {
      const calls = phaseCallStats(phase);
      const usage = totalUsage(calls);
      return `| ${index + 1} | ${phase.label} | ${calls.length} | ${phase.beforeLength.words} | ${phase.afterLength.words} | ${phase.durationMs} | ${formatNullable(usage.inputTokens)} | ${formatNullable(usage.outputTokens)} | ${formatNullable(usage.cacheCreationInputTokens)} | ${formatNullable(usage.cacheReadInputTokens)} | ${formatNullable(usage.reasoningTokens)} | ${formatNullable(usage.standardCostUsd, 6)} |`;
    })
    .join('\n');
  const promptRows = trace.phases
    .flatMap((phase) => phase.prompts.map((prompt) => {
      const call = prompt.callStats;
      return `| ${phase.label} | ${prompt.step} | ${prompt.promptStats.words} | ${call ? call.request.messages.count : ''} | ${call ? call.request.appendedMessages.count : ''} | ${call ? call.request.appendedMessages.words : ''} | ${prompt.durationMs} | ${call ? formatNullable(call.response.usage.inputTokens) : ''} | ${call ? formatNullable(call.response.usage.outputTokens) : ''} | ${call ? formatNullable(call.response.usage.cacheCreationInputTokens) : ''} | ${call ? formatNullable(call.response.usage.cacheReadInputTokens) : ''} | ${call ? formatReasoningTokens(call.response.usage) : ''} | ${call ? formatNullable(call.response.usage.standardCostUsd, 6) : ''} | ${call?.stopReason ?? ''} |`;
    }))
    .join('\n');
  const totals = totalUsage(allCallStats(trace));
  return [
    '# Prompt Optimization Report',
    '',
    '## Inputs',
    '',
    '- Target files:',
    ...trace.targetPaths.map((filePath) => `  - \`${filePath}\``),
    '- Supporting files:',
    ...(trace.supportingPaths.length > 0 ? trace.supportingPaths.map((filePath) => `  - \`${filePath}\``) : ['  - (none)']),
    '- Additional goals:',
    ...(trace.additional.length > 0 ? trace.additional.map((goal) => `  - ${goal}`) : ['  - (none)']),
    '',
    '## Run',
    '',
    `- Model: \`${trace.model}\``,
    `- Max output tokens: ${trace.maxOutputTokens}`,
    `- Effort: ${trace.effort}`,
    `- Thinking: adaptive (display: summarized), replayed across the single session`,
    `- Anthropic betas: ${trace.anthropicBetas.length > 0 ? trace.anthropicBetas.map((beta) => `\`${beta}\``).join(', ') : '(none)'}`,
    `- Steps run: ${trace.stepLimit}/${trace.totalSteps} + mid value-lost + final value-lost`,
    `- Final size: ${trace.finalLength.words} words, ${trace.finalLength.chars} chars`,
    `- Total input tokens: ${formatNullable(totals.inputTokens) || 'not reported'}`,
    `- Total output tokens: ${formatNullable(totals.outputTokens) || 'not reported'}`,
    `- Total cache creation input tokens: ${formatNullable(totals.cacheCreationInputTokens) || 'not reported'}`,
    `- Total cache read input tokens: ${formatNullable(totals.cacheReadInputTokens) || 'not reported'}`,
    `- Total reasoning tokens: ${formatNullable(totals.reasoningTokens) || 'not reported'}`,
    `- Estimated standard input/output cost: ${formatNullable(totals.standardCostUsd, 6) || 'not reported'}`,
    '- Built-in hardening and patterns references are package-owned constants, not CLI inputs.',
    '- The whole run is one conversation: content steps, a mid value-lost review, a finalize-draft, then a final value-lost audit.',
    '',
    '| # | Phase | Calls | Before words | After words | Duration ms | Input tok | Output tok | Cache create tok | Cache read tok | Reasoning tok | Est. standard cost USD |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    phaseRows,
    '',
    '## Call Stats',
    '',
    '| Phase | Step | Prompt words | Request messages | Appended messages | Appended words | Duration ms | Input tok | Output tok | Cache create tok | Cache read tok | Reasoning tok | Est. standard cost USD | Stop |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    promptRows,
    ...(trace.finalAudit ? [
      `| ${OPTIMIZE_SESSION.label} | ${FINAL_VALUE_LOST} | ${trace.finalAudit.promptStats.words} | ${trace.finalAudit.callStats.request.messages.count} | ${trace.finalAudit.callStats.request.appendedMessages.count} | ${trace.finalAudit.callStats.request.appendedMessages.words} | ${trace.finalAudit.durationMs} | ${formatNullable(trace.finalAudit.callStats.response.usage.inputTokens)} | ${formatNullable(trace.finalAudit.callStats.response.usage.outputTokens)} | ${formatNullable(trace.finalAudit.callStats.response.usage.cacheCreationInputTokens)} | ${formatNullable(trace.finalAudit.callStats.response.usage.cacheReadInputTokens)} | ${formatReasoningTokens(trace.finalAudit.callStats.response.usage)} | ${formatNullable(trace.finalAudit.callStats.response.usage.standardCostUsd, 6)} | ${trace.finalAudit.callStats.stopReason ?? ''} |`,
    ] : []),
    '',
  ].join('\n');
}

async function writeOptimizedFiles(outDir: string, files: OptimizedFile[]): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const outputPath = path.resolve(outDir, file.path);
    const relative = path.relative(outDir, outputPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Refusing to write outside output directory: ${file.path}`);
    }
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, file.content, 'utf-8');
    written.push(outputPath);
  }
  return written;
}

export async function runPromptOptimization(
  client: OptimizeClient,
  options: OptimizeOptions,
  onProgress?: OptimizeProgressCallback,
): Promise<OptimizeResult> {
  if (!Number.isInteger(options.maxOutputTokens) || options.maxOutputTokens <= 0) {
    throw new Error('--max-output-tokens must be a positive integer');
  }
  if (!options.targetPaths?.length) throw new Error('At least one --target file is required');
  const stepLimit = options.stepLimit ?? OPTIMIZE_STEPS.length;
  if (!Number.isInteger(stepLimit) || stepLimit < 1 || stepLimit > OPTIMIZE_STEPS.length) {
    throw new Error(`--step-limit must be an integer from 1 to ${OPTIMIZE_STEPS.length}`);
  }
  const selectedSteps = OPTIMIZE_STEPS.slice(0, stepLimit);
  const effort = options.effort ?? DEFAULT_EFFORT;

  const resolvedTargets = options.targetPaths.map((targetPath) => path.resolve(targetPath));
  const baseDir = commonAncestor(resolvedTargets);
  const targetFiles = await readFiles(resolvedTargets, 'target', baseDir);
  const supportingFiles = await readFiles(options.supportingPaths ?? [], 'supporting', baseDir);
  const targetRelativePaths = targetFiles.map((file) => file.relativePath.replaceAll(path.sep, '/'));
  const originalFiles: OptimizedFile[] = targetFiles.map((file) => ({
    path: file.relativePath.replaceAll(path.sep, '/'),
    content: file.content,
  }));
  let currentFiles: OptimizedFile[] = originalFiles.map((file) => ({ ...file }));
  const outDir = path.resolve(options.outDir);
  const additional = options.additional ?? [];
  const traceFullPrompts = options.traceFullPrompts ?? false;
  const anthropicBetas = options.anthropicBetas ?? DEFAULT_OPTIMIZE_ANTHROPIC_BETAS;
  const rawTracePath = options.traceRaw ? path.join(outDir, 'raw-calls.jsonl') : undefined;
  const system = cacheableText(buildRunSetup({ additional, supportingFiles }));

  if (options.dryRun) {
    const trace: OptimizeTrace = {
      generatedAt: new Date().toISOString(),
      targetPaths: targetFiles.map((file) => file.path),
      supportingPaths: supportingFiles.map((file) => file.path),
      additional,
      model: options.model,
      maxOutputTokens: options.maxOutputTokens,
      anthropicBetas,
      effort,
      stepLimit,
      totalSteps: OPTIMIZE_STEPS.length,
      targetFiles,
      supportingFiles,
      phases: [],
      traceFullPrompts,
      finalLength: {
        chars: filesCharCount(currentFiles),
        words: filesWordCount(currentFiles),
      },
    };
    return { optimizedFiles: currentFiles, trace };
  }

  if (rawTracePath) {
    await mkdir(outDir, { recursive: true });
    await writeFile(rawTracePath, '', 'utf-8');
  }

  const sessionStartedAt = Date.now();
  const messages: OptimizeMessage[] = [];
  const prompts: OptimizePhaseTrace['prompts'] = [];
  let previousRequestMessageCount = 0;
  let doneSteps = 0;

  // SESSION SETUP: cache the stable run setup (system) + original target files (first user message).
  const setup = cacheableText(buildSessionSetup(originalFiles));
  messages.push({ role: 'user', content: setup });
  prompts.push({
    step: 'session-setup',
    ...tracePrompt(setup, traceFullPrompts),
    output: '',
    durationMs: 0,
  });

  // Run one proposal call, appending the full response (thinking + text) as the assistant turn.
  const runProposalCall = async (
    step: OptimizeStepId | typeof VALUE_LOST_MID,
    prompt: string,
  ): Promise<void> => {
    messages.push({ role: 'user', content: textBlocks(prompt) });
    const { text: output, content, durationMs, callStats } = await complete(
      client,
      options.model,
      options.maxOutputTokens,
      anthropicBetas,
      effort,
      system,
      messages,
      previousRequestMessageCount,
      `Optimizer ${step}`,
      rawTracePath,
    );
    previousRequestMessageCount = messages.length;
    messages.push({ role: 'assistant', content });
    prompts.push({ step, ...tracePrompt(textBlocks(prompt), traceFullPrompts), output, durationMs, callStats });
    onProgress?.({
      type: 'call',
      phase: OPTIMIZE_SESSION.id,
      phaseLabel: OPTIMIZE_SESSION.label,
      step,
      doneSteps,
      totalSteps: selectedSteps.length,
      callStats,
    });
  };

  // Fresh per-step delivery (see the buildStepPrompt banner): one step's
  // instructions arrive as their own user message here, just-in-time — never
  // batched up front or cached — so the model addresses each concern in turn.
  for (let index = 0; index < selectedSteps.length; index++) {
    await runProposalCall(selectedSteps[index].id, buildStepPrompt(selectedSteps[index]));
    doneSteps++;
    // VALUE-LOST #1 (middle review) runs after step 3 (Execution & Delegation).
    if (index === 2) {
      await runProposalCall(VALUE_LOST_MID, buildMidValueLostPrompt());
    }
  }

  // FINALIZE-DRAFT: materialize all accumulated proposals into complete draft files.
  messages.push({ role: 'user', content: textBlocks(buildFinalizePrompt()) });
  const finalize = await complete(
    client,
    options.model,
    options.maxOutputTokens,
    anthropicBetas,
    effort,
    system,
    messages,
    previousRequestMessageCount,
    `Optimizer ${FINALIZE_DRAFT}`,
    rawTracePath,
  );
  previousRequestMessageCount = messages.length;
  messages.push({ role: 'assistant', content: finalize.content });
  currentFiles = parseOptimizedFiles(finalize.text, targetRelativePaths);
  prompts.push({
    step: FINALIZE_DRAFT,
    ...tracePrompt(textBlocks(buildFinalizePrompt()), traceFullPrompts),
    output: finalize.text,
    durationMs: finalize.durationMs,
    callStats: finalize.callStats,
  });
  onProgress?.({
    type: 'call',
    phase: OPTIMIZE_SESSION.id,
    phaseLabel: OPTIMIZE_SESSION.label,
    step: FINALIZE_DRAFT,
    doneSteps,
    totalSteps: selectedSteps.length,
    callStats: finalize.callStats,
  });

  const draftLength = {
    chars: filesCharCount(currentFiles),
    words: filesWordCount(currentFiles),
  };

  // VALUE-LOST #2 (final): original (cached setup) vs draft (prior message); instructions only.
  const finalPrompt = buildFinalValueLostPrompt();
  messages.push({ role: 'user', content: textBlocks(finalPrompt) });
  const finalAudit = await complete(
    client,
    options.model,
    options.maxOutputTokens,
    anthropicBetas,
    effort,
    system,
    messages,
    previousRequestMessageCount,
    `Optimizer ${FINAL_VALUE_LOST}`,
    rawTracePath,
  );
  currentFiles = parseOptimizedFiles(finalAudit.text, targetRelativePaths);
  onProgress?.({
    type: 'call',
    step: FINAL_VALUE_LOST,
    doneSteps,
    totalSteps: selectedSteps.length,
    callStats: finalAudit.callStats,
  });

  const phaseTrace: OptimizePhaseTrace = {
    phase: OPTIMIZE_SESSION.id,
    label: OPTIMIZE_SESSION.label,
    steps: selectedSteps.map((step) => step.id),
    prompts,
    beforeLength: {
      chars: filesCharCount(originalFiles),
      words: filesWordCount(originalFiles),
    },
    afterLength: draftLength,
    durationMs: Date.now() - sessionStartedAt,
  };
  onProgress?.({
    type: 'phase',
    doneSteps,
    totalSteps: selectedSteps.length,
    phase: phaseTrace,
  });

  const trace: OptimizeTrace = {
    generatedAt: new Date().toISOString(),
    targetPaths: targetFiles.map((file) => file.path),
    supportingPaths: supportingFiles.map((file) => file.path),
    additional,
    model: options.model,
    maxOutputTokens: options.maxOutputTokens,
    anthropicBetas,
    effort,
    stepLimit,
    totalSteps: OPTIMIZE_STEPS.length,
    targetFiles,
    supportingFiles,
    phases: [phaseTrace],
    traceFullPrompts,
    finalAudit: {
      ...tracePrompt(textBlocks(finalPrompt), traceFullPrompts),
      output: finalAudit.text,
      durationMs: finalAudit.durationMs,
      callStats: finalAudit.callStats,
    },
    finalLength: {
      chars: filesCharCount(currentFiles),
      words: filesWordCount(currentFiles),
    },
  };

  await mkdir(outDir, { recursive: true });
  const optimizedPaths = await writeOptimizedFiles(outDir, currentFiles);
  const tracePath = path.join(outDir, 'trace.json');
  const reportPath = path.join(outDir, 'report.md');
  await writeFile(tracePath, `${JSON.stringify(trace, null, 2)}\n`, 'utf-8');
  await writeFile(reportPath, renderOptimizeReport(trace), 'utf-8');

  return {
    optimizedFiles: currentFiles,
    trace,
    files: { optimizedPaths, tracePath, reportPath, ...(rawTracePath ? { rawTracePath } : {}) },
  };
}

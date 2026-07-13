import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  COMMON_CONTEXT,
  OPTIMIZE_STEPS,
  STEP_REFERENCE_SECTIONS,
  type OptimizeContent,
  type OptimizeClient,
  type OptimizeQuestion,
  type OptimizeQuestionAsker,
  runPromptOptimization,
} from '../src/optimize.js';

const execFileAsync = promisify(execFile);

interface OptimizeCall {
  system?: OptimizeContent;
  thinking?: unknown;
  output_config?: unknown;
  messages: Array<{ role: 'user' | 'assistant'; content: OptimizeContent }>;
}

function textOf(content: OptimizeContent | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .filter((block): block is typeof block & { text: string } => typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function isCacheable(content: OptimizeContent | undefined): boolean {
  return Array.isArray(content) && content.some((block) => block.cache_control?.type === 'ephemeral');
}

function responseFor(paths: string[], callNumber: number): string {
  return JSON.stringify({
    files: paths.map((filePath) => ({
      path: filePath,
      content: `optimized ${filePath} call ${callNumber}`,
    })),
  });
}

/** Optional per-call (1-based) questions merged into that call's response JSON. */
type QuestionsByCall = Record<number, unknown>;

function fakeClient(calls: OptimizeCall[], paths = ['SKILL.md'], questionsByCall: QuestionsByCall = {}): OptimizeClient {
  return {
    messages: {
      async create(params) {
        calls.push({
          system: params.system,
          thinking: params.thinking,
          output_config: params.output_config,
          messages: params.messages.map((message) => ({ ...message })),
        });
        const prompt = textOf(params.messages.at(-1)?.content);
        // FINALIZE-DRAFT and the final value-lost audit both materialize complete files.
        const isMaterializing = prompt.includes('Return FINAL_FILES_JSON.');
        const base: Record<string, unknown> = isMaterializing
          ? {
              files: paths.map((filePath) => ({
                path: filePath,
                content: `optimized ${filePath} call ${calls.length}`,
              })),
            }
          : {
              changes: paths.map((filePath) => ({
                path: filePath,
                intent: `proposal ${calls.length}`,
                find: 'original snippet',
                replace: 'replacement snippet',
                preserves: ['concrete anchor'],
              })),
            };
        const questions = questionsByCall[calls.length];
        const text = JSON.stringify(questions === undefined ? base : { ...base, questions });
        return {
          // Full content includes a thinking block so we can assert same-session replay.
          content: [
            { type: 'thinking', thinking: `reasoning ${calls.length}`, signature: `sig-${calls.length}` },
            { type: 'text', text },
          ],
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 100 + calls.length,
            output_tokens: 20 + calls.length,
            cache_creation_input_tokens: calls.length === 1 ? 50 : 0,
            cache_read_input_tokens: calls.length > 1 ? 40 : 0,
            output_tokens_details: { thinking_tokens: 5 + calls.length },
            reasoning_tokens: 7 + calls.length,
          },
        };
      },
    },
  };
}

interface AskInvocation {
  questions: OptimizeQuestion[];
  step: string;
  stepLabel: string;
}

/** Records every invocation and returns canned answers keyed by question id (missing id = skip). */
function fakeAsker(answersById: Record<string, string>, log: AskInvocation[]): OptimizeQuestionAsker {
  return async (questions, context) => {
    log.push({ questions, step: context.step, stepLabel: context.stepLabel });
    return questions.map((question) => answersById[question.id] ?? '');
  };
}

async function tempWorkspace(): Promise<{
  dir: string;
  outDir: string;
  target: string;
  target2: string;
  supporting: string;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), 'rosettify-prompts-optimize-test-'));
  const refs = path.join(dir, 'references');
  const assets = path.join(dir, 'assets');
  await mkdir(refs, { recursive: true });
  await mkdir(assets, { recursive: true });
  const target = path.join(dir, 'SKILL.md');
  const target2 = path.join(refs, 'foo.md');
  const supporting = path.join(assets, 'context.md');
  await writeFile(target, 'Skill prompt with mental hook and concrete anchor.', 'utf-8');
  await writeFile(target2, 'Reference target file that must also be rewritten.', 'utf-8');
  await writeFile(supporting, 'Supporting context only; do not rewrite.', 'utf-8');
  return { dir, outDir: path.join(dir, 'out'), target, target2, supporting };
}

/** Total API calls for a given step limit: content steps + mid value-lost (if >=3) + finalize + final. */
function expectedCalls(stepLimit: number): number {
  return stepLimit + (stepLimit >= 3 ? 1 : 0) + 2;
}

describe('optimize prompts', () => {
  it('defines 7 intent-combined steps with the expected members', () => {
    expect(OPTIMIZE_STEPS.map((step) => step.id)).toEqual([
      'inventory-intent',
      'actors-contracts',
      'execution-delegation',
      'review-failure',
      'patterns-simulation',
      'compression',
      'consistency-minimality',
    ]);
    expect(OPTIMIZE_STEPS.flatMap((step) => step.members)).toEqual([
      'inventory-ledger',
      'requirements-intent',
      'actor-boundaries',
      'responsibility-slicing',
      'contracts',
      'workflow-semantics',
      'subagent-orchestration',
      'hitl-user-loop',
      'review-validate',
      'failure-mode-hardening',
      'pattern-integration',
      'simulation',
      'anti-slop',
      'compactness',
      'final-consistency',
      'final-minimality',
      'hierarchy-priority',
    ]);
  });

  it('merges member reference text verbatim into combined steps and dedupes duplicate lines', () => {
    expect(STEP_REFERENCE_SECTIONS['inventory-intent'].objectives).toHaveLength(2);
    expect(STEP_REFERENCE_SECTIONS['inventory-intent'].objectives[0]).toContain('Identify every behavior');
    expect(STEP_REFERENCE_SECTIONS['actors-contracts'].hardening).toContain('Maintains Workflow/Phase/Subagent/Skill/Rule boundaries');
    expect(STEP_REFERENCE_SECTIONS['actors-contracts'].hardening).toContain('Actively hunt for cross-skill refs');
    expect(STEP_REFERENCE_SECTIONS['inventory-intent'].hardening).toContain('Use common and domain terms & abbreviations');
    expect(STEP_REFERENCE_SECTIONS['execution-delegation'].patterns).toContain('<subagents-orchestration>');
    expect(STEP_REFERENCE_SECTIONS['review-failure'].patterns).toContain('Review IS statically reviewing some result for some intent');
    expect(STEP_REFERENCE_SECTIONS['review-failure'].aiIssues).toContain('F1');
    expect(STEP_REFERENCE_SECTIONS.compression.hardening).toContain('Small rules, extensive coverage, clear concerns');
    expect(STEP_REFERENCE_SECTIONS.compression.hardening).toContain('Rephrase, restructure, compress for much more compact prompt without loosing value');
    expect(STEP_REFERENCE_SECTIONS.compression.hardening).toContain('one-two word nudges');
    expect(STEP_REFERENCE_SECTIONS.compression.hardening).toContain('remove meta-explanation');
    expect(STEP_REFERENCE_SECTIONS.compression.aiIssues).toContain('Keep the concrete anchor');
    expect(STEP_REFERENCE_SECTIONS['consistency-minimality'].hardening).toContain('# Five-Axis Audit');
    expect(STEP_REFERENCE_SECTIONS['consistency-minimality'].hardening).toContain('# Surface Area Reduction');
    expect(STEP_REFERENCE_SECTIONS['consistency-minimality'].hardening).toContain('Respect instruction hierarchy');
    // "- No logical conflicts" appears in both final-consistency and hierarchy-priority; deduped to one.
    const hardening = STEP_REFERENCE_SECTIONS['consistency-minimality'].hardening ?? '';
    expect((hardening.match(/^- No logical conflicts$/gm) ?? []).length).toBe(1);
  });

  it('uses target/supporting/additional semantics and writes every target preserving relative paths', async () => {
    const calls: OptimizeCall[] = [];
    const { dir, outDir, target, target2, supporting } = await tempWorkspace();

    const result = await runPromptOptimization(
      fakeClient(calls, ['SKILL.md', 'references/foo.md']),
      {
        targetPaths: [target, target2],
        supportingPaths: [supporting],
        additional: ['Prefer terse wording; keep examples concrete.'],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
      },
    );

    expect(result.optimizedFiles.map((file) => file.path)).toEqual(['SKILL.md', 'references/foo.md']);
    expect(await readFile(path.join(outDir, 'SKILL.md'), 'utf-8')).toContain('optimized SKILL.md');
    expect(await readFile(path.join(outDir, 'references', 'foo.md'), 'utf-8')).toContain('optimized references/foo.md');
    await expect(readFile(path.join(outDir, 'assets', 'context.md'), 'utf-8')).rejects.toThrow();
    expect(result.trace.targetPaths).toEqual([path.resolve(target), path.resolve(target2)]);
    expect(result.trace.supportingPaths).toEqual([path.resolve(supporting)]);
    expect(result.trace.additional).toEqual(['Prefer terse wording; keep examples concrete.']);
    expect(result.files?.optimizedPaths.map((filePath) => path.relative(outDir, filePath))).toEqual([
      'SKILL.md',
      path.join('references', 'foo.md'),
    ]);
    expect(path.dirname(target)).toBe(dir);
  });

  it('runs one growing conversation: 10 ordered ops with two value-lost checks', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
    });

    expect(calls).toHaveLength(10);
    // One conversation: each call sends the whole prior history plus the new user prompt.
    calls.forEach((call, index) => {
      expect(call.messages).toHaveLength(2 * (index + 1));
    });

    // SESSION SETUP is the cached first user message (not its own call), carrying the originals.
    const setup = calls[0].messages[0].content;
    expect(isCacheable(calls[0].system)).toBe(true);
    expect(isCacheable(setup)).toBe(true);
    expect(textOf(setup)).toContain('SESSION SETUP');
    expect(textOf(setup)).toContain('ORIGINAL_TARGET_FILE');
    expect(textOf(setup)).toContain('Skill prompt with mental hook');

    // Moving cache breakpoint sits on the last block of the last (user) message each call.
    const lastMessage = calls[0].messages.at(-1)?.content;
    expect(Array.isArray(lastMessage) && lastMessage.at(-1)?.cache_control?.type).toBe('ephemeral');

    // Ordered pipeline, identified by each call's final user prompt.
    const step1 = calls[0].messages.at(-1)?.content;
    expect(textOf(step1)).toContain('Combined step: Inventory & Intent (inventory-intent)');
    expect(textOf(step1)).toContain('Do all of these sub-objectives');
    expect(textOf(step1)).toContain('Identify every behavior');
    expect(textOf(step1)).toContain('Clarify intended audience');
    expect(textOf(step1)).toContain('Requirements could be reverse engineered');
    expect(textOf(step1)).toContain('Return STEP_CHANGES_JSON only.');
    expect(textOf(step1)).not.toContain('Skill prompt with mental hook');

    expect(textOf(calls[2].messages.at(-1)?.content)).toContain('execution-delegation');
    expect(textOf(calls[3].messages.at(-1)?.content)).toContain('Mid-run value-lost');
    expect(textOf(calls[8].messages.at(-1)?.content)).toContain('Finalize draft');

    const finalPrompt = textOf(calls[9].messages.at(-1)?.content);
    expect(finalPrompt).toContain('Final global preservation audit');
    // Final value-lost is instructions only: no re-rendered original/draft file blocks.
    expect(finalPrompt).not.toContain('ORIGINAL_TARGET_FILE');
    expect(finalPrompt).not.toContain('Skill prompt with mental hook');

    expect(result.trace.phases).toHaveLength(1);
    expect(result.trace.phases[0].steps).toEqual(OPTIMIZE_STEPS.map((step) => step.id));
    expect(result.trace.phases[0].prompts.map((prompt) => prompt.step)).toEqual([
      'session-setup',
      'inventory-intent',
      'actors-contracts',
      'execution-delegation',
      'value-lost-mid',
      'review-failure',
      'patterns-simulation',
      'compression',
      'consistency-minimality',
      'finalize-draft',
    ]);
    expect(result.trace.finalAudit?.prompt).toBeUndefined();
  });

  it('replays full assistant content (thinking + text) into later turns', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
    });

    const assistantTurns = calls[1].messages.filter((message) => message.role === 'assistant');
    expect(assistantTurns).toHaveLength(1);
    const blocks = assistantTurns[0].content;
    expect(Array.isArray(blocks)).toBe(true);
    expect((blocks as Array<{ type: string; thinking?: string }>).some(
      (block) => block.type === 'thinking' && block.thinking === 'reasoning 1',
    )).toBe(true);
  });

  it('always sends adaptive thinking (summarized) and defaults effort to high', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
    });

    for (const call of calls) {
      expect(call.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
      expect(call.output_config).toEqual({ effort: 'high' });
    }
    expect(result.trace.effort).toBe('high');
  });

  it('honors an explicit effort level', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
      effort: 'max',
    });

    expect(calls[0].output_config).toEqual({ effort: 'max' });
    expect(result.trace.effort).toBe('max');
  });

  it('records per-call request, usage, cache, reasoning, cost, and response stats', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-sonnet-5',
      maxOutputTokens: 2048,
    });

    const firstStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'inventory-intent');
    expect(firstStep?.promptStats.words).toBeGreaterThan(0);
    expect(firstStep?.callStats?.request.messages.count).toBe(2);
    expect(firstStep?.callStats?.request.appendedMessages.count).toBe(2);
    expect(firstStep?.callStats?.response.usage.inputTokens).toBeGreaterThan(0);
    expect(firstStep?.callStats?.response.usage.outputTokens).toBeGreaterThan(0);
    expect(firstStep?.callStats?.response.usage.cacheCreationInputTokens).toBe(50);
    expect(firstStep?.callStats?.response.usage.reasoningTokens).toBe(6);
    expect(firstStep?.callStats?.response.usage.standardCostUsd).toBeGreaterThan(0);

    const secondStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'actors-contracts');
    expect(secondStep?.callStats?.request.messages.count).toBe(4);
    expect(secondStep?.callStats?.request.appendedMessages.count).toBe(2);
    expect(secondStep?.callStats?.response.usage.cacheReadInputTokens).toBe(40);

    // The final value-lost audit is the last call and reviews the draft in-conversation.
    expect(result.trace.finalAudit?.callStats.request.messages.count).toBe(20);
    expect(result.trace.finalAudit?.callStats.request.appendedMessages.count).toBe(2);
    expect(result.trace.finalAudit?.callStats.response.usage.rawUsage).toBeDefined();
  });

  it('sends default Anthropic beta and can write raw request/response traces', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-sonnet-5',
      maxOutputTokens: 2048,
      stepLimit: 1,
      traceRaw: true,
    });

    expect(result.trace.anthropicBetas).toEqual(['thinking-token-count-2026-05-13']);
    expect(result.files?.rawTracePath).toBe(path.join(outDir, 'raw-calls.jsonl'));
    const rawLines = (await readFile(result.files!.rawTracePath!, 'utf-8')).trim().split('\n');
    // stepLimit 1 => 1 content step + finalize + final value-lost = 3 calls.
    expect(rawLines).toHaveLength(expectedCalls(1));
    const firstRaw = JSON.parse(rawLines[0]);
    expect(firstRaw.request.betas).toEqual(['thinking-token-count-2026-05-13']);
    expect(firstRaw.request.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(firstRaw.response.usage.output_tokens_details.thinking_tokens).toBeGreaterThan(0);
    expect(firstRaw.callStats.response.usage.reasoningTokens).toBeGreaterThan(0);
  });

  it('can limit content steps and still finalize + final value-lost + serialize', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
      stepLimit: 1,
    });

    expect(result.trace.stepLimit).toBe(1);
    expect(result.trace.totalSteps).toBe(7);
    expect(result.trace.phases[0].steps).toEqual(['inventory-intent']);
    expect(result.trace.finalAudit).toBeDefined();
    expect(calls).toHaveLength(expectedCalls(1));
    const allPrompts = calls.map((call) => textOf(call.messages.at(-1)?.content)).join('\n');
    expect(allPrompts).not.toContain('actors-contracts');
    expect(allPrompts).not.toContain('Mid-run value-lost'); // below the >=3 threshold
    expect(allPrompts).toContain('Finalize draft');
    expect(allPrompts).toContain('Final global preservation audit');
    expect(await readFile(path.join(outDir, 'SKILL.md'), 'utf-8')).toContain('optimized SKILL.md');
    expect(await readFile(path.join(outDir, 'trace.json'), 'utf-8')).toContain('"stepLimit": 1');
    expect(await readFile(path.join(outDir, 'report.md'), 'utf-8')).toContain('Steps run: 1/7');
  });

  it('runs the mid value-lost review once the third step is reached', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
      stepLimit: 3,
    });

    expect(calls).toHaveLength(expectedCalls(3));
    expect(textOf(calls[3].messages.at(-1)?.content)).toContain('Mid-run value-lost');
  });

  it('rejects invalid step limits before model calls', async () => {
    let calls = 0;
    const { outDir, target } = await tempWorkspace();
    const client: OptimizeClient = {
      messages: { async create() {
        calls++;
        return { content: [{ type: 'text', text: responseFor(['SKILL.md'], 1) }] };
      } },
    };

    await expect(
      runPromptOptimization(client, {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        stepLimit: 8,
      }),
    ).rejects.toThrow(/--step-limit/);
    expect(calls).toBe(0);
  });

  it('injects additional goals into stable system context, not target file blocks', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      additional: ['Preserve domain terminology exactly.'],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
    });

    expect(textOf(calls[0].system)).toContain('Additional user optimization goals:');
    expect(textOf(calls[0].system)).toContain('Preserve domain terminology exactly.');
    expect(textOf(calls[0].messages.at(-1)?.content)).not.toContain('Preserve domain terminology exactly.');
    expect(textOf(calls[0].system)).not.toContain('<patterns mix-and-match="any">');
    expect(textOf(calls[0].system)).not.toContain('<hardening>');
  });

  it('puts line-purpose and preservation purpose into common context', () => {
    expect(COMMON_CONTEXT).toContain('Purpose: improve clarity, progressive disclosure');
    expect(COMMON_CONTEXT).toContain('Preserve ideas, mental hooks, strategy, tricks, unusual patterns');
    expect(COMMON_CONTEXT).toContain('Why does it exist?');
    expect(COMMON_CONTEXT).toContain('Is it useful for model weights?');
    expect(COMMON_CONTEXT).toContain('Does it address an AI failure mode?');
  });

  it('rejects omitted, duplicate, non-target, unsafe, and truncated outputs', async () => {
    const { outDir, target } = await tempWorkspace();

    const omitted: OptimizeClient = {
      messages: { async create() {
        return { content: [{ type: 'text', text: JSON.stringify({ files: [] }) }] };
      } },
    };
    await expect(
      runPromptOptimization(omitted, { targetPaths: [target], outDir, model: 'claude-test', maxOutputTokens: 2048 }),
    ).rejects.toThrow(/omitted target file/);

    const unsafe: OptimizeClient = {
      messages: { async create() {
        return { content: [{ type: 'text', text: JSON.stringify({ files: [{ path: '../x.md', content: 'x' }] }) }] };
      } },
    };
    await expect(
      runPromptOptimization(unsafe, { targetPaths: [target], outDir, model: 'claude-test', maxOutputTokens: 2048 }),
    ).rejects.toThrow(/unsafe path/);

    const truncated: OptimizeClient = {
      messages: { async create() {
        return { stop_reason: 'max_tokens', content: [{ type: 'text', text: responseFor(['SKILL.md'], 1) }] };
      } },
    };
    await expect(
      runPromptOptimization(truncated, { targetPaths: [target], outDir, model: 'claude-test', maxOutputTokens: 1 }),
    ).rejects.toThrow(/max output tokens/);
  });

  it('dry-run validates target and supporting files without model calls or writes', async () => {
    let calls = 0;
    const { outDir, target, supporting } = await tempWorkspace();
    const client: OptimizeClient = {
      messages: { async create() {
        calls++;
        return { content: [{ type: 'text', text: responseFor(['SKILL.md'], 1) }] };
      } },
    };

    const result = await runPromptOptimization(client, {
      targetPaths: [target],
      supportingPaths: [supporting],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
      dryRun: true,
    });

    expect(calls).toBe(0);
    expect(result.optimizedFiles[0].content).toContain('Skill prompt');
    expect(result.trace.phases).toEqual([]);
    await expect(readFile(path.join(outDir, 'SKILL.md'), 'utf-8')).rejects.toThrow();
  });

  it('CLI dry-run uses --target, --supporting, and --additional', async () => {
    const { outDir, target, target2, supporting } = await tempWorkspace();

    const { stdout } = await execFileAsync(process.execPath, [
      '--import',
      'tsx/esm',
      'src/cli.ts',
      'optimize',
      '--target',
      target,
      '--target',
      target2,
      '--supporting',
      supporting,
      '--additional',
      'Prefer terse wording; keep examples concrete.',
      '--out',
      outDir,
      '--model',
      'claude-test',
      '--dry-run',
    ]);

    expect(stdout).toContain('Optimize plan OK: 7/7 step(s), one conversation.');
    expect(stdout).toContain(path.resolve(target));
    expect(stdout).toContain(path.resolve(target2));
    expect(stdout).toContain(path.resolve(supporting));
    expect(stdout).toContain('Prefer terse wording; keep examples concrete.');
    expect(stdout).toContain('Step limit: 7');
    expect(stdout).toContain('Inventory & Intent (inventory-intent)');
    expect(stdout).toContain('Execution & Delegation (execution-delegation)');
    expect(stdout).toContain('VALUE-LOST #1 (mid review)');
    expect(stdout).toContain('FINALIZE-DRAFT');
    expect(stdout).toContain('VALUE-LOST #2 (final)');
    expect(stdout).toContain('SERIALIZE (write files)');
  });

  it('CLI dry-run can limit execution to the first content step', async () => {
    const { outDir, target } = await tempWorkspace();

    const { stdout } = await execFileAsync(process.execPath, [
      '--import',
      'tsx/esm',
      'src/cli.ts',
      'optimize',
      '--target',
      target,
      '--out',
      outDir,
      '--model',
      'claude-test',
      '--step-limit',
      '1',
      '--dry-run',
    ]);

    expect(stdout).toContain('Optimize plan OK: 1/7 step(s), one conversation.');
    expect(stdout).toContain('Step limit: 1');
    expect(stdout).toContain('Inventory & Intent (inventory-intent)');
    expect(stdout).not.toContain('Review, Validation & Failure Hardening');
    expect(stdout).not.toContain('VALUE-LOST #1 (mid review)');
    expect(stdout).toContain('FINALIZE-DRAFT');
    expect(stdout).toContain('VALUE-LOST #2 (final)');
  });

  it('renders optimizer reports with token, cache, reasoning, cost, and appended-message stats', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-sonnet-5',
      maxOutputTokens: 2048,
    });
    const report = await readFile(result.files!.reportPath, 'utf-8');

    expect(report).toContain('Total input tokens:');
    expect(report).toContain('Total cache creation input tokens:');
    expect(report).toContain('Total cache read input tokens:');
    expect(report).toContain('Total reasoning tokens:');
    expect(report).toContain('Est. standard cost USD');
    expect(report).toContain('Steps run: 7/7');
    expect(report).toContain('Appended messages');
    expect(report).toContain('Cache read tok');
    expect(report).toContain('Reasoning tok');
  });

  it('flag off ignores emitted questions and keeps single-text-block user messages', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], { 1: [{ id: 'q1', question: 'Would this help?' }] }),
      { targetPaths: [target], outDir, model: 'claude-test', maxOutputTokens: 2048 },
    );

    for (const call of calls) {
      expect(textOf(call.system)).not.toContain('STEP_QUESTIONS_JSON');
      for (const message of call.messages) {
        expect(textOf(message.content)).not.toContain('USER_ANSWERS');
        if (message.role === 'user') {
          expect(Array.isArray(message.content) && message.content.length).toBe(1);
        }
      }
    }
    expect(result.trace.enableQuestions).toBe(false);
    expect(result.trace.phases[0].prompts.every((prompt) => prompt.questions === undefined)).toBe(true);
  });

  it('asks emitted questions, appends answers by id only, and records them in trace and report', async () => {
    const calls: OptimizeCall[] = [];
    const log: AskInvocation[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], {
        1: [
          { id: 'q1', question: 'Q one?' },
          { id: 'q2', question: 'Q two?', why: 'because' },
        ],
      }),
      {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        enableQuestions: true,
        askQuestions: fakeAsker({ q1: 'answer one' }, log),
      },
    );

    expect(log).toHaveLength(1);
    expect(log[0].step).toBe('inventory-intent');
    expect(log[0].stepLabel).toBe('Inventory & Intent');
    expect(log[0].questions).toHaveLength(2);

    // The step-2 user message carries the answers block plus the normal prompt as two text blocks.
    const nextUser = calls[1].messages.at(-1)?.content;
    expect(Array.isArray(nextUser) && nextUser.length).toBe(2);
    const answersBlock = textOf(Array.isArray(nextUser) ? [nextUser[0]] : undefined);
    expect(answersBlock).toContain('USER_ANSWERS');
    expect(answersBlock).toContain('q1: answer one');
    expect(answersBlock).not.toContain('Q one?');
    expect(answersBlock).not.toContain('q2');

    const firstStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'inventory-intent');
    expect(firstStep?.questions).toHaveLength(2);
    const answered = firstStep?.questions?.find((record) => record.id === 'q1');
    const skipped = firstStep?.questions?.find((record) => record.id === 'q2');
    expect(answered).toMatchObject({ question: 'Q one?', answer: 'answer one', skipped: false });
    expect(skipped).toMatchObject({ question: 'Q two?', answer: '', skipped: true });
    expect(result.trace.enableQuestions).toBe(true);

    const report = await readFile(result.files!.reportPath, 'utf-8');
    expect(report).toContain('## Questions & Answers');
    expect(report).toContain('answer one');
    expect(report).toContain('(skipped)');
  });

  it('never re-asks a question by id or by identical text across steps', async () => {
    const calls: OptimizeCall[] = [];
    const log: AskInvocation[] = [];
    const { outDir, target } = await tempWorkspace();

    await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], {
        // Step 1 also emits a within-batch duplicate id (different text) that must collapse to one.
        1: [
          { id: 'a', question: 'Same question?' },
          { id: 'a', question: 'Different text same id?' },
        ],
        2: [
          { id: 'a', question: 'Same question?' },
          { id: 'b', question: 'Same question?' },
        ],
      }),
      {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        enableQuestions: true,
        askQuestions: fakeAsker({ a: 'answered', b: 'answered-b' }, log),
      },
    );

    expect(log).toHaveLength(1);
    expect(log[0].questions.map((question) => question.id)).toEqual(['a']);
  });

  it('drops malformed question entries without calling the asker', async () => {
    const calls: OptimizeCall[] = [];
    const log: AskInvocation[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], {
        1: [{ question: 'no id' }, { id: '', question: 'empty id' }, { id: 'no-question' }, 'string', 42],
      }),
      {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        enableQuestions: true,
        askQuestions: fakeAsker({}, log),
      },
    );

    expect(log).toHaveLength(0);
    expect(calls).toHaveLength(10);
    expect(result.trace.phases[0].prompts.every((prompt) => prompt.questions === undefined)).toBe(true);
  });

  it('leaves the conversation shape unchanged when every question is skipped', async () => {
    const calls: OptimizeCall[] = [];
    const log: AskInvocation[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], { 1: [{ id: 'q1', question: 'Q?' }] }),
      {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        enableQuestions: true,
        askQuestions: fakeAsker({}, log),
      },
    );

    for (const call of calls) {
      for (const message of call.messages) {
        expect(textOf(message.content)).not.toContain('USER_ANSWERS');
        if (message.role === 'user') expect(Array.isArray(message.content) && message.content.length).toBe(1);
      }
    }
    const firstStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'inventory-intent');
    expect(firstStep?.questions?.[0]).toMatchObject({ id: 'q1', skipped: true });
  });

  it('flushes answers from the last content step into finalize and ignores questions in FINAL_FILES_JSON', async () => {
    const calls: OptimizeCall[] = [];
    const log: AskInvocation[] = [];
    const { outDir, target } = await tempWorkspace();

    await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], {
        1: [{ id: 'q1', question: 'Q?' }],
        2: [{ id: 'fq', question: 'Finalize Q?' }],
      }),
      {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        stepLimit: 1,
        enableQuestions: true,
        askQuestions: fakeAsker({ q1: 'yes' }, log),
      },
    );

    expect(calls).toHaveLength(expectedCalls(1));
    expect(log).toHaveLength(1);
    expect(log[0].step).toBe('inventory-intent');

    // FINALIZE-DRAFT (call 2) carries the flushed answers; the final value-lost call (call 3) does not.
    const finalizeUser = calls[1].messages.at(-1)?.content;
    expect(Array.isArray(finalizeUser) && finalizeUser.length).toBe(2);
    expect(textOf(Array.isArray(finalizeUser) ? [finalizeUser[0]] : undefined)).toContain('q1: yes');
    expect(Array.isArray(calls[2].messages.at(-1)?.content) && (calls[2].messages.at(-1)?.content as unknown[]).length).toBe(1);
  });

  it('records questions as skipped when the flag is on but no asker is provided', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], { 1: [{ id: 'q1', question: 'Q?' }] }),
      { targetPaths: [target], outDir, model: 'claude-test', maxOutputTokens: 2048, enableQuestions: true },
    );

    expect(calls).toHaveLength(10);
    for (const call of calls) {
      for (const message of call.messages) expect(textOf(message.content)).not.toContain('USER_ANSWERS');
    }
    const firstStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'inventory-intent');
    expect(firstStep?.questions?.[0]).toMatchObject({ id: 'q1', skipped: true });
  });

  it('lets the mid value-lost review ask, flushing answers into the next step', async () => {
    const calls: OptimizeCall[] = [];
    const log: AskInvocation[] = [];
    const { outDir, target } = await tempWorkspace();

    await runPromptOptimization(
      fakeClient(calls, ['SKILL.md'], { 4: [{ id: 'm1', question: 'Mid Q?' }] }),
      {
        targetPaths: [target],
        outDir,
        model: 'claude-test',
        maxOutputTokens: 2048,
        stepLimit: 4,
        enableQuestions: true,
        askQuestions: fakeAsker({ m1: 'mid answer' }, log),
      },
    );

    const midInvocation = log.find((invocation) => invocation.step === 'value-lost-mid');
    expect(midInvocation?.stepLabel).toBe('Mid-run value-lost review');
    // calls[3] is the mid value-lost call; calls[4] is the next content step carrying the answers.
    const nextUser = calls[4].messages.at(-1)?.content;
    expect(Array.isArray(nextUser) && nextUser.length).toBe(2);
    expect(textOf(Array.isArray(nextUser) ? [nextUser[0]] : undefined)).toContain('m1: mid answer');
  });

  it('CLI dry-run reports interactive questions enabled/disabled', async () => {
    const { outDir, target } = await tempWorkspace();
    const argsFor = (extra: string[]): string[] => [
      '--import', 'tsx/esm', 'src/cli.ts', 'optimize',
      '--target', target, '--out', outDir, '--model', 'claude-test', '--dry-run', ...extra,
    ];

    const enabled = await execFileAsync(process.execPath, argsFor(['--enable-questions']));
    expect(enabled.stdout).toContain('Interactive questions: enabled');
    const disabled = await execFileAsync(process.execPath, argsFor([]));
    expect(disabled.stdout).toContain('Interactive questions: disabled');
  });

  it('CLI errors when --enable-questions is used without a TTY and not dry-run', async () => {
    const { outDir, target } = await tempWorkspace();

    let error: { code?: number; stderr?: string } | undefined;
    try {
      await execFileAsync(process.execPath, [
        '--import', 'tsx/esm', 'src/cli.ts', 'optimize',
        '--target', target, '--out', outDir, '--model', 'claude-test', '--enable-questions',
      ]);
    } catch (err) {
      error = err as { code?: number; stderr?: string };
    }
    expect(error).toBeDefined();
    expect(error?.code).toBe(1);
    expect(String(error?.stderr)).toMatch(/interactive terminal/);
  });
});

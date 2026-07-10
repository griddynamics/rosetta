import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  COMMON_CONTEXT,
  OPTIMIZE_PHASES,
  OPTIMIZE_STEPS,
  STEP_REFERENCE_SECTIONS,
  type OptimizeContent,
  type OptimizeClient,
  runPromptOptimization,
} from '../src/optimize.js';

const execFileAsync = promisify(execFile);

interface OptimizeCall {
  system?: OptimizeContent;
  messages: Array<{ role: 'user' | 'assistant'; content: OptimizeContent }>;
}

function textOf(content: OptimizeContent | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content.map((block) => block.text).join('\n');
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

function fakeClient(calls: OptimizeCall[], paths = ['SKILL.md']): OptimizeClient {
  return {
    messages: {
      async create(params) {
        calls.push({
          system: params.system,
          messages: params.messages.map((message) => ({ ...message })),
        });
        const prompt = textOf(params.messages.at(-1)?.content);
        const isFinalizing = prompt.includes('Return corrected complete target files only') ||
          prompt.includes('Final global preservation audit/fix');
        const text = isFinalizing
          ? responseFor(paths, calls.length)
          : JSON.stringify({
              changes: paths.map((filePath) => ({
                path: filePath,
                intent: `proposal ${calls.length}`,
                find: 'original snippet',
                replace: 'replacement snippet',
                preserves: ['concrete anchor'],
              })),
            });
        return {
          content: [{ type: 'text', text }],
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

describe('optimize prompts', () => {
  it('defines 3 logical phases plus final audit', () => {
    expect(OPTIMIZE_PHASES.map((phase) => phase.id)).toEqual([
      'architecture-intent',
      'execution-review',
      'compression-patterns',
    ]);
    expect(OPTIMIZE_STEPS).toEqual([
      'inventory-ledger',
      'requirements-intent',
      'actor-boundaries',
      'responsibility-slicing',
      'contracts',
      'hierarchy-priority',
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
    ]);
  });

  it('keeps exact hardening, patterns, and AI issue text split by step', () => {
    expect(STEP_REFERENCE_SECTIONS['actor-boundaries'].hardening).toContain('Maintains Workflow/Phase/Subagent/Skill/Rule boundaries');
    expect(STEP_REFERENCE_SECTIONS['subagent-orchestration'].patterns).toContain('<subagents-orchestration>');
    expect(STEP_REFERENCE_SECTIONS['review-validate'].patterns).toContain('Review IS statically reviewing some result for some intent');
    expect(STEP_REFERENCE_SECTIONS.compactness.hardening).toContain('Rephrase, restructure, compress for much more compact prompt without loosing value');
    expect(STEP_REFERENCE_SECTIONS.compactness.aiIssues).toContain('Keep the concrete anchor');
    expect(STEP_REFERENCE_SECTIONS['failure-mode-hardening'].aiIssues).toContain('F1');
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

  it('runs phase conversations with step follow-ups and one phase loss reviewer/fixer', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
    });

    const expectedCalls = OPTIMIZE_PHASES.reduce((sum, phase) => sum + phase.steps.length + 1, 0) + 1;
    expect(calls).toHaveLength(expectedCalls);
    expect(result.trace.phases).toHaveLength(3);
    expect(result.trace.finalAudit?.prompt).toBeUndefined();

    const firstPhaseCalls = calls.slice(0, OPTIMIZE_PHASES[0].steps.length + 1);
    firstPhaseCalls.forEach((call, index) => {
      expect(call.messages).toHaveLength(index * 2 + 2);
    });
    const phaseSetup = calls[0].messages[0].content;
    const firstStep = calls[0].messages.at(-1)?.content;
    expect(isCacheable(calls[0].system)).toBe(true);
    expect(isCacheable(phaseSetup)).toBe(true);
    expect(textOf(phaseSetup)).toContain('CURRENT_TARGET_FILES');
    expect(textOf(firstStep)).toContain('Step: inventory-ledger');
    expect(textOf(firstStep)).toContain('Do this:');
    expect(textOf(firstStep)).toContain('Requirements could be reverse engineered');
    expect(textOf(firstStep)).not.toContain('Use cached RUN SETUP');
    expect(textOf(firstStep)).not.toContain('Exact hardening reference text');
    expect(textOf(firstStep)).toContain('Return STEP_CHANGES_JSON only.');
    expect(textOf(firstStep)).not.toContain('Skill prompt with mental hook');
    expect(textOf(firstStep)).not.toContain('Step: requirements-intent');
    expect(calls[1].messages[2].content).toContain('"changes"');
    const finalizer = firstPhaseCalls.at(-1)?.messages.at(-1)?.content;
    expect(textOf(finalizer)).toContain('Phase loss reviewer/fixer');
    expect(textOf(finalizer)).toContain('Use the phase-start CURRENT_TARGET_FILES already provided');
    expect(textOf(finalizer)).not.toContain('Use cached CURRENT_TARGET_FILES');
    expect(textOf(finalizer)).not.toContain('Skill prompt with mental hook');
    expect(textOf(finalizer)).not.toContain('Original target files:');
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

    const firstStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'inventory-ledger');
    expect(firstStep?.promptStats.words).toBeGreaterThan(0);
    expect(firstStep?.callStats?.request.messages.count).toBe(2);
    expect(firstStep?.callStats?.request.appendedMessages.count).toBe(2);
    expect(firstStep?.callStats?.request.appendedMessages.cacheableBlocks).toBe(1);
    expect(firstStep?.callStats?.response.usage.inputTokens).toBeGreaterThan(0);
    expect(firstStep?.callStats?.response.usage.outputTokens).toBeGreaterThan(0);
    expect(firstStep?.callStats?.response.usage.cacheCreationInputTokens).toBe(50);
    expect(firstStep?.callStats?.response.usage.reasoningTokens).toBe(6);
    expect(firstStep?.callStats?.response.usage.standardCostUsd).toBeGreaterThan(0);

    const secondStep = result.trace.phases[0].prompts.find((prompt) => prompt.step === 'requirements-intent');
    expect(secondStep?.callStats?.request.messages.count).toBe(4);
    expect(secondStep?.callStats?.request.appendedMessages.count).toBe(2);
    expect(secondStep?.callStats?.request.appendedMessages.cacheableBlocks).toBe(0);
    expect(secondStep?.callStats?.response.usage.cacheReadInputTokens).toBe(40);

    expect(result.trace.finalAudit?.callStats.request.appendedMessages.count).toBe(1);
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
      phaseLimit: 1,
      traceRaw: true,
    });

    expect(result.trace.anthropicBetas).toEqual(['thinking-token-count-2026-05-13']);
    expect(result.files?.rawTracePath).toBe(path.join(outDir, 'raw-calls.jsonl'));
    expect(calls[0]).toMatchObject({ system: expect.anything() });
    const rawLines = (await readFile(result.files!.rawTracePath!, 'utf-8')).trim().split('\n');
    expect(rawLines).toHaveLength(OPTIMIZE_PHASES[0].steps.length + 2);
    const firstRaw = JSON.parse(rawLines[0]);
    expect(firstRaw.request.betas).toEqual(['thinking-token-count-2026-05-13']);
    expect(firstRaw.response.usage.output_tokens_details.thinking_tokens).toBeGreaterThan(0);
    expect(firstRaw.callStats.response.usage.reasoningTokens).toBeGreaterThan(0);
  });

  it('can run only the first phase and still perform final audit', async () => {
    const calls: OptimizeCall[] = [];
    const { outDir, target } = await tempWorkspace();

    const result = await runPromptOptimization(fakeClient(calls), {
      targetPaths: [target],
      outDir,
      model: 'claude-test',
      maxOutputTokens: 2048,
      phaseLimit: 1,
    });

    expect(result.trace.phaseLimit).toBe(1);
    expect(result.trace.totalAvailablePhases).toBe(3);
    expect(result.trace.phases.map((phase) => phase.phase)).toEqual(['architecture-intent']);
    expect(result.trace.finalAudit).toBeDefined();
    expect(calls).toHaveLength(OPTIMIZE_PHASES[0].steps.length + 2);
    expect(calls.map((call) => textOf(call.messages.at(-1)?.content)).join('\n')).not.toContain('Execution + Review Mechanics');
    expect(calls.map((call) => textOf(call.messages.at(-1)?.content)).join('\n')).not.toContain('Compression + Pattern Integration');
    expect(await readFile(path.join(outDir, 'SKILL.md'), 'utf-8')).toContain('optimized SKILL.md');
    expect(await readFile(path.join(outDir, 'trace.json'), 'utf-8')).toContain('"phaseLimit": 1');
    expect(await readFile(path.join(outDir, 'report.md'), 'utf-8')).toContain('Phases run: 1/3 + final audit');
  });

  it('rejects invalid phase limits before model calls', async () => {
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
        phaseLimit: 4,
      }),
    ).rejects.toThrow(/--phase-limit/);
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
    expect(textOf(calls[0].messages[0].content)).not.toContain('Preserve domain terminology exactly.');
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

    expect(stdout).toContain('Optimize plan OK: 3/3 phase(s) + final audit.');
    expect(stdout).toContain(path.resolve(target));
    expect(stdout).toContain(path.resolve(target2));
    expect(stdout).toContain(path.resolve(supporting));
    expect(stdout).toContain('Prefer terse wording; keep examples concrete.');
    expect(stdout).toContain('Phase limit: 3');
    expect(stdout).toContain('Architecture + Intent');
    expect(stdout).toContain('Execution + Review Mechanics');
    expect(stdout).toContain('Final global preservation audit/fix');
  });

  it('CLI dry-run can limit execution to the first phase plus final audit', async () => {
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
      '--phase-limit',
      '1',
      '--dry-run',
    ]);

    expect(stdout).toContain('Optimize plan OK: 1/3 phase(s) + final audit.');
    expect(stdout).toContain('Phase limit: 1');
    expect(stdout).toContain('Architecture + Intent');
    expect(stdout).not.toContain('Execution + Review Mechanics');
    expect(stdout).toContain('Final global preservation audit/fix');
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
    expect(report).toContain('Appended messages');
    expect(report).toContain('Cache read tok');
    expect(report).toContain('Reasoning tok');
  });
});

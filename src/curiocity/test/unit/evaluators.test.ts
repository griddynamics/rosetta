import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { describe, it, expect, vi } from 'vitest';
import { fileExists } from '../../src/evaluators/file-exists';
import { command } from '../../src/evaluators/command';
import { trajectoryCheck, resolveToolPattern } from '../../src/evaluators/trajectory-check';
import {
  assembleJudgePrompt,
  capTextHeadTail,
  distillTrajectory,
  judgeLogger,
  llmJudge,
  MAX_FILE_CHARS,
} from '../../src/evaluators/llm-judge';
import type { EvalContext } from '../../src/evaluators/types';
import { FakeModelRouter } from '../../src/shared/model-router';
import { ConfigError } from '../../src/shared/errors';
import type { TrajectoryEvent } from '../../src/shared/trajectory';

function workspaceWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'curio-eval-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

function ctx(over: Partial<EvalContext>): EvalContext {
  return {
    workspace: over.workspace ?? mkdtempSync(join(tmpdir(), 'curio-eval-')),
    workspaceDiff: over.workspaceDiff ?? '',
    events: over.events ?? [],
    qnaLog: over.qnaLog ?? [],
    caseFiles: over.caseFiles ?? { promptMd: 'do it' },
    agentId: over.agentId ?? 'mock',
    models: over.models ?? new FakeModelRouter({ entries: [] }),
    exec: over.exec ?? execa,
    ...(over.log !== undefined ? { log: over.log } : {}),
  };
}

describe('file-exists (§11)', () => {
  it('passes when must globs match and mustNot globs do not', async () => {
    const ws = workspaceWith({ 'plans/x-SPECS.md': '#', 'src/a.ts': '' });
    const res = await fileExists.evaluate(ctx({ workspace: ws }), { must: ['plans/*-SPECS.md'] });
    expect(res.pass).toBe(true);
  });

  it('fails on a missing required glob and on a forbidden present glob (must-not alias)', async () => {
    const ws = workspaceWith({ 'secret.env': 'x' });
    const missing = await fileExists.evaluate(ctx({ workspace: ws }), { must: ['out.txt'] });
    expect(missing.pass).toBe(false);
    const forbidden = await fileExists.evaluate(ctx({ workspace: ws }), { 'must-not': ['*.env'] });
    expect(forbidden.pass).toBe(false);
  });
});

describe('command (§11)', () => {
  it('passes when the command exits with the expected code', async () => {
    const res = await command.evaluate(ctx({}), { run: 'exit 0' });
    expect(res.pass).toBe(true);
  });
  it('fails on an unexpected exit code', async () => {
    const res = await command.evaluate(ctx({}), { run: 'exit 3' });
    expect(res.pass).toBe(false);
  });
  it('honours a non-zero expectExitCode', async () => {
    const res = await command.evaluate(ctx({}), { run: 'exit 2', expectExitCode: 2 });
    expect(res.pass).toBe(true);
  });
  it('on failure, details includes a tail of the command output for diagnosis', async () => {
    const res = await command.evaluate(ctx({}), { run: 'echo DIAG_MARKER_STDOUT; echo DIAG_MARKER_STDERR 1>&2; exit 3' });
    expect(res.pass).toBe(false);
    expect(res.details).toContain('DIAG_MARKER_STDOUT');
    expect(res.details).toContain('DIAG_MARKER_STDERR');
    expect(res.details).toContain('--- output (last 1500 chars) ---');
  });
  it('on pass, details does not append any output tail', async () => {
    const res = await command.evaluate(ctx({}), { run: 'echo hello world' });
    expect(res.pass).toBe(true);
    expect(res.details).toBe('`echo hello world` exited 0 (expected 0)');
    expect(res.details).not.toContain('--- output');
  });
});

describe('trajectory-check (§11)', () => {
  const events: TrajectoryEvent[] = [
    { ts: 1, kind: 'tool_call', name: 'Skill', payload: {} },
    { ts: 2, kind: 'tool_call', name: 'Bash', payload: {} },
  ];

  it('matches a single regex', async () => {
    const res = await trajectoryCheck.evaluate(ctx({ events }), { toolPattern: 'Skill|mcp__rosetta__.*' });
    expect(res.pass).toBe(true);
  });

  it('resolves a per-agent map by the trial agentId', () => {
    const map = { 'claude-code': 'Skill|mcp__rosetta__.*', codex: 'mcp__rosetta__.*' };
    expect(resolveToolPattern(map, 'claude-code')).toBe('Skill|mcp__rosetta__.*');
    expect(resolveToolPattern(map, 'codex')).toBe('mcp__rosetta__.*');
    expect(() => resolveToolPattern(map, 'mock')).toThrow(ConfigError);
  });

  it('evaluate uses the per-agent pattern for the trial agent', async () => {
    const map = { 'claude-code': 'Skill', codex: 'mcp__rosetta__.*' };
    const hit = await trajectoryCheck.evaluate(ctx({ events, agentId: 'claude-code' }), { toolPattern: map });
    expect(hit.pass).toBe(true);
    const miss = await trajectoryCheck.evaluate(ctx({ events, agentId: 'codex' }), { toolPattern: map });
    expect(miss.pass).toBe(false); // codex pattern wants mcp__rosetta__.*, none present
  });
});

describe('llm-judge assembled prompt (§11 fixed contract [1]-[4])', () => {
  it('includes rubric, distilled trajectory, artifacts (diff + capped files), QnA', () => {
    const big = 'x'.repeat(MAX_FILE_CHARS + 500);
    const ws = workspaceWith({ 'plans/out.md': big, 'ignore.txt': 'nope' });
    const events: TrajectoryEvent[] = [
      { ts: 1, kind: 'assistant', payload: { text: 'I will write the plan.' } },
      { ts: 2, kind: 'tool_call', name: 'Write', payload: { text: 'plans/out.md' } },
    ];
    const c = ctx({
      workspace: ws,
      workspaceDiff: '+++ plans/out.md',
      events,
      qnaLog: [{ type: 'free-text', question: 'Which db?', answer: 'sqlite', ts: 1 }],
      caseFiles: { evaluationMd: 'RUBRIC: the plan must exist', promptMd: 'make a plan' },
    });
    const prompt = assembleJudgePrompt(c, ['plans/**/*.md']);

    // [1] rubric verbatim
    expect(prompt).toContain('RUBRIC: the plan must exist');
    // [2] distilled trajectory
    expect(prompt).toContain('assistant: I will write the plan.');
    expect(prompt).toContain('tool_call Write');
    // [3] artifacts: diff + only the matching file, size-capped with a marker
    expect(prompt).toContain('## Workspace diff');
    expect(prompt).toContain('## Artifact file: plans/out.md');
    expect(prompt).toContain('[truncated: plans/out.md showed');
    expect(prompt).not.toContain('nope'); // ignore.txt did not match the artifacts glob
    // [4] QnA log
    expect(prompt).toContain('Q: Which db?');
    expect(prompt).toContain('A: sqlite');
  });

  it('distillTrajectory trims tool results and keeps prose', () => {
    const text = distillTrajectory([
      { ts: 1, kind: 'tool_result', name: 'Bash', payload: { text: 'y'.repeat(2000) } },
      { ts: 2, kind: 'assistant', payload: { text: 'done' } },
    ]);
    expect(text).toContain('assistant: done');
    expect(text).toContain('[truncated: tool_result showed');
  });

  it('capTextHeadTail keeps BOTH ends of a long text with a middle elision marker', () => {
    const text = `HEAD${'x'.repeat(50000)}TAIL`;
    const capped = capTextHeadTail(text, 1000, 'trajectory');
    expect(capped.startsWith('HEAD')).toBe(true);
    expect(capped.endsWith('TAIL')).toBe(true);
    expect(capped).toContain('[truncated: trajectory — omitted');
    expect(capped.length).toBeLessThan(text.length);
  });

  it('distillTrajectory preserves the DELIVERY tail of a long run (head+tail cap, not head-only)', () => {
    const events: TrajectoryEvent[] = [
      { ts: 0, kind: 'assistant', payload: { text: 'DISCOVERY_START exploring the codebase' } },
      ...Array.from({ length: 500 }, (_, i) => ({
        ts: i + 1,
        kind: 'assistant' as const,
        payload: { text: `work step ${'z'.repeat(60)}` },
      })),
      { ts: 999, kind: 'assistant', payload: { text: 'DELIVERY_DONE validated /api/health live 200' } },
    ];
    const text = distillTrajectory(events);
    expect(text).toContain('DISCOVERY_START'); // head survives
    expect(text).toContain('DELIVERY_DONE'); // tail survives — head-only truncation would drop it
    expect(text).toContain('[truncated: trajectory');
  });

  it('scores via the judge role (generateObject) and returns the verdict fields', async () => {
    const router = new FakeModelRouter({
      entries: [
        {
          role: 'judge',
          kind: 'object',
          object: { score: 82, pass: true, rationale: 'meets rubric', confidenceLevel: 90 },
        },
      ],
    });
    const res = await llmJudge.evaluate(ctx({ models: router }), { artifacts: [] });
    expect(res).toMatchObject({ pass: true, score: 82, details: 'meets rubric', confidenceLevel: 90 });
    expect(router.calls[0]!.role).toBe('judge');
  });

  it('propagates a MEASURED perplexityLevel when the router supplies logprobs', async () => {
    // logprobs = [-ln2, -ln2] → mean = -ln2 → PPL = 2 → 100×(1 − 1/2) = 50.
    const router = new FakeModelRouter({
      entries: [
        {
          role: 'judge',
          kind: 'object',
          object: { score: 70, pass: true, rationale: 'ok', confidenceLevel: 60 },
          logprobs: [-Math.log(2), -Math.log(2)],
          model: 'openai/gpt-x',
        },
      ],
    });
    const res = await llmJudge.evaluate(ctx({ models: router }), { artifacts: [] });
    expect(res.confidenceLevel).toBe(60);
    expect(res.perplexityLevel).toBe(50);
  });

  it('omits perplexityLevel and warns once per model when the provider exposes no logprobs', async () => {
    const spy = vi.spyOn(judgeLogger, 'warn').mockImplementation(() => undefined as never);
    try {
      const router = new FakeModelRouter({
        entries: [
          {
            role: 'judge',
            kind: 'object',
            object: { score: 70, pass: true, rationale: 'ok', confidenceLevel: 60 },
            model: 'anthropic/claude-x',
          },
          {
            role: 'judge',
            kind: 'object',
            object: { score: 71, pass: true, rationale: 'ok2', confidenceLevel: 61 },
            model: 'anthropic/claude-x',
          },
        ],
      });
      const log = vi.fn();
      const a = await llmJudge.evaluate(ctx({ models: router, log }), { artifacts: [] });
      const b = await llmJudge.evaluate(ctx({ models: router, log }), { artifacts: [] });
      expect(a.perplexityLevel).toBeUndefined();
      expect(b.perplexityLevel).toBeUndefined();
      // Warned exactly once for the (same) model across the two calls.
      const relevant = spy.mock.calls.filter((c) => JSON.stringify(c).includes('anthropic/claude-x'));
      expect(relevant).toHaveLength(1);
      // The warning also goes through the trial's IPC log sink (so it reaches the parent's
      // run logs from a forked child) flagged `once: true` for run-level dedup.
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0]?.[0]).toContain('anthropic/claude-x');
      expect(log.mock.calls[0]?.[1]).toMatchObject({ model: 'anthropic/claude-x', once: true });
    } finally {
      spy.mockRestore();
    }
  });
});

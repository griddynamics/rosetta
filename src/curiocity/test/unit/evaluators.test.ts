import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { describe, it, expect } from 'vitest';
import { fileExists } from '../../src/evaluators/file-exists';
import { command } from '../../src/evaluators/command';
import { trajectoryCheck, resolveToolPattern } from '../../src/evaluators/trajectory-check';
import {
  assembleJudgePrompt,
  distillTrajectory,
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

  it('scores via the judge role (generateObject) and returns the verdict fields', async () => {
    const router = new FakeModelRouter({
      entries: [{ role: 'judge', kind: 'object', object: { score: 82, pass: true, rationale: 'meets rubric' } }],
    });
    const res = await llmJudge.evaluate(ctx({ models: router }), { artifacts: [] });
    expect(res).toMatchObject({ pass: true, score: 82, details: 'meets rubric' });
    expect(router.calls[0]!.role).toBe('judge');
  });
});

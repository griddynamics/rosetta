import { performance } from 'node:perf_hooks';
import { describe, expect, test } from 'vitest';
import { DANGEROUS_BASH } from '../src/hooks/dangerous-actions/patterns';
import { evaluateDangerous } from '../src/hooks/dangerous-actions/evaluate';
import type { HookContext } from '../src/runtime/types';

const branchDelete = DANGEROUS_BASH.find((pattern) => pattern.id === 'git-branch-delete')!.re;

const bashCtx = (command: string): HookContext => ({
  ide: 'claude-code',
  event: 'PreToolUse',
  toolKind: 'bash',
  toolName: 'Bash',
  filePath: '',
  cwd: '/proj',
  sessionId: null,
  toolInput: { command },
});

const forceDeleteVariants = [
  'git branch -D throwaway-test',
  'git branch -d -f throwaway-test',
  'git branch -f -d throwaway-test',
  'git branch -fd throwaway-test',
  'git branch -df throwaway-test',
  'git branch --delete --force throwaway-test',
  'git branch --force --delete throwaway-test',
  'git branch -d --force throwaway-test',
  'git branch --delete -f throwaway-test',
  'git branch throwaway-test -d -f',
  'git branch throwaway-test -f -d',
  'git branch throwaway-test -D',
  'git branch throwaway-test -df',
  'git branch throwaway-test --delete --force',
  'git branch -d throwaway-test -f',
  'git branch --delete throwaway-test --force',
  'git branch -qD throwaway-test',
  'git branch -Dq throwaway-test',
  'git branch -dfq throwaway-test',
  'git branch -qfd throwaway-test',
  'git\tbranch\t-d\t-f\tthrowaway-test',
  'sudo git branch -D throwaway-test',
] as const;

const commandSeparators = [';', '&&', '|', '\n', '\r\n'] as const;

const crossLineForceDeleteVariants = [
  ['LF', 'git\nbranch -D x'],
  ['CRLF', 'git\r\nbranch -D x'],
  ['CR', 'git\rbranch -D x'],
  ['surrounding spaces and LF', 'git \n branch -d -f x'],
] as const;

describe('git-branch-delete dangerous-action guard', () => {
  for (const command of forceDeleteVariants) {
    test(`${command} matches the guard`, () => {
      expect(branchDelete.test(command)).toBe(true);
    });

    test(`${command} is reconsidered without the review marker`, () => {
      const result = evaluateDangerous(bashCtx(command));
      expect(result?.kind).toBe('deny');
      expect((result as { kind: 'deny'; reason: string }).reason).toContain('git-branch-delete');
    });

    test(`${command} is allowed with the review marker`, () => {
      expect(
        evaluateDangerous(bashCtx(`${command}  # Rosetta-AI-reviewed`)),
      ).toBeNull();
    });
  }

  test.each([
    'git branch',
    'git branch new-feature',
    'git branch -d throwaway-test',
    'git branch --delete throwaway-test',
    'git branch -f throwaway-test',
    'git branch --force throwaway-test',
    'git branch --list',
    'git branch --show-current',
    'git status --short',
    'git switch throwaway-test',
    'echo safe',
  ])('%s stays outside the force-delete guard', (command) => {
    expect(branchDelete.test(command)).toBe(false);
    expect(evaluateDangerous(bashCtx(command))).toBeNull();
  });

  test('widely separated delete and force flags still match', () => {
    const command = `git branch -d throwaway-test ${'branch-operand '.repeat(5_000)}-f`;
    expect(branchDelete.test(command)).toBe(true);
    expect(evaluateDangerous(bashCtx(command))?.kind).toBe('deny');
  });

  // Each command puts CR/LF between `git` and `branch`, which the line-local
  // alternative excludes, so these cases pin the dedicated cross-line path.
  for (const [lineBreak, command] of crossLineForceDeleteVariants) {
    test(`${lineBreak} between git and branch preserves force-delete detection`, () => {
      expect(branchDelete.test(command)).toBe(true);
      const result = evaluateDangerous(bashCtx(command));
      expect(result?.kind).toBe('deny');
      expect((result as { kind: 'deny'; reason: string }).reason).toContain(
        '[git-branch-delete]',
      );
    });
  }

  test('a later dangerous git branch candidate in the same segment is reconsidered', () => {
    const command = 'git branch -a git branch -D x';
    expect(branchDelete.test(command)).toBe(true);
    const result = evaluateDangerous(bashCtx(command));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain(
      '[git-branch-delete]',
    );
  });

  for (const separator of commandSeparators) {
    test(`a dangerous command before ${JSON.stringify(separator)} is reconsidered`, () => {
      expect(
        evaluateDangerous(bashCtx(`git branch -D throwaway-test${separator}echo safe`))?.kind,
      ).toBe('deny');
    });

    test(`a dangerous command after ${JSON.stringify(separator)} is reconsidered`, () => {
      expect(
        evaluateDangerous(bashCtx(`echo safe${separator}git branch -D throwaway-test`))?.kind,
      ).toBe('deny');
    });

    test(`delete and force flags cannot combine across ${JSON.stringify(separator)}`, () => {
      const command = `git branch -d first${separator}git branch -f second`;
      expect(branchDelete.test(command)).toBe(false);
      expect(evaluateDangerous(bashCtx(command))).toBeNull();
    });

    test(`a later command after ${JSON.stringify(separator)} cannot supply a force flag`, () => {
      const command = `git branch -d throwaway-test${separator}echo --force`;
      expect(branchDelete.test(command)).toBe(false);
      expect(evaluateDangerous(bashCtx(command))).toBeNull();
    });

    test(`a later command after ${JSON.stringify(separator)} cannot supply a delete flag`, () => {
      const command = `git branch -f throwaway-test${separator}echo --delete`;
      expect(branchDelete.test(command)).toBe(false);
      expect(evaluateDangerous(bashCtx(command))).toBeNull();
    });
  }

  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx('git branch --list'));
    }

    const command = 'git branch -a '.repeat(8_000);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(250);
  });
});

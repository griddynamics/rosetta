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
    'git branch -d throwaway-test',
    'git branch --delete throwaway-test',
    'git branch -f throwaway-test',
    'git branch --force throwaway-test',
    'git branch --list',
    'git branch --show-current',
  ])('%s stays outside the force-delete guard', (command) => {
    expect(branchDelete.test(command)).toBe(false);
  });

  test('a later shell command cannot supply the missing force flag', () => {
    expect(branchDelete.test('git branch -d throwaway-test && echo --force')).toBe(false);
  });

  test('a later shell command cannot supply the missing delete flag', () => {
    expect(branchDelete.test('git branch -f throwaway-test; echo --delete')).toBe(false);
  });
});

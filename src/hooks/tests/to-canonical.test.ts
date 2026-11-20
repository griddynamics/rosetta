import { describe, expect, test } from 'vitest';
import { toCanonical } from '../src/runtime/run-hook';
import { formatOutput } from '../src/adapter';
import { advise } from '../src/runtime/result-helpers';
import type { HookContext, HookResult } from '../src/runtime/types';

const ctx = { event: 'PreToolUse' } as unknown as HookContext;
const adviseResult = advise('heads-up') as NonNullable<HookResult>;

describe('toCanonical — advise must not decide permission', () => {
  test('advise carries additionalContext and no permissionDecision', () => {
    expect(toCanonical(adviseResult, ctx)).toStrictEqual({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'heads-up' },
    });
  });

  test.each(['claude-code', 'copilot', 'cursor', 'codex'])('%s output never auto-approves an advise', (ide) => {
    const json = JSON.stringify(formatOutput(toCanonical(adviseResult, ctx), ide));
    expect(json).not.toMatch(/"permission(Decision)?":"allow"/);
  });
});

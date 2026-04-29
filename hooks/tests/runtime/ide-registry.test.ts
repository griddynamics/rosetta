import { test, describe, expect } from 'vitest';
import { EVENTS, reverseLookupEvent } from '../../src/runtime/ide-registry';

const IDES = ['claude-code', 'codex', 'cursor', 'windsurf', 'copilot'] as const;

describe('EVENTS — completeness', () => {
  test('PostToolUse exists for all IDEs (value or explicit null)', () => {
    IDES.forEach(ide => expect(EVENTS.PostToolUse).toHaveProperty(ide));
  });
  test('no column is accidentally undefined (only null allowed)', () => {
    for (const [event, map] of Object.entries(EVENTS)) {
      IDES.forEach(ide =>
        expect(map[ide], `EVENTS.${event}['${ide}'] must not be undefined`).not.toBeUndefined()
      );
    }
  });
});

describe('reverseLookupEvent', () => {
  test('PostToolUse — claude-code canonical name', () =>
    expect(reverseLookupEvent('claude-code', 'PostToolUse')).toBe('PostToolUse'));
  test('postToolUse — cursor normalized to PostToolUse', () =>
    expect(reverseLookupEvent('cursor', 'postToolUse')).toBe('PostToolUse'));
  test('unknown raw value returns null', () =>
    expect(reverseLookupEvent('claude-code', 'SomeRandomEvent')).toBeNull());
});

import { test, describe, expect } from 'vitest';
import { EVENTS, reverseLookupEvent, TOOL_KINDS, reverseLookupToolKind } from '../../src/runtime/ide-registry';

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

describe('TOOL_KINDS — completeness', () => {
  test('every kind has every IDE mapped or explicit null', () => {
    for (const [kind, map] of Object.entries(TOOL_KINDS)) {
      IDES.forEach(ide =>
        expect(map[ide], `TOOL_KINDS.${kind}['${ide}'] must not be undefined`).not.toBeUndefined()
      );
    }
  });
});

describe('reverseLookupToolKind', () => {
  test('claude-code Write → write', () =>
    expect(reverseLookupToolKind('claude-code', 'Write')).toBe('write'));
  test('copilot create_file → write', () =>
    expect(reverseLookupToolKind('copilot', 'create_file')).toBe('write'));
  test('copilot replace_string_in_file → edit', () =>
    expect(reverseLookupToolKind('copilot', 'replace_string_in_file')).toBe('edit'));
  test('MultiEdit for codex → null (not supported)', () =>
    expect(reverseLookupToolKind('codex', 'MultiEdit')).toBeNull());
  test('Bash → bash for claude-code', () =>
    expect(reverseLookupToolKind('claude-code', 'Bash')).toBe('bash'));
});

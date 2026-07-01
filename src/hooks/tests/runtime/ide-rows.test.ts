import { test, describe, expect } from 'vitest';
import { lookupEvent as ccEvent, lookupToolKind as ccTool } from '../../src/runtime/ide-rows/claude-code';
import { lookupEvent as cpEvent, lookupToolKind as cpTool } from '../../src/runtime/ide-rows/copilot';
import { lookupEvent as cxEvent, lookupToolKind as cxTool } from '../../src/runtime/ide-rows/cursor';
import { lookupEvent as cdEvent, lookupToolKind as cdTool } from '../../src/runtime/ide-rows/codex';
import { lookupEvent as wsEvent, lookupToolKind as wsTool } from '../../src/runtime/ide-rows/windsurf';

describe('claude-code row', () => {
  test('PostToolUse → "PostToolUse"', () => expect(ccEvent('PostToolUse')).toBe('PostToolUse'));
  test('Stop → "Stop"', () => expect(ccEvent('Stop')).toBe('Stop'));
  test('Write → write kind', () => expect(ccTool('Write')).toBe('write'));
  test('Bash → bash kind', () => expect(ccTool('Bash')).toBe('bash'));
  test('unknown → null', () => expect(ccTool('unknown')).toBeNull());
});

describe('copilot row', () => {
  test('sessionStart raw → "SessionStart" semantic', () => expect(cpEvent('sessionStart')).toBe('SessionStart'));
  test('PostToolUse has no raw copilot name → null', () => expect(cpEvent('PostToolUse')).toBeNull());
  test('Stop (PascalCase) → "Stop" semantic', () => expect(cpEvent('Stop')).toBe('Stop'));
  test('agentStop (CLI camelCase, unregistered) → null', () => expect(cpEvent('agentStop')).toBeNull());
  test('create_file → write kind', () => expect(cpTool('create_file')).toBe('write'));
  test('replace_string_in_file → edit kind', () => expect(cpTool('replace_string_in_file')).toBe('edit'));
  test('view → read kind', () => expect(cpTool('view')).toBe('read'));
});

describe('cursor row', () => {
  test('postToolUse camelCase → PostToolUse', () => expect(cxEvent('postToolUse')).toBe('PostToolUse'));
  test('stop (lowercase) → "Stop" semantic', () => expect(cxEvent('stop')).toBe('Stop'));
  test('Write → write kind', () => expect(cxTool('Write')).toBe('write'));
});

describe('codex row', () => {
  test('PostToolUse → PostToolUse', () => expect(cdEvent('PostToolUse')).toBe('PostToolUse'));
  test('Stop → "Stop"', () => expect(cdEvent('Stop')).toBe('Stop'));
  test('apply_patch → write kind', () => expect(cdTool('apply_patch')).toBe('write'));
  test('Bash → bash kind', () => expect(cdTool('Bash')).toBe('bash'));
});

describe('windsurf row', () => {
  test('PostToolUse → PostToolUse', () => expect(wsEvent('PostToolUse')).toBe('PostToolUse'));
  test('Stop unsupported (no session-level lifecycle events) → null', () => expect(wsEvent('Stop')).toBeNull());
  test('Write → write kind', () => expect(wsTool('Write')).toBe('write'));
});

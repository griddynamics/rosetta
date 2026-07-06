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
  // VS Code's own tool-name vocabulary (routing-bug fix, hooks-verify.md) — previously only
  // reachable via the misrouted claude-code fallback, which didn't know these names either.
  test('run_in_terminal (VS Code) → bash kind', () => expect(cpTool('run_in_terminal')).toBe('bash'));
  test('read_file (VS Code) → read kind', () => expect(cpTool('read_file')).toBe('read'));
  // Regression guard: Copilot CLI's OWN PascalCase fire sends 'Bash' (capitalized) — distinct
  // from VS Code, which never sends this literal name. Before the routing-bug fix this
  // resolved correctly only by ACCIDENT (via the misrouted claude-code fallback, whose table
  // happens to have 'Bash' too); routing traffic through copilot's own table regressed it to
  // null until 'Bash' was added here explicitly.
  test('Bash (Copilot CLI PascalCase fire) → bash kind', () => expect(cpTool('Bash')).toBe('bash'));
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

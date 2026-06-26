// adapter.cursor.test.ts — Tests for Cursor IDE adapter

import { test, describe, expect } from 'vitest';

import fxCursorWrite  from './fixtures/cursor-post-tool-use-write.json';
import fxCursorEdit   from './fixtures/cursor-post-tool-use-edit.json';
import fxCursorBash   from './fixtures/cursor-pre-tool-use-bash.json';
import fxCursorStart  from './fixtures/cursor-session-start.json';
import fxCursorPrompt from './fixtures/cursor-user-prompt-submit.json';
import fxCursorRead   from './fixtures/cursor-before-read-file.json';
import fxCopilot      from './fixtures/copilot-post-tool-use-write.json';
import fxCC           from './fixtures/claude-code-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Cursor', () => {

  test('returns "cursor" for Cursor PostToolUse Write input', () => {
    expect(detectIDE(fxCursorWrite)).toBe('cursor');
  });

  test('returns "cursor" for Cursor PostToolUse Edit input', () => {
    expect(detectIDE(fxCursorEdit)).toBe('cursor');
  });

  test('returns "cursor" for Cursor PreToolUse Bash input', () => {
    expect(detectIDE(fxCursorBash)).toBe('cursor');
  });

  test('returns "cursor" for Cursor SessionStart input', () => {
    expect(detectIDE(fxCursorStart)).toBe('cursor');
  });

  test('returns "cursor" for Cursor userPromptSubmit input', () => {
    expect(detectIDE(fxCursorPrompt)).toBe('cursor');
  });

  test('returns "cursor" for Cursor beforeReadFile input', () => {
    expect(detectIDE(fxCursorRead)).toBe('cursor');
  });

  test('does NOT match claude-code (conversation_id + cursor_version distinguish cursor)', () => {
    expect(detectIDE(fxCursorWrite)).not.toBe('claude-code');
  });

  test('does NOT match copilot', () => {
    expect(detectIDE(fxCursorWrite)).not.toBe('copilot');
  });

  test('CC input without cursor_version does NOT match cursor', () => {
    expect(detectIDE(fxCC)).toBe('claude-code');
    expect(detectIDE(fxCC)).not.toBe('cursor');
  });

  test('Copilot input without cursor_version does NOT match cursor', () => {
    expect(detectIDE(fxCopilot)).not.toBe('cursor');
  });

  test('CC-like input missing cursor_version does NOT match cursor', () => {
    const noCv = { ...fxCursorWrite } as Record<string, unknown>;
    delete noCv.cursor_version;
    expect(detectIDE(noCv)).not.toBe('cursor');
  });

  test('CC-like input missing conversation_id still matches cursor via session_id + cursor_version', () => {
    const noCid = { ...fxCursorWrite } as Record<string, unknown>;
    delete noCid.conversation_id;
    expect(detectIDE(noCid)).toBe('cursor');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Cursor PostToolUse', () => {

  test('normalizes hook_event_name camelCase → PascalCase', () => {
    const result = normalize(fxCursorWrite);
    expect(result.hook_event_name).toBe('PostToolUse');
  });

  test('normalizes preToolUse → PreToolUse', () => {
    const result = normalize(fxCursorBash);
    expect(result.hook_event_name).toBe('PreToolUse');
  });

  test('normalizes sessionStart → SessionStart', () => {
    const result = normalize(fxCursorStart);
    expect(result.hook_event_name).toBe('SessionStart');
  });

  test('normalizes beforeSubmitPrompt → BeforeSubmitPrompt and semantic PrePromptSubmit', () => {
    const result = normalize(fxCursorPrompt);
    expect(result.hook_event_name).toBe('BeforeSubmitPrompt');
    expect(result.event).toBe('PrePromptSubmit');
  });

  test('normalizes beforeReadFile → PreRead', () => {
    const result = normalize(fxCursorRead);
    expect(result.hook_event_name).toBe('PreRead');
    expect(result.event).toBe('PreRead');
    expect(result.toolKind).toBe(null);
  });

  test('maps conversation_id to session_id', () => {
    const result = normalize(fxCursorWrite);
    expect(result.session_id).toBe(fxCursorWrite.conversation_id);
  });

  test('canonical fields all present for PostToolUse', () => {
    const result = normalize(fxCursorWrite);
    expect(result.hook_event_name, 'hook_event_name missing').toBeTruthy();
    expect(result.tool_name, 'tool_name missing').toBeTruthy();
    expect(result.tool_input, 'tool_input missing').toBeTruthy();
    expect(result.session_id, 'session_id missing').toBeTruthy();
    expect(result.cwd, 'cwd missing').toBeTruthy();
  });

  test('preserves cursor-specific extras (cursor_version, generation_id, duration)', () => {
    const result = normalize(fxCursorWrite);
    expect(result.cursor_version).toBe(fxCursorWrite.cursor_version);
    expect(result.conversation_id).toBe(fxCursorWrite.conversation_id);
    expect(result.generation_id).toBe(fxCursorWrite.generation_id);
    expect(result.duration).toBe(fxCursorWrite.duration);
  });

  test('preserves tool_input with file_path', () => {
    const result = normalize(fxCursorWrite);
    expect(result.tool_input.file_path, 'tool_input.file_path missing').toBeTruthy();
  });

  test('PreToolUse Bash — tool_input has command', () => {
    const result = normalize(fxCursorBash);
    expect(result.tool_input.command).toBeTruthy();
  });

  test('SessionStart — tool_name is null/undefined (no tool)', () => {
    const result = normalize(fxCursorStart);
    expect(result.tool_name == null).toBe(true);
  });

  test('beforeReadFile maps file_path and session_id', () => {
    const result = normalize(fxCursorRead);
    expect(result.file_path).toBe('/proj/src/readme.md');
    expect(result.session_id).toBe(fxCursorRead.conversation_id);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Cursor', () => {

  test('additionalContext → top-level additional_context (snake_case)', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'Test message' } };
    const result = formatOutput(canonical, 'cursor');
    expect(result.additional_context).toBe('Test message');
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  test('permissionDecision → permission, reason → user_message', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'Not allowed' },
    };
    const result = formatOutput(canonical, 'cursor');
    expect(result.permission).toBe('deny');
    expect(result.user_message).toBe('Not allowed');
  });

  test('permissionDecision allow → permission allow', () => {
    const canonical = { hookSpecificOutput: { permissionDecision: 'allow' } };
    const result = formatOutput(canonical, 'cursor');
    expect(result.permission).toBe('allow');
  });

  test('continue: false → permission deny (when no explicit decision)', () => {
    const result = formatOutput({ hookSpecificOutput: {}, continue: false }, 'cursor');
    expect(result.permission).toBe('deny');
  });

  test('continue: false with explicit allow → allow wins', () => {
    const result = formatOutput(
      { hookSpecificOutput: { permissionDecision: 'allow' }, continue: false },
      'cursor',
    );
    expect(result.permission).toBe('allow');
  });

  test('additionalContext + permissionDecision → both present', () => {
    const canonical = {
      hookSpecificOutput: {
        additionalContext: 'Loose file',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Blocked',
      },
    };
    const result = formatOutput(canonical, 'cursor');
    expect(result.additional_context).toBe('Loose file');
    expect(result.permission).toBe('deny');
    expect(result.user_message).toBe('Blocked');
  });

  test('empty canonical → empty output object', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'cursor');
    expect(result).toEqual({});
  });

  test('no additionalContext → additional_context absent', () => {
    const result = formatOutput({ hookSpecificOutput: { permissionDecision: 'deny' } }, 'cursor');
    expect(result.additional_context).toBeUndefined();
  });

  test('no permissionDecision → permission absent', () => {
    const result = formatOutput({ hookSpecificOutput: { additionalContext: 'hi' } }, 'cursor');
    expect(result.permission).toBeUndefined();
  });

  test('undefined canonical → empty output', () => {
    const result = formatOutput(undefined as unknown as Record<string, unknown>, 'cursor');
    expect(result).toEqual({});
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Cursor (all event types)', () => {

  test('PostToolUse Write: detect → normalize → formatOutput → valid cursor output', () => {
    const ide = detectIDE(fxCursorWrite);
    expect(ide).toBe('cursor');
    const normalized = normalize(fxCursorWrite);
    expect(normalized.hook_event_name).toBe('PostToolUse');
    expect(normalized.session_id).toBeTruthy();
    const canonical = { hookSpecificOutput: { additionalContext: 'nudge context' } };
    const output = formatOutput(canonical, ide);
    expect(output.additional_context).toBe('nudge context');
    expect(output).not.toHaveProperty('hookSpecificOutput');
  });

  test('PreToolUse Bash: detect → normalize preserves event and tool', () => {
    const ide = detectIDE(fxCursorBash);
    expect(ide).toBe('cursor');
    const normalized = normalize(fxCursorBash);
    expect(normalized.hook_event_name).toBe('PreToolUse');
    expect(normalized.tool_name).toBe('Bash');
  });

  test('SessionStart: detect → normalize has no tool_name', () => {
    const ide = detectIDE(fxCursorStart);
    expect(ide).toBe('cursor');
    const normalized = normalize(fxCursorStart);
    expect(normalized.hook_event_name).toBe('SessionStart');
    expect(normalized.tool_name == null).toBe(true);
  });

  test('beforeSubmitPrompt: semantic event preserved', () => {
    const ide = detectIDE(fxCursorPrompt);
    expect(ide).toBe('cursor');
    const normalized = normalize(fxCursorPrompt);
    expect(normalized.event).toBe('PrePromptSubmit');
  });

  test('beforeReadFile: detect → normalize produces PreRead', () => {
    const ide = detectIDE(fxCursorRead);
    expect(ide).toBe('cursor');
    const normalized = normalize(fxCursorRead);
    expect(normalized.hook_event_name).toBe('PreRead');
    expect(normalized.file_path).toBe('/proj/src/readme.md');
  });

  test('deny round-trip: continue:false → permission:deny in output', () => {
    const ide = detectIDE(fxCursorWrite);
    const output = formatOutput({ hookSpecificOutput: {}, continue: false }, ide);
    expect(output.permission).toBe('deny');
  });

});

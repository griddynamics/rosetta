// adapter-copilot.test.ts — Tests for the SHIPPED core-copilot bundle's slim adapter.
// This is the entrypoint esbuild actually aliases `../adapter` to for the core-copilot bundle
// (scripts/build-bundles.mjs) — it is what runs in production, not src/adapter.ts's
// multi-IDE dispatcher. Proves the routing-bug fix (hooks-verify.md): VS Code Copilot's
// snake_case payloads no longer fall back to the claude-code adapter's tool-name vocabulary.

import { test, describe, expect } from 'vitest';

import { adapter } from '../../src/entrypoints/adapter-copilot';

const { detectIDE, normalize, formatOutput, exitCodeFor } = adapter;

import fxCopilot from '../fixtures/copilot-post-tool-use-write.json';

describe('entrypoints/adapter-copilot — detectIDE', () => {

  test('always "copilot" — bundle is pinned, no cross-IDE ambiguity to resolve', () => {
    expect(detectIDE(fxCopilot)).toBe('copilot');
    expect(detectIDE({ hook_event_name: 'PreToolUse', session_id: 'x', tool_name: 'run_in_terminal' }))
      .toBe('copilot');
  });

});

describe('entrypoints/adapter-copilot — normalize (VS Code snake_case shape)', () => {

  test('run_in_terminal resolves toolKind "bash" (was toolKind:null via the removed claude-code fallback)', () => {
    const raw = {
      hook_event_name: 'PreToolUse',
      session_id: 'vscode-session',
      cwd: '/proj',
      tool_name: 'run_in_terminal',
      tool_input: { command: 'rm -rf /' },
    };
    const result = normalize(raw);
    expect(result.toolKind).toBe('bash');
  });

  test('read_file resolves toolKind "read" and file_path from tool_input.filePath', () => {
    const raw = {
      hook_event_name: 'PreToolUse',
      session_id: 'vscode-session',
      cwd: '/proj',
      tool_name: 'read_file',
      tool_input: { filePath: '/proj/secret.env' },
    };
    const result = normalize(raw);
    expect(result.toolKind).toBe('read');
    expect(result.file_path).toBe('/proj/secret.env');
  });

  test('Copilot CLI camelCase fire still normalizes correctly (no regression)', () => {
    const result = normalize(fxCopilot);
    expect(result.ide).toBe('copilot');
    expect(result.tool_name).toBe(fxCopilot.toolName);
  });

});

describe('entrypoints/adapter-copilot — formatOutput (Bug 2 merged emit)', () => {

  test('additionalContext emitted at both top-level and nested', () => {
    const canonical = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'ctx' } };
    const result = formatOutput(canonical);
    expect(result.additionalContext).toBe('ctx');
    expect((result.hookSpecificOutput as Record<string, unknown>).additionalContext).toBe('ctx');
  });

});

describe('entrypoints/adapter-copilot — exitCodeFor', () => {

  test('exitCodeFor is always 0 — deny carried in the JSON body', () => {
    expect(exitCodeFor({ hookSpecificOutput: {} })).toBe(0);
  });

});

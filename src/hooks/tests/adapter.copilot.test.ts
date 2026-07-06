// adapter.copilot.test.ts — Tests for GitHub Copilot CLI adapter
// Fixture: constructed from docs at:
//   https://docs.github.com/en/copilot/tutorials/copilot-cli-hooks
//   https://docs.github.com/en/copilot/reference/hooks-configuration

import { test, describe, expect } from 'vitest';

import fxCopilot from './fixtures/copilot-post-tool-use-write.json';
import fxCopilotView from './fixtures/copilot-pre-tool-use-view.json';
import fxCopilotSessionStart from './fixtures/copilot-session-start.json';
import fxCopilotPreCompact from './fixtures/copilot-pre-compact.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';
import { copilot } from '../src/adapters/copilot';

// ---------------------------------------------------------------------------
describe('detectIDE — Copilot', () => {

  test('returns "copilot" for Copilot postToolUse Write input', () => {
    expect(detectIDE(fxCopilot)).toBe('copilot');
  });

  test('does NOT match claude-code (no hook_event_name)', () => {
    expect(detectIDE(fxCopilot)).not.toBe('claude-code');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Copilot', () => {

  test('infers hook_event_name PostToolUse when toolResult present', () => {
    const result = normalize(fxCopilot);
    expect(result.hook_event_name).toBe('PostToolUse');
  });

  test('infers hook_event_name PreToolUse when toolResult absent', () => {
    const preInput = { timestamp: 1704614400000, cwd: '/proj', toolName: 'bash', toolArgs: '{"command":"ls"}' };
    const result = normalize(preInput);
    expect(result.hook_event_name).toBe('PreToolUse');
  });

  test('view tool normalizes to PreRead', () => {
    const result = normalize(fxCopilotView);
    expect(result.hook_event_name).toBe('PreRead');
    expect(result.tool_name).toBe('view');
    expect(result.file_path).toBe('/proj/src/app.js');
  });

  // Regression: a prior version returned 'PreRead' for ANY read-kind tool call regardless of
  // Pre/Post, so a completed read (result already present) was ALSO mislabeled PreRead — making
  // read-once.ts (gated on event: ['PreRead','PreToolUse']) fire a second, spurious time after
  // the read already happened.
  test('completed view tool (toolResult present) stays PostToolUse, NOT PreRead', () => {
    const completedView = { timestamp: 1, cwd: '/proj', toolName: 'view', toolArgs: '{"filePath":"/proj/src/app.js"}', toolResult: { resultType: 'success', textResultForLlm: 'file contents' } };
    const result = normalize(completedView);
    expect(result.hook_event_name).toBe('PostToolUse');
  });

  test('sessionStart is inferred from source/initialPrompt', () => {
    const result = normalize(fxCopilotSessionStart);
    expect(result.hook_event_name).toBe('SessionStart');
    expect(result.session_id).toBe('copilot-session-002');
    expect(result.source).toBe('compact');
  });

  test('preCompact is inferred from trigger/customInstructions', () => {
    const result = normalize(fxCopilotPreCompact);
    expect(result.hook_event_name).toBe('PreCompact');
    expect(result.session_id).toBe('copilot-session-002');
    expect(result.trigger).toBe('context-limit');
  });

  test('maps toolName (camelCase) to tool_name', () => {
    const result = normalize(fxCopilot);
    expect(result.tool_name).toBe(fxCopilot.toolName);
  });

  test('parses toolArgs JSON string into tool_input object', () => {
    const result = normalize(fxCopilot);
    expect(typeof result.tool_input).toBe('object');
    expect('file_path' in result.tool_input, 'file_path not parsed from toolArgs').toBeTruthy();
  });

  test('preserves toolResult as tool_response', () => {
    const result = normalize(fxCopilot);
    const response = result.tool_response as Record<string, unknown>;
    expect(response.resultType).toBe('success');
    expect(response.textResultForLlm).toBeTruthy();
  });

  test('cwd preserved', () => {
    const result = normalize(fxCopilot);
    expect(result.cwd).toBe(fxCopilot.cwd);
  });

  test('session_id is preserved when Copilot provides it', () => {
    const result = normalize(fxCopilotView);
    expect(result.session_id).toBe('copilot-session-001');
  });

  test('session_id is undefined when Copilot has none', () => {
    const result = normalize(fxCopilot);
    expect(result.session_id).toBe(undefined);
  });

  test('handles invalid toolArgs gracefully — returns { _raw }', () => {
    const input = { timestamp: 1704614400000, cwd: '/proj', toolName: 'bash', toolArgs: 'not { valid json' };
    const result = normalize(input);
    expect(result.tool_input._raw).toBe('not { valid json');
  });

  test('preserves copilot extras in _copilot', () => {
    const result = normalize(fxCopilot);
    const copilot = result._copilot as Record<string, unknown>;
    expect(copilot.toolName).toBe(fxCopilot.toolName);
    expect(copilot.timestamp).toBe(fxCopilot.timestamp);
  });

});

// ---------------------------------------------------------------------------
// VS Code + Copilot CLI's PascalCase fire both send this snake_case shape
// (hook_event_name, session_id, tool_name, tool_input object) — OI-3.
// Calling copilot.normalize() directly here mirrors what the shipped core-copilot bundle
// does (entrypoints/adapter-copilot.ts always routes through the copilot adapter now —
// see the routing-bug finding in hooks-verify.md).
describe('normalize — Copilot VS Code / snake_case shape (OI-3)', () => {

  const vscodeRunInTerminal = {
    hook_event_name: 'PreToolUse',
    session_id: 'f46082a6-vscode',
    timestamp: '2026-06-30T18:18:13.407Z',
    cwd: '/proj',
    tool_name: 'run_in_terminal',
    tool_input: { command: 'echo rosetta-hook-probe', explanation: 'test', mode: 'sync' },
    tool_use_id: 'call_abc__vscode-1',
  };

  const vscodeReadFile = {
    hook_event_name: 'PreToolUse',
    session_id: 'f46082a6-vscode',
    timestamp: '2026-06-30T18:18:26.881Z',
    cwd: '/proj',
    tool_name: 'read_file',
    tool_input: { filePath: '/proj/docs/HOOK-DENY-PROBE.txt', startLine: 1, endLine: 50 },
    tool_use_id: 'call_abc__vscode-2',
  };

  const vscodePostToolUse = {
    hook_event_name: 'PostToolUse',
    session_id: 'f46082a6-vscode',
    cwd: '/proj',
    tool_name: 'run_in_terminal',
    tool_input: { command: 'echo rosetta-hook-probe' },
    tool_response: 'rosetta-hook-probe\n',
    tool_use_id: 'call_abc__vscode-3',
  };

  test('run_in_terminal resolves toolKind "bash" (was null via claude-code fallback)', () => {
    const result = copilot.normalize(vscodeRunInTerminal);
    expect(result.toolKind).toBe('bash');
    expect(result.tool_name).toBe('run_in_terminal');
    expect(result.hook_event_name).toBe('PreToolUse');
    expect(result.event).toBe('PreToolUse');
  });

  test('read_file resolves toolKind "read" and reclassifies event to PreRead', () => {
    const result = copilot.normalize(vscodeReadFile);
    expect(result.toolKind).toBe('read');
    expect(result.event).toBe('PreRead');
    expect(result.file_path).toBe('/proj/docs/HOOK-DENY-PROBE.txt');
  });

  test('tool_input object is used directly (not re-parsed as toolArgs)', () => {
    const result = copilot.normalize(vscodeRunInTerminal);
    expect(result.tool_input).toEqual(vscodeRunInTerminal.tool_input);
  });

  test('tool_use_id is read from snake_case field (was hardcoded undefined)', () => {
    const result = copilot.normalize(vscodeRunInTerminal);
    expect(result.tool_use_id).toBe('call_abc__vscode-1');
  });

  test('tool_response string (VS Code) is preserved as-is', () => {
    const result = copilot.normalize(vscodePostToolUse);
    expect(result.tool_response).toBe('rosetta-hook-probe\n');
    expect(result.event).toBe('PostToolUse');
  });

  // Regression: a completed read_file (PostToolUse, result already present) must NOT be
  // reclassified to PreRead — only the pre-read call gets that treatment (see camelCase
  // regression test above for the same bug via the CLI shape).
  test('completed read_file (PostToolUse) stays PostToolUse, NOT PreRead', () => {
    const completedReadFile = {
      hook_event_name: 'PostToolUse',
      session_id: 'f46082a6-vscode',
      cwd: '/proj',
      tool_name: 'read_file',
      tool_input: { filePath: '/proj/docs/HOOK-DENY-PROBE.txt' },
      tool_response: 'file contents here',
    };
    const result = copilot.normalize(completedReadFile);
    expect(result.event).toBe('PostToolUse');
    expect(result.hook_event_name).toBe('PostToolUse');
  });

  test('session_id prefers snake_case', () => {
    const result = copilot.normalize(vscodeRunInTerminal);
    expect(result.session_id).toBe('f46082a6-vscode');
  });

  test('hook_event_name is read directly when present, not re-inferred', () => {
    const result = copilot.normalize(vscodeRunInTerminal);
    expect(result.hook_event_name).toBe('PreToolUse');
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Copilot', () => {

  test('maps permissionDecision deny → output.permissionDecision', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'Blocked by policy' },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.permissionDecision).toBe('deny');
    expect(result.permissionDecisionReason).toBe('Blocked by policy');
  });

  test('continue: false without explicit decision → permissionDecision deny', () => {
    const result = formatOutput({ hookSpecificOutput: {}, continue: false }, 'copilot');
    expect(result.permissionDecision).toBe('deny');
  });

  test('empty canonical → empty output (no decision, no additionalContext)', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'copilot');
    expect(result).toEqual({});
  });

  test('additionalContext → included in hookSpecificOutput', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'File appears to be loose' },
      continue: true,
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.hookSpecificOutput).toEqual({
      hookEventName: 'PostToolUse',
      additionalContext: 'File appears to be loose',
    });
  });

  test('additionalContext + permissionDecision → both in output', () => {
    const canonical = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: 'Loose file detected',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Blocked',
      },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.permissionDecision).toBe('deny');
    expect(result.permissionDecisionReason).toBe('Blocked');
    expect((result.hookSpecificOutput as Record<string, unknown>)?.additionalContext).toBe('Loose file detected');
  });

  test('no additionalContext → hookSpecificOutput absent from output', () => {
    const result = formatOutput({ hookSpecificOutput: { hookEventName: 'PostToolUse' } }, 'copilot');
    expect(result.hookSpecificOutput).toBeUndefined();
  });

});

// ---------------------------------------------------------------------------
// Bug 2: additionalContext / permissionDecision / permissionDecisionReason must each reach
// BOTH runtimes — VS Code honors nested hookSpecificOutput.*, Copilot CLI honors top-level.
describe('formatOutput — Copilot merged emit (Bug 2)', () => {

  test('additionalContext (e.g. SessionStart) is emitted at BOTH top-level and nested', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'Rosetta context' },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.additionalContext).toBe('Rosetta context');
    expect((result.hookSpecificOutput as Record<string, unknown>).additionalContext).toBe('Rosetta context');
  });

  test('PreToolUse deny: permissionDecision + reason emitted at BOTH placements', () => {
    const canonical = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Blocked by policy',
      },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.permissionDecision).toBe('deny');
    expect(result.permissionDecisionReason).toBe('Blocked by policy');
    const nested = result.hookSpecificOutput as Record<string, unknown>;
    expect(nested.permissionDecision).toBe('deny');
    expect(nested.permissionDecisionReason).toBe('Blocked by policy');
  });

  test('continue:false deny (no explicit permissionDecision) is merged too', () => {
    const result = formatOutput({ hookSpecificOutput: {}, continue: false }, 'copilot');
    expect(result.permissionDecision).toBe('deny');
    expect((result.hookSpecificOutput as Record<string, unknown>).permissionDecision).toBe('deny');
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Copilot', () => {

  test('normalize → formatOutput, toolName and toolResult preserved', () => {
    const normalized = normalize(fxCopilot);
    expect(normalized.tool_name).toBe(fxCopilot.toolName);
    expect(normalized.tool_response).toBeTruthy();

    const output = formatOutput({ hookSpecificOutput: {} }, 'copilot');
    expect(output).toEqual({});
  });

  test('PreRead view input stays readable by runHook-level consumers', () => {
    const normalized = normalize(fxCopilotView);
    expect(normalized.hook_event_name).toBe('PreRead');
    expect(normalized.tool_input.file_path).toBe('/proj/src/app.js');
  });

});

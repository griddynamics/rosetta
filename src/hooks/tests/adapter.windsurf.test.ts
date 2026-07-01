// adapter.windsurf.test.ts — Tests for Windsurf (Codeium) Cascade IDE adapter
// Fixture: constructed from docs at https://docs.windsurf.com/windsurf/cascade/hooks

import { test, describe, expect } from 'vitest';

import fxWindsurf from './fixtures/windsurf-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput, exitCodeFor } from '../src/adapter';

function wsInput(agent_action_name: string, tool_info: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    agent_action_name,
    trajectory_id: 'traj-123',
    execution_id: 'exec-456',
    timestamp: '2025-06-15T10:30:00Z',
    model_name: 'claude-sonnet-4-20250514',
    tool_info,
  };
}

// ---------------------------------------------------------------------------
describe('detectIDE — Windsurf', () => {

  test('returns "windsurf" for Windsurf post_write_code input', () => {
    expect(detectIDE(fxWindsurf)).toBe('windsurf');
  });

  test('returns "windsurf" for post_run_command input', () => {
    expect(detectIDE(wsInput('post_run_command', { command_line: 'npm test', cwd: '/proj' }))).toBe('windsurf');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf write events', () => {

  test('post_write_code → hook_event_name PostToolUse, tool_name Write', () => {
    const result = normalize(fxWindsurf);
    expect(result.hook_event_name).toBe('PostToolUse');
    expect(result.tool_name).toBe('Write');
  });

  test('pre_write_code → hook_event_name PreToolUse, tool_name Write', () => {
    const result = normalize(wsInput('pre_write_code', { file_path: '/proj/a.py' }));
    expect(result.hook_event_name).toBe('PreToolUse');
    expect(result.tool_name).toBe('Write');
    expect(result.tool_input.file_path).toBe('/proj/a.py');
  });

  test('maps trajectory_id to session_id', () => {
    const result = normalize(fxWindsurf);
    expect(result.session_id).toBe(fxWindsurf.trajectory_id);
  });

  test('tool_input has file_path from tool_info', () => {
    const result = normalize(fxWindsurf);
    expect(result.tool_input.file_path).toBe('/proj/src/app.js');
  });

  test('windsurf extras preserved in _windsurf', () => {
    const result = normalize(fxWindsurf);
    const ws = result._windsurf as Record<string, unknown>;
    expect(ws.agent_action_name).toBe('post_write_code');
    expect(ws.execution_id).toBeTruthy();
    expect(ws.model_name).toBeTruthy();
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf command events', () => {

  test('post_run_command → tool_name Bash, tool_input.command from command_line', () => {
    const result = normalize(wsInput('post_run_command', { command_line: 'npm test', cwd: '/proj' }));
    expect(result.hook_event_name).toBe('PostToolUse');
    expect(result.tool_name).toBe('Bash');
    expect(result.tool_input.command).toBe('npm test');
  });

  test('pre_run_command → hook_event_name PreToolUse', () => {
    const result = normalize(wsInput('pre_run_command', { command_line: 'git push', cwd: '/proj' }));
    expect(result.hook_event_name).toBe('PreToolUse');
    expect(result.tool_name).toBe('Bash');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf read events', () => {

  test('post_read_code → tool_name Read', () => {
    const result = normalize(wsInput('post_read_code', { file_path: '/proj/utils.py' }));
    expect(result.hook_event_name).toBe('PostToolUse');
    expect(result.tool_name).toBe('Read');
    expect(result.tool_input.file_path).toBe('/proj/utils.py');
  });

  test('pre_read_code → hook_event_name PreRead', () => {
    const result = normalize(wsInput('pre_read_code', { file_path: '/proj/config.js' }));
    expect(result.hook_event_name).toBe('PreRead');
    expect(result.tool_name).toBe('Read');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf MCP events', () => {

  test('post_mcp_tool_use → tool_name from mcp_tool_name', () => {
    const result = normalize(wsInput('post_mcp_tool_use', {
      mcp_server_name: 'github',
      mcp_tool_name: 'create_issue',
      mcp_tool_arguments: { owner: 'org', repo: 'repo' },
      mcp_result: 'created',
    }));
    expect(result.hook_event_name).toBe('PostToolUse');
    expect(result.tool_name).toBe('mcp__create_issue');
    expect(result.tool_input).toEqual({ owner: 'org', repo: 'repo' });
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf non-tool events', () => {

  test('pre_user_prompt → hook_event_name PrePromptSubmit', () => {
    const result = normalize(wsInput('pre_user_prompt', { user_prompt: 'run the tests' }));
    expect(result.hook_event_name).toBe('PrePromptSubmit');
    expect(result.tool_input.prompt).toBe('run the tests');
  });

  test('post_cascade_response → hook_event_name PostResponse', () => {
    const result = normalize(wsInput('post_cascade_response', { response: 'Done!' }));
    expect(result.hook_event_name).toBe('PostResponse');
    expect(result.tool_input.response).toBe('Done!');
  });

  test('post_cascade_response_with_transcript → transcript_path in tool_input', () => {
    const result = normalize(wsInput('post_cascade_response_with_transcript', { transcript_path: '/tmp/t.jsonl' }));
    expect(result.hook_event_name).toBe('PostResponse');
    expect(result.tool_input.transcript_path).toBe('/tmp/t.jsonl');
  });

  test('post_setup_worktree → hook_event_name PostWorktree', () => {
    const result = normalize(wsInput('post_setup_worktree', {
      worktree_path: '/tmp/wt',
      root_workspace_path: '/proj',
    }));
    expect(result.hook_event_name).toBe('PostWorktree');
    expect(result.tool_input.worktree_path).toBe('/tmp/wt');
    expect(result.tool_input.root_workspace_path).toBe('/proj');
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Windsurf', () => {

  test('additionalContext preserved', () => {
    const result = formatOutput({ hookSpecificOutput: { additionalContext: 'Test' } }, 'windsurf');
    expect(result.additionalContext).toBe('Test');
  });

  test('deny decision → no _exitCode in the JSON body (stdout is never parsed)', () => {
    const result = formatOutput({ hookSpecificOutput: { permissionDecision: 'deny' } }, 'windsurf');
    expect(result._exitCode).toBeUndefined();
  });

  test('deny decision → exitCodeFor returns 2 (the only mechanism Windsurf honors)', () => {
    const code = exitCodeFor({ hookSpecificOutput: { permissionDecision: 'deny' } }, 'windsurf');
    expect(code).toBe(2);
  });

  test('non-deny decision → exitCodeFor returns 0', () => {
    const code = exitCodeFor({ hookSpecificOutput: { permissionDecision: 'allow' } }, 'windsurf');
    expect(code).toBe(0);
  });

});

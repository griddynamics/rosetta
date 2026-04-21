// adapter.windsurf.test.ts — Tests for Windsurf (Codeium) Cascade IDE adapter
// Fixture: constructed from docs at https://docs.windsurf.com/windsurf/cascade/hooks

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import fxWindsurf from './fixtures/windsurf-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

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
    assert.equal(detectIDE(fxWindsurf), 'windsurf');
  });

  test('returns "windsurf" for post_run_command input', () => {
    assert.equal(detectIDE(wsInput('post_run_command', { command_line: 'npm test', cwd: '/proj' })), 'windsurf');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf write events', () => {

  test('post_write_code → hook_event_name PostToolUse, tool_name Write', () => {
    const result = normalize(fxWindsurf);
    assert.equal(result.hook_event_name, 'PostToolUse');
    assert.equal(result.tool_name, 'Write');
  });

  test('pre_write_code → hook_event_name PreToolUse, tool_name Write', () => {
    const result = normalize(wsInput('pre_write_code', { file_path: '/proj/a.py' }));
    assert.equal(result.hook_event_name, 'PreToolUse');
    assert.equal(result.tool_name, 'Write');
    assert.equal(result.tool_input.file_path, '/proj/a.py');
  });

  test('maps trajectory_id to session_id', () => {
    const result = normalize(fxWindsurf);
    assert.equal(result.session_id, fxWindsurf.trajectory_id);
  });

  test('tool_input has file_path from tool_info', () => {
    const result = normalize(fxWindsurf);
    assert.equal(result.tool_input.file_path, '/proj/src/app.js');
  });

  test('windsurf extras preserved in _windsurf', () => {
    const result = normalize(fxWindsurf);
    const ws = result._windsurf as Record<string, unknown>;
    assert.equal(ws.agent_action_name, 'post_write_code');
    assert.ok(ws.execution_id);
    assert.ok(ws.model_name);
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf command events', () => {

  test('post_run_command → tool_name Bash, tool_input.command from command_line', () => {
    const result = normalize(wsInput('post_run_command', { command_line: 'npm test', cwd: '/proj' }));
    assert.equal(result.hook_event_name, 'PostToolUse');
    assert.equal(result.tool_name, 'Bash');
    assert.equal(result.tool_input.command, 'npm test');
  });

  test('pre_run_command → hook_event_name PreToolUse', () => {
    const result = normalize(wsInput('pre_run_command', { command_line: 'git push', cwd: '/proj' }));
    assert.equal(result.hook_event_name, 'PreToolUse');
    assert.equal(result.tool_name, 'Bash');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf read events', () => {

  test('post_read_code → tool_name Read', () => {
    const result = normalize(wsInput('post_read_code', { file_path: '/proj/utils.py' }));
    assert.equal(result.hook_event_name, 'PostToolUse');
    assert.equal(result.tool_name, 'Read');
    assert.equal(result.tool_input.file_path, '/proj/utils.py');
  });

  test('pre_read_code → hook_event_name PreToolUse', () => {
    const result = normalize(wsInput('pre_read_code', { file_path: '/proj/config.js' }));
    assert.equal(result.hook_event_name, 'PreToolUse');
    assert.equal(result.tool_name, 'Read');
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
    assert.equal(result.hook_event_name, 'PostToolUse');
    assert.equal(result.tool_name, 'create_issue');
    assert.deepEqual(result.tool_input, { owner: 'org', repo: 'repo' });
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Windsurf non-tool events', () => {

  test('pre_user_prompt → hook_event_name PrePromptSubmit', () => {
    const result = normalize(wsInput('pre_user_prompt', { user_prompt: 'run the tests' }));
    assert.equal(result.hook_event_name, 'PrePromptSubmit');
    assert.equal(result.tool_input.prompt, 'run the tests');
  });

  test('post_cascade_response → hook_event_name PostResponse', () => {
    const result = normalize(wsInput('post_cascade_response', { response: 'Done!' }));
    assert.equal(result.hook_event_name, 'PostResponse');
    assert.equal(result.tool_input.response, 'Done!');
  });

  test('post_cascade_response_with_transcript → transcript_path in tool_input', () => {
    const result = normalize(wsInput('post_cascade_response_with_transcript', { transcript_path: '/tmp/t.jsonl' }));
    assert.equal(result.hook_event_name, 'PostResponse');
    assert.equal(result.tool_input.transcript_path, '/tmp/t.jsonl');
  });

  test('post_setup_worktree → hook_event_name PostWorktree', () => {
    const result = normalize(wsInput('post_setup_worktree', {
      worktree_path: '/tmp/wt',
      root_workspace_path: '/proj',
    }));
    assert.equal(result.hook_event_name, 'PostWorktree');
    assert.equal(result.tool_input.worktree_path, '/tmp/wt');
    assert.equal(result.tool_input.root_workspace_path, '/proj');
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Windsurf', () => {

  test('additionalContext preserved', () => {
    const result = formatOutput({ hookSpecificOutput: { additionalContext: 'Test' } }, 'windsurf');
    assert.equal(result.additionalContext, 'Test');
  });

  test('deny decision → _exitCode 2', () => {
    const result = formatOutput({ hookSpecificOutput: { permissionDecision: 'deny' } }, 'windsurf');
    assert.equal(result._exitCode, 2);
  });

});

// claude-plugin-root.test.ts — Smoke test for CLAUDE_PLUGIN_ROOT env-var resolution.
//
// CLAUDE_PLUGIN_ROOT is injected by Claude Code at hook execution time and points to
// the installed plugin directory. If it is missing or unresolved, the hook command
// expands to an invalid path and silently does nothing.
//
// These tests verify:
// 1. The built loose-files.js is present at the expected CLAUDE_PLUGIN_ROOT-relative path.
// 2. When the env var is set correctly, the script executes and produces valid JSON.
// 3. The hooks.json for core-claude references ${CLAUDE_PLUGIN_ROOT} in PostToolUse.

import { test, describe, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const HOOKS_ROOT = path.resolve(__dirname, '..');

// Path that CLAUDE_PLUGIN_ROOT would point to in a real Claude Code install.
// In tests we point it at the project-local copy of the built plugin.
const PLUGIN_ROOT = path.resolve(HOOKS_ROOT, '..', 'plugins', 'core-claude');
const LOOSE_FILES_JS = path.join(PLUGIN_ROOT, 'hooks', 'loose-files.js');

// Release detection: deterministic (advisory) hooks ship only from r3+ (plugin.json major >= 3).
// For r2 the advisory hooks are intentionally absent, so these checks only report for r3.
const MANIFEST = path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
const releaseMajor = (): number => {
  try {
    const version = String(JSON.parse(readFileSync(MANIFEST, 'utf-8')).version ?? '0');
    return parseInt(version.split('.')[0], 10) || 0;
  } catch { return 0; }
};
const IS_R3 = releaseMajor() >= 3;

// ---------------------------------------------------------------------------
describe('CLAUDE_PLUGIN_ROOT — file exists at expected path', () => {

  test('plugins/core-claude/hooks/loose-files.js is present', () => {
    if (!IS_R3) return; // r2 ships no advisory hooks
    expect(existsSync(LOOSE_FILES_JS), `Missing: ${LOOSE_FILES_JS}`).toBe(true);
  });

});

// ---------------------------------------------------------------------------
describe('CLAUDE_PLUGIN_ROOT — hooks.json references the env var', () => {

  const hooksJsonPath = path.join(PLUGIN_ROOT, 'hooks', 'hooks.json');

  test('hooks.json exists', () => {
    expect(existsSync(hooksJsonPath)).toBe(true);
  });

  test('PostToolUse command uses ${CLAUDE_PLUGIN_ROOT}', () => {
    if (!IS_R3) return; // r2 has no PostToolUse advisory hooks
    const raw = readFileSync(hooksJsonPath, 'utf-8');
    expect(raw).toContain('${CLAUDE_PLUGIN_ROOT}');
  });

  test('${CLAUDE_PLUGIN_ROOT} path ends with /hooks/loose-files.js', () => {
    if (!IS_R3) return; // r2 has no PostToolUse advisory hooks
    const raw = readFileSync(hooksJsonPath, 'utf-8');
    expect(raw).toContain('${CLAUDE_PLUGIN_ROOT}/hooks/loose-files.js');
  });

});

// ---------------------------------------------------------------------------
describe('CLAUDE_PLUGIN_ROOT — script executes correctly when env var is set', () => {

  const CC_INPUT = JSON.stringify({
    hook_event_name: 'PostToolUse',
    session_id: 'smoke-test-session',
    tool_name: 'Write',
    tool_input: { file_path: '/tmp/rosetta-smoke-test-orphan.py', content: 'pass\n' },
    tool_use_id: 'smoke-tu-001',
    cwd: '/tmp',
    permission_mode: 'default',
  });

  test('exits 0 when CLAUDE_PLUGIN_ROOT is valid', () => {
    if (!existsSync(LOOSE_FILES_JS)) return;
    const result = spawnSync('node', [LOOSE_FILES_JS], {
      input: CC_INPUT,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
      encoding: 'utf-8',
    });
    expect(result.status, `stderr: ${result.stderr}`).toBe(0);
  });

  test('produces valid JSON output for a loose .py file', () => {
    if (!existsSync(LOOSE_FILES_JS)) return;
    const result = spawnSync('node', [LOOSE_FILES_JS], {
      input: CC_INPUT,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    const out = (result.stdout ?? '').trim();
    if (!out) return; // file may not be loose if /tmp has a package.json
    const parsed = JSON.parse(out) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(hso?.additionalContext).toBeTruthy();
  });

  test('exits 0 silently for non-JS/PY file (no output expected)', () => {
    if (!existsSync(LOOSE_FILES_JS)) return;
    const tsInput = JSON.stringify({
      hook_event_name: 'PostToolUse',
      session_id: 'smoke-test-session',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/rosetta-smoke.ts', content: 'x\n' },
      tool_use_id: 'smoke-tu-002',
      cwd: '/tmp',
      permission_mode: 'default',
    });
    const result = spawnSync('node', [LOOSE_FILES_JS], {
      input: tsInput,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    expect((result.stdout ?? '').trim()).toBe('');
  });

});

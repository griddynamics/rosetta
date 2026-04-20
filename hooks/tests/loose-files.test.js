'use strict';
// loose-files.test.js — TDD test suite for loose-files.js
// Run: node --test hooks/tests/loose-files.test.js

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const fx = (name) => require(path.join(FIXTURES, name));

const ccWrite = fx('claude-code-post-tool-use-write.json');
const ccEdit  = fx('claude-code-post-tool-use-edit.json');
const ccBash  = fx('claude-code-pre-tool-use-bash.json');

const { shouldCheck, isLooseFile, buildNudgeOutput } = require('../loose-files');

function mockFs(existingPaths) {
  return { existsSync: (p) => existingPaths.includes(p) };
}

// ---------------------------------------------------------------------------
describe('shouldCheck — file extension filter', () => {

  test('.py file → true', () => {
    assert.equal(shouldCheck({ ...ccWrite, tool_input: { file_path: '/proj/utils.py' } }), true);
  });

  test('.js file → true', () => {
    assert.equal(shouldCheck({ ...ccWrite, tool_input: { file_path: '/proj/app.js' } }), true);
  });

  test('.ts file → false', () => {
    assert.equal(shouldCheck({ ...ccWrite, tool_input: { file_path: '/proj/app.ts' } }), false);
  });

  test('.md file → false', () => {
    assert.equal(shouldCheck({ ...ccWrite, tool_input: { file_path: '/proj/README.md' } }), false);
  });

  test('.json file → false', () => {
    assert.equal(shouldCheck({ ...ccWrite, tool_input: { file_path: '/proj/config.json' } }), false);
  });

});

// ---------------------------------------------------------------------------
describe('shouldCheck — event + tool filter', () => {

  test('PostToolUse + Write → true', () => {
    assert.equal(shouldCheck(ccWrite), true);
  });

  test('PostToolUse + Edit → true', () => {
    assert.equal(shouldCheck(ccEdit), true);
  });

  test('PostToolUse + Bash → false', () => {
    assert.equal(shouldCheck(ccBash), false);
  });

  test('PostToolUse + Read → false', () => {
    assert.equal(shouldCheck({ ...ccWrite, tool_name: 'Read' }), false);
  });

  test('PreToolUse + Write → false (wrong event)', () => {
    assert.equal(shouldCheck({ ...ccWrite, hook_event_name: 'PreToolUse' }), false);
  });

});

// ---------------------------------------------------------------------------
describe('shouldCheck — exclusion paths', () => {

  const makeInput = (filePath) => ({ ...ccWrite, tool_input: { file_path: filePath } });

  test('path contains agents/TEMP/ → false', () => {
    assert.equal(shouldCheck(makeInput('/proj/agents/TEMP/debug.py')), false);
  });

  test('path contains scripts/ → false', () => {
    assert.equal(shouldCheck(makeInput('/proj/scripts/runner.py')), false);
  });

  test('path contains node_modules/ → false', () => {
    assert.equal(shouldCheck(makeInput('/proj/node_modules/foo/bar.js')), false);
  });

  test('path contains .venv/ → false', () => {
    assert.equal(shouldCheck(makeInput('/proj/.venv/lib/site.py')), false);
  });

  test('path contains __pycache__/ → false', () => {
    assert.equal(shouldCheck(makeInput('/proj/src/__pycache__/util.py')), false);
  });

});

// ---------------------------------------------------------------------------
describe('isLooseFile — Python module detection (.py)', () => {

  test('.py with __init__.py in same dir → false (not loose)', () => {
    const fs = mockFs(['/proj/src/mypackage/__init__.py']);
    assert.equal(isLooseFile('/proj/src/mypackage/utils.py', fs), false);
  });

  test('.py with __init__.py two levels up → false', () => {
    const fs = mockFs(['/proj/src/mypackage/__init__.py']);
    assert.equal(isLooseFile('/proj/src/mypackage/sub/utils.py', fs), false);
  });

  test('.py with NO __init__.py anywhere → true (loose)', () => {
    assert.equal(isLooseFile('/proj/orphan.py', mockFs([])), true);
  });

  test('.py at root with no markers — stops at 10 levels max, returns true', () => {
    assert.equal(isLooseFile('/a/b/c/d/e/f/g/h/i/j/k/deep.py', mockFs([])), true);
  });

});

// ---------------------------------------------------------------------------
describe('isLooseFile — JavaScript module detection (.js)', () => {

  test('.js with package.json in same dir → false (not loose)', () => {
    const fs = mockFs(['/proj/src/package.json']);
    assert.equal(isLooseFile('/proj/src/app.js', fs), false);
  });

  test('.js with package.json three levels up → false', () => {
    const fs = mockFs(['/proj/src/package.json']);
    assert.equal(isLooseFile('/proj/src/lib/utils/helpers.js', fs), false);
  });

  test('.js with NO package.json anywhere → true (loose)', () => {
    assert.equal(isLooseFile('/proj/helper.js', mockFs([])), true);
  });

  test('.js at deep nesting — stops at 10 levels, returns true', () => {
    assert.equal(isLooseFile('/a/b/c/d/e/f/g/h/i/j/k/deep.js', mockFs([])), true);
  });

});

// ---------------------------------------------------------------------------
describe('buildNudgeOutput', () => {

  test('returns valid JSON-serializable object', () => {
    JSON.parse(JSON.stringify(buildNudgeOutput('/proj/orphan.py')));
  });

  test('has hookSpecificOutput.hookEventName === "PostToolUse"', () => {
    assert.equal(buildNudgeOutput('/proj/orphan.py').hookSpecificOutput.hookEventName, 'PostToolUse');
  });

  test('.py — additionalContext mentions file path', () => {
    assert.ok(buildNudgeOutput('/proj/orphan.py').hookSpecificOutput.additionalContext.includes('orphan.py'));
  });

  test('.py — additionalContext mentions __init__.py', () => {
    assert.ok(buildNudgeOutput('/proj/orphan.py').hookSpecificOutput.additionalContext.includes('__init__.py'));
  });

  test('.js — additionalContext mentions package.json', () => {
    assert.ok(buildNudgeOutput('/proj/helper.js').hookSpecificOutput.additionalContext.includes('package.json'));
  });

  test('has continue: true', () => {
    assert.equal(buildNudgeOutput('/proj/orphan.py').continue, true);
  });

});

// ---------------------------------------------------------------------------
describe('integration with adapter', () => {

  const { normalize } = require('../adapter');

  test('Claude Code Write fixture (.py loose) → shouldCheck=true + isLooseFile=true', () => {
    const input = {
      ...ccWrite,
      tool_input: { file_path: '/proj/orphan.py', content: 'pass\n' },
      tool_response: { filePath: '/proj/orphan.py' },
    };
    const normalized = normalize(input);
    assert.equal(shouldCheck(normalized), true);
    assert.equal(isLooseFile(normalized.tool_input.file_path, mockFs([])), true);
  });

  test('Claude Code Write fixture (.py inside module) → shouldCheck=true + isLooseFile=false', () => {
    const input = {
      ...ccWrite,
      tool_input: { file_path: '/proj/src/mypackage/utils.py', content: 'pass\n' },
      tool_response: { filePath: '/proj/src/mypackage/utils.py' },
    };
    const normalized = normalize(input);
    assert.equal(shouldCheck(normalized), true);
    assert.equal(isLooseFile(normalized.tool_input.file_path, mockFs(['/proj/src/mypackage/__init__.py'])), false);
  });

  test('Claude Code Edit fixture (.js loose) → shouldCheck=true + isLooseFile=true', () => {
    const normalized = normalize(ccEdit);
    assert.equal(shouldCheck(normalized), true);
    assert.equal(isLooseFile(normalized.tool_input.file_path, mockFs([])), true);
  });

  test('Claude Code Bash fixture → shouldCheck=false', () => {
    assert.equal(shouldCheck(normalize(ccBash)), false);
  });

});

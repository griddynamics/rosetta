// adapter.antigravity.test.ts — Tests for the combined Google Antigravity adapter
// (Antigravity 2.0 / CLI / IDE — one adapter, contract verified identical across all three).
// Fixtures are captured REAL payloads from docs/hooks/agy-{cli,ide,2.0}-logs.txt (see
// docs/hooks/antigravity.md). All three surfaces are exercised: CLI (session 9996e494…, model
// gemini-3.6-flash-high), IDE (session b3e702af…, no modelName), 2.0 (session be777993…, model
// gemini-3.5-flash-low).

import { test, describe, expect } from 'vitest';

import fxPreBash from './fixtures/antigravity-pre-tool-use-bash.json';
import fxPreBashIde from './fixtures/antigravity-pre-tool-use-bash-ide.json';
import fxPreBash20 from './fixtures/antigravity-pre-tool-use-bash-20.json';
import fxPostBash from './fixtures/antigravity-post-tool-use-bash.json';
import fxPreWrite from './fixtures/antigravity-pre-tool-use-write.json';
import fxPreEdit from './fixtures/antigravity-pre-tool-use-edit.json';
import fxPreMultiEdit from './fixtures/antigravity-pre-tool-use-multi-edit.json';
import fxPreView from './fixtures/antigravity-pre-tool-use-view.json';
import fxStop from './fixtures/antigravity-stop.json';
import fxPreInvocation from './fixtures/antigravity-pre-invocation.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';
import { antigravity } from '../src/adapters/antigravity';
import { evaluateDangerous } from '../src/hooks/dangerous-actions/evaluate';
import type { HookContext } from '../src/runtime/types';
import fxClaudeWrite from './fixtures/claude-code-post-tool-use-write.json';
import fxCursorBash from './fixtures/cursor-pre-tool-use-bash.json';
import fxCopilotView from './fixtures/copilot-pre-tool-use-view.json';
import fxWindsurfWrite from './fixtures/windsurf-post-tool-use-write.json';

// Builds the same HookContext shape run-hook.ts's toHookContext() produces, from a normalized
// input — used by the dangerous-actions safety tests below to drive the REAL evaluator.
const toCtx = (norm: ReturnType<typeof normalize>): HookContext => ({
  ide: norm.ide,
  event: norm.event,
  toolKind: norm.toolKind,
  toolName: (norm.tool_name as string) ?? '',
  filePath: norm.file_path ?? '',
  cwd: (norm.cwd as string) ?? '',
  sessionId: (norm.session_id as string) ?? null,
  toolInput: norm.tool_input,
});

// ---------------------------------------------------------------------------
describe('detectIDE — Antigravity', () => {

  test('returns "antigravity" for a PreToolUse (run_command) payload', () => {
    expect(detectIDE(fxPreBash)).toBe('antigravity');
  });

  test('returns "antigravity" for a PostToolUse payload (toolCall: null)', () => {
    expect(detectIDE(fxPostBash)).toBe('antigravity');
  });

  test('returns "antigravity" for a Stop payload', () => {
    expect(detectIDE(fxStop)).toBe('antigravity');
  });

  test('returns "antigravity" for a PreInvocation payload', () => {
    expect(detectIDE(fxPreInvocation)).toBe('antigravity');
  });

  test('returns "antigravity" for the IDE surface (no modelName)', () => {
    expect(detectIDE(fxPreBashIde)).toBe('antigravity');
  });

  test('returns "antigravity" for the 2.0 surface (docs/hooks/agy-2.0-logs.txt line 103)', () => {
    expect(detectIDE(fxPreBash20)).toBe('antigravity');
  });

  test('does NOT match any other adapter\'s own fixture (collision check)', () => {
    expect(detectIDE(fxClaudeWrite)).not.toBe('antigravity');
    expect(detectIDE(fxCursorBash)).not.toBe('antigravity');
    expect(detectIDE(fxCopilotView)).not.toBe('antigravity');
    expect(detectIDE(fxWindsurfWrite)).not.toBe('antigravity');
  });

  test('antigravity\'s own detect() does not match any other adapter\'s fixture (reverse collision check)', () => {
    expect(antigravity.detect(fxClaudeWrite as Record<string, unknown>)).toBe(false);
    expect(antigravity.detect(fxCursorBash as Record<string, unknown>)).toBe(false);
    expect(antigravity.detect(fxCopilotView as Record<string, unknown>)).toBe(false);
    expect(antigravity.detect(fxWindsurfWrite as Record<string, unknown>)).toBe(false);
  });

  test('rejects a payload with conversationId/workspacePaths but none of the distinguishing fields', () => {
    expect(
      antigravity.detect({ conversationId: 'x', workspacePaths: ['/proj'] } as Record<string, unknown>),
    ).toBe(false);
  });

  test('rejects a payload missing workspacePaths', () => {
    expect(
      antigravity.detect({ conversationId: 'x', toolCall: { name: 'run_command', args: {} } } as Record<string, unknown>),
    ).toBe(false);
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Antigravity — per event', () => {

  test('PreToolUse (run_command) → event PreToolUse, toolKind bash, command/cwd extracted', () => {
    const result = normalize(fxPreBash);
    expect(result.event).toBe('PreToolUse');
    expect(result.hook_event_name).toBe('PreToolUse');
    expect(result.toolKind).toBe('bash');
    expect(result.tool_name).toBe('run_command');
    expect(result.tool_input.command).toBe('echo rosetta-hook-probe');
    expect(result.tool_input.cwd).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql');
    expect(result.cwd).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql');
    expect(result.session_id).toBe('9996e494-b3d9-4cf7-aabf-36acef4972bf');
  });

  test('IDE surface (no modelName) normalizes identically', () => {
    const result = normalize(fxPreBashIde);
    expect(result.event).toBe('PreToolUse');
    expect(result.toolKind).toBe('bash');
    expect(result.tool_input.command).toBe('echo rosetta-hook-probe');
  });

  // Third surface — Antigravity 2.0 (docs/hooks/agy-2.0-logs.txt line 103, verbatim RAW STDIN,
  // session be777993-927d-49ef-a024-3f87ca05e670, model gemini-3.5-flash-low). Net: all three
  // surfaces (CLI/IDE/2.0) are now exercised by real captured traces in this suite.
  test('2.0 surface: session_id + modelName both present, normalizes identically to CLI/IDE', () => {
    const result = normalize(fxPreBash20);
    expect(result.event).toBe('PreToolUse');
    expect(result.hook_event_name).toBe('PreToolUse');
    expect(result.toolKind).toBe('bash');
    expect(result.tool_name).toBe('run_command');
    expect(result.tool_input.command).toBe('echo rosetta-hook-probe');
    expect(result.tool_input.cwd).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql');
    expect(result.session_id).toBe('be777993-927d-49ef-a024-3f87ca05e670');
    expect((result._antigravity as Record<string, unknown>).modelName).toBe('gemini-3.5-flash-low');
  });

  test('PostToolUse → event PostToolUse, NO tool identity (toolKind/tool_name null, tool_input empty)', () => {
    const result = normalize(fxPostBash);
    expect(result.event).toBe('PostToolUse');
    expect(result.hook_event_name).toBe('PostToolUse');
    expect(result.toolKind).toBeNull();
    expect(result.tool_name).toBeUndefined();
    expect(result.tool_input).toEqual({});
    expect(result.file_path).toBe('');
  });

  test('write_to_file (PreToolUse) → toolKind write, file_path + content extracted', () => {
    const result = normalize(fxPreWrite);
    expect(result.toolKind).toBe('write');
    expect(result.tool_name).toBe('write_to_file');
    expect(result.file_path).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql/hook-probe-tmp.txt');
    expect(result.tool_input.file_path).toBe(result.file_path);
    expect(result.tool_input.content).toBe('rosetta antigravity probe line one');
  });

  test('replace_file_content (PreToolUse) → toolKind edit, new_string/old_string extracted', () => {
    const result = normalize(fxPreEdit);
    expect(result.toolKind).toBe('edit');
    expect(result.tool_name).toBe('replace_file_content');
    expect(result.file_path).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql/hook-probe-tmp.txt');
    expect(result.tool_input.new_string).toBe('rosetta antigravity probe line two');
    expect(result.tool_input.old_string).toBe('rosetta antigravity probe line one');
  });

  test('multi_replace_file_content (PreToolUse) → toolKind multi-edit, edits[].new_string extracted', () => {
    const result = normalize(fxPreMultiEdit);
    expect(result.toolKind).toBe('multi-edit');
    expect(result.tool_name).toBe('multi_replace_file_content');
    const edits = result.tool_input.edits as Array<{ old_string: string; new_string: string }>;
    expect(edits).toHaveLength(2);
    expect(edits[0]).toEqual({ old_string: 'rosetta', new_string: 'ROSETTA' });
    expect(edits[1]).toEqual({ old_string: 'probe', new_string: 'PROBE' });
  });

  test('view_file (PreToolUse) → toolKind read, AbsolutePath extracted as file_path', () => {
    const result = normalize(fxPreView);
    expect(result.toolKind).toBe('read');
    expect(result.tool_name).toBe('view_file');
    expect(result.file_path).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql/HOOK-DENY-PROBE.txt');
    expect(result.tool_input.file_path).toBe(result.file_path);
  });

  test('mcp__* tool name → toolKind mcp-call, args passed through as-is', () => {
    const mcpInput = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1, modelName: 'x',
      toolCall: { name: 'mcp__filesystem__write_file', args: { path: '/proj/a.txt', content: 'hi' } },
      transcriptPath: '/t', artifactDirectoryPath: '/a',
    };
    const result = normalize(mcpInput);
    expect(result.toolKind).toBe('mcp-call');
    expect(result.tool_name).toBe('mcp__filesystem__write_file');
    expect(result.tool_input).toEqual({ path: '/proj/a.txt', content: 'hi' });
  });

  test('null-kind tool (list_dir) → toolKind null, args still passed through', () => {
    const input = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1,
      toolCall: { name: 'list_dir', args: { DirectoryPath: '/proj' } },
    };
    const result = normalize(input);
    expect(result.toolKind).toBeNull();
    expect(result.tool_name).toBe('list_dir');
    expect(result.tool_input).toEqual({ DirectoryPath: '/proj' });
  });

  test('Stop → event Stop, terminationReason carried as reason', () => {
    const result = normalize(fxStop);
    expect(result.event).toBe('Stop');
    expect(result.hook_event_name).toBe('Stop');
    expect(result.reason).toBe('NO_TOOL_CALL');
    expect(result.toolKind).toBeNull();
  });

  test('PreInvocation → event null (no SemanticEvent mapping), hook_event_name preserved for context', () => {
    const result = normalize(fxPreInvocation);
    expect(result.event).toBeNull();
    expect(result.hook_event_name).toBe('PreInvocation');
    expect(result.toolKind).toBeNull();
    expect(result.cwd).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql');
  });

  test('SessionStart is never inferred — no such Antigravity event', () => {
    const result = normalize(fxPreInvocation);
    expect(result.hook_event_name).not.toBe('SessionStart');
    expect(result.event).not.toBe('SessionStart');
  });

  test('session_id ← conversationId for every event shape', () => {
    expect(normalize(fxPreBash).session_id).toBe(fxPreBash.conversationId);
    expect(normalize(fxStop).session_id).toBe(fxStop.conversationId);
    expect(normalize(fxPreInvocation).session_id).toBe(fxPreInvocation.conversationId);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Antigravity', () => {

  test('deny (PreToolUse) → native { decision: "deny", reason }', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'Blocked by policy' },
      continue: false,
    };
    const result = formatOutput(canonical, 'antigravity');
    expect(result).toEqual({ decision: 'deny', reason: 'Blocked by policy' });
    expect(result.permissionDecision).toBeUndefined();
  });

  test('continue:false without explicit permissionDecision (PreToolUse) → decision deny', () => {
    const result = formatOutput({ hookSpecificOutput: { hookEventName: 'PreToolUse' }, continue: false }, 'antigravity');
    expect(result.decision).toBe('deny');
  });

  test('Stop block → native { decision: "continue", reason } (NOT "deny")', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'Stop', permissionDecision: 'deny', permissionDecisionReason: 'Keep working — task incomplete' },
      continue: false,
    };
    const result = formatOutput(canonical, 'antigravity');
    expect(result).toEqual({ decision: 'continue', reason: 'Keep working — task incomplete' });
  });

  test('advise (additionalContext) → { injectSteps: [{ userMessage }] }', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PreInvocation', additionalContext: 'Some advisory context' },
    };
    const result = formatOutput(canonical, 'antigravity');
    expect(result).toEqual({ injectSteps: [{ userMessage: 'Some advisory context' }] });
  });

  test('advise shape is emitted the same way even on PreToolUse (event-agnostic, per spec)', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'Non-blocking notice' },
    };
    const result = formatOutput(canonical, 'antigravity');
    expect(result).toEqual({ injectSteps: [{ userMessage: 'Non-blocking notice' }] });
  });

  test('allow → empty output (no stdout)', () => {
    const result = formatOutput({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } }, 'antigravity');
    expect(result).toEqual({});
  });

  test('empty canonical → empty output', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'antigravity');
    expect(result).toEqual({});
  });

  test('no exitCode() override — default exit code is 0 for a deny', () => {
    expect(antigravity.exitCode).toBeUndefined();
  });

  test('no stderrMessage() implemented', () => {
    expect(antigravity.stderrMessage).toBeUndefined();
  });

});

// ---------------------------------------------------------------------------
// (!) STRICT SCHEMA: Antigravity validates output against the EXACT documented shape for the
// firing event and drops the WHOLE output on any extra/misplaced field (docs/hooks/antigravity.md
// Practical Conclusion 1). A subset match (`toEqual` on selected fields) is NOT sufficient proof —
// it would pass even if formatOutput leaked a foreign field alongside the expected ones. Every case
// below feeds a KITCHEN-SINK canonical (every field that could conceivably leak: hookSpecificOutput.
// {additionalContext,permissionDecision,permissionDecisionReason,updatedInput}, top-level continue/
// systemMessage/stopReason/decision/reason/suppressOutput) and asserts the EXACT key set survives —
// nothing foreign passes through, regardless of how much foreign data the canonical carries.
describe('formatOutput — Antigravity — STRICT no-foreign-field-escapes', () => {

  test('deny (PreToolUse): exact key set is ["decision","reason"] — nothing else escapes', () => {
    const kitchenSink = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Blocked by policy',
        additionalContext: 'MUST NOT leak on a deny',
        updatedInput: { foo: 'bar' },
      },
      continue: false,
      systemMessage: 'MUST NOT leak',
      stopReason: 'MUST NOT leak',
      decision: 'MUST NOT leak (top-level, foreign)',
      reason: 'MUST NOT leak (top-level, foreign — real reason lives under hookSpecificOutput)',
      suppressOutput: true,
    };
    const result = formatOutput(kitchenSink, 'antigravity');
    expect(Object.keys(result).sort()).toEqual(['decision', 'reason']);
    expect(result).toEqual({ decision: 'deny', reason: 'Blocked by policy' });
  });

  test('Stop-continue: exact key set is ["decision","reason"], decision is "continue" not "deny"', () => {
    const kitchenSink = {
      hookSpecificOutput: {
        hookEventName: 'Stop',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Keep working — task incomplete',
        additionalContext: 'MUST NOT leak on Stop-continue',
        updatedInput: { foo: 'bar' },
      },
      continue: false,
      systemMessage: 'MUST NOT leak',
      stopReason: 'MUST NOT leak',
      decision: 'MUST NOT leak (top-level, foreign)',
      reason: 'MUST NOT leak (top-level, foreign)',
      suppressOutput: true,
    };
    const result = formatOutput(kitchenSink, 'antigravity');
    expect(Object.keys(result).sort()).toEqual(['decision', 'reason']);
    expect(result).toEqual({ decision: 'continue', reason: 'Keep working — task incomplete' });
  });

  test('advise: exact key set is ["injectSteps"], element is exactly {userMessage} — no ephemeralMessage/toolCall', () => {
    const kitchenSink = {
      hookSpecificOutput: {
        hookEventName: 'PreInvocation',
        additionalContext: 'Real advisory text',
        permissionDecision: 'allow',
        permissionDecisionReason: 'MUST NOT leak',
        updatedInput: { foo: 'bar' },
      },
      continue: true,
      systemMessage: 'MUST NOT leak',
      stopReason: 'MUST NOT leak',
      decision: 'MUST NOT leak (top-level, foreign)',
      reason: 'MUST NOT leak (top-level, foreign)',
      suppressOutput: false,
    };
    const result = formatOutput(kitchenSink, 'antigravity');
    expect(Object.keys(result).sort()).toEqual(['injectSteps']);
    const steps = result.injectSteps as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(1);
    expect(Object.keys(steps[0]).sort()).toEqual(['userMessage']);
    expect(steps[0]).toEqual({ userMessage: 'Real advisory text' });
  });

  test('allow/empty: exact key set is [] — a fully-populated non-blocking, non-advise canonical still emits nothing', () => {
    const kitchenSink = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        updatedInput: { foo: 'bar' },
      },
      continue: true,
      systemMessage: 'MUST NOT leak',
      stopReason: 'MUST NOT leak',
      decision: 'MUST NOT leak (top-level, foreign)',
      reason: 'MUST NOT leak (top-level, foreign)',
      suppressOutput: true,
    };
    const result = formatOutput(kitchenSink, 'antigravity');
    expect(Object.keys(result)).toEqual([]);
    expect(result).toEqual({});
  });

});

// ---------------------------------------------------------------------------
// (!) SAFETY: dangerous-actions must be able to scan write/edit/multi-edit content carried under
// Antigravity's PascalCase args — this is the OI-8-class bug (dropped edit content → dangerous
// content bypass). Verified here directly against the real evaluator, not just field-presence.
describe('dangerous-actions content scanning — Antigravity (safety gate)', () => {

  // dangerous-actions' content scanner (DANGEROUS_CONTENT, src/hooks/src/hooks/dangerous-actions/
  // patterns.ts) matches destructive SQL DDL/DML, not arbitrary secret-shaped text (there is no
  // PEM/credential-content pattern — credential files are matched by PATH via DANGEROUS_PATHS,
  // advise-tier, not deny). A destructive SQL statement is the real, reachable "dangerous content"
  // shape this gate denies on, so it's what proves the wiring end-to-end.
  const DANGEROUS_SQL = 'DROP TABLE users;';

  test('write_to_file with a dangerous SQL statement in CodeContent → denied (reconsider tier)', () => {
    const raw = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1, artifactDirectoryPath: '/a',
      toolCall: { name: 'write_to_file', args: { TargetFile: '/proj/migrate.sql', CodeContent: DANGEROUS_SQL } },
    };
    const result = evaluateDangerous(toCtx(normalize(raw)));
    expect(result?.kind).toBe('deny');
  });

  test('replace_file_content with a dangerous SQL statement in ReplacementContent → denied', () => {
    const raw = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1, artifactDirectoryPath: '/a',
      toolCall: { name: 'replace_file_content', args: { TargetFile: '/proj/migrate.sql', TargetContent: 'old', ReplacementContent: DANGEROUS_SQL } },
    };
    const result = evaluateDangerous(toCtx(normalize(raw)));
    expect(result?.kind).toBe('deny');
  });

  test('multi_replace_file_content with a dangerous SQL statement in one ReplacementChunks[].ReplacementContent → denied', () => {
    const raw = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1, artifactDirectoryPath: '/a',
      toolCall: {
        name: 'multi_replace_file_content',
        args: {
          TargetFile: '/proj/secret.txt',
          ReplacementChunks: [
            { TargetContent: 'unrelated', ReplacementContent: 'still unrelated' },
            { TargetContent: 'old', ReplacementContent: DANGEROUS_SQL },
          ],
        },
      },
    };
    const result = evaluateDangerous(toCtx(normalize(raw)));
    expect(result?.kind).toBe('deny');
  });

  test('benign write_to_file content → not denied', () => {
    const raw = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1, artifactDirectoryPath: '/a',
      toolCall: { name: 'write_to_file', args: { TargetFile: '/proj/hello.txt', CodeContent: 'console.log("hi")' } },
    };
    const result = evaluateDangerous(toCtx(normalize(raw)));
    expect(result).toBeNull();
  });

  test('run_command with a dangerous shell pattern in CommandLine → denied', () => {
    const raw = {
      conversationId: 'c1', workspacePaths: ['/proj'], stepIdx: 1, artifactDirectoryPath: '/a',
      toolCall: { name: 'run_command', args: { CommandLine: 'rm -rf /', Cwd: '/proj' } },
    };
    const result = evaluateDangerous(toCtx(normalize(raw)));
    expect(result?.kind).toBe('deny');
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Antigravity', () => {

  test('normalize → formatOutput, deny reason preserved end to end', () => {
    const normalized = normalize(fxPreBash);
    expect(normalized.tool_name).toBe('run_command');

    const output = formatOutput(
      { hookSpecificOutput: { hookEventName: normalized.event ?? '', permissionDecision: 'deny', permissionDecisionReason: 'nope' }, continue: false },
      'antigravity',
    );
    expect(output).toEqual({ decision: 'deny', reason: 'nope' });
  });

});

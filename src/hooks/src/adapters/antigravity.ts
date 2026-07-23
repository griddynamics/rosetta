// adapters/antigravity.ts — Adapter for Google Antigravity (one combined adapter covering all
// three surfaces: Antigravity 2.0, Antigravity CLI, Antigravity IDE — contract confirmed identical
// across all three, docs/hooks/antigravity.md).
// Docs: https://antigravity.google/docs/hooks (R1), https://antigravity.google/docs/ide/hooks (R2),
//       https://antigravity.google/docs/cli/plugins#managing-hooks (R3)
//
// Wire shape: JSON via stdin, camelCase top-level fields — { conversationId, workspacePaths,
// transcriptPath, artifactDirectoryPath, modelName? } + per-event fields. There is NO explicit
// event-name field on the wire; the event is inferred from which fields are present (see
// inferHookEventName). Tool call args are PascalCase and vary by tool name (CommandLine, Cwd,
// TargetFile, CodeContent, ReplacementContent, TargetContent, ReplacementChunks, AbsolutePath) —
// unique to Antigravity; see docs/hooks/antigravity.md Tool Vocabulary.

import { lookupEvent, lookupToolKind, getFilePath, getCwd, getSessionId } from '../runtime/ide-rows/antigravity';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'antigravity' as const;

const SIGNATURE = ['conversationId', 'workspacePaths'] as const;
// One of these must ALSO be present so a stray payload that merely happens to carry
// conversationId+workspacePaths (no known IDE does, but shape-detect must stay specific) doesn't
// false-positive. Per-event: toolCall (PreToolUse), invocationNum (Pre/PostInvocation),
// executionNum (Stop). artifactDirectoryPath is a common field present on every real Antigravity
// event, included as a fourth fallback per the verified contract's Runtime Detection section.
const DISTINGUISHERS = ['toolCall', 'invocationNum', 'executionNum', 'artifactDirectoryPath'] as const;

const detect = (raw: Record<string, unknown>): boolean =>
  SIGNATURE.every((f) => f in raw) && DISTINGUISHERS.some((f) => f in raw);

// No explicit event-name field on the wire (verified: docs/hooks/agy-cli-logs.txt PARSED INPUT
// entries carry no "event"/"hookEventName" key) — the event is inferred from field presence:
//   - executionNum present            → Stop
//   - stepIdx present, no `error` key → PreToolUse   (PreToolUse never carries `error`)
//   - stepIdx present, `error` key    → PostToolUse  (PostToolUse always carries `error`, even "")
//   - invocationNum present           → PreInvocation/PostInvocation (see note below)
// PreInvocation and PostInvocation share a BYTE-IDENTICAL input shape (invocationNum,
// initialNumSteps + common; confirmed empirically — docs/hooks/agy-cli-logs.txt shows the same
// PARSED INPUT for both) — nothing in the payload distinguishes them; only the hooks.json
// registration slot that invoked the script knows which one fired, and that information never
// reaches stdin. Since neither maps to a Rosetta SemanticEvent and no hook targets either today
// (docs/hooks/antigravity.md), this ambiguity has zero functional impact. 'PreInvocation' is used
// as the label for this shape — a documented, non-authoritative default, not a real distinction.
const inferHookEventName = (raw: Record<string, unknown>): string => {
  if ('executionNum' in raw) return 'Stop';
  if ('stepIdx' in raw) return 'error' in raw ? 'PostToolUse' : 'PreToolUse';
  if ('invocationNum' in raw) return 'PreInvocation';
  return 'Unknown';
};

type ToolCall = { name: string; args: Record<string, unknown> };

// Maps toolCall.name + PascalCase args → canonical (snake_case) tool_input fields that
// dangerous-actions/evaluate.ts actually scans: `command` (evalBash), `content` (evalWrite),
// `new_string` (evalEdit), `edits[].new_string` (evalMultiEdit) — see src/hooks/src/hooks/
// dangerous-actions/evaluate.ts. Without this mapping, CodeContent/ReplacementContent/
// ReplacementChunks[].ReplacementContent would never be scanned and dangerous write/edit content
// would silently bypass the safety gate — the exact bug class fixed for Windsurf's MultiEdit
// mapping (docs/hooks-verify.md OI-8; adapters/windsurf.ts carries the same warning).
function buildToolInput(toolCall: ToolCall): Record<string, unknown> {
  const { name, args } = toolCall;
  switch (name) {
    case 'run_command':
      return { command: args.CommandLine, cwd: args.Cwd };
    case 'view_file':
      return { file_path: args.AbsolutePath };
    case 'write_to_file':
      return { file_path: args.TargetFile, content: args.CodeContent };
    case 'replace_file_content':
      return { file_path: args.TargetFile, new_string: args.ReplacementContent, old_string: args.TargetContent };
    case 'multi_replace_file_content': {
      const chunks = (args.ReplacementChunks as Array<Record<string, unknown>> | undefined) ?? [];
      return {
        file_path: args.TargetFile,
        edits: chunks.map((c) => ({ old_string: c.TargetContent, new_string: c.ReplacementContent })),
      };
    }
    default:
      // mcp__* (opaque, tool-specific arg names — mirrors windsurf's mcp_tool_arguments
      // passthrough) and every null-SemanticKind tool (list_dir, find_by_name, grep_search,
      // search_web, read_url_content, browser_*, invoke_subagent/define_subagent/
      // manage_subagents, send_message, manage_task, schedule, list_permissions,
      // ask_permission, ask_question, generate_image): no Rosetta hook gates on these, so pass
      // args through unchanged for context/debugging.
      return { ...args };
  }
}

const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const hookEventName = inferHookEventName(raw);
  // PostToolUse carries NO tool identity by contract (docs/hooks/antigravity.md Practical
  // Conclusion 3: "toolCall: null — no tool name/args/result") — tool fields are derived ONLY on
  // PreToolUse, regardless of what a given payload's toolCall happens to contain.
  const rawToolCall = hookEventName === 'PreToolUse'
    ? (raw.toolCall as { name?: string; args?: Record<string, unknown> } | null | undefined)
    : null;
  const toolName = rawToolCall?.name ?? null;
  const toolKind = toolName ? lookupToolKind(toolName) : null;

  return {
    ide:             IDE,
    event:           lookupEvent(hookEventName),
    toolKind,
    hook_event_name: hookEventName,
    session_id:      getSessionId(raw) ?? undefined,
    tool_name:       toolName ?? undefined,
    tool_input:      toolName ? buildToolInput({ name: toolName, args: rawToolCall!.args ?? {} }) : {},
    // file_path is gated the same way as tool identity above (Pre-only) — getFilePath(raw) also
    // naturally returns null for a contract-compliant PostToolUse payload (toolCall: null), this
    // is a defense-in-depth guard against any payload that leaks tool data on PostToolUse.
    file_path:       hookEventName === 'PreToolUse' ? (getFilePath(raw) ?? '') : '',
    cwd:             getCwd(raw) ?? undefined,
    transcript_path: (raw.transcriptPath as string) ?? undefined,
    // Stop's terminationReason is the closest fit for the generic canonical `reason` field.
    reason:          (raw.terminationReason as string) ?? undefined,
    _antigravity: {
      artifactDirectoryPath: raw.artifactDirectoryPath,
      modelName:             raw.modelName,
      stepIdx:               raw.stepIdx,
      invocationNum:         raw.invocationNum,
      initialNumSteps:       raw.initialNumSteps,
      executionNum:          raw.executionNum,
      terminationReason:     raw.terminationReason,
      fullyIdle:             raw.fullyIdle,
      error:                 raw.error,
      toolCall:              raw.toolCall,
      workspacePaths:        raw.workspacePaths,
    },
  } as unknown as NormalizedInput;
};

// Antigravity validates output against the EXACT documented schema for the firing event — extra/
// misplaced fields cause the WHOLE output to be dropped (docs/hooks/antigravity.md Practical
// Conclusion 1). So formatOutput must emit ONLY the documented shape for the case at hand:
//   - deny (PreToolUse)      → { decision: "deny", reason }              (native — NOT Copilot's
//                                                                          permissionDecision, NOT exit-2)
//   - Stop block (continue)  → { decision: "continue", reason }           (same underlying
//                                                                          canonical shape as deny —
//                                                                          continue:false — but Stop's
//                                                                          native verb is "continue")
//   - advise (additionalContext) → { injectSteps: [{ userMessage }] }     (only reaches the model on
//                                                                          Pre/PostInvocation; emitted
//                                                                          unconditionally per the
//                                                                          verified per-event strict
//                                                                          schema — harmless no-op on
//                                                                          events that ignore it)
//   - allow / side-effect / null → {}                                    (no stdout)
const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
  const isBlocking = permissionDecision === 'deny' || cont === false;

  if (isBlocking) {
    return hookEventName === 'Stop'
      ? { decision: 'continue', reason: permissionDecisionReason }
      : { decision: 'deny', reason: permissionDecisionReason };
  }
  if (additionalContext) {
    return { injectSteps: [{ userMessage: additionalContext }] };
  }
  return {};
};

// No exitCode() override: deny is carried entirely in the JSON body at exit 0 (docs/hooks/
// antigravity.md Exit Codes: "not documented... deny works via JSON at exit 0"). No stderrMessage()
// either — Antigravity always parses stdout JSON; stderr is not a documented hook→model channel.
export const antigravity: IdeAdapter = { name: 'antigravity', detect, normalize, formatOutput };

// types.ts — Shared types for the hooks adapter layer.
// Lives in its own file to keep the module graph acyclic:
// adapter.ts imports adapter values, adapters import these types.

import type { IdeName, SemanticEvent, SemanticKind } from './runtime/ide-registry';

export interface NormalizedInput {
  hook_event_name: string;
  session_id: string | undefined;
  tool_name: string | null | undefined;
  tool_input: Record<string, unknown>;
  file_path?: string;
  tool_use_id?: string;
  cwd?: string;
  tool_response?: unknown;
  ide: IdeName;
  event: SemanticEvent | null;
  toolKind: SemanticKind | null;
  [key: string]: unknown;
}

export interface CanonicalOutput {
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
    permissionDecision?: string;
    permissionDecisionReason?: string;
  };
  continue?: boolean;
  suppressOutput?: boolean;
}

export interface IdeAdapter {
  name:         string;
  detect:       (raw: Record<string, unknown>) => boolean;
  normalize:    (raw: Record<string, unknown>) => NormalizedInput;
  formatOutput: (canonical?: CanonicalOutput) => Record<string, unknown>;
  // Platform-level dedup: return a stable key per logical tool call to collapse duplicate
  // events emitted by the IDE. Return null to disable dedup for this adapter.
  dedupKey?:    (raw: Record<string, unknown>, hookName: string) => string | null;
  // Process exit code for this IDE's deny mechanism. Default (unset) = 0 — correct for IDEs whose
  // deny is carried entirely in the JSON body at exit 0 (Claude Code, Codex, Copilot, Cursor —
  // for Cursor this is deliberate, see adapters/cursor.ts). Only implement this for an IDE whose
  // deny is exit-code-driven, and only once verified empirically (Windsurf: docs/hooks/windsurf.md).
  exitCode?:    (canonical: CanonicalOutput) => number;
}

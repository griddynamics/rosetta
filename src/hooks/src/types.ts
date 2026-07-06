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
  // Process exit code for this IDE's deny mechanism. Default (unset) = 0 — correct for IDEs whose
  // deny is carried entirely in the JSON body at exit 0 (Claude Code, Codex, Copilot, Cursor —
  // for Cursor this is deliberate, see adapters/cursor.ts). Only implement this for an IDE whose
  // deny is exit-code-driven, and only once verified empirically (Windsurf: docs/hooks/windsurf.md).
  exitCode?:    (canonical: CanonicalOutput) => number;
  // Text to write to the process's STDERR (not stdout). Default (unset) = nothing. Only for IDEs
  // whose sole hook→model text channel is stderr — i.e. stdout is never parsed as JSON, so a deny
  // reason must be delivered via stderr on a blocking (exit-2) pre-hook. Verified only for Windsurf
  // (docs/hooks/windsurf.md: Cascade "will see the error message from stderr"). Every other IDE
  // carries its deny reason in the stdout JSON body and leaves this unset.
  stderrMessage?: (canonical: CanonicalOutput) => string | undefined;
}

export type AdapterEnv = Record<string, string | undefined>;

// The full adapter API surface consumed by run-hook.ts. Both the multi-IDE dispatcher (adapter.ts)
// and each slim per-IDE bundle entrypoint (entrypoints/adapter-*.ts, via makeEntrypoint) expose an
// `adapter: AdapterApi` object. run-hook.ts imports `{ adapter }` from '../adapter'; the bundler
// aliases '../adapter' to the per-IDE entrypoint at build time (scripts/build-bundles.mjs). Adding a
// new method here is a single-file change to make-entrypoint.ts + adapter.ts's object, not an edit
// across every entrypoint in lockstep (was the cost noted in hooks-verify.md OI-5).
export interface AdapterApi {
  readStdin: (stream?: NodeJS.ReadableStream) => Promise<unknown>;
  detectIDE: (rawInput: unknown, env?: AdapterEnv) => string;
  normalize: (rawInput: unknown, env?: AdapterEnv) => NormalizedInput;
  formatOutput: (canonicalOutput: CanonicalOutput | Record<string, unknown>, ide?: string) => Record<string, unknown>;
  exitCodeFor: (canonicalOutput: CanonicalOutput, ide?: string) => number;
  stderrMessageFor: (canonicalOutput: CanonicalOutput, ide?: string) => string | undefined;
}

// types.ts — Shared types for the hooks adapter layer.
// Lives in its own file to keep the module graph acyclic:
// adapter.ts imports adapter values, adapters import these types.

export interface NormalizedInput {
  hook_event_name: string;
  session_id: string | undefined;
  tool_name: string | null | undefined;
  tool_input: Record<string, unknown>;
  tool_use_id?: string;
  cwd?: string;
  tool_response?: unknown;
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
  name: string;
  detect: (raw: Record<string, unknown>) => boolean;
  normalize: (raw: Record<string, unknown>) => NormalizedInput;
  formatOutput: (canonical?: CanonicalOutput) => Record<string, unknown>;
}

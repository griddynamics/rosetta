// --- Run Envelope (FR-ARCH-0011) ---

export interface RunEnvelope<T = unknown> {
  ok: boolean;
  result: T | null;
  error: string | null;
  include_help: boolean;
}

// --- Enriched Envelope (FR-ARCH-0012) ---
// After help enrichment, the envelope may carry a help field.

export interface EnrichedEnvelope<T = unknown> extends RunEnvelope<T> {
  help?: HelpTopLevel | HelpCommandDetail;
}

// --- Command Input Base (FR-ARCH-0004, FR-ARCH-0006) ---
// All run delegate inputs must extend this interface.
// Defines the full vocabulary of input fields for commands in this batch.

export interface CommandInput {
  /** Routing parameter: identifies which subcommand to execute (FR-ARCH-0006). */
  subcommand?: string;
  /** Path to the plan JSON file (FR-PLAN-0010 through FR-PLAN-0015). */
  plan_file?: string;
  /** JSON payload: plan/phase/step data (FR-PLAN-0010, FR-PLAN-0015). */
  data?: string | Record<string, unknown>;
  /** Target identifier: step-id, phase-id, or "entire_plan" (FR-PLAN-0011 through FR-PLAN-0015). */
  target_id?: string;
  /** New status value for update_status (FR-PLAN-0012). */
  new_status?: string;
  /** Maximum items to return (FR-PLAN-0011). */
  limit?: number;
  /** Item kind for new items: "phase" | "step" (FR-PLAN-0015). */
  kind?: string;
  /** Parent phase ID for new steps (FR-PLAN-0015). */
  phase_id?: string;
}

// --- Run Delegate (FR-ARCH-0004) ---

export type RunDelegate<TInput extends CommandInput = CommandInput, TResult = unknown> = (
  input: TInput,
) => Promise<RunEnvelope<TResult>>;

// --- Tool Definition (FR-ARCH-0001) ---

export interface ToolDef<TInput extends CommandInput = CommandInput, TResult = unknown> {
  name: string;
  brief: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
  outputSchema: Record<string, unknown>; // JSON Schema object
  cli: boolean; // FR-ARCH-0005
  mcp: boolean; // FR-ARCH-0005
  run: RunDelegate<TInput, TResult>; // FR-ARCH-0004
}

// --- Help output shapes (FR-HELP-0001, FR-HELP-0002) ---

export interface HelpCommandEntry {
  name: string;
  brief: string;
}

export interface HelpTopLevel {
  tool: string;
  version: string;
  commands: HelpCommandEntry[];
  guidance: string;
}

export interface HelpCommandDetail {
  name: string;
  brief: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  subcommands?: HelpCommandEntry[];
}

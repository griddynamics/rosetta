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

  // FR-PLAN-0030 / FR-PLAN-0031 / FR-PLAN-0034 — kebab-case template parameter fields.
  // Uniform naming across CLI positionals, MCP named fields, and template placeholder names.
  /** FR-PLAN-0030 / FR-PLAN-0034 — value for the [plan-name] placeholder (create-with-template). */
  "plan-name"?: string;
  /** FR-PLAN-0030 / FR-PLAN-0034 — value for the [plan-description] placeholder (create-with-template). */
  "plan-description"?: string;
  /** FR-PLAN-0031 / FR-PLAN-0034 — value for the [phase-id] placeholder (upsert-with-template). */
  "phase-id"?: string;
  /** FR-PLAN-0031 / FR-PLAN-0034 — value for the [phase-name] placeholder (upsert-with-template). */
  "phase-name"?: string;
  /** FR-PLAN-0031 / FR-PLAN-0034 — value for the [phase-description] placeholder (upsert-with-template). */
  "phase-description"?: string;
  /** FR-PLAN-0030 / FR-PLAN-0031 — template name to look up in the kind-scoped registry. */
  template?: string;
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
  // FR-HELP-0002 — optional per-command help payload merged into HelpCommandDetail.
  // Carries the full content authored by the command (schemas, notes, plus
  // command-specific extensions like FR-PLAN-0016 plan_file/concepts/limits/templates/etc).
  // Tool's canonical name/brief/description always win over keys in this payload.
  helpContent?: Record<string, unknown>;
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

// FR-HELP-0002 — required minimum shape: {name, brief, description, schemas, subcommands?, notes}.
// Commands may extend with additional fields per their own FRs (e.g. FR-PLAN-0016 adds plan_file,
// concepts, subagent_fields, limits, templates, plan_authoring_guidance, next_steps_for_ai).
// The index signature accepts these without breaking the strict base shape.
export interface HelpCommandDetail {
  name: string;
  brief: string;
  description: string;
  /** FR-HELP-0002 — flat dictionary: subcommand name → JSON Schema (sourced from per-subcommand declarations). */
  schemas?: Record<string, unknown>;
  /** FR-HELP-0002 — subcommand listing. Each entry may carry richer per-command fields (examples, usage, args, description) per FR-PLAN-0016. */
  subcommands?: Array<Record<string, unknown>>;
  /** FR-HELP-0002 — string array of behavioral notes declared alongside the command's help content. */
  notes?: string[];
  /** Per-command extensions (FR-PLAN-0016 etc.). */
  [key: string]: unknown;
}

/** Consumer-facing success payload: the result object itself. */
export type SuccessPayload<T> = T;

/** Consumer-facing failure payload — never includes envelope wrapper fields. */
export interface FailurePayload {
  error: string;
  help?: HelpTopLevel | HelpCommandDetail;
}

/** Discriminated union returned by extractOutput. ok=true → result payload; ok=false → error payload. */
export type OutputPayload<T> = { ok: true; payload: T } | { ok: false; payload: FailurePayload };

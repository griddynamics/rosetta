import * as fs from "fs";
import * as path from "path";
import type { CommandInput } from "../../registry/types.js";
import {
  PLAN_MAX_PHASES,
  PLAN_MAX_STEPS_PER_PHASE,
  PLAN_MAX_DEPENDENCIES_PER_ITEM,
  PLAN_MAX_STRING_LENGTH,
  PLAN_MAX_NAME_LENGTH,
} from "../../shared/constants.js";

// ---------------------------------------------------------------------------
// Status Enum (FR-PLAN-0002)
// ---------------------------------------------------------------------------

export const VALID_STATUSES = [
  "open",
  "in_progress",
  "complete",
  "blocked",
  "failed",
] as const;

export type Status = (typeof VALID_STATUSES)[number];

// ---------------------------------------------------------------------------
// Data Types
// ---------------------------------------------------------------------------

export interface Step {
  id: string;
  name: string;
  prompt: string;
  status: Status;
  depends_on: string[];
  subagent?: string;
  role?: string;
  model?: string;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  status: Status;
  depends_on: string[];
  subagent?: string;
  role?: string;
  model?: string;
  steps: Step[];
}

export interface Plan {
  name: string;
  description: string;
  status: Status;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  phases: Phase[];
}

export interface PlanInput extends CommandInput {}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export interface CreateResult {
  plan_file: string;
  name: string;
  status: Status;
}

export interface NextStep {
  id: string;
  name: string;
  prompt: string;
  status: Status;
  depends_on: string[];
  phase_id: string;
  phase_name: string;
  resume?: boolean;
  previously_blocked?: boolean;
  previously_failed?: boolean;
  subagent?: string;
  role?: string;
  model?: string;
}

export interface NextResult {
  ready: NextStep[];
  count: number;
  plan_status: Status;
}

export interface UpdateStatusResult {
  id: string;
  status: Status;
  plan_status: Status;
}

export interface StatusTotals {
  open: number;
  in_progress: number;
  complete: number;
  blocked: number;
  failed: number;
  total: number;
  progress_pct: number;
}

export interface PhaseSummaryEntry {
  id: string;
  name: string;
  status: Status;
  steps: Array<{ id: string; name: string; status: Status }>;
}

export interface ShowStatusPlanResult {
  name: string;
  status: Status;
  phases: StatusTotals;
  steps: StatusTotals;
  phase_summary: PhaseSummaryEntry[];
}

export interface ShowStatusPhaseResult {
  id: string;
  name: string;
  status: Status;
  steps: Array<{ id: string; name: string; status: Status }>;
}

export interface ShowStatusStepResult {
  id: string;
  name: string;
  status: Status;
  depends_on: string[];
  subagent?: string;
  role?: string;
  model?: string;
}

export interface UpsertResult {
  id: string;
  plan_status: Status;
  message?: string;
}

// ---------------------------------------------------------------------------
// Merge Functions (RFC 7396)
// ---------------------------------------------------------------------------

export function mergePatch(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return patch as Record<string, unknown>;
  }
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    target = {};
  }
  const result: Record<string, unknown> = Object.assign({}, target);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = mergePatch(
        (result[key] as Record<string, unknown>) ?? {},
        value as Record<string, unknown>,
      );
    }
  }
  return result;
}

export type MergeByIdResult<T> = T[] | { error: string };

export function mergeById<T extends Record<string, unknown>>(
  existing: T[],
  incoming: T[],
): MergeByIdResult<T> {
  const result = [...existing];
  for (const patch of incoming) {
    if (!patch["id"]) return { error: "missing_id" };
    const idx = result.findIndex((i) => i["id"] === patch["id"]);
    if (idx >= 0) {
      result[idx] = mergePatch(
        result[idx] as Record<string, unknown>,
        patch as Record<string, unknown>,
      ) as T;
    } else {
      result.push(Object.assign({}, patch));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Status Functions
// ---------------------------------------------------------------------------

export function computeStatusFromChildren(statuses: Status[]): Status {
  if (!statuses.length) return "open";
  if (statuses.every((s) => s === "complete")) return "complete";
  if (statuses.some((s) => s === "failed")) return "failed";
  if (statuses.some((s) => s === "blocked")) return "blocked";
  if (statuses.some((s) => s === "in_progress" || s === "complete"))
    return "in_progress";
  return "open";
}

export function propagateStatuses(plan: Plan): void {
  for (const phase of plan.phases ?? []) {
    const stepStatuses = (phase.steps ?? []).map((s) => s.status ?? "open");
    if (stepStatuses.length) {
      phase.status = computeStatusFromChildren(stepStatuses);
    }
  }
  const phaseStatuses = (plan.phases ?? []).map((p) => p.status ?? "open");
  if (phaseStatuses.length) {
    plan.status = computeStatusFromChildren(phaseStatuses);
  }
}

export function findPhase(plan: Plan, id: string): Phase | undefined {
  return plan.phases.find((p) => p.id === id);
}

export function findStep(
  plan: Plan,
  id: string,
): { phase: Phase; step: Step } | undefined {
  for (const phase of plan.phases) {
    const step = phase.steps.find((s) => s.id === id);
    if (step) return { phase, step };
  }
  return undefined;
}

export function buildStepStatusMap(plan: Plan): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const phase of plan.phases ?? []) {
    for (const step of phase.steps ?? []) {
      if (step.id) m.set(step.id, step.status ?? "open");
    }
  }
  return m;
}

export function buildPhaseStatusMap(plan: Plan): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const phase of plan.phases ?? []) {
    if (phase.id) m.set(phase.id, phase.status ?? "open");
  }
  return m;
}

export function depsSatisfied(
  item: { depends_on: string[] },
  statusMap: Map<string, Status>,
): boolean {
  return (item.depends_on ?? []).every((d) => statusMap.get(d) === "complete");
}

// ---------------------------------------------------------------------------
// Validation Functions
// ---------------------------------------------------------------------------

export function validatePlanName(name: string): string | null {
  if (!name || !name.trim()) return "size_limit_exceeded";
  if (name.length > PLAN_MAX_NAME_LENGTH) return "size_limit_exceeded";
  return null;
}

export function validateNonNegativeLimit(limit: number): string | null {
  if (limit < 0) return "invalid_limit";
  return null;
}

export function validateImmutableId(
  patchId: string | undefined,
  targetId: string,
): string | null {
  if (patchId !== undefined && patchId !== targetId) return "immutable_id";
  return null;
}

export function validateUniqueIds(plan: Plan): string | null {
  const seen = new Set<string>();
  for (const phase of plan.phases ?? []) {
    if (phase.id) {
      if (seen.has(phase.id)) return "duplicate_id";
      seen.add(phase.id);
    }
    for (const step of phase.steps ?? []) {
      if (step.id) {
        if (seen.has(step.id)) return "duplicate_id";
        seen.add(step.id);
      }
    }
  }
  return null;
}

export function detectCycle(
  graph: Map<string, string[]>,
): string | null {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return "dependency_cycle";
    }
  }
  return null;
}

export function validateDependencies(plan: Plan): string | null {
  const allIds = new Set<string>();
  for (const phase of plan.phases ?? []) {
    if (phase.id) allIds.add(phase.id);
    for (const step of phase.steps ?? []) {
      if (step.id) allIds.add(step.id);
    }
  }

  // Build phase graph
  const phaseGraph = new Map<string, string[]>();
  for (const phase of plan.phases ?? []) {
    if (!phase.id) continue;
    phaseGraph.set(phase.id, []);
    for (const dep of phase.depends_on ?? []) {
      if (!allIds.has(dep)) return "unknown_dependency";
      phaseGraph.get(phase.id)!.push(dep);
    }
  }

  const phaseCycle = detectCycle(phaseGraph);
  if (phaseCycle) return phaseCycle;

  // Build step graph
  const stepGraph = new Map<string, string[]>();
  for (const phase of plan.phases ?? []) {
    for (const step of phase.steps ?? []) {
      if (!step.id) continue;
      stepGraph.set(step.id, []);
      for (const dep of step.depends_on ?? []) {
        if (!allIds.has(dep)) return "unknown_dependency";
        stepGraph.get(step.id)!.push(dep);
      }
    }
  }

  return detectCycle(stepGraph);
}

export function validateSizeLimits(plan: Plan): string | null {
  if ((plan.phases ?? []).length > PLAN_MAX_PHASES) return "size_limit_exceeded";

  if (plan.name && plan.name.length > PLAN_MAX_NAME_LENGTH)
    return "size_limit_exceeded";

  function checkStringLength(value: unknown): boolean {
    if (typeof value === "string" && value.length > PLAN_MAX_STRING_LENGTH)
      return false;
    return true;
  }

  function checkObj(obj: unknown): string | null {
    if (typeof obj !== "object" || obj === null) {
      if (!checkStringLength(obj)) return "size_limit_exceeded";
      return null;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const r = checkObj(item);
        if (r) return r;
      }
      return null;
    }
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (!checkStringLength(key)) return "size_limit_exceeded";
      const r = checkObj(val);
      if (r) return r;
    }
    return null;
  }

  for (const phase of plan.phases ?? []) {
    if ((phase.steps ?? []).length > PLAN_MAX_STEPS_PER_PHASE)
      return "size_limit_exceeded";
    if ((phase.depends_on ?? []).length > PLAN_MAX_DEPENDENCIES_PER_ITEM)
      return "size_limit_exceeded";

    const phaseCheck = checkObj(phase);
    if (phaseCheck) return phaseCheck;

    for (const step of phase.steps ?? []) {
      if ((step.depends_on ?? []).length > PLAN_MAX_DEPENDENCIES_PER_ITEM)
        return "size_limit_exceeded";
      const stepCheck = checkObj(step);
      if (stepCheck) return stepCheck;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

export function loadPlan(file: string): Plan | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Plan;
}

export function savePlan(file: string, plan: Plan): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  plan.updated_at = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(plan, null, 2));
}

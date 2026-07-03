import type { Role } from '../shared/models';
import { addUsage, makeUsage, zeroUsage, type Usage } from '../shared/trajectory';

/**
 * Cost meter (§12). Every router call records `{role, model, usage, durationMs}`. The
 * Curion reads the accumulated per-role totals into the trial cost block (`cost.fast` /
 * `cost.workhorse` / `cost.judge`) alongside the agent's own usage; the `cost-rollup`
 * stat then itemizes tokens (and $ where priced) across the suite.
 *
 * EVERY record is keyed by the concrete `provider/model` id that served it, not just
 * the role (§12: roles are labels; the model is the unit of account). Both token
 * usage AND wall-clock durations therefore itemize per model — consistently across
 * trial → group → suite.
 *
 * Token counts are ALWAYS tracked; dollar amounts come only from the config `pricing`
 * map at reporting time (§12) — the meter itself is money-agnostic.
 */

export interface CostRecord {
  role: Role;
  model: string;
  usage: Usage;
  /** Wall-clock spent in this router call (ms); feeds the `harnessLlmMs` breakdown. */
  durationMs: number;
}

/** The harness LLM roles that carry token/cost accounting (§12). */
export const HARNESS_ROLES: Role[] = ['fast', 'workhorse', 'judge'];

// Re-exported for existing importers (cost-rollup); the canonical definition lives in
// shared/trajectory.ts so the shared floor owns the usage helpers.
export { zeroUsage } from '../shared/trajectory';

export class CostMeter {
  readonly records: CostRecord[] = [];

  record(role: Role, model: string, usage: Usage, durationMs = 0): void {
    this.records.push({ role, model, usage: makeUsage(usage), durationMs });
  }

  /** Total wall-clock spent in all router calls (ms) — the `harnessLlmMs` total. */
  totalDurationMs(): number {
    return this.records.reduce((sum, r) => sum + r.durationMs, 0);
  }

  /** LLM wall-clock (ms) itemized per concrete model (§12 per-model duration keying). */
  durationByModel(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const r of this.records) out[r.model] = (out[r.model] ?? 0) + r.durationMs;
    return out;
  }

  /** Total usage per role (only roles that were actually used appear). */
  byRole(): Partial<Record<Role, Usage>> {
    const out: Partial<Record<Role, Usage>> = {};
    for (const role of HARNESS_ROLES) {
      const forRole = this.records.filter((r) => r.role === role);
      if (forRole.length === 0) continue;
      const total = zeroUsage();
      for (const r of forRole) addUsage(total, r.usage);
      out[role] = total;
    }
    return out;
  }

  /** Resolved model string observed per role (for $ itemization by model). */
  modelsByRole(): Partial<Record<Role, string>> {
    const out: Partial<Record<Role, string>> = {};
    for (const r of this.records) out[r.role] = r.model;
    return out;
  }
}

import type { AgentEffortRecord, AgentModelRecord } from '../results/schema';

/**
 * agentModel accounting (§5.2, M6.6). M6.5 reads the model the agent CLI ACTUALLY ran
 * from the SessionStart ctrl payload (the observed truth); M6.6 also passes the
 * REQUESTED model (profile < case < CLI) to the CLI as `--model`/`-m`. We record BOTH
 * on the trial and flag a mismatch, so a run that silently fell back to a different
 * model (e.g. an unavailable id, or a config the CLI ignored) is visible in trial.json.
 *
 * `mismatch` is only meaningful when BOTH the requested and observed models are known,
 * and uses a TOLERANT comparison: a CLI reports a fully-qualified id (e.g.
 * `claude-haiku-3-5-20241022`) while the requested value may be an alias or short id
 * (`haiku`, `claude-haiku-3-5`). Treat one being a case-insensitive substring of the
 * other as agreement — only a genuine divergence (neither contains the other) is a
 * mismatch. When either side is unknown we cannot assert disagreement, so `mismatch` is
 * omitted (undefined) rather than falsely reported.
 */

/** Minimum length for the SHORTER id before substring containment is allowed to imply
 *  agreement. Below this floor, only exact equality counts. Without it a 1-char token
 *  ("4", "5") is a substring of almost every full model id (`claude-sonnet-4-5`,
 *  `gpt-5.4-mini`) and would falsely report agreement. Two chars is the floor because
 *  real short aliases bottom out there (OpenAI `o1`/`o3`), and those must still match
 *  their full ids (`o1`⊂`o1-mini`). */
const MIN_SUBSTR_LEN = 2;

/** True when a requested model id and an observed model id refer to the same model
 *  (exact, or alias/short-id ⊂ full-id either direction), case-insensitive. The
 *  substring path is gated by MIN_SUBSTR_LEN on the shorter id (see above). */
export function agentModelsAgree(requested: string, observed: string): boolean {
  const r = requested.trim().toLowerCase();
  const o = observed.trim().toLowerCase();
  if (r === '' || o === '') return false;
  if (r === o) return true;
  // Substring containment only when the shorter id is long enough to be a meaningful
  // alias — never a lone digit/letter that trivially appears inside a full id.
  if (Math.min(r.length, o.length) < MIN_SUBSTR_LEN) return false;
  return o.includes(r) || r.includes(o);
}

/** Build the trial's agentModel record from the requested + observed ids (either may be
 *  undefined). Returns undefined when NEITHER is known (nothing to record). */
export function buildAgentModelRecord(
  requested: string | undefined,
  observed: string | undefined,
): AgentModelRecord | undefined {
  if (requested === undefined && observed === undefined) return undefined;
  const record: AgentModelRecord = {
    ...(requested !== undefined ? { requested } : {}),
    ...(observed !== undefined ? { observed } : {}),
  };
  if (requested !== undefined && observed !== undefined) {
    record.mismatch = !agentModelsAgree(requested, observed);
  }
  return record;
}

/**
 * agentEffort accounting (§5.2, M6.7). A SEPARATE dimension from the model with the same
 * record shape: the REQUESTED effort is what we passed to the CLI (profile < case < CLI),
 * the OBSERVED effort is what the CLI's Stop-hook payload reported (`effort.level`). Effort
 * is a small closed enum (low/medium/high/xhigh/max), so — unlike the model's alias/full-id
 * tolerance — agreement is exact case-insensitive equality. `mismatch` is only meaningful
 * when BOTH sides are known; otherwise it is omitted.
 */

/** True when a requested and observed effort refer to the same level (case-insensitive). */
export function agentEffortsAgree(requested: string, observed: string): boolean {
  const r = requested.trim().toLowerCase();
  const o = observed.trim().toLowerCase();
  if (r === '' || o === '') return false;
  return r === o;
}

/** Build the trial's agentEffort record from the requested + observed levels (either may
 *  be undefined). Returns undefined when NEITHER is known (nothing to record). */
export function buildAgentEffortRecord(
  requested: string | undefined,
  observed: string | undefined,
): AgentEffortRecord | undefined {
  if (requested === undefined && observed === undefined) return undefined;
  const record: AgentEffortRecord = {
    ...(requested !== undefined ? { requested } : {}),
    ...(observed !== undefined ? { observed } : {}),
  };
  if (requested !== undefined && observed !== undefined) {
    record.mismatch = !agentEffortsAgree(requested, observed);
  }
  return record;
}

// Implements FR-SPECS-0017 (approve subcommand). Draft|Modified -> Approved, setting
// approved_by to the resolved actor; idempotent on an already-Approved spec; Removed|Deprecated
// -> invalid_transition; a missing id -> target_not_found. Before approving, runs validate.ts's
// runValidation over every target (bypassing the query grammar — FILTER_KEYS has no `id` key,
// so approve resolves ids to Spec[] itself); any error-severity finding refuses the WHOLE batch
// with one aggregated validation_failed string naming every blocking finding.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { resolveActor } from "../../shared/actor.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { aggregate, type RejectRef } from "./aggregate.js";
import type { Spec } from "./core.js";
import { buildSpecLifecycleResult, type SpecLifecycleResult } from "./output.js";
import { ERR_INVALID_TRANSITION, ERR_TARGET_NOT_FOUND, ERR_VALIDATION_FAILED } from "./errors.js";
import { runValidation } from "./validate.js";

export async function cmdApprove(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecLifecycleResult>> {
  try {
    // FR-SPECS-0041 — resolved once, then passed as the EXPLICIT actor into applyBatchWrite so
    // approved_by (set inside `build`) and changed_by (stamped by the write path afterward) are
    // guaranteed to be the identical resolved value, not two independent resolutions.
    const resolvedActor = resolveActor(actor);

    const build: BatchBuild<SpecLifecycleResult> = (doc) => {
      const rejects: RejectRef[] = [];
      const targets: Spec[] = [];

      for (const id of ids ?? []) {
        const spec = (doc.specs ?? []).find((s) => s.id === id);
        if (!spec) {
          rejects.push({ ref: id, reason: ERR_TARGET_NOT_FOUND });
          continue;
        }
        if (spec.status === "Removed" || spec.status === "Deprecated") {
          rejects.push({ ref: id, reason: ERR_INVALID_TRANSITION });
          continue;
        }
        targets.push(spec);
      }
      if (rejects.length > 0) {
        return { ok: false, error: aggregate(rejects[0]!.reason, rejects) };
      }

      // FR-SPECS-0017 — validation gate runs over every target before any status changes; any
      // error-severity finding refuses the whole batch (nothing approved).
      const errorFindings = runValidation(doc, targets).filter((f) => f.severity === "error");
      if (errorFindings.length > 0) {
        const validationRejects: RejectRef[] = errorFindings.map((f) => ({ ref: f.id, reason: `${f.check}: ${f.message}` }));
        return { ok: false, error: aggregate(ERR_VALIDATION_FAILED, validationRejects) };
      }

      const affected: string[] = [];
      for (const spec of targets) {
        if (spec.status !== "Approved") {
          spec.status = "Approved"; // guarded — set only here, inside the write-path build
          spec.approved_by = resolvedActor;
        }
        affected.push(spec.id); // idempotent — already-Approved targets pass through unchanged
      }

      return { ok: true, affected, result: buildSpecLifecycleResult(doc, affected) };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { actor: resolvedActor });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const result = writeResult.result!.result;
    logger.info({ specsFile, count: result.updated.length }, "specs approve");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

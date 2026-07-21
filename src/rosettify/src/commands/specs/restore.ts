// Implements FR-SPECS-0019 (restore subcommand). Removed -> Draft (re-enters authoring, requires
// re-approval); any other current status -> invalid_transition (not idempotent — restoring an
// already-Draft spec is rejected, not a no-op). A missing id -> target_not_found.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { aggregate, type RejectRef } from "./aggregate.js";
import { buildSpecLifecycleResult, type SpecLifecycleResult } from "./output.js";
import { ERR_INVALID_TRANSITION, ERR_TARGET_NOT_FOUND } from "./errors.js";

export async function cmdRestore(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecLifecycleResult>> {
  try {
    const build: BatchBuild<SpecLifecycleResult> = (doc) => {
      const rejects: RejectRef[] = [];
      const affected: string[] = [];

      for (const id of ids ?? []) {
        const spec = (doc.specs ?? []).find((s) => s.id === id);
        if (!spec) {
          rejects.push({ ref: id, reason: ERR_TARGET_NOT_FOUND });
          continue;
        }
        if (spec.status !== "Removed") {
          rejects.push({ ref: id, reason: ERR_INVALID_TRANSITION });
          continue;
        }
        spec.status = "Draft"; // guarded — set only here, inside the write-path build
        affected.push(id);
      }

      if (rejects.length > 0) {
        return { ok: false, error: aggregate(rejects[0]!.reason, rejects) };
      }
      return { ok: true, affected, result: buildSpecLifecycleResult(doc, affected) };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { actor });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const result = writeResult.result!.result;
    logger.info({ specsFile, count: result.updated.length }, "specs restore");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

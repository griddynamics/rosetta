// Implements FR-SPECS-0014 (delete subcommand — soft-delete). Sets status=Removed, retains the
// unit. Idempotent (re-deleting an already-Removed spec succeeds, no-op). A missing id is
// reported in `missing`, never errors the batch.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import type { SpecDeleteResult } from "./output.js";

export async function cmdDelete(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecDeleteResult>> {
  try {
    const build: BatchBuild<SpecDeleteResult> = (doc) => {
      const removed: string[] = [];
      const missing: string[] = [];

      for (const id of ids ?? []) {
        const spec = (doc.specs ?? []).find((s) => s.id === id);
        if (!spec) {
          missing.push(id);
          continue;
        }
        spec.status = "Removed"; // guarded — set only here, inside the write-path build (FR-SPECS-0040); idempotent if already Removed
        removed.push(id);
      }

      return { ok: true, affected: removed, result: { removed, missing } };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { actor });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const result = writeResult.result!.result;
    logger.info({ specsFile, removed: result.removed.length, missing: result.missing.length }, "specs delete");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

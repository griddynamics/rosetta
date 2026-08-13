// Implements FR-SPECS-0016 (purge subcommand — permanent removal). Requires --force
// (force_required otherwise). Refuses with referenced_by_others (aggregated) when a remaining
// spec outside this batch still references a purge target, unless every referrer is also purged
// in the same batch. A missing id is reported in `missing`, never errors the batch. Routes
// through applyBatchWrite's write path but returns affected:[] — a purged spec no longer exists
// to stamp changed/changed_by on.
// Purge erases the CONTENT of a requirement completely and its IDENTITY deliberately not at all:
// every purged id is recorded in the document and stays taken forever, so it can never be handed
// to a different requirement later and a reader of an old reference is never silently misled.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { aggregate, type RejectRef } from "./aggregate.js";
import type { SpecPurgeResult } from "./output.js";
import { ERR_FORCE_REQUIRED, ERR_REFERENCED_BY_OTHERS } from "./errors.js";

export async function cmdPurge(
  specsFile: string,
  ids: string[],
  force: boolean,
  actor?: string,
): Promise<RunEnvelope<SpecPurgeResult>> {
  try {
    if (!force) return err(ERR_FORCE_REQUIRED, true); // FR-ARCH-0015

    const build: BatchBuild<SpecPurgeResult> = (doc) => {
      const idSet = new Set(ids ?? []);
      const missing: string[] = [];
      const purgeable: string[] = [];
      for (const id of ids ?? []) {
        if ((doc.specs ?? []).some((s) => s.id === id)) purgeable.push(id);
        else missing.push(id);
      }

      // FR-SPECS-0005/0016 — a purge target still referenced by a spec NOT itself in this batch
      // is rejected (aggregated across every offending target).
      const rejects: RejectRef[] = [];
      for (const target of purgeable) {
        const referrers = (doc.specs ?? []).filter(
          (s) => !idSet.has(s.id) && ((s.depends_on ?? []).includes(target) || (s.related ?? []).includes(target)),
        );
        if (referrers.length > 0) {
          // FR-SPECS-0016 — the rejection reason MUST be a single human-readable string listing
          // the referencing ids, not just the bare error code.
          const referrerIds = referrers.map((r) => r.id).join(", ");
          rejects.push({ ref: target, reason: `${ERR_REFERENCED_BY_OTHERS} (referenced by: ${referrerIds})` });
        }
      }
      if (rejects.length > 0) {
        return { ok: false, error: aggregate(ERR_REFERENCED_BY_OTHERS, rejects) };
      }

      // FR-SPECS-0016/FR-SPECS-0009 — record identity before erasing content. Placed after the
      // referenced_by_others gate above so a rejected batch leaves the registry untouched, and
      // before the removal below so the ids are still known to be genuinely purgeable. The union
      // keeps the field idempotent under any repeated call path.
      doc.purged_ids = [...new Set([...(doc.purged_ids ?? []), ...purgeable])];

      doc.specs = (doc.specs ?? []).filter((s) => !purgeable.includes(s.id));
      // affected:[] — the purged specs no longer exist in doc.specs to stamp changed/changed_by.
      return { ok: true, affected: [], result: { purged: purgeable, missing } };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { actor });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const result = writeResult.result!.result;
    logger.info({ specsFile, purged: result.purged.length, missing: result.missing.length }, "specs purge");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

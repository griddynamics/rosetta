// Implements the single specs write path (SPECS §7; FR-SPECS-0030, 0040, 0070). Every write
// subcommand (add, update, delete, purge, implemented, approve, deprecate, restore, reopen)
// routes through applyBatchWrite so IO, actor/time stamping, and post-batch integrity are
// implemented exactly once — lifecycle ops never re-implement any of it themselves.

import * as fs from "fs";
import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { atomicWriteWithBackup } from "../../shared/doc-io.js";
import { resolveActor } from "../../shared/actor.js";
import { nowUtcZ } from "../../shared/time.js";
import {
  type SpecsDocument,
  newDocument,
  saveSpecs,
  validateSizeLimits,
  validateUniqueIds,
  validateReferences,
  validateDependsAcyclic,
} from "./core.js";
import { ERR_MISSING_SYSTEM, ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND, ERR_SYSTEM_MISMATCH } from "./errors.js";

/**
 * A pure in-memory mutator over a working copy of the document. Returns the ids it touched
 * (for changed/changed_by stamping) plus the caller's own result payload, or an aggregatable
 * error string on failure. MUST NOT perform IO — applyBatchWrite owns that.
 */
export interface BatchBuild<T> {
  (doc: SpecsDocument): { ok: true; affected: string[]; result: T } | { ok: false; error: string };
}

type MutateOutcome<T> =
  | { ok: true; result: T; updated: SpecsDocument }
  | { ok: false; error: string };

/**
 * Applies one write-path batch to a specs document (SPECS §7 algorithm):
 * 1. Resolve actor once (opts.actor, else the env/git/OS fallback chain) and the write
 *    timestamp once, so every affected spec in this batch shares identical stamps.
 * 2. Reconcile opts.system (when supplied) against the doc's stored `system` (FR-SPECS-0002):
 *    a stored empty name adopts the supplied one, an identical name is a no-op, and a
 *    different one is rejected with system_mismatch — before `build` runs.
 * 3. Run `build` over the in-memory doc; on success, stamp every affected id's
 *    changed/changed_by, then run the post-batch integrity chain (FR-SPECS-0005/0007) in the
 *    order required by SPECS §5: size limits → unique ids → references → depends-acyclic.
 * 4. If `opts.allowCreate` and the file does not yet exist, bypass the atomic write cycle
 *    entirely (mirrors plan's upsert first-create bypass) — build over a fresh document and
 *    save it directly; previous_version stays null. Creating without opts.system is rejected
 *    with missing_system (FR-SPECS-0002) before the fresh document is even constructed.
 * 5. Otherwise route through the shared atomicWriteWithBackup (lock + backup + rename), with
 *    specs' own not-found/corrupted error codes, and surface its backupPath as previous_version.
 */
export async function applyBatchWrite<T>(
  file: string,
  build: BatchBuild<T>,
  opts?: { allowCreate?: boolean; actor?: string; system?: string },
): Promise<RunEnvelope<{ result: T; previous_version: string | null }>> {
  const actor = resolveActor(opts?.actor); // FR-SPECS-0041
  const ts = nowUtcZ(); // FR-SPECS-0042 — resolved once per call, shared by every affected spec

  function mutateFn(doc: SpecsDocument): MutateOutcome<T> {
    // FR-SPECS-0002 — reconcile a supplied system name against what is stored, before `build`
    // runs: an empty stored name adopts the supplied one (a legacy document's only path to
    // acquire one), an identical name is accepted as a no-op, and a different one is rejected.
    if (opts?.system) {
      if (!doc.system) {
        doc.system = opts.system;
      } else if (doc.system !== opts.system) {
        return { ok: false, error: ERR_SYSTEM_MISMATCH };
      }
    }

    const built = build(doc);
    if (!built.ok) return { ok: false, error: built.error };

    // FR-SPECS-0041/0042 — stamp every affected spec once, using the timestamp/actor resolved
    // for this call. `build` itself never sets these — they are the write path's job alone.
    const affectedSet = new Set(built.affected);
    for (const spec of doc.specs ?? []) {
      if (affectedSet.has(spec.id)) {
        spec.changed = ts;
        spec.changed_by = actor;
      }
    }

    // FR-SPECS-0005/0007 — post-batch integrity over the resulting state, in the order fixed
    // by SPECS §5. `related` is intentionally excluded from cycle detection inside this chain.
    const integrityError =
      validateSizeLimits(doc) ?? validateUniqueIds(doc) ?? validateReferences(doc) ?? validateDependsAcyclic(doc);
    if (integrityError) return { ok: false, error: integrityError };

    return { ok: true, result: built.result, updated: doc };
  }

  // FR-SPECS-0002 — first-ever create bypasses the rename-as-guard cycle (nothing to rename yet).
  if (opts?.allowCreate && !fs.existsSync(file)) {
    if (!opts?.system) return err(ERR_MISSING_SYSTEM, true); // absent-argument usage error, like missing_data
    const outcome = mutateFn(newDocument(opts.system));
    if (!outcome.ok) return err(outcome.error);
    saveSpecs(file, outcome.updated); // previous_version stays null on first create
    return ok({ result: outcome.result, previous_version: null });
  }

  const writeResult = await atomicWriteWithBackup<SpecsDocument, T>(file, mutateFn, saveSpecs, {
    errors: { corrupted: ERR_SPECS_FILE_CORRUPTED, notFound: ERR_SPECS_NOT_FOUND },
  });

  if (!writeResult.ok) {
    return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
  }

  const { result, backupPath } = writeResult.result!;
  return ok({ result, previous_version: backupPath }); // FR-SPECS-0070 — surfaced in the write result
}

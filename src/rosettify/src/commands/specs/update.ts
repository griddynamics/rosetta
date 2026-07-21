// Implements FR-SPECS-0013 (update subcommand). Batch RFC 7396 merge-patch; guarded fields
// silently dropped; an Approved spec's normative edit (statement/acceptance) auto-transitions to
// Modified (+ clears approved_by), and if its implementation was Implemented, to ToBeModified.
// All-or-nothing (FR-SPECS-0030). Resolution: update's authoritative error catalog (SPECS.md
// FR-SPECS-0013) is exactly {target_not_found, immutable_id, invalid_spec_field,
// unknown_dependency, dependency_cycle, duplicate_id, size_limit_exceeded, invalid_data,
// missing_data} — deliberately NOT invalid_type/missing_required_field (those are add-only,
// SPECS FR-SPECS-0010), so a patch is not re-validated against the full add-time schema. The one
// exception: source/priority/verification enum membership (FR-SPECS-0001) IS enforced on the
// merged spec — those are structural (a fixed value set, not an add-time completeness check),
// so leaving them unchecked would let a patch persist a spec no read path could rely on.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { aggregate, type RejectRef } from "./aggregate.js";
import {
  type Spec,
  stripGuarded,
  validateImmutableId,
  validateKnownFields,
  validatePriority,
  validateSource,
  validateVerification,
} from "./core.js";
import { type SpecWriteResult, buildSpecWriteResult, withPreviousVersion } from "./output.js";
import { ERR_INVALID_DATA, ERR_MISSING_DATA, ERR_MISSING_ID, ERR_TARGET_NOT_FOUND } from "./errors.js";

/**
 * RFC 7396 JSON Merge Patch (specs-local copy of the plan pattern — NOT imported from
 * commands/plan to avoid command→command coupling, per architecture-notes' detectCycle
 * precedent). `null` removes a key; nested plain objects merge recursively; scalars and arrays
 * replace wholesale (Spec has no nested plain-object fields, so the recursion never actually
 * descends for this command's data, but the general form is kept for parity/future-proofing).
 */
function mergePatch(target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) return patch;
  if (typeof target !== "object" || target === null || Array.isArray(target)) target = {};
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = mergePatch((result[key] as Record<string, unknown>) ?? {}, value as Record<string, unknown>);
    }
  }
  return result;
}

export async function cmdUpdate(specsFile: string, patches: unknown[], actor?: string): Promise<RunEnvelope<SpecWriteResult>> {
  try {
    if (!patches || patches.length === 0) return err(ERR_MISSING_DATA, true);

    const build: BatchBuild<SpecWriteResult> = (doc) => {
      const rejects: RejectRef[] = [];
      const affected: string[] = [];

      patches.forEach((raw, index) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          // FR-SPECS-0013: a non-object patch item is invalid_data (not invalid_spec_field,
          // which is reserved for an object carrying an unknown field).
          rejects.push({ ref: `index ${index}`, reason: ERR_INVALID_DATA });
          return;
        }
        const patch = raw as Record<string, unknown>;
        const targetId = typeof patch["id"] === "string" ? patch["id"] : undefined;
        if (!targetId) {
          rejects.push({ ref: `index ${index}`, reason: ERR_MISSING_ID });
          return;
        }

        const idx = (doc.specs ?? []).findIndex((s) => s.id === targetId);
        if (idx < 0) {
          rejects.push({ ref: targetId, reason: ERR_TARGET_NOT_FOUND });
          return;
        }
        const existing = doc.specs[idx]!;

        // FR-SPECS-0013 — a patch body carrying a different id is rejected. This is
        // STRUCTURALLY UNREACHABLE in this design: targetId (the lookup key used just above to
        // find `existing`) IS patch["id"] itself, so validateImmutableId(targetId, existing.id)
        // always compares targetId to itself and can never observe a mismatch. Kept anyway per
        // SPECS §10 and the plan-upsert precedent it mirrors — a cheap defensive net that costs
        // nothing and guards against a future refactor that changes how the target is resolved.
        const immutableErr = validateImmutableId(targetId, existing.id);
        if (immutableErr) {
          rejects.push({ ref: targetId, reason: immutableErr });
          return;
        }

        // FR-SPECS-0040 — guarded fields silently dropped; `id` is excluded from the merge
        // itself (immutable), never passed to mergePatch at all.
        const { id: _dropId, ...patchWithoutId } = stripGuarded(patch);
        const knownErr = validateKnownFields(patchWithoutId);
        if (knownErr) {
          rejects.push({ ref: targetId, reason: knownErr });
          return;
        }

        const merged = mergePatch(existing as unknown as Record<string, unknown>, patchWithoutId) as unknown as Spec;
        merged.id = existing.id;

        // FR-SPECS-0001 — source/priority/verification enum membership is structural (same
        // treatment as add's invalid_type), so a patch that leaves the resulting spec with a
        // value outside the allowed enum is a hard rejection, not silently merged.
        const sourceErr = validateSource(merged.source);
        if (sourceErr) {
          rejects.push({ ref: targetId, reason: sourceErr });
          return;
        }
        const priorityErr = validatePriority(merged.priority);
        if (priorityErr) {
          rejects.push({ ref: targetId, reason: priorityErr });
          return;
        }
        const verificationErr = validateVerification(merged.verification);
        if (verificationErr) {
          rejects.push({ ref: targetId, reason: verificationErr });
          return;
        }

        // FR-SPECS-0013 — normative edit (statement|acceptance) on an Approved spec forces
        // re-approval; if its implementation was Implemented, the implementation is revisited.
        const normativeEdit = patchWithoutId["statement"] !== undefined || patchWithoutId["acceptance"] !== undefined;
        if (normativeEdit && existing.status === "Approved") {
          merged.status = "Modified"; // guarded — set only here, inside the write-path build
          merged.approved_by = "";
        }
        if (normativeEdit && existing.implementation === "Implemented") {
          merged.implementation = "ToBeModified";
        }

        doc.specs[idx] = merged;
        affected.push(targetId);
      });

      if (rejects.length > 0) {
        return { ok: false, error: aggregate(rejects[0]!.reason, rejects) };
      }

      const result = buildSpecWriteResult(doc, affected, null);
      return { ok: true, affected, result };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { actor }); // update never creates (FR-SPECS-0013 targets must pre-exist)
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const { result, previous_version } = writeResult.result!;
    logger.info({ specsFile, count: result.affected.length }, "specs update");
    return ok(withPreviousVersion(result, previous_version));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

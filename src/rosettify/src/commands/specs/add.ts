// Implements FR-SPECS-0010 (add subcommand). Batch append of caller-supplied spec objects;
// creates the document if it does not yet exist (FR-SPECS-0002). All-or-nothing (FR-SPECS-0030):
// any rejected item fails the whole batch with one aggregated error string, nothing is written.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { aggregate, type RejectRef } from "./aggregate.js";
import {
  type AcceptanceCriterion,
  type MoscowEnum,
  type Spec,
  type SourceEnum,
  type SpecType,
  type VerifEnum,
  autoRegisterAreas,
  stripGuarded,
  validateAreaRegistration,
  validateIdFormat,
  validateKnownFields,
  validatePriority,
  validateRequired,
  validateSource,
  validateType,
  validateVerification,
} from "./core.js";
import { type SpecWriteResult, buildSpecWriteResult, withPreviousVersion } from "./output.js";
import { ERR_MISSING_DATA, ERR_MISSING_ID, ERR_INVALID_SPEC_FIELD } from "./errors.js";

// FR-SPECS-0010 — new spec always enters as Draft/NotStarted regardless of caller input; any
// status/approved_by/implementation on the item is dropped by stripGuarded before this runs.
function prepareItem(raw: unknown, index: number): { spec: Spec } | { reject: RejectRef } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { reject: { ref: `index ${index}`, reason: ERR_INVALID_SPEC_FIELD } };
  }
  const item = raw as Record<string, unknown>;
  const idRaw = item["id"];
  if (typeof idRaw !== "string" || idRaw.trim() === "") {
    return { reject: { ref: `index ${index}`, reason: ERR_MISSING_ID } };
  }
  const id = idRaw;

  const stripped = stripGuarded(item); // FR-SPECS-0040 — caller-supplied status/approved_by/implementation/changed_by ignored

  const knownErr = validateKnownFields(stripped);
  if (knownErr) return { reject: { ref: id, reason: knownErr } };

  const typeErr = validateType(stripped["type"]);
  if (typeErr) return { reject: { ref: id, reason: typeErr } };

  // FR-SPECS-0001 — source/priority/verification enum membership is structural (like `type`
  // above), so a bad value is a hard rejection here, not a validate-only phrasing check.
  const sourceErr = validateSource(stripped["source"]);
  if (sourceErr) return { reject: { ref: id, reason: sourceErr } };

  const priorityErr = validatePriority(stripped["priority"]);
  if (priorityErr) return { reject: { ref: id, reason: priorityErr } };

  const verificationErr = validateVerification(stripped["verification"]);
  if (verificationErr) return { reject: { ref: id, reason: verificationErr } };

  const idFormatErr = validateIdFormat(id);
  if (idFormatErr) return { reject: { ref: id, reason: idFormatErr } };

  const spec: Spec = {
    id,
    type: stripped["type"] as SpecType,
    level: typeof stripped["level"] === "string" && stripped["level"].trim() !== "" ? (stripped["level"] as string) : "System",
    ...(typeof stripped["ticket_id"] === "string" ? { ticket_id: stripped["ticket_id"] as string } : {}),
    ...(typeof stripped["classification"] === "string" ? { classification: stripped["classification"] as string } : {}),
    title: (stripped["title"] as string) ?? "",
    statement: (stripped["statement"] as string) ?? "",
    rationale: (stripped["rationale"] as string) ?? "",
    source: stripped["source"] as SourceEnum,
    priority: stripped["priority"] as MoscowEnum,
    status: "Draft", // FR-SPECS-0040 — guarded default
    approved_by: "",
    changed: "", // stamped by applyBatchWrite (FR-SPECS-0041/0042)
    changed_by: "",
    verification: stripped["verification"] as VerifEnum,
    acceptance: (stripped["acceptance"] as AcceptanceCriterion[]) ?? [],
    depends_on: (stripped["depends_on"] as string[]) ?? [],
    related: (stripped["related"] as string[]) ?? [],
    implementation: "NotStarted", // guarded default
    implementation_notes: (stripped["implementation_notes"] as string) ?? "",
    notes: (stripped["notes"] as string) ?? "",
  };

  const requiredErr = validateRequired(spec);
  if (requiredErr) return { reject: { ref: id, reason: requiredErr } };

  return { spec };
}

/**
 * FR-SPECS-0010 — appends `items` (each a spec object) to the document at `specsFile`, creating
 * it if missing. Resolution (ambiguity: aggregate.ts's `code` is one string but a batch may fail
 * for several distinct reasons across items) — every RejectRef.reason here is the bare error
 * code (not its prose template), matching every other error surface in this command being
 * code-based; the aggregate's leading `code` reuses the first violation's own code, since SPECS
 * §13 names no separate umbrella code for a mixed-cause batch rejection.
 */
export async function cmdAdd(specsFile: string, items: unknown[], actor?: string): Promise<RunEnvelope<SpecWriteResult>> {
  try {
    if (!items || items.length === 0) return err(ERR_MISSING_DATA, true);

    const build: BatchBuild<SpecWriteResult> = (doc) => {
      const rejects: RejectRef[] = [];
      const prepared: Spec[] = [];

      items.forEach((raw, index) => {
        const outcome = prepareItem(raw, index);
        if ("reject" in outcome) {
          rejects.push(outcome.reject);
        } else {
          prepared.push(outcome.spec);
        }
      });

      if (rejects.length > 0) {
        return { ok: false, error: aggregate(rejects[0]!.reason, rejects) };
      }

      const newIds = prepared.map((s) => s.id);
      // FR-SPECS-0004 — register any new AREA before the registration check below, so a batch
      // introducing a brand-new area succeeds instead of being rejected unknown_area.
      autoRegisterAreas(doc, newIds);
      for (const spec of prepared) {
        const areaErr = validateAreaRegistration(spec, doc);
        if (areaErr) return { ok: false, error: aggregate(areaErr, [{ ref: spec.id, reason: areaErr }]) };
      }

      doc.specs = [...(doc.specs ?? []), ...prepared];
      // previous_version is a placeholder here — the real backup path is only known after
      // applyBatchWrite returns; injected below via withPreviousVersion.
      const result = buildSpecWriteResult(doc, newIds, null);
      return { ok: true, affected: newIds, result };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { allowCreate: true, actor });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const { result, previous_version } = writeResult.result!;
    logger.info({ specsFile, count: result.affected.length }, "specs add");
    return ok(withPreviousVersion(result, previous_version));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

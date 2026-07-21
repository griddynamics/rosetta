// Implements FR-SPECS-0021 (validate subcommand). Read-only: runs structural (schema/id/area/
// uniqueness/reference/cycle/size, core.ts-flavored) and phrasing (EARS/measurable-NFR/modal-verb/
// duplicate-statement, rubric.ts) checks over a target set, WITHOUT mutating the document.
// Structural findings are severity "error" (they block approve, FR-SPECS-0017); phrasing findings
// are "warning" (advisory only). validate does NOT assess subjective qualities (unambiguity,
// scope-creep, completeness-against-intent) — those remain the reviewer's responsibility.
//
// `runValidation` is exported standalone (not just via cmdValidate) because approve.ts calls it
// directly with its own id-resolved Spec[] as targets, bypassing the query grammar entirely
// (FILTER_KEYS has no `id` key) — per SPECS §10/§11.1.
//
// Resolution (ambiguity — FR-SPECS-0021's severity sentence names "missing required field,
// invalid id format, duplicate id, unknown reference, dependency cycle, size limit" as the
// structural/error bucket without mentioning acceptance completeness at all, even though it is
// one of "these checks" the statement lists running): acceptance completeness is treated as
// severity "error" here, not "warning" — it lives in rubric.ts only for module-colocation
// reasons (that file's own header explicitly calls it "structural, not phrasing"), and it is the
// natural finer-grained sibling of the already-error "missing required field" check (which only
// catches an empty acceptance ARRAY, not an incomplete criterion within a non-empty one).

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import {
  SPECS_MAX_ACCEPTANCE_PER_SPEC,
  SPECS_MAX_DEPENDENCIES_PER_SPEC,
  SPECS_MAX_NAME_LENGTH,
  SPECS_MAX_SPECS,
  SPECS_MAX_STRING_LENGTH,
} from "../../shared/constants.js";
import {
  type Spec,
  type SpecsDocument,
  validateAreaRegistration,
  validateIdFormat,
  validatePriority,
  validateRequired,
  validateSource,
  validateVerification,
} from "./core.js";
import type { SpecFinding, SpecValidateResult, Severity } from "./output.js";
import { ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";
import { applyFilter, parseQuery } from "./query-filter.js";
import { checkAcceptanceComplete, checkEars, checkMeasurableNfr, checkModalVerbs, findDuplicateStatements } from "./rubric.js";
import { enumerateCycles } from "./graph.js";

function finding(id: string, check: string, severity: Severity, message: string): SpecFinding {
  return { id, check, severity, message };
}

/** FR-SPECS-0007 per-spec slice of core.ts's validateSizeLimits (array-length + string-length
 * limits), scoped to one spec so it can be attributed to that spec's finding. */
function sizeLimitIssue(spec: Spec): string | null {
  if ((spec.depends_on ?? []).length > SPECS_MAX_DEPENDENCIES_PER_SPEC) return "depends_on exceeds the maximum allowed entries.";
  if ((spec.related ?? []).length > SPECS_MAX_DEPENDENCIES_PER_SPEC) return "related exceeds the maximum allowed entries.";
  if ((spec.acceptance ?? []).length > SPECS_MAX_ACCEPTANCE_PER_SPEC) return "acceptance exceeds the maximum allowed criteria.";
  if ((spec.id ?? "").length > SPECS_MAX_NAME_LENGTH || (spec.title ?? "").length > SPECS_MAX_NAME_LENGTH) {
    return "id or title exceeds the maximum allowed length.";
  }
  const longStringFields: Array<keyof Spec> = ["statement", "rationale", "notes", "implementation_notes"];
  for (const f of longStringFields) {
    const v = spec[f];
    if (typeof v === "string" && v.length > SPECS_MAX_STRING_LENGTH) return `${f} exceeds the maximum allowed length.`;
  }
  return null;
}

/**
 * FR-SPECS-0021 — runs every check over `targets`, using `doc` (the whole document) for
 * cross-reference/cycle/duplicate context so a target's finding can be informed by specs outside
 * the target set (e.g. a target's statement duplicating some other, unrelated existing spec).
 * Findings are only ever emitted for ids in `targets` — "a filter scoping to one area" (or an
 * explicit id-resolved target list from approve) means only those specs are checked.
 */
export function runValidation(doc: SpecsDocument, targets: Spec[]): SpecFinding[] {
  const findings: SpecFinding[] = [];
  const allSpecs = doc.specs ?? [];

  const idCounts = new Map<string, number>();
  for (const s of allSpecs) idCounts.set(s.id, (idCounts.get(s.id) ?? 0) + 1);
  const allIds = new Set(allSpecs.map((s) => s.id));

  const dependsMap = new Map<string, string[]>();
  for (const s of allSpecs) dependsMap.set(s.id, [...(s.depends_on ?? [])]);
  const idsInCycle = new Set<string>();
  for (const cycle of enumerateCycles(dependsMap)) {
    for (const edge of cycle) {
      idsInCycle.add(edge.from);
      idsInCycle.add(edge.to);
    }
  }

  const duplicatesById = new Map<string, string[]>();
  for (const group of findDuplicateStatements(allSpecs)) {
    for (const id of group.ids) duplicatesById.set(id, group.ids.filter((other) => other !== id));
  }

  for (const spec of targets) {
    // Structural — error (FR-SPECS-0001, 0004, 0005, 0007)
    if (validateRequired(spec)) {
      findings.push(finding(spec.id, "schema_completeness", "error", "A required field is missing or empty."));
    }
    if (validateIdFormat(spec.id)) {
      findings.push(finding(spec.id, "id_format", "error", "The spec id does not match the required <PREFIX>-<AREA>-<NNNN> format."));
    }
    if (validateAreaRegistration(spec, doc)) {
      findings.push(finding(spec.id, "area_registration", "error", "The spec's area is not registered in this document."));
    }
    // FR-SPECS-0001 — enum membership for source/priority/verification is machine-checkable
    // integrity, same bucket as the other structural checks in this loop.
    if (validateSource(spec.source)) {
      findings.push(finding(spec.id, "source_enum", "error", "The spec's source is not one of User, Inferred, Sources, Documentation."));
    }
    if (validatePriority(spec.priority)) {
      findings.push(finding(spec.id, "priority_enum", "error", "The spec's priority is not one of Must, Should, Could, Wont."));
    }
    if (validateVerification(spec.verification)) {
      findings.push(finding(spec.id, "verification_enum", "error", "The spec's verification is not one of Test, Analysis, Inspection, Demo."));
    }
    if ((idCounts.get(spec.id) ?? 0) > 1) {
      findings.push(finding(spec.id, "uniqueness", "error", "This id is used by more than one spec in the document."));
    }
    const missingRefs = [...(spec.depends_on ?? []), ...(spec.related ?? [])].filter((r) => !allIds.has(r));
    if (missingRefs.length > 0) {
      findings.push(finding(spec.id, "reference_integrity", "error", `References an id absent from this document: ${missingRefs.join(", ")}.`));
    }
    if (idsInCycle.has(spec.id)) {
      findings.push(finding(spec.id, "depends_acyclic", "error", "Participates in a depends_on cycle."));
    }
    if (!checkAcceptanceComplete(spec)) {
      findings.push(finding(spec.id, "acceptance_completeness", "error", "Acceptance is empty, or a criterion is missing given/when/then."));
    }
    const sizeIssue = sizeLimitIssue(spec);
    if (sizeIssue) {
      findings.push(finding(spec.id, "size_limits", "error", sizeIssue));
    }

    // Phrasing — warning (FR-SPECS-0006)
    if (spec.type === "FR" && !checkEars(spec.statement ?? "")) {
      findings.push(finding(spec.id, "ears_pattern", "warning", "The statement does not match an EARS pattern."));
    }
    if (spec.type === "NFR" && !checkMeasurableNfr(spec.statement ?? "")) {
      findings.push(finding(spec.id, "measurable_nfr", "warning", "The statement lacks a quantified metric with a threshold and condition."));
    }
    if (!checkModalVerbs(spec.statement ?? "")) {
      findings.push(finding(spec.id, "modal_verbs", "warning", "The statement does not use shall/should/may."));
    }
    const duplicatesOf = duplicatesById.get(spec.id);
    if (duplicatesOf && duplicatesOf.length > 0) {
      findings.push(finding(spec.id, "duplicate_statement", "warning", `Shares its statement verbatim with: ${duplicatesOf.join(", ")}.`));
    }
  }

  // FR-SPECS-0007 — doc-wide total-count limit has no single target to attribute to.
  if (allSpecs.length > SPECS_MAX_SPECS) {
    findings.push(finding("(document)", "size_limits", "error", "The document exceeds the maximum number of specs."));
  }

  return findings;
}

export async function cmdValidate(specsFile: string, query?: string): Promise<RunEnvelope<SpecValidateResult>> {
  try {
    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    const filter = parseQuery(query);
    if ("error" in filter) return err(filter.error);
    const targets = applyFilter(doc.specs ?? [], filter);

    const findings = runValidation(doc, targets);
    const error_count = findings.filter((f) => f.severity === "error").length;
    const warning_count = findings.filter((f) => f.severity === "warning").length;
    return ok({ ok: error_count === 0, findings, error_count, warning_count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

// Implements FR-SPECS-0004/0005/0006/0021 (validate subcommand). Read-only: runs every check
// FR-SPECS-0021 names over a target set and NEVER mutates the document (AC9) — in particular it
// does not register areas, seed the reserved quality-characteristic codes, or touch the purged-id
// registry, all of which are write-path concerns.
//
// Severity is fixed by FR-SPECS-0021, not chosen here. Error = a fact decided from the stored
// fields alone: schema completeness, id format, area registration, enum membership, uniqueness,
// reference integrity, dependency acyclicity, criterion id shape and per-unit uniqueness,
// criterion EARS conformance, acceptance completeness, a location name the level requires, size
// limits. Warning = a text heuristic or a recommendation: no quantity token in a non-functional
// statement, no modal verb, empty evidence against a code-derived source, an area outside the
// nine recommended codes, a repeated statement, a location name only recommended at this level.
//
// A warning message states the omission the heuristic found and nothing more — passing one means
// the text carries the expected token, not that the requirement is measurable, distinct, or truly
// derived from the code it cites. validate does NOT assess subjective qualities (unambiguity,
// scope-creep, completeness-against-intent, whether cited evidence really supports its unit) —
// those remain the reviewer's responsibility.
//
// `runValidation` is exported standalone (not just via cmdValidate) because approve.ts calls it
// directly with its own id-resolved Spec[] as targets, bypassing the query grammar entirely
// (FILTER_KEYS has no `id` key) — per SPECS §10/§11.1.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import {
  SPECS_MAX_ACCEPTANCE_PER_SPEC,
  SPECS_MAX_DEPENDENCIES_PER_SPEC,
  SPECS_MAX_EVIDENCE_PER_SPEC,
  SPECS_MAX_NAME_LENGTH,
  SPECS_MAX_SPECS,
  SPECS_MAX_STRING_LENGTH,
} from "../../shared/constants.js";
import {
  type AcceptanceCriterion,
  type Spec,
  type SpecsDocument,
  validateAreaRegistration,
  validateIdFormat,
  validateLevel,
  validatePriority,
  validateRequired,
  validateSource,
  validateVerification,
} from "./core.js";
import type { SpecFinding, SpecValidateResult, Severity } from "./output.js";
import { ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";
import { applyFilter, parseQuery } from "./query-filter.js";
import {
  checkAcceptanceComplete,
  checkCriterionEars,
  checkCriterionIdFormat,
  checkEvidencePresence,
  checkMeasurableNfr,
  checkModalVerbs,
  checkRecommendedNfrArea,
  checkSingleConditionWord,
  findDuplicateStatements,
  findLocationGaps,
} from "./rubric.js";
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
  if ((spec.evidence ?? []).length > SPECS_MAX_EVIDENCE_PER_SPEC) return "evidence exceeds the maximum allowed locations.";
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

/** How a criterion is named in a finding message. Its own id where it has one, otherwise its
 * 1-based position — a stored criterion only lacks an id if it was hand-edited, since the write
 * path assigns one (FR-SPECS-0001 AC3), and a blank name would make the finding unactionable. */
function criterionLabel(c: AcceptanceCriterion, index: number): string {
  const id = typeof c?.id === "string" ? c.id.trim() : "";
  return id !== "" ? id : `criterion ${index + 1}`;
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
    if (validateLevel(spec.level)) {
      findings.push(finding(spec.id, "level_enum", "error", "The spec's level is not one of System, Subsystem, Component."));
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

    // Criteria — error (FR-SPECS-0006, FR-SPECS-0021). Reported per spec, listing every offending
    // criterion, so one call names them all rather than one per pass.
    const criteria = spec.acceptance ?? [];
    const malformedCriterionIds: string[] = [];
    const criterionIdCounts = new Map<string, number>();
    const wrongConditionWord: string[] = [];
    const extraConditionWords: string[] = [];
    criteria.forEach((c, i) => {
      if (!checkCriterionIdFormat(spec.id, c)) malformedCriterionIds.push(criterionLabel(c, i));
      const cid = typeof c?.id === "string" ? c.id.trim() : "";
      if (cid !== "") criterionIdCounts.set(cid, (criterionIdCounts.get(cid) ?? 0) + 1);
      if (!checkCriterionEars(c)) wrongConditionWord.push(criterionLabel(c, i));
      if (!checkSingleConditionWord(c)) extraConditionWords.push(criterionLabel(c, i));
    });
    if (malformedCriterionIds.length > 0) {
      findings.push(
        finding(spec.id, "criterion_id_format", "error", `A criterion id does not read <spec-id>.AC<n>: ${malformedCriterionIds.join(", ")}.`),
      );
    }
    const repeatedCriterionIds = [...criterionIdCounts.entries()].filter(([, n]) => n > 1).map(([cid]) => cid);
    if (repeatedCriterionIds.length > 0) {
      findings.push(
        finding(spec.id, "duplicate_criterion_id", "error", `An id is used by more than one criterion in this spec: ${repeatedCriterionIds.join(", ")}.`),
      );
    }
    if (wrongConditionWord.length > 0) {
      findings.push(
        finding(
          spec.id,
          "criterion_ears",
          "error",
          `A criterion does not carry exactly the condition word its declared pattern names: ${wrongConditionWord.join(", ")}.`,
        ),
      );
    }
    if (extraConditionWords.length > 0) {
      findings.push(finding(spec.id, "criterion_ears", "error", `A criterion carries more than one condition word: ${extraConditionWords.join(", ")}.`));
    }
    if (!checkAcceptanceComplete(spec)) {
      findings.push(finding(spec.id, "acceptance_completeness", "error", "Acceptance is empty, or a criterion is missing its responder or outcome."));
    }
    // Location completeness (FR-SPECS-0006 AC10-AC12) — the level decides the severity, so both
    // tiers share one check name and the message is phrased from the severity, not the field.
    for (const gap of findLocationGaps(spec)) {
      const message =
        gap.severity === "error"
          ? `This level requires a ${gap.field} name and none is given.`
          : "Neither a subsystem nor a component is named.";
      findings.push(finding(spec.id, "location_completeness", gap.severity, message));
    }
    const sizeIssue = sizeLimitIssue(spec);
    if (sizeIssue) {
      findings.push(finding(spec.id, "size_limits", "error", sizeIssue));
    }

    // Heuristics and recommendations — warning (FR-SPECS-0006, FR-SPECS-0021). Each message names
    // the token or field that is absent; none of them claims the requirement is good or bad.
    if (spec.type === "NFR" && !checkMeasurableNfr(spec.statement ?? "")) {
      findings.push(finding(spec.id, "measurable_nfr", "warning", "The statement carries no numeric quantity with a unit or threshold token."));
    }
    if (!checkModalVerbs(spec.statement ?? "")) {
      findings.push(finding(spec.id, "modal_verbs", "warning", "The statement does not use shall/should/may."));
    }
    if (!checkEvidencePresence(spec)) {
      findings.push(finding(spec.id, "missing_evidence", "warning", "The source names existing code while the evidence field is empty."));
    }
    if (spec.type === "NFR" && !checkRecommendedNfrArea(spec)) {
      findings.push(
        finding(spec.id, "recommended_nfr_area", "warning", "The area of this non-functional requirement is outside the nine recommended quality-characteristic codes."),
      );
    }
    const duplicatesOf = duplicatesById.get(spec.id);
    if (duplicatesOf && duplicatesOf.length > 0) {
      findings.push(
        finding(spec.id, "duplicate_statement", "warning", `After normalizing whitespace and case, this statement matches: ${duplicatesOf.join(", ")}.`),
      );
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

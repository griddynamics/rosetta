// Implements the specs error-code catalog (SPECS §13) and FR-SPECS-0043 (no-internal-leakage
// for the command's OWN authored surfaces). These templates describe the *kind* of failure in
// generic terms and never interpolate a Rosetta-internal id, ticket id, or source path. They MAY
// be composed with caller-supplied data (spec ids, reasons) by aggregate.ts / cmd* callers —
// that composition is the caller's payload passing through verbatim, which FR-SPECS-0043
// explicitly exempts from the leakage rule.

/** FR-SPECS-0071 — document file (and no backup) truly absent. */
export const ERR_SPECS_NOT_FOUND = "specs_not_found";
/** FR-SPECS-0071 — document file exists but does not parse as the specs schema. */
export const ERR_SPECS_FILE_CORRUPTED = "specs_file_corrupted";
/** FR-SPECS-0013 — data payload could not be parsed as JSON. */
export const ERR_INVALID_DATA = "invalid_data";
/** FR-SPECS-0013 — no data payload supplied at all. */
export const ERR_MISSING_DATA = "missing_data";
/** FR-SPECS-0004 — a spec item is missing its required id on add. */
export const ERR_MISSING_ID = "missing_id";
/** FR-SPECS-0005 — a spec id is already used by another spec in the document. */
export const ERR_DUPLICATE_ID = "duplicate_id";
/** FR-SPECS-0004 — a spec id does not match the `<PREFIX>-<AREA>-<NNNN>` format. */
export const ERR_INVALID_ID_FORMAT = "invalid_id_format";
/** FR-SPECS-0003 — a spec's `type` is not one of FR, NFR, INT, DATA. */
export const ERR_INVALID_TYPE = "invalid_type";
/** FR-SPECS-0001 — a spec's `level` is not one of System, Subsystem, Component. */
export const ERR_INVALID_LEVEL = "invalid_level";
/** FR-SPECS-0001 — a spec's `source` is not one of User, Inferred, Sources, Documentation. */
export const ERR_INVALID_SOURCE = "invalid_source";
/** FR-SPECS-0001 — a spec's `priority` is not one of Must, Should, Could, Wont. */
export const ERR_INVALID_PRIORITY = "invalid_priority";
/** FR-SPECS-0001 — a spec's `verification` is not one of Test, Analysis, Inspection, Demo. */
export const ERR_INVALID_VERIFICATION = "invalid_verification";
/** FR-SPECS-0001 — a spec item carries a field outside the spec schema. */
export const ERR_INVALID_SPEC_FIELD = "invalid_spec_field";
/** FR-SPECS-0001 — a required field is absent or empty. */
export const ERR_MISSING_REQUIRED_FIELD = "missing_required_field";
/** FR-SPECS-0001 — an acceptance criterion's `ears` is not one of the five patterns. */
export const ERR_INVALID_EARS = "invalid_ears";
/** FR-SPECS-0001 — two acceptance criteria within one spec unit carry the same id. */
export const ERR_DUPLICATE_CRITERION_ID = "duplicate_criterion_id";
/** FR-SPECS-0005 — a depends_on/related entry references an id absent from the document. */
export const ERR_UNKNOWN_DEPENDENCY = "unknown_dependency";
/** FR-SPECS-0005 — a depends_on reference would create a cycle (or a spec depends on itself). */
export const ERR_DEPENDENCY_CYCLE = "dependency_cycle";
/** FR-SPECS-0007 — a configured size limit was exceeded. */
export const ERR_SIZE_LIMIT_EXCEEDED = "size_limit_exceeded";
/** FR-SPECS-0009 — a spec's `type` disagrees with the prefix of its own id (add and update alike). */
export const ERR_ID_TYPE_MISMATCH = "id_type_mismatch";
/** FR-SPECS-0013 — a target spec id does not exist in the document. */
export const ERR_TARGET_NOT_FOUND = "target_not_found";
/** FR-SPECS-0015 — implementation value is not one of the allowed enum values. */
export const ERR_INVALID_IMPLEMENTATION = "invalid_implementation";
/** FR-SPECS-0015 — no implementation value supplied. */
export const ERR_MISSING_IMPLEMENTATION = "missing_implementation";
/** FR-SPECS-0017..0020 — the requested status change is not a valid transition from the current status. */
export const ERR_INVALID_TRANSITION = "invalid_transition";
/** FR-SPECS-0017 — one or more approve targets failed validation. */
export const ERR_VALIDATION_FAILED = "validation_failed";
/** FR-SPECS-0016 — purge requires the --force flag. */
export const ERR_FORCE_REQUIRED = "force_required";
/** FR-SPECS-0016 — purge target is still referenced by other specs not in the same batch. */
export const ERR_REFERENCED_BY_OTHERS = "referenced_by_others";
/** FR-SPECS-0012 — query contains an unrecognized filter key. */
export const ERR_INVALID_FILTER = "invalid_filter";
/** FR-SPECS-0012 — query string is malformed. */
export const ERR_INVALID_QUERY = "invalid_query";
/** FR-SPECS-0023 — requested render format is not markdown|text|xml. */
export const ERR_INVALID_FORMAT = "invalid_format";
/** FR-SPECS-0025 — a migrate source path does not exist. */
export const ERR_SOURCE_NOT_FOUND = "source_not_found";
/** FR-SPECS-0025 — a migrate source contained no parseable spec blocks. */
export const ERR_MIGRATE_PARSE_ERROR = "migrate_parse_error";
/** FR-SPECS-0002 — add/migrate would create a document but named no system. */
export const ERR_MISSING_SYSTEM = "missing_system";
/** FR-SPECS-0002 — a caller-supplied system name disagrees with the document's stored one. */
export const ERR_SYSTEM_MISMATCH = "system_mismatch";

/**
 * FR-SPECS-0070 — rename-as-guard write cycle exhausted retries. Shared with `plan` (not
 * specs-specific); re-exported here so specs call sites have one import surface.
 */
export { ERR_BACKUP_CREATE_FAILED } from "../../shared/errors.js";

// ---------------------------------------------------------------------------
// Message templates (FR-SPECS-0043) — generic, leakage-clean prose per code.
// No Rosetta id / ticket id / source path / module name ever appears here. Callers (e.g.
// aggregate.ts) MAY append caller-supplied spec ids / reasons to these — that is the caller's
// own payload passing through verbatim, which FR-SPECS-0043 explicitly permits.
// ---------------------------------------------------------------------------

export const TEMPLATES: Readonly<Record<string, string>> = {
  [ERR_SPECS_NOT_FOUND]: "The specs document was not found at the given path.",
  [ERR_SPECS_FILE_CORRUPTED]: "The specs document exists but could not be parsed as valid JSON.",
  [ERR_INVALID_DATA]: "The data payload could not be parsed as JSON.",
  [ERR_MISSING_DATA]: "No data payload was supplied.",
  [ERR_MISSING_ID]: "A spec item is missing its required id.",
  [ERR_DUPLICATE_ID]: "A spec id is already used by another spec in this document.",
  [ERR_INVALID_ID_FORMAT]: "A spec id does not match the required <PREFIX>-<AREA>-<NNNN> format.",
  [ERR_INVALID_TYPE]: "A spec's type is not one of FR, NFR, INT, DATA.",
  [ERR_INVALID_LEVEL]: "A spec's level is not one of System, Subsystem, Component.",
  [ERR_INVALID_SOURCE]: "A spec's source is not one of User, Inferred, Sources, Documentation.",
  [ERR_INVALID_PRIORITY]: "A spec's priority is not one of Must, Should, Could, Wont.",
  [ERR_INVALID_VERIFICATION]: "A spec's verification is not one of Test, Analysis, Inspection, Demo.",
  [ERR_INVALID_SPEC_FIELD]: "A spec item carries a field that is not part of the spec schema.",
  [ERR_MISSING_REQUIRED_FIELD]: "A spec item is missing a required field.",
  [ERR_INVALID_EARS]: "An acceptance criterion declares a pattern that is not one of ubiquitous, event, state, optional, unwanted.",
  [ERR_DUPLICATE_CRITERION_ID]: "Two acceptance criteria within one spec unit carry the same id.",
  [ERR_UNKNOWN_DEPENDENCY]: "A depends_on or related reference points to an id that does not exist in this document.",
  [ERR_DEPENDENCY_CYCLE]: "A depends_on reference would create a cycle.",
  [ERR_SIZE_LIMIT_EXCEEDED]: "A configured size limit was exceeded.",
  [ERR_ID_TYPE_MISMATCH]: "A spec's type does not agree with the prefix of its own id.",
  [ERR_TARGET_NOT_FOUND]: "A target spec id does not exist in this document.",
  [ERR_INVALID_IMPLEMENTATION]: "The implementation value is not one of the allowed values.",
  [ERR_MISSING_IMPLEMENTATION]: "No implementation value was supplied.",
  [ERR_INVALID_TRANSITION]: "The requested status change is not a valid transition from the spec's current status.",
  [ERR_VALIDATION_FAILED]: "One or more targets failed validation and cannot be approved.",
  [ERR_FORCE_REQUIRED]: "Permanent removal is irreversible and requires the force flag.",
  [ERR_REFERENCED_BY_OTHERS]: "One or more targets are still referenced by other specs.",
  [ERR_INVALID_FILTER]: "The query contains an unrecognized filter key.",
  [ERR_INVALID_QUERY]: "The query string is malformed.",
  [ERR_INVALID_FORMAT]: "The requested render format is not supported.",
  [ERR_SOURCE_NOT_FOUND]: "A migration source path does not exist.",
  [ERR_MIGRATE_PARSE_ERROR]: "A migration source contained no parseable spec blocks.",
  [ERR_MISSING_SYSTEM]: "Creating a document requires a system name.",
  [ERR_SYSTEM_MISMATCH]: "The supplied system name does not match the one already stored in this document.",
};

/** Returns the generic template for a code, or the code itself if it has no authored template. */
export function describeError(code: string): string {
  return TEMPLATES[code] ?? code;
}

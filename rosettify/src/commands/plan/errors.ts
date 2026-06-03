// Implements FR-PLAN-0021 (known error codes for plan command).
// Centralizes new error codes introduced for atomic write, read resilience, and templates,
// so call sites cite the same canonical string. Existing legacy codes (plan_not_found,
// target_not_found, etc.) remain inline at their original sites.

/** FR-PLAN-0021 — plan file exists but cannot be parsed as valid JSON. */
export const ERR_PLAN_FILE_CORRUPTED = "plan_file_corrupted";

/** FR-PLAN-0021 / FR-PLAN-0024 — rename-as-guard write cycle exhausted retries. */
export const ERR_BACKUP_CREATE_FAILED = "backup_create_failed";

/** FR-PLAN-0021 / FR-PLAN-0030 / FR-PLAN-0031 — template name not found in the requested kind's collection. */
export const ERR_INVALID_TEMPLATE = "invalid_template";

/** FR-PLAN-0021 / FR-PLAN-0034 — declared placeholder has no value provided by the caller. */
export const ERR_MISSING_TEMPLATE_PARAM = "missing_template_param";

/** FR-PLAN-0021 / FR-PLAN-0034 — caller provided a value with no matching declared placeholder, or template contains a placeholder token not in its declared set. */
export const ERR_UNEXPECTED_TEMPLATE_PARAM = "unexpected_template_param";

/** FR-PLAN-0021 / FR-PLAN-0043 — phase-steps is present but is not valid JSON, or parses to a value that is not an array. */
export const ERR_INVALID_PHASE_STEPS = "invalid_phase_steps";

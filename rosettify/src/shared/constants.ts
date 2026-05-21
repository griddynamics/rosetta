// FR-PLAN-0005 — authoritative values from ims_mcp/constants.py

export const PLAN_MAX_PHASES = 100;
export const PLAN_MAX_STEPS_PER_PHASE = 100;
export const PLAN_MAX_DEPENDENCIES_PER_ITEM = 50;
export const PLAN_MAX_STRING_LENGTH = 20_000;
export const PLAN_MAX_NAME_LENGTH = 256;

export const MAX_CONCURRENCY_RETRIES = 3; // FR-SHRD-0006

// FR-PLAN-0024 — atomic write with rename-as-guard constants
export const PLAN_BACKUP_RETENTION = 5;
export const PLAN_BACKUP_MAX_RETRIES = 50;

// FR-SHRD-0009 — read resilience constants
export const PLAN_READ_RETRY_DELAY_MS = 100;
export const PLAN_READ_MAX_RETRIES = 50;

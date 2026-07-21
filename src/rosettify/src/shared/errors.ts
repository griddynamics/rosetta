// Shared error codes used across commands (not scoped to any single command).
// Extracted from commands/plan/errors.ts to remove a shared → command back-import
// (shared/doc-io.ts needs this code but must not depend on a specific command's module).

/** Rename-as-guard write cycle exhausted retries (shared by plan and specs via doc-io.ts). */
export const ERR_BACKUP_CREATE_FAILED = "backup_create_failed";

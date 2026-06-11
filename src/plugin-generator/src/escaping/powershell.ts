// NFR-0009 — PowerShell escaping for copilot hooks

/**
 * Escape a string for PowerShell single-quoted string context.
 * In PowerShell, single-quote is escaped as '' (doubled).
 */
export function psEscapeSingleQuoted(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Build the PowerShell Write-Output form for a hook payload.
 * Used in copilot entries alongside the bash form.
 * The payload is wrapped in Write-Output '...' with '' escaping.
 */
export function wrapInPsWriteOutput(jsonPayload: string): string {
  return `Write-Output '${psEscapeSingleQuoted(jsonPayload)}'`;
}

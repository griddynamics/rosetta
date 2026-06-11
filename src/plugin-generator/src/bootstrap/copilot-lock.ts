// FR-HOOK-0006, QF-3 — per-entry bash/pwsh session-lock wrapper for copilot
// Decoded byte-for-byte from baseline core-copilot/.github/plugin/hooks.json

/**
 * Build the bash lock wrapper for a copilot hook entry.
 * Index 0 includes the stale-lock cleanup (find /tmp -maxdepth 1 ...).
 * Indices 1+ skip the cleanup (shorter prefix).
 *
 * @param lockIndex - 0-based entry index (determines lock filename suffix and whether to include cleanup)
 * @param jsonPayload - the raw JSON payload to embed (already single-quote-escaped internally)
 */
export function buildCopilotBashEntry(lockIndex: number, jsonPayload: string): string {
  // jsonPayload is the compact JSON object: {"hookSpecificOutput":...}
  // It must be embedded in a single-quoted printf argument
  // Internal ' chars are escaped as '\'' by the caller
  const printfPart = `printf '%s' '${bashSingleQuoteEscape(jsonPayload)}'`;

  if (lockIndex === 0) {
    // Entry 0: stale-lock cleanup + session lock
    return (
      `find /tmp -maxdepth 1 -name "rosetta-bs-*.lock" -mmin +1 -delete 2>/dev/null; ` +
      `INPUT=$(cat); ` +
      `SESSION_ID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id":"\\([^"]*\\)".*/\\1/p'); ` +
      `LOCK="/tmp/rosetta-bs-\${SESSION_ID:-$$}-${lockIndex}.lock"; ` +
      `if [ -f "$LOCK" ]; then exit 0; fi; ` +
      `touch "$LOCK"; ` +
      printfPart
    );
  } else {
    // Entries 1+: no stale-lock cleanup
    return (
      `INPUT=$(cat); ` +
      `SESSION_ID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id":"\\([^"]*\\)".*/\\1/p'); ` +
      `LOCK="/tmp/rosetta-bs-\${SESSION_ID:-$$}-${lockIndex}.lock"; ` +
      `if [ -f "$LOCK" ]; then exit 0; fi; ` +
      `touch "$LOCK"; ` +
      printfPart
    );
  }
}

/**
 * Build the PowerShell lock wrapper for a copilot hook entry.
 * Index 0 includes the stale-lock cleanup (Get-ChildItem ...).
 * Indices 1+ skip the cleanup.
 *
 * @param lockIndex - 0-based entry index
 * @param jsonPayload - the raw JSON payload to embed (single-quote-escaped for PS)
 */
export function buildCopilotPowershellEntry(lockIndex: number, jsonPayload: string): string {
  const writeOutputPart = `Write-Output '${psSingleQuoteEscape(jsonPayload)}'`;

  if (lockIndex === 0) {
    // Entry 0: stale-lock cleanup + session lock
    return (
      `Get-ChildItem "$env:TEMP\\rosetta-bs-*-${lockIndex}.lock" -ErrorAction SilentlyContinue ` +
      `| Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) } ` +
      `| Remove-Item -Force -ErrorAction SilentlyContinue; ` +
      `$Inp = [Console]::In.ReadToEnd(); ` +
      `$Sid = if ($Inp -match '"session_id":"([^"]*)"') { $Matches[1] } else { [System.Diagnostics.Process]::GetCurrentProcess().Id }; ` +
      `$Lk = "$env:TEMP\\rosetta-bs-$Sid-${lockIndex}.lock"; ` +
      `if (Test-Path $Lk) { exit 0 }; ` +
      `New-Item -Path $Lk -ItemType File -Force | Out-Null; ` +
      writeOutputPart
    );
  } else {
    // Entries 1+: no stale-lock cleanup
    return (
      `$Inp = [Console]::In.ReadToEnd(); ` +
      `$Sid = if ($Inp -match '"session_id":"([^"]*)"') { $Matches[1] } else { [System.Diagnostics.Process]::GetCurrentProcess().Id }; ` +
      `$Lk = "$env:TEMP\\rosetta-bs-$Sid-${lockIndex}.lock"; ` +
      `if (Test-Path $Lk) { exit 0 }; ` +
      `New-Item -Path $Lk -ItemType File -Force | Out-Null; ` +
      writeOutputPart
    );
  }
}

// --- helpers ---

function bashSingleQuoteEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function psSingleQuoteEscape(s: string): string {
  return s.replace(/'/g, "''");
}

import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  toolName: string;
  blockedByCooldown: boolean;
  sessionId?: string | null;
}

/**
 * Appends one JSON line to <cwd>/.claude/audit/hook-overrides.jsonl.
 * Failures are swallowed — audit must never block execution.
 */
export function appendOverrideAudit(cwd: string, entry: AuditEntry): void {
  const p = path.join(cwd, '.claude', 'audit', 'hook-overrides.jsonl');
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    // Intentionally swallowed — audit failure must not block hook execution.
  }
}

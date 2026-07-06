import { execFileSync } from 'node:child_process';
import { CuriocityError } from '../../shared/errors';

/**
 * Codex launch-flag preflight (§10.2 build-start requirement, §18 risk). The launch
 * flags (`--dangerously-bypass-hook-trust`, `-c features.hooks=true`, trust seeding,
 * `-a never`, `--sandbox`) are OBSERVED CLI behavior on codex-cli 0.142.2, not part
 * of the approved hook contract — so before the adapter drives a real trial we assert
 * the installed CLI still advertises them. A missing flag means the pinned CLI drifted
 * and the launch would silently misbehave; fail LOUDLY instead.
 *
 * Pure string checks against `codex --help` (no session, no config mutation, no
 * network). Used by the contract-test setup.
 */

/** Flags (any listed alias satisfies the requirement) that `codex --help` must advertise. */
const REQUIRED_FLAGS: Array<{ label: string; anyOf: string[] }> = [
  { label: 'approval policy', anyOf: ['-a', '--ask-for-approval'] },
  { label: 'sandbox', anyOf: ['--sandbox'] },
  { label: 'hook-trust bypass', anyOf: ['--dangerously-bypass-hook-trust'] },
  { label: 'config override', anyOf: ['-c', '--config'] },
];

export function readCodexHelp(command = 'codex'): string {
  try {
    return execFileSync(command, ['--help'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    throw new CuriocityError(
      `codex flag preflight: could not run \`${command} --help\`: ${(err as Error).message}. ` +
        'Is codex-cli installed and on PATH?',
      'CODEX_PREFLIGHT_FAILED',
    );
  }
}

/** Assert `codex --help` advertises every required launch flag; throw with the full
 *  missing-flag list otherwise. Returns the help text on success (handy for logs). */
export function assertCodexFlags(help?: string, command = 'codex'): string {
  const text = help ?? readCodexHelp(command);
  const missing: string[] = [];
  for (const req of REQUIRED_FLAGS) {
    // Match a flag token bounded by whitespace/comma so `-c` does not match inside
    // some longer `--c...` token.
    const found = req.anyOf.some((flag) => new RegExp(`(^|[\\s,])${escapeRe(flag)}([\\s,=]|$)`, 'm').test(text));
    if (!found) missing.push(`${req.label} (${req.anyOf.join(' / ')})`);
  }
  if (missing.length > 0) {
    throw new CuriocityError(
      `codex flag preflight FAILED — \`codex --help\` no longer advertises: ${missing.join('; ')}. ` +
        'The pinned codex-cli drifted from the observed 0.142.2 launch contract (§10.2); ' +
        'reverify the flags before running the codex adapter.',
      'CODEX_PREFLIGHT_FAILED',
    );
  }
  return text;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

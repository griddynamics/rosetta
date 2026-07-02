import { discoverCases } from '../../cases/discovery';
import { ExitCode } from '../exit-codes';

/**
 * `curiocity validate --source <dir>` (§13). Fully functional in M1: discovery
 * dry-run listing valid cases + skip reasons.
 *
 * Preflight checks (P10 — agent-home writeability / unsandboxed run) require the
 * terminal + agent layers and are out of scope for M1; a note is printed instead.
 */
export interface ValidateOptions {
  source?: string;
}

export function runValidate(opts: ValidateOptions): number {
  if (!opts.source) {
    process.stderr.write('error: `validate` requires --source <dir>\n');
    return ExitCode.CONFIG_ERROR;
  }

  const result = discoverCases(opts.source);

  const out = process.stdout;
  out.write(`Discovered cases in ${result.source}\n`);
  out.write(`\nvalid (${result.valid.length}):\n`);
  if (result.valid.length === 0) {
    out.write('  (none)\n');
  } else {
    for (const c of result.valid) {
      out.write(`  - ${c.name}  [agents: ${c.config.agents.join(', ')}]\n`);
    }
  }

  out.write(`\nskipped (${result.skipped.length}):\n`);
  if (result.skipped.length === 0) {
    out.write('  (none)\n');
  } else {
    for (const s of result.skipped) {
      out.write(`  - ${s.name}: ${s.reason}\n`);
    }
  }

  out.write('\nnote: preflight checks (P10, agent-home writeability) are not implemented in M1.\n');

  if (result.valid.length === 0) {
    return ExitCode.CONFIG_ERROR;
  }
  return ExitCode.OK;
}

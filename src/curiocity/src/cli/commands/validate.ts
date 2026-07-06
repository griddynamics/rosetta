import { discoverCases } from '../../cases/discovery';
import { loadTopLevelConfig } from '../../config/loader';
import { preflightAgentHomes } from '../../orchestrator/preflight';
import { ExitCode } from '../exit-codes';

/**
 * `curiocity validate --source <dir>` (§13): discovery dry-run listing valid cases +
 * skip reasons, plus the P10 preflight (agent-home writeability). Preflight is skipped
 * for mock-only matrices; a failure fails fast with a clear message (exit 2).
 */
export interface ValidateOptions {
  source?: string;
  config?: string;
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

  // --- P10 preflight: agent-home writeability (unsandboxed run) --------------
  const topLevel = loadTopLevelConfig(opts.config);
  const agentIds = [...new Set(result.valid.flatMap((c) => c.config.agents))];
  const pre = preflightAgentHomes(agentIds, topLevel);
  out.write('\npreflight (P10, agent-home writeability):\n');
  if (pre.skipped) {
    out.write('  skipped (mock-only matrix — no real agent home to check)\n');
  } else if (pre.ok) {
    out.write('  ok — agent homes are writeable (harness is unsandboxed)\n');
  } else {
    for (const e of pre.errors) process.stderr.write(`  FAIL: ${e}\n`);
    return ExitCode.CONFIG_ERROR;
  }

  if (result.valid.length === 0) {
    return ExitCode.CONFIG_ERROR;
  }
  return ExitCode.OK;
}

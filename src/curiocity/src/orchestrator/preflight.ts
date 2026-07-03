import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TopLevelConfig } from '../config/schema';
import { resolveAgentProfile } from './profile';

/**
 * P10 preflight — agent-home writeability (§13, Part 3.1). The harness process MUST
 * run unsandboxed: a sandboxed harness blocks the agent CLIs from writing their native
 * transcripts under `$HOME`, and no transcript ever appears (the clearest, most
 * expensive-to-diagnose failure mode). `run` and `validate` therefore fail fast, with
 * a clear message, when the home an adapter needs is not writeable.
 *
 * - `claude-code` writes its transcript/history under `~/.claude` (P9), so that dir
 *   (or `$HOME` when it does not exist yet) must be writeable.
 * - `codex` runs under a per-trial throwaway `CODEX_HOME` created under the OS temp
 *   dir (§10.2), so temp must be writeable (the "create the throwaway home" check).
 *
 * Mock-only matrices are skipped — the mock TUI writes only into the ctrl dir and needs
 * no real agent home.
 */

export interface PreflightResult {
  ok: boolean;
  /** True when every agent was mock (no real home to check). */
  skipped: boolean;
  errors: string[];
}

/** Probe write access to `dir` (creating it if `create`); returns an error string or null. */
export function probeWriteable(dir: string, create: boolean): string | null {
  try {
    if (!existsSync(dir)) {
      if (!create) return `${dir} does not exist`;
      mkdirSync(dir, { recursive: true });
    }
    const probe = join(dir, `.curiocity-preflight-${randomUUID()}`);
    writeFileSync(probe, 'ok');
    rmSync(probe, { force: true });
    return null;
  } catch (err) {
    return `${dir} is not writeable (${(err as Error).message})`;
  }
}

/** Can we create a throwaway home under the OS temp dir (codex CODEX_HOME)? */
function probeTempCreatable(): string | null {
  try {
    const d = mkdtempSync(join(tmpdir(), 'curiocity-preflight-'));
    rmSync(d, { recursive: true, force: true });
    return null;
  } catch (err) {
    return `cannot create a throwaway agent home under ${tmpdir()} (${(err as Error).message})`;
  }
}

/**
 * Resolve the distinct adapter ids for a set of agent ids (via the D13 profile merge),
 * so preflight checks each real agent's home exactly once. Unknown / unconfigured
 * agents are ignored here (they surface as `skipped` cells at matrix build).
 */
function adapterIdsFor(agentIds: string[], topLevel: TopLevelConfig): Set<string> {
  const out = new Set<string>();
  for (const id of new Set(agentIds)) {
    try {
      const profile = resolveAgentProfile(id, topLevel);
      if (profile) out.add(profile.adapter);
    } catch {
      // A profile that fails to resolve is a config error surfaced elsewhere; the
      // preflight does not need to check a home for it.
    }
  }
  return out;
}

export function preflightAgentHomes(agentIds: string[], topLevel: TopLevelConfig): PreflightResult {
  const adapters = adapterIdsFor(agentIds, topLevel);
  const real = [...adapters].filter((a) => a !== 'mock');
  if (real.length === 0) return { ok: true, skipped: true, errors: [] };

  const errors: string[] = [];
  for (const adapter of real) {
    if (adapter === 'claude-code') {
      const claudeHome = join(homedir(), '.claude');
      const target = existsSync(claudeHome) ? claudeHome : homedir();
      const err = probeWriteable(target, target === claudeHome);
      if (err) errors.push(`claude-code: agent home not writeable — ${err} (P10: the harness must run unsandboxed so claude can persist its transcript under ~/.claude)`);
    } else if (adapter === 'codex') {
      const err = probeTempCreatable();
      if (err) errors.push(`codex: ${err} (P10: the harness must run unsandboxed so codex can write its per-trial CODEX_HOME + rollout transcript)`);
    }
    // Future adapters: add their home check here.
  }
  return { ok: errors.length === 0, skipped: false, errors };
}

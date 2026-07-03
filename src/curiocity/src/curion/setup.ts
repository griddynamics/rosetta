import { execa } from 'execa';

/**
 * Setup / teardown scripts (§7 steps 2 & 8, D14). Run via execa with
 * `cwd = workspace` and `CURIOCITY_*` env. Setup scripts are concatenated
 * (top-level then case) upstream; a non-zero exit → the caller marks the trial
 * `setup-error` and skips to teardown. Teardown always runs, even after failure.
 *
 * TRUST MODEL (shell:true — deliberate, matches evaluators/command.ts): each entry is a
 * user-authored shell LINE from the top-level or case `setup`/`teardown` config array
 * (e.g. `"./install-rosetta-hook.sh"`, `"cp -r fixtures/* ."`). These are shell
 * expressions by design and are trusted at the case-authoring level — the same party that
 * authors the prompt/config already dictates what the harness executes. No agent output or
 * other untrusted data is interpolated into the line. (The `external` evaluator, which runs
 * a program with a discrete argv rather than a shell line, uses execa's array form instead.)
 */

export interface ScriptEnv {
  workspace: string;
  caseName: string;
  agentId: string;
  repeat: number;
  ctrlDir: string;
}

function scriptEnv(env: ScriptEnv, base: Record<string, string>): Record<string, string> {
  return {
    ...base,
    CURIOCITY_WORKSPACE: env.workspace,
    CURIOCITY_CASE: env.caseName,
    CURIOCITY_AGENT: env.agentId,
    CURIOCITY_REPEAT: String(env.repeat),
    CURIOCITY_CTRL_DIR: env.ctrlDir,
  };
}

export interface ScriptResult {
  script: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Run setup scripts in order; stop at the first non-zero exit (returns it). */
export async function runSetup(
  scripts: string[],
  env: ScriptEnv,
  baseEnv: Record<string, string>,
): Promise<{ ok: true } | { ok: false; failure: ScriptResult }> {
  const runEnv = scriptEnv(env, baseEnv);
  for (const script of scripts) {
    const res = await execa(script, { shell: true, cwd: env.workspace, env: runEnv, reject: false });
    if (res.exitCode !== 0) {
      return {
        ok: false,
        failure: { script, exitCode: res.exitCode ?? -1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' },
      };
    }
  }
  return { ok: true };
}

/** Run all teardown scripts; never throws (best-effort, §7 step 8). */
export async function runTeardown(
  scripts: string[],
  env: ScriptEnv,
  baseEnv: Record<string, string>,
): Promise<void> {
  const runEnv = scriptEnv(env, baseEnv);
  for (const script of scripts) {
    try {
      await execa(script, { shell: true, cwd: env.workspace, env: runEnv, reject: false });
    } catch {
      // best-effort
    }
  }
}

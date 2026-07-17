import { CuriocityError } from '../shared/errors';

/**
 * Child env scrubbing (§4). Curions are forked with the FULL parent env passed through —
 * so toolchains the case/agent may shell out to (`JAVA_HOME`, `MAVEN_OPTS`, `GOPATH`, …)
 * keep working exactly as they would in a normal shell — MINUS provider secret vars:
 * anything matching `ANTHROPIC_*`/`OPENAI_*` (case-insensitive) is stripped, EXCEPT the
 * two whitelisted keys the harness must forward for auth (`AGENT_API_KEY_ALLOWLIST`).
 * LLM keys otherwise travel to the child inside `TrialSpec` over IPC; the agent PTY env
 * is then derived from this deny-listed base (§5.2 `envRemove`/`envSet`).
 *
 * NOTE — deliberate trade-off: OTHER secrets already present in the environment (e.g.
 * `AWS_*`, `GITHUB_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS`) are intentionally passed
 * through unmodified. This harness is meant to behave like a normal shell/CI step, not
 * a secret vault; only the two provider-key families this harness itself forwards for
 * agent auth are singled out for stripping.
 */

/**
 * Env vars explicitly allowed to reach the child (and, via `filterAgentEnv`, the agent
 * PTY) irrespective of adapter. These are agent/judge API keys the harness MUST forward
 * in CI, where there is no interactive OAuth session. They are exempted from the
 * `ANTHROPIC_*`/`OPENAI_*` strip below — every other var matching those prefixes is
 * still stripped. Single global allowlist (no per-adapter filtering).
 */
export const AGENT_API_KEY_ALLOWLIST = new Set(['ANTHROPIC_API_KEY', 'OPENAI_API_KEY']);

/** Key prefixes stripped from the child env (provider secrets), unless whitelisted above. */
const STRIP_PREFIXES = [/^ANTHROPIC_/i, /^OPENAI_/i];

/** True if `key` is a provider-secret-shaped var that must be stripped from the child env. */
export function shouldStrip(key: string): boolean {
  return !AGENT_API_KEY_ALLOWLIST.has(key) && STRIP_PREFIXES.some((re) => re.test(key));
}

/**
 * Defense-in-depth: assert none of the surviving env entries still match a strip prefix
 * without being whitelisted (i.e. `buildChildEnv`'s strip logic regressed). Throws so a
 * leak is caught before a child/PTY is ever spawned. Deliberately does NOT check generic
 * `API_KEY|SECRET|TOKEN` shapes or value shapes — those vars pass through by design under
 * the deny-list model (see file doc comment).
 */
export function assertNoProviderSecrets(env: Record<string, string>): void {
  for (const key of Object.keys(env)) {
    if (shouldStrip(key)) {
      throw new CuriocityError(`Refusing to pass secret-shaped env var "${key}" to a child.`, 'SECRET_LEAK');
    }
  }
}

/** Build the child env from a source env (default `process.env`): full pass-through minus provider secrets. */
export function buildChildEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && !shouldStrip(key)) out[key] = value;
  }
  assertNoProviderSecrets(out);
  return out;
}

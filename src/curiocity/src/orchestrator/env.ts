import { CuriocityError } from '../shared/errors';

/**
 * Child env scrubbing (§4). Curions are forked with an EXPLICIT allow-list — PATH,
 * HOME, TERM, the user-identity pair (USER/LOGNAME) and locale vars, nothing else —
 * so CI-provided secret env (API keys) is never inherited by default `fork` behavior.
 * LLM keys travel to the child only inside `TrialSpec` over IPC; the agent PTY env is
 * then derived from this scrubbed base (§5.2 `envRemove`/`envSet`), so no secret can
 * reach the agent even by accident.
 *
 * USER/LOGNAME are on the allow-list because the agent CLIs resolve their OWN stored
 * auth through them: on macOS, Claude Code's Keychain-backed OAuth credential lookup
 * needs `USER` to identify the login context, and without it `claude` reports
 * "Not logged in" even though HOME/~/.claude are readable (validated live 2026-07-02).
 * Neither is secret-shaped (see `keyLooksSecret`), so they pass `assertNoSecrets`.
 */

/** Exact allow-listed env keys. */
const ALLOW_EXACT = new Set([
  'PATH',
  'HOME',
  'TERM',
  'USER',
  'LOGNAME',
  'LANG',
  'LANGUAGE',
  'LC_ALL',
  'LC_CTYPE',
]);
/** Allow-listed prefixes (locale family, e.g. LC_TIME, LC_NUMERIC). */
const ALLOW_PREFIX = ['LC_'];

function isAllowed(key: string): boolean {
  if (ALLOW_EXACT.has(key)) return true;
  return ALLOW_PREFIX.some((p) => key.startsWith(p));
}

/** Key looks secret (provider key vars). */
function keyLooksSecret(key: string): boolean {
  return /^(ANTHROPIC|OPENAI|AWS|AZURE|GOOGLE|GEMINI|COHERE|MISTRAL|GROQ)_/i.test(key) || /API_?KEY|SECRET|TOKEN/i.test(key);
}

/** Value looks like an API key/token (e.g. `sk-...`). */
function valueLooksSecret(value: string): boolean {
  return /\bsk-[A-Za-z0-9_-]{8,}/.test(value) || /\b(sk|pk)-(live|proj|ant)/i.test(value);
}

/**
 * Assert none of the env entries are secret-shaped (defense in depth). Throws so a
 * leak is caught before a child/PTY is ever spawned.
 */
export function assertNoSecrets(env: Record<string, string>): void {
  for (const [key, value] of Object.entries(env)) {
    if (keyLooksSecret(key)) {
      throw new CuriocityError(`Refusing to pass secret-shaped env var "${key}" to a child.`, 'SECRET_LEAK');
    }
    if (valueLooksSecret(value)) {
      throw new CuriocityError(`Refusing to pass secret-shaped value for env var "${key}" to a child.`, 'SECRET_LEAK');
    }
  }
}

/** Build the allow-listed child env from a source env (default `process.env`). */
export function buildChildEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && isAllowed(key)) out[key] = value;
  }
  assertNoSecrets(out);
  return out;
}

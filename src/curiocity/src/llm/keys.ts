import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { providers } from './providers';

/**
 * LLM key resolution (§4/§12). Resolved ONCE at orchestrator startup, held in
 * memory, shipped to Curions inside `TrialSpec.keys` over IPC (§4) — never written
 * to disk, never logged. For each provider the precedence is:
 *
 *   CURIOCITY_<PROVIDER>_KEY   →   provider-standard var (e.g. ANTHROPIC_API_KEY)
 *
 * each looked up first in `process.env`, then in the `src/curiocity/.env` file.
 *
 * IMPORTANT: this module deliberately reads `.env`, but NEVER logs a value and
 * never returns anything but the provider→key map. Callers must keep it out of logs
 * (a masking helper is in `shared/mask.ts`).
 */

/** Resolve the default `.env` path (`<pkg>/.env`) from a module URL — correct in both modes:
 *  - source/tests: `<pkg>/src/llm/keys.ts` → `../../.env` = `<pkg>/.env`.
 *  - built dist: the bundle collapses the tree — this code lives in a dist-root file
 *    (`<pkg>/dist/cli.js` or a shared chunk), so `../.env` = `<pkg>/.env`.
 *  Exported for unit tests so both layouts are pinned. The `.env` fallback matters only
 *  for local dev; a published package ships `dist/` only, so users pass keys via env vars. */
export function resolveEnvFilePath(moduleUrl: string): string {
  const isTs = moduleUrl.endsWith('.ts');
  return fileURLToPath(new URL(isTs ? '../../.env' : '../.env', moduleUrl));
}

/** Default `.env` location: the curiocity package root (`<pkg>/.env`). */
export function defaultEnvFilePath(): string {
  return resolveEnvFilePath(import.meta.url);
}

/**
 * Minimal `.env` parser: `KEY=VALUE` per line, `#` comments, optional surrounding
 * quotes, `export ` prefix tolerated. Not a full dotenv implementation — enough for
 * provider keys. Returns `{}` when the file is absent or unreadable.
 */
export function parseDotEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const body = line.startsWith('export ') ? line.slice('export '.length) : line;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key !== '') out[key] = value;
  }
  return out;
}

function loadEnvFile(path: string): Record<string, string> {
  try {
    if (!existsSync(path)) return {};
    return parseDotEnv(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

export interface ResolveKeysOptions {
  env?: NodeJS.ProcessEnv;
  /** Override the `.env` path (tests). Set to `null` to skip the file entirely. */
  envFilePath?: string | null;
}

/**
 * Resolve provider → api key for every known provider that has one available.
 * Providers with no resolvable key are simply omitted (a run only fails if a role
 * actually needs the missing provider, §12).
 *
 * Precedence is strictly tiered by SOURCE first, then by name, within each source
 * (§12: "CURIOCITY_<PROVIDER>_KEY env, falling back to provider-standard vars, or a
 * .env file"): process.env's `CURIOCITY_<PROVIDER>_KEY`, then process.env's
 * provider-standard var(s); only when NEITHER is set in the environment does the
 * `.env` file get consulted (again `CURIOCITY_<PROVIDER>_KEY` before the standard
 * var). This ensures a live CI-injected standard env var always outranks a stale
 * value left over in a local `.env` file.
 */
export function resolveKeys(opts: ResolveKeysOptions = {}): Record<string, string> {
  const env = opts.env ?? process.env;
  const fileEnv =
    opts.envFilePath === null ? {} : loadEnvFile(opts.envFilePath ?? defaultEnvFilePath());

  const firstDefined = (source: Record<string, string | undefined>, names: string[]): string | undefined => {
    for (const name of names) {
      const v = source[name];
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return undefined;
  };

  const keys: Record<string, string> = {};
  for (const [provider, factory] of Object.entries(providers)) {
    const names = [`CURIOCITY_${provider.toUpperCase()}_KEY`, ...factory.standardKeyEnvVars];
    const key = firstDefined(env, names) ?? firstDefined(fileEnv, names);
    if (key !== undefined) keys[provider] = key;
  }
  return keys;
}

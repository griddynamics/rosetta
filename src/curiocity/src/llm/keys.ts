import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { providers } from './providers';
import { ConfigError } from '../shared/errors';

/**
 * LLM key resolution (§4/§12). Resolved ONCE at orchestrator startup, held in
 * memory, shipped to Curions inside `TrialSpec.keys` over IPC (§4) — never written
 * to disk, never logged. For each provider the precedence is:
 *
 *   CURIOCITY_<PROVIDER>_KEY   →   provider-standard var (e.g. ANTHROPIC_API_KEY)
 *
 * each looked up first in `process.env`, then in a `.env` file in the current
 * working directory — i.e. wherever the CLI was invoked from.
 *
 * IMPORTANT: this module deliberately reads `.env`, but NEVER logs a value and
 * never returns anything but provider-scoped config maps. Callers must keep secrets
 * out of logs (a masking helper is in `shared/mask.ts`). Base URL resolution uses
 * the same source-tier precedence: process env first, then cwd `.env`, with name
 * precedence within each source.
 */

/** Default `.env` location: `.env` in the invoking process's cwd. */
export function defaultEnvFilePath(): string {
  return join(process.cwd(), '.env');
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

export type ResolveBaseUrlsOptions = ResolveKeysOptions;

function firstDefined(source: Record<string, string | undefined>, names: string[]): string | undefined {
  for (const name of names) {
    const v = source[name];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function validateBaseUrl(value: string, sourceName: string, provider: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigError(`${sourceName} for provider "${provider}" must be a valid http(s) URL, got "${value}".`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ConfigError(`${sourceName} for provider "${provider}" must use http:// or https://, got "${value}".`);
  }
  return value;
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

  const keys: Record<string, string> = {};
  for (const [provider, factory] of Object.entries(providers)) {
    const names = [`CURIOCITY_${provider.toUpperCase()}_KEY`, ...factory.standardKeyEnvVars];
    const key = firstDefined(env, names) ?? firstDefined(fileEnv, names);
    if (key !== undefined) keys[provider] = key;
  }
  return keys;
}

/**
 * Resolve provider → base URL for every known provider that has one configured.
 *
 * Name precedence within each source:
 *   CURIOCITY_<PROVIDER>_BASE_URL → <PROVIDER>_BASE_URL → CURIOCITY_BASE_URL
 *
 * `CURIOCITY_BASE_URL` intentionally fans out to every provider. It is for
 * multi-provider gateways (for example Bifrost) that expose Anthropic/OpenAI-style
 * routes behind one origin; use provider-specific vars when providers need
 * different origins.
 *
 * Source precedence matches `resolveKeys`: process.env is exhausted first, then
 * the `.env` file is consulted with the same name order. Resolved values are
 * validated here so malformed URLs fail before TrialSpecs/child workers are built.
 */
export function resolveBaseUrls(opts: ResolveBaseUrlsOptions = {}): Record<string, string> {
  const env = opts.env ?? process.env;
  const fileEnv =
    opts.envFilePath === null ? {} : loadEnvFile(opts.envFilePath ?? defaultEnvFilePath());

  const baseUrls: Record<string, string> = {};
  for (const provider of Object.keys(providers)) {
    const upper = provider.toUpperCase();
    const names = [`CURIOCITY_${upper}_BASE_URL`, `${upper}_BASE_URL`, 'CURIOCITY_BASE_URL'];
    for (const source of [env, fileEnv]) {
      const sourceName = names.find((name) => {
        const value = source[name];
        return typeof value === 'string' && value.length > 0;
      });
      if (sourceName !== undefined) {
        baseUrls[provider] = validateBaseUrl(source[sourceName]!, sourceName, provider);
        break;
      }
    }
  }
  return baseUrls;
}

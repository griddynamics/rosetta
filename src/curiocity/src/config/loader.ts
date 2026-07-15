import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigError } from '../shared/errors';
import { topLevelConfigSchema, type TopLevelConfig } from './schema';

/**
 * The only module that reads top-level config files (§3). Precedence layering
 * lives in `merge.ts`; this just parses + zod-validates one file.
 */

export const DEFAULT_CONFIG_PATH = './curiocity.config.json';

function parseTopLevel(json: string, sourcePath: string): TopLevelConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    throw new ConfigError(`Config file ${sourcePath} is not valid JSON: ${(err as Error).message}`);
  }
  const result = topLevelConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(`Config file ${sourcePath} failed validation:\n${result.error.message}`);
  }
  return result.data;
}

/**
 * Load the top-level config.
 * - Explicit `configPath` (from `--config`): must exist and validate, else ConfigError.
 * - Otherwise the default path is used if present; if absent, built-in defaults
 *   (an empty, fully-defaulted config) are returned so `validate` / `--dry-run`
 *   work with no config file.
 */
export function loadTopLevelConfig(configPath?: string): TopLevelConfig {
  if (configPath) {
    const abs = resolve(configPath);
    if (!existsSync(abs)) {
      throw new ConfigError(`Config file not found: ${abs}`);
    }
    return parseTopLevel(readFileSync(abs, 'utf8'), abs);
  }

  const abs = resolve(DEFAULT_CONFIG_PATH);
  if (existsSync(abs)) {
    return parseTopLevel(readFileSync(abs, 'utf8'), abs);
  }

  // No config file: return an empty, fully-defaulted config.
  return topLevelConfigSchema.parse({});
}

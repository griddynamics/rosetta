import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { ConfigError } from '../shared/errors';

/**
 * Provider map (§5.6, §12). Resolves a `"provider/model"` prefix to an `@ai-sdk/*`
 * factory. Adding a provider = add the dependency + one entry here (§17). Nothing
 * else in the harness knows the concrete SDK factories.
 *
 * `standardKeyEnvVars` are the provider-standard fallback vars consulted after
 * `CURIOCITY_<PROVIDER>_KEY` during key resolution (§12, see `keys.ts`).
 */

export interface ProviderFactory {
  /** Provider-standard key env var names, checked as a fallback (§12). */
  readonly standardKeyEnvVars: readonly string[];
  /** Construct a language model for a bare model id with an explicit api key.
   *  Offline: builds the client object only — no network call happens here. */
  model(modelId: string, apiKey: string, baseURL?: string): LanguageModel;
}

export const providers: Record<string, ProviderFactory> = {
  anthropic: {
    standardKeyEnvVars: ['ANTHROPIC_API_KEY'],
    model: (modelId, apiKey, baseURL) => createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId),
  },
  openai: {
    standardKeyEnvVars: ['OPENAI_API_KEY'],
    model: (modelId, apiKey, baseURL) => createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId),
  },
};

export interface ParsedModelRef {
  provider: string;
  modelId: string;
}

/** Split `"provider/model"` → `{provider, modelId}` (model id may contain `/`). */
export function parseModelRef(ref: string): ParsedModelRef {
  const idx = ref.indexOf('/');
  if (idx <= 0 || idx === ref.length - 1) {
    throw new ConfigError(`Invalid model reference "${ref}": expected "provider/model".`);
  }
  return { provider: ref.slice(0, idx), modelId: ref.slice(idx + 1) };
}

/** Look up a provider factory by id; throws `ConfigError` with the known ids. */
export function getProvider(id: string): ProviderFactory {
  const p = providers[id];
  if (!p) {
    throw new ConfigError(
      `Unknown model provider "${id}". Known providers: ${Object.keys(providers).join(', ')}.`,
    );
  }
  return p;
}

// Slim adapter for core-codex bundle — only codex code, zero other IDE adapters.
// run-hook.ts imports `{ adapter }` from '../adapter'; the bundler aliases '../adapter' here.
import { codex } from '../adapters/codex';
import { makeEntrypoint } from './make-entrypoint';

export const adapter = makeEntrypoint(codex);

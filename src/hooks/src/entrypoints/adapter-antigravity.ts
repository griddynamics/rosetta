// Slim adapter for antigravity bundle — antigravity-only, zero other IDE adapters.
// run-hook.ts imports `{ adapter }` from '../adapter'; the bundler aliases '../adapter' here.
import { antigravity } from '../adapters/antigravity';
import { makeEntrypoint } from './make-entrypoint';

export const adapter = makeEntrypoint(antigravity);

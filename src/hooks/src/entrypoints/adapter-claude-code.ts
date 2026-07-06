// Slim adapter for core-claude bundle — only claude-code code, zero other IDE adapters.
// run-hook.ts imports `{ adapter }` from '../adapter'; the bundler aliases '../adapter' here.
import { claudeCode } from '../adapters/claude-code';
import { makeEntrypoint } from './make-entrypoint';

export const adapter = makeEntrypoint(claudeCode);

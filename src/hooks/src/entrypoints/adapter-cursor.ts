// Slim adapter for core-cursor bundle — only cursor code, zero other IDE adapters.
// run-hook.ts imports `{ adapter }` from '../adapter'; the bundler aliases '../adapter' here.
// Cursor's exit-0 + permission:"deny" JSON deny is confirmed working and field-selective
// (docs/hooks/cursor.md Run 1+3); pairing exit-2 with the body dumps it raw/unparsed instead
// (Run 4) — strictly worse. The cursor adapter has no exitCode/stderrMessage override, so
// makeEntrypoint yields exitCodeFor→0 / stderrMessageFor→undefined (deny stays in the JSON body).
import { cursor } from '../adapters/cursor';
import { makeEntrypoint } from './make-entrypoint';

export const adapter = makeEntrypoint(cursor);

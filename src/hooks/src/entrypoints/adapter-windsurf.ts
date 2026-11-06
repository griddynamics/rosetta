// Slim adapter for the windsurf entrypoint — only windsurf code, zero other IDE adapters.
// NOTE: windsurf is not an output target, so no bundle is built from this entrypoint today
// (it is absent from PLUGINS in scripts/build-bundles.mjs); kept as the adapter source of record.
// run-hook.ts imports `{ adapter }` from '../adapter'; the bundler aliases '../adapter' here.
// Windsurf never parses stdout (docs/hooks/windsurf.md): blocking is exit-code-only and the deny
// reason reaches the model via stderr — both wired through the windsurf adapter's exitCode/
// stderrMessage, which makeEntrypoint surfaces as exitCodeFor/stderrMessageFor.
import { windsurf } from '../adapters/windsurf';
import { makeEntrypoint } from './make-entrypoint';

export const adapter = makeEntrypoint(windsurf);

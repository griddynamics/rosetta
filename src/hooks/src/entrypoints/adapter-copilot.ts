// Slim adapter for core-copilot bundle — copilot-only, zero other IDE adapters.
// run-hook.ts imports `{ adapter }` from '../adapter'; the bundler aliases '../adapter' here.
// The copilot adapter itself handles both Copilot CLI's camelCase fire (toolName/toolArgs) and the
// snake_case fire shared by VS Code + Copilot CLI's PascalCase fire (hook_event_name/tool_name/
// tool_input) — see docs/hooks/copilot.md and adapters/copilot.ts.
import { copilot } from '../adapters/copilot';
import { makeEntrypoint } from './make-entrypoint';

export const adapter = makeEntrypoint(copilot);

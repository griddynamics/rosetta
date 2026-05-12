import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { evaluateDangerous } from './dangerous-actions/evaluate';

export const dangerousActionsHook = defineHook({
  name: 'dangerous-actions',
  on: {
    event: 'PreToolUse',
    toolKinds: ['bash', 'write', 'edit', 'multi-edit', 'mcp-call'],
  },
  run: (ctx) => evaluateDangerous(ctx),
});

runAsCli(dangerousActionsHook, module);

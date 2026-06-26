import { defineHook } from '../runtime/define-hook';
import { runAsCli, runHook } from '../runtime/run-hook';
import { handleReadOnce } from './read-once-shared';

export const readOnceHook = defineHook({
  name: 'read-once',
  on: {
    event: ['PreRead', 'PreToolUse'],
    toolKinds: ['read', 'bash'],
  },
  run: handleReadOnce,
});

runAsCli(readOnceHook, module);

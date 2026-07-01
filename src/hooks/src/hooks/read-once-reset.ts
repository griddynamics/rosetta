import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { resetReadOnceSession } from './read-once-shared';

export const readOnceResetHook = defineHook({
  name: 'read-once-reset',
  on: {
    event: ['PreCompact', 'PostCompact'],
  },
  run: resetReadOnceSession,
});

runAsCli(readOnceResetHook, module);

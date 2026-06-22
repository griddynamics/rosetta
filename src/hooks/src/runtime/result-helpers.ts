import type { HookResult } from './types';

export const advise     = (message: string): HookResult => ({ kind: 'advise', message });
export const allow      = (): HookResult                 => ({ kind: 'allow' });
export const deny       = (reason: string): HookResult  => ({ kind: 'deny', reason });
export const sideEffect = (): HookResult                 => ({ kind: 'side-effect' });

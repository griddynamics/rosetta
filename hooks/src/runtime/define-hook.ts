import type { HookDefinition } from './types';

/**
 * Type-narrowing helper — returns the definition unchanged.
 *
 * Gates in runHook execute in this order:
 *   on.event → on.toolKinds → on.filePath → on.toolInput → on.fs
 *   → adapter.dedupKey (platform) → throttle.dedupBy → run(ctx)
 *
 * Top-level fields:
 *   name      string               id used in errors, debug logs, and dedup keys
 *   on        HookActivation       declarative activation gates (see types.ts)
 *   throttle? HookThrottle         hook-level dedup; not for platform quirks
 *   run       (ctx) => HookResult  body; called only when all gates pass
 *
 * Return helpers: advise / allow / deny / sideEffect (runtime/result-helpers.ts)
 */
export const defineHook = (def: HookDefinition): HookDefinition => def;

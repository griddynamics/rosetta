"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineHook = void 0;
/**
 * Type-narrowing helper — returns the definition unchanged.
 *
 * Gates in runHook execute in this order:
 *   on.event → on.toolKinds → on.filePath → on.toolInput → on.fs
 *   → throttle.dedupBy → run(ctx)
 *
 * (There used to be a platform-level `adapter.dedupKey` gate here too, specific to Copilot —
 * removed 2026-06-30. It existed because Copilot CLI would invoke a SINGLE registered hook
 * TWICE per real event (a Copilot-side runtime bug, independent of registration casing);
 * GitHub has since fixed that, confirmed empirically (one registration → one invocation).
 * This is distinct from registering the same hook under two DIFFERENT keys, e.g. both
 * `preToolUse` and `PreToolUse` — that's two separate matching config entries and will always
 * fire twice regardless of any dedup; the fix there is registering one common key, not dedup.)
 *
 * Top-level fields:
 *   name      string               id used in errors and debug logs
 *   on        HookActivation       declarative activation gates (see types.ts)
 *   throttle? HookThrottle         hook-level dedup, author-configurable
 *   run       (ctx) => HookResult  body; called only when all gates pass
 *
 * Return helpers: advise / allow / deny / sideEffect (runtime/result-helpers.ts)
 */
const defineHook = (def) => def;
exports.defineHook = defineHook;

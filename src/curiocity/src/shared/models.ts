import { z } from 'zod';

/**
 * Model roles (§5.6, P5). Two live tiers (`fast`, `workhorse`); `judge` defaults
 * to `workhorse` when unset. The concrete AI-SDK router lives in `llm/` (out of
 * scope for M1) — the schema lives here because `config/` (AgentProfile.models,
 * top-level `models`, per-case `models`) and `shared/ipc.ts` all reference it and
 * `shared/` is the common dependency floor (§3).
 */
export const roleSchema = z.enum(['fast', 'workhorse', 'judge']);
export type Role = z.infer<typeof roleSchema>;

/** Model assignments as `"provider/model"` strings; `judge` optional (defaults to workhorse). */
export const modelRolesSchema = z.object({
  fast: z.string().min(1),
  workhorse: z.string().min(1),
  judge: z.string().min(1).optional(),
});
export type ModelRoles = z.infer<typeof modelRolesSchema>;

/** Per-agent / per-case overrides merge onto the top-level `models` (D13). */
export const partialModelRolesSchema = modelRolesSchema.partial();
export type PartialModelRoles = z.infer<typeof partialModelRolesSchema>;

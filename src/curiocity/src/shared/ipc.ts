import { z } from 'zod';
import { partialModelRolesSchema } from './models';
import { fakeRouterScriptSchema } from './model-router';
import { qnaEntrySchema } from './trajectory';

/**
 * IPC message types (§4). Parent (orchestrator) forks one Curion per matrix cell;
 * every message crossing the boundary is zod-validated.
 *
 *   parent → child:  { type: 'spec', spec: TrialSpec }
 *   child  → parent: { type: 'status' | 'log' | 'mirror' | 'qna' | 'result' | 'fatal', ... }
 *
 * Secrets travel to the child ONLY inside `TrialSpec.keys` over this channel (§4);
 * children are forked with an allow-listed env and never inherit CI secret vars.
 *
 * The orchestrator/curion runtime that produces & consumes these is out of scope
 * for M1 — this module defines the wire contract only.
 */

// --- TrialSpec ---------------------------------------------------------------
// Kept structural (not importing config schemas) to preserve the dependency floor:
// `shared/` must not depend on `config/`. The orchestrator assembles this from the
// resolved config; the child re-validates on receipt.
export const trialSpecSchema = z.object({
  agentId: z.string(),
  caseName: z.string(),
  repeat: z.number().int().positive(),
  timeoutSec: z.number().int().positive(),
  /** Task prompt (launch argument, D15). */
  prompt: z.string(),
  /** QnA answering policy (§6). */
  qna: z.string(),
  /** Judge rubric, verbatim, when evaluation is enabled. */
  evaluation: z.string().optional(),
  /** Effective model roles for this trial (top-level < profile < case < CLI). */
  models: partialModelRolesSchema,
  /** Provider LLM keys, resolved once by the parent (§4/§12); masked in logs. */
  keys: z.record(z.string()).default({}),
  /** Merged provisioning (MCPs + plugins), passed through opaquely for M1. */
  provision: z.record(z.unknown()).default({}),
  /** Concatenated setup / teardown scripts (D14). */
  setup: z.array(z.string()).default([]),
  teardown: z.array(z.string()).default([]),
  /** Evaluator config entries, validated by the evaluator layer later. */
  evaluators: z.array(z.unknown()).default([]),
  /** Verdict combiner id (§5.4, default `gated-mean`). */
  combiner: z.string().default('gated-mean'),
  /** Case source folder (discovered cases): the `external` evaluator's `caseDir` and
   *  the cwd for case-relative evaluator commands (§11). Absent for inline cases. */
  caseDir: z.string().optional(),
  /** Path to the case source archive (unzipped into the workspace). */
  srcZipPath: z.string().optional(),
  /** Inline `--src <dir>` source directory (copied into the workspace). */
  srcDir: z.string().optional(),
  /**
   * The resolved `AgentProfile` for this trial. Carried opaquely (like `provision`
   * / `evaluators`) so `shared/` stays free of a `config/` dependency; the Curion
   * re-validates it with `agentProfileSchema` on receipt.
   */
  profile: z.unknown(),
  /** Registry id of the adapter (mirrors `profile.adapter`; convenience for logs). */
  adapter: z.string(),
  /** Run dir this trial writes its artifacts into (§14). */
  runDir: z.string(),
  /** `--keep-workspace`: keep the workspace even on success (§7 step 8). */
  keepWorkspace: z.boolean().default(false),
  /** `--mirror`: forward raw PTY frames to the parent over IPC. */
  mirror: z.boolean().default(false),
  /** Whether the evaluate step runs (D9 / `--evaluate`). Evaluators themselves are M3. */
  evaluate: z.boolean().default(false),
  /**
   * Scripted fake model router for token-free integration tests (M2). When
   * present the Curion builds a `FakeModelRouter` instead of a real LLM router
   * (the real router is M3). Never set by production suite/inline runs.
   */
  fakeRouter: fakeRouterScriptSchema.optional(),
});
export type TrialSpec = z.infer<typeof trialSpecSchema>;

// --- parent → child ----------------------------------------------------------
export const specMessageSchema = z.object({
  type: z.literal('spec'),
  spec: trialSpecSchema,
});
export type SpecMessage = z.infer<typeof specMessageSchema>;

export const parentToChildSchema = specMessageSchema;
export type ParentToChildMessage = z.infer<typeof parentToChildSchema>;

// --- child → parent ----------------------------------------------------------
export const statusMessageSchema = z.object({
  type: z.literal('status'),
  status: z.string(),
  detail: z.string().optional(),
});

export const logMessageSchema = z.object({
  type: z.literal('log'),
  level: z.string(),
  msg: z.string(),
  fields: z.record(z.unknown()).optional(),
});

export const mirrorMessageSchema = z.object({
  type: z.literal('mirror'),
  paneId: z.string(),
  data: z.string(),
});

export const qnaMessageSchema = z.object({
  type: z.literal('qna'),
  entry: qnaEntrySchema,
});

export const resultMessageSchema = z.object({
  type: z.literal('result'),
  // Validated against `results/schema.ts#trialResultSchema` by the orchestrator;
  // kept opaque here to avoid a `shared/` -> `results/` dependency.
  result: z.unknown(),
});

export const fatalMessageSchema = z.object({
  type: z.literal('fatal'),
  error: z.string(),
});

export const childToParentSchema = z.discriminatedUnion('type', [
  statusMessageSchema,
  logMessageSchema,
  mirrorMessageSchema,
  qnaMessageSchema,
  resultMessageSchema,
  fatalMessageSchema,
]);
export type ChildToParentMessage = z.infer<typeof childToParentSchema>;

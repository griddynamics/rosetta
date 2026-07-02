import { z } from 'zod';

/**
 * `TrajectoryEvent` (§5.2) — the ONE normalized shape every evaluator, judge and
 * stat consumes regardless of agent. Each adapter's `parseEvents` maps its native
 * transcript dialect into arrays of these.
 */
export const trajectoryKindSchema = z.enum([
  'user',
  'assistant',
  'tool_call',
  'tool_result',
  'usage',
  'lifecycle',
]);
export type TrajectoryKind = z.infer<typeof trajectoryKindSchema>;

export const trajectoryEventSchema = z.object({
  /** Event timestamp: epoch millis (number) or the source ISO string. */
  ts: z.union([z.number(), z.string()]),
  kind: trajectoryKindSchema,
  /** Tool / event name where applicable (e.g. tool_call name, lifecycle phase). */
  name: z.string().optional(),
  /** Opaque per-kind payload; not interpreted at the shared layer. */
  payload: z.unknown(),
});
export type TrajectoryEvent = z.infer<typeof trajectoryEventSchema>;

/**
 * QnA audit entry (§6). Every typed reply the harness sends in answer to a genuine
 * question is recorded here (full audit trail). Referenced by both the results
 * schema and IPC messages, hence it lives in `shared/`.
 */
export const qnaEntrySchema = z.object({
  type: z.enum(['structured', 'free-text']),
  question: z.string(),
  answer: z.string(),
  ts: z.union([z.number(), z.string()]),
});
export type QnaEntry = z.infer<typeof qnaEntrySchema>;

/** Token usage accounting (§12). Extra provider-specific fields pass through. */
export const usageSchema = z
  .object({
    inputTokens: z.number().nonnegative().default(0),
    outputTokens: z.number().nonnegative().default(0),
  })
  .passthrough();
export type Usage = z.infer<typeof usageSchema>;

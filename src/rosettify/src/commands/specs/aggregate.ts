// Implements the aggregated error-string builder (SPECS §13, Decision 6). Used for batch
// all-or-nothing rejection (FR-SPECS-0030), the approve validation gate (FR-SPECS-0017,
// validation_failed), and purge's multi-field referenced_by_others (FR-SPECS-0016) — same
// builder in every case so callers get one consistent human-readable shape.

/** One rejected batch item. `ref` is the spec id, or `index N` when the item carries no id. */
export interface RejectRef {
  ref: string;
  reason: string;
}

/**
 * Builds the single human-readable aggregated error string:
 * `<code>: <n> item(s) rejected | [<ref>] <reason>; [<ref>] <reason>; …`
 * Emitted verbatim into the envelope's `error: string` field — no schema change needed.
 */
export function aggregate(code: string, rejects: RejectRef[]): string {
  const detail = rejects.map((r) => `[${r.ref}] ${r.reason}`).join("; ");
  return `${code}: ${rejects.length} item(s) rejected | ${detail}`;
}

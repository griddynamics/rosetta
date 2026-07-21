// Implements FR-SPECS-0042 (UTC storage, local display).
// Persisted timestamps in a specs document are always produced by nowUtcZ(); human-oriented
// output (render/info) converts via formatLocal(); machine-oriented output (get/query) returns
// the stored UTC string unchanged.

/** Current instant as ISO8601 UTC (ends with "Z"). Used for created_at/updated_at/changed. */
export function nowUtcZ(): string {
  return new Date().toISOString();
}

/**
 * Formats a stored ISO8601 UTC timestamp for human display in the host's local timezone.
 * Passthrough (returns the input unchanged) if it cannot be parsed as a date, so a
 * malformed/legacy value never throws or renders as "Invalid Date".
 */
export function formatLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

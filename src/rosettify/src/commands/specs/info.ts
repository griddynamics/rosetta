// Implements FR-SPECS-0024 (info subcommand — orientation). Read-only summary: areas+counts,
// totals by type/status/implementation, and the next free id per prefix+area (so the authoring
// agent can pick ids in advance without collision). Timestamps are shown in local time
// (FR-SPECS-0042) via formatLocal — unlike get/query, which return the stored UTC verbatim.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import { formatLocal } from "../../shared/time.js";
import { parseId, type SpecsDocument } from "./core.js";
import type { SpecAreaInfo, SpecInfoResult, SpecNextId, SpecTotals } from "./output.js";
import { ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";

function computeAreas(doc: SpecsDocument): SpecAreaInfo[] {
  const counts = new Map<string, number>();
  for (const spec of doc.specs ?? []) {
    const parsed = parseId(spec.id);
    if (!parsed) continue;
    counts.set(parsed.area, (counts.get(parsed.area) ?? 0) + 1);
  }
  return (doc.areas ?? []).map((a) => ({ code: a.code, name: a.name, count: counts.get(a.code) ?? 0 }));
}

function computeTotals(doc: SpecsDocument): SpecTotals {
  const by_type: Record<string, number> = {};
  const by_status: Record<string, number> = {};
  const by_implementation: Record<string, number> = {};
  for (const spec of doc.specs ?? []) {
    by_type[spec.type] = (by_type[spec.type] ?? 0) + 1;
    by_status[spec.status] = (by_status[spec.status] ?? 0) + 1;
    by_implementation[spec.implementation] = (by_implementation[spec.implementation] ?? 0) + 1;
  }
  return { by_type, by_status, by_implementation, total: (doc.specs ?? []).length };
}

/** FR-SPECS-0004/0024 — highest used NNNN (+1 suggested) per prefix+area combination that has
 * at least one existing spec. A combination with no existing specs is not reported — an
 * authoring agent introducing a genuinely new prefix+area starts from 0001 by convention, which
 * `add`'s own auto-registration already handles without needing a next_ids entry. */
function computeNextIds(doc: SpecsDocument): SpecNextId[] {
  const highest = new Map<string, number>(); // key: `${prefix}|${area}`
  for (const spec of doc.specs ?? []) {
    const parsed = parseId(spec.id);
    if (!parsed) continue;
    const key = `${parsed.prefix}|${parsed.area}`;
    if (parsed.seq > (highest.get(key) ?? 0)) highest.set(key, parsed.seq);
  }
  const results: SpecNextId[] = [];
  for (const [key, seq] of highest) {
    const [prefix, area] = key.split("|") as [string, string];
    results.push({ prefix, area, highest: seq, suggested: `${prefix}-${area}-${String(seq + 1).padStart(4, "0")}` });
  }
  return results.sort((a, b) => a.prefix.localeCompare(b.prefix) || a.area.localeCompare(b.area));
}

export async function cmdInfo(specsFile: string): Promise<RunEnvelope<SpecInfoResult>> {
  try {
    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    return ok({
      component: doc.component,
      description: doc.description,
      areas: computeAreas(doc),
      totals: computeTotals(doc),
      next_ids: computeNextIds(doc),
      created_at: formatLocal(doc.created_at),
      updated_at: formatLocal(doc.updated_at),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

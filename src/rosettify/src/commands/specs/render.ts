// Implements FR-SPECS-0023/0042 (human-readable rendering). renderSpecs is pure (no IO, no file
// write); cmdRender is the thin envelope wrapper (SPECS §10), completed in this stage per the
// execution plan (S5) since it needs only readDocWithRetry/envelope/logger (already available)
// plus query-filter.ts — the plan explicitly names query-filter.ts as "shared by
// query/validate/render", so this cross-import between S5 files is intentional, not a slip of
// the "no cross-imports" guideline (which is about avoiding accidental coupling between the five
// files, not about forbidding the one shared-by-design dependency the plan itself calls out).

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import { formatLocal } from "../../shared/time.js";
import { type Spec, type SpecsDocument, parseId } from "./core.js";
import type { SpecRenderResult } from "./output.js";
import { ERR_INVALID_FORMAT, ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";
import { parseQuery, applyFilter } from "./query-filter.js";

// ---------------------------------------------------------------------------
// Pure rendering (SPECS §11.5)
// ---------------------------------------------------------------------------

interface AreaGroup {
  code: string;
  name: string;
  specs: Spec[];
}

/** Groups `specs` by area (via parseId), ordered per doc.areas' registration order; any area
 * code present in `specs` but not registered in doc.areas is appended at the end (tolerant —
 * render never fails on an unregistered/unparseable area, it just falls back to the raw code
 * as its own display name). */
function groupByArea(doc: SpecsDocument, specs: Spec[]): AreaGroup[] {
  const byArea = new Map<string, Spec[]>();
  for (const spec of specs) {
    const parsed = parseId(spec.id);
    const code = parsed?.area ?? "UNKNOWN";
    const list = byArea.get(code);
    if (list) list.push(spec);
    else byArea.set(code, [spec]);
  }

  const groups: AreaGroup[] = [];
  const seen = new Set<string>();
  for (const area of doc.areas ?? []) {
    const list = byArea.get(area.code);
    if (list && list.length > 0) {
      groups.push({ code: area.code, name: area.name, specs: [...list].sort((a, b) => a.id.localeCompare(b.id)) });
      seen.add(area.code);
    }
  }
  for (const [code, list] of byArea) {
    if (seen.has(code)) continue;
    groups.push({ code, name: code, specs: [...list].sort((a, b) => a.id.localeCompare(b.id)) });
  }
  return groups;
}

function renderMarkdown(doc: SpecsDocument, groups: AreaGroup[]): string {
  const lines: string[] = [`# ${doc.component || "(unnamed)"}`];
  if (doc.description) lines.push("", doc.description);
  for (const group of groups) {
    lines.push("", `## ${group.code} — ${group.name}`);
    for (const spec of group.specs) {
      lines.push("", `### ${spec.id} — ${spec.title}`);
      lines.push(`- Priority: ${spec.priority}`);
      lines.push(`- Status: ${spec.status}`);
      lines.push(`- Statement: ${spec.statement}`);
      lines.push("- Acceptance:");
      (spec.acceptance ?? []).forEach((c, i) => {
        lines.push(`  ${i + 1}. Given ${c.given} When ${c.when} Then ${c.then}`);
      });
      lines.push(`- Depends on: ${(spec.depends_on ?? []).join(", ") || "(none)"}`);
      lines.push(`- Related: ${(spec.related ?? []).join(", ") || "(none)"}`);
      lines.push(`- Changed: ${formatLocal(spec.changed)} by ${spec.changed_by || "unknown"}`);
    }
  }
  return lines.join("\n");
}

function renderText(doc: SpecsDocument, groups: AreaGroup[]): string {
  const lines: string[] = [doc.component || "(unnamed)"];
  if (doc.description) lines.push(doc.description);
  for (const group of groups) {
    lines.push("", `Area: ${group.code} - ${group.name}`);
    for (const spec of group.specs) {
      lines.push("", `${spec.id} - ${spec.title}`);
      lines.push(`  Priority: ${spec.priority}`);
      lines.push(`  Status: ${spec.status}`);
      lines.push(`  Statement: ${spec.statement}`);
      lines.push("  Acceptance:");
      (spec.acceptance ?? []).forEach((c, i) => {
        lines.push(`    ${i + 1}. Given ${c.given} When ${c.when} Then ${c.then}`);
      });
      lines.push(`  Depends on: ${(spec.depends_on ?? []).join(", ") || "(none)"}`);
      lines.push(`  Related: ${(spec.related ?? []).join(", ") || "(none)"}`);
      lines.push(`  Changed: ${formatLocal(spec.changed)} by ${spec.changed_by || "unknown"}`);
    }
  }
  return lines.join("\n");
}

/** FR-SPECS-0023 — renders `specs` (already the caller's chosen subset — e.g. query-filtered)
 * grouped by area, in `format`. No file write; timestamps go through formatLocal (FR-SPECS-0042
 * — local display, UTC storage). `format` validity is the caller's (cmdRender's) concern. */
export function renderSpecs(doc: SpecsDocument, specs: Spec[], format: "markdown" | "text"): string {
  const groups = groupByArea(doc, specs);
  return format === "markdown" ? renderMarkdown(doc, groups) : renderText(doc, groups);
}

// ---------------------------------------------------------------------------
// cmdRender — FR-SPECS-0023, SPECS §10. Optional query scope (default: all non-Removed specs);
// format defaults to markdown; a format other than markdown|text -> invalid_format, checked
// before any read/render work.
// ---------------------------------------------------------------------------

export async function cmdRender(
  specsFile: string,
  query?: string,
  format?: string,
): Promise<RunEnvelope<SpecRenderResult>> {
  try {
    const fmt = format ?? "markdown";
    if (fmt !== "markdown" && fmt !== "text") return err(ERR_INVALID_FORMAT);

    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    const filter = parseQuery(query);
    if ("error" in filter) return err(filter.error);
    const specs = applyFilter(doc.specs ?? [], filter);

    const content = renderSpecs(doc, specs, fmt);
    logger.info({ specsFile, format: fmt, count: specs.length }, "specs render");
    return ok({ format: fmt, content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

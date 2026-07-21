// Implements FR-SPECS-0012 (query subcommand). Read-only attribute search over the whole
// document via query-filter.ts's grammar; excludes soft-deleted (Removed) specs unless the query
// string says `include_removed:true`/`status:Removed`, or the caller's own includeRemoved flag
// (FR-CLI `--include-removed`) is set.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import type { SpecsDocument } from "./core.js";
import type { SpecQueryResult } from "./output.js";
import { ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";
import { applyFilter, parseQuery } from "./query-filter.js";

export async function cmdQuery(
  specsFile: string,
  query?: string,
  includeRemoved?: boolean,
): Promise<RunEnvelope<SpecQueryResult>> {
  try {
    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    const filter = parseQuery(query);
    if ("error" in filter) return err(filter.error);
    if (includeRemoved) filter.includeRemoved = true;

    const specs = applyFilter(doc.specs ?? [], filter);
    logger.info({ specsFile, count: specs.length }, "specs query");
    return ok({ specs, count: specs.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

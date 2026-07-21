// Implements FR-SPECS-0011 (get subcommand). By-id retrieval; returns a spec regardless of its
// status (including Removed, since the caller addressed it explicitly). Never errors on a
// missing id — it is reported in `missing` instead.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import type { SpecsDocument } from "./core.js";
import type { SpecGetResult } from "./output.js";
import { ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";

export async function cmdGet(specsFile: string, ids: string[]): Promise<RunEnvelope<SpecGetResult>> {
  try {
    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    const byId = new Map((doc.specs ?? []).map((s) => [s.id, s]));
    const found: SpecGetResult["found"] = [];
    const missing: string[] = [];
    for (const id of ids ?? []) {
      const spec = byId.get(id);
      if (spec) found.push(spec);
      else missing.push(id);
    }

    logger.info({ specsFile, requested: (ids ?? []).length, found: found.length }, "specs get");
    return ok({ found, missing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

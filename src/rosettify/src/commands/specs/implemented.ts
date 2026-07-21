// Implements FR-SPECS-0015 (implemented subcommand). Sets the target's `implementation` enum
// (+optional implementation_notes); NEVER touches `status` — approval and implementation
// lifecycles are independent. All-or-nothing (FR-SPECS-0030).

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { aggregate, type RejectRef } from "./aggregate.js";
import { IMPLS, type ImplEnum } from "./core.js";
import type { SpecImplementedItem, SpecImplementedResult } from "./output.js";
import { ERR_INVALID_IMPLEMENTATION, ERR_INVALID_SPEC_FIELD, ERR_MISSING_DATA, ERR_MISSING_ID, ERR_MISSING_IMPLEMENTATION, ERR_TARGET_NOT_FOUND } from "./errors.js";

const IMPL_SET: ReadonlySet<string> = new Set(IMPLS);

export async function cmdImplemented(
  specsFile: string,
  items: unknown[],
  actor?: string,
): Promise<RunEnvelope<SpecImplementedResult>> {
  try {
    if (!items || items.length === 0) return err(ERR_MISSING_DATA, true);

    const build: BatchBuild<SpecImplementedResult> = (doc) => {
      const rejects: RejectRef[] = [];
      const affected: string[] = [];
      const updated: SpecImplementedItem[] = [];

      items.forEach((raw, index) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          rejects.push({ ref: `index ${index}`, reason: ERR_INVALID_SPEC_FIELD });
          return;
        }
        const item = raw as Record<string, unknown>;
        const id = typeof item["id"] === "string" ? item["id"] : undefined;
        if (!id) {
          rejects.push({ ref: `index ${index}`, reason: ERR_MISSING_ID });
          return;
        }

        const spec = (doc.specs ?? []).find((s) => s.id === id);
        if (!spec) {
          rejects.push({ ref: id, reason: ERR_TARGET_NOT_FOUND });
          return;
        }

        const implRaw = item["implementation"];
        if (implRaw === undefined || implRaw === null || implRaw === "") {
          rejects.push({ ref: id, reason: ERR_MISSING_IMPLEMENTATION });
          return;
        }
        if (typeof implRaw !== "string" || !IMPL_SET.has(implRaw)) {
          rejects.push({ ref: id, reason: ERR_INVALID_IMPLEMENTATION });
          return;
        }

        spec.implementation = implRaw as ImplEnum; // guarded — set only here (FR-SPECS-0040); status untouched
        if (typeof item["implementation_notes"] === "string") {
          spec.implementation_notes = item["implementation_notes"];
        }

        affected.push(id);
        updated.push({ id, implementation: spec.implementation });
      });

      if (rejects.length > 0) {
        return { ok: false, error: aggregate(rejects[0]!.reason, rejects) };
      }

      return { ok: true, affected, result: { updated } };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { actor });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const result = writeResult.result!.result;
    logger.info({ specsFile, count: result.updated.length }, "specs implemented");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

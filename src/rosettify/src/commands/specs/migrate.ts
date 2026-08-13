// Implements FR-SPECS-0025 (migrate subcommand). Reads requirement units held as markup via
// req-parser.ts, maps each unit to a spec, registers areas, and appends via applyBatchWrite
// (allowCreate — the destination may not exist yet).
//
// CANONICAL FORM ONLY. A unit that is not in the canonical shape is skipped with a stated reason
// and is never reconstructed by inference; `migrated` counts the canonical units alone. Skips are
// recorded per unit, not per file: two skipped units from one source produce two entries sharing
// that source, and each entry names its unit inside the reason. A whole-source failure (missing
// file, zero locatable units) is recorded the same way, against the source itself.
//
// Report-don't-drop: one failing source never aborts the others in the same call, and every parse
// issue is reported rather than short-circuiting on the first.
//
// Resolution (ambiguity — FR-SPECS-0025's own acceptance criteria phrase a missing/unparseable
// source as a bare top-level `{error: "source_not_found"}` / `{error: "migrate_parse_error"}`,
// which reads as a hard RunEnvelope failure): those criteria are read here as describing a
// single-source call (where "the whole call fails" and "that one source is excluded" collapse to
// the same observable outcome). For the general multi-source case this module instead reports
// each failing source into `skipped` and keeps processing the rest — the only reading under
// which `SpecMigrateResult.skipped` (explicitly typed for exactly these two reasons) has any
// purpose, and consistent with the surrounding "report every issue rather than silently dropping
// data" mandate. migrate does NOT re-validate a mapped spec's type/id-format/required-fields
// beyond what the standard write path already enforces (duplicate/reference/cycle/size) — that
// full validation surface is what `validate` (FR-SPECS-0021) exists for, and is not itself named
// in FR-SPECS-0025's acceptance criteria.

import * as fs from "fs";
import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { type BatchBuild, applyBatchWrite } from "./write.js";
import { autoRegisterAreas, ensureReservedAreas, type Spec } from "./core.js";
import { describeError, ERR_MIGRATE_PARSE_ERROR, ERR_SOURCE_NOT_FOUND } from "./errors.js";
import type { SpecFinding, SpecMigrateResult, SpecSkipped } from "./output.js";
import { mapToSpec, scanReqBlocks } from "./req-parser.js";

/** Fills every Spec field a mapped unit may have left unset. migrate imports historical state
 * as-is (req-parser's mapToSpec does not strip guarded fields — see its own header comment), so
 * this only supplies safe defaults for fields the source genuinely omitted. An empty
 * subsystem/component means the source did not say, never that none applies. */
function toFullSpec(partial: Partial<Spec>): Spec {
  return {
    id: partial.id!,
    type: partial.type ?? "FR",
    level: partial.level || "System",
    subsystem: partial.subsystem ?? "",
    component: partial.component ?? "",
    ...(partial.ticket_id ? { ticket_id: partial.ticket_id } : {}),
    ...(partial.classification ? { classification: partial.classification } : {}),
    title: partial.title ?? "",
    statement: partial.statement ?? "",
    rationale: partial.rationale ?? "",
    evidence: partial.evidence ?? [],
    source: partial.source ?? "User",
    priority: partial.priority ?? "Must",
    status: partial.status ?? "Draft",
    approved_by: partial.approved_by ?? "",
    changed: partial.changed ?? "",
    changed_by: "", // historical authorship unknown; migrate never auto-stamps (build returns affected:[])
    verification: partial.verification ?? "Test",
    acceptance: partial.acceptance ?? [],
    depends_on: partial.depends_on ?? [],
    related: partial.related ?? [],
    implementation: partial.implementation ?? "NotStarted",
    implementation_notes: partial.implementation_notes ?? "",
    notes: partial.notes ?? "",
  };
}

export async function cmdMigrate(
  sources: string[],
  specsFile: string,
  actor?: string,
  system?: string,
): Promise<RunEnvelope<SpecMigrateResult>> {
  try {
    const warnings: SpecFinding[] = [];
    const skipped: SpecSkipped[] = [];
    const pending: Spec[] = [];
    // FR-SPECS-0025 — tracks the raw code of the first source-level failure (source_not_found /
    // migrate_parse_error) so a call where EVERY supplied source fails can surface it as a
    // top-level error instead of silently downgrading to an ok(migrated:0) result.
    let firstFailureCode: string | null = null;

    for (const source of sources ?? []) {
      if (!fs.existsSync(source)) {
        skipped.push({ source, reason: describeError(ERR_SOURCE_NOT_FOUND) });
        firstFailureCode ??= ERR_SOURCE_NOT_FOUND;
        continue;
      }

      let content: string;
      try {
        content = fs.readFileSync(source, "utf8");
      } catch {
        skipped.push({ source, reason: describeError(ERR_SOURCE_NOT_FOUND) });
        firstFailureCode ??= ERR_SOURCE_NOT_FOUND;
        continue;
      }

      const blocks = scanReqBlocks(content);
      if (blocks.length === 0) {
        skipped.push({ source, reason: describeError(ERR_MIGRATE_PARSE_ERROR) });
        firstFailureCode ??= ERR_MIGRATE_PARSE_ERROR;
        continue;
      }

      for (const block of blocks) {
        const { spec, warnings: blockWarnings, skip } = mapToSpec(block);
        warnings.push(...blockWarnings);
        if (skip) {
          // FR-SPECS-0025 — one entry per skipped unit, sharing this source; the unit is named
          // inside the reason. Nothing about the unit is guessed at.
          skipped.push({ source, reason: skip });
          continue;
        }
        pending.push(toFullSpec(spec));
      }
    }

    // FR-SPECS-0025 acceptance: if a source path does not exist, or a source cannot be parsed at
    // the file level, the call is rejected with that code — so when nothing was parseable BECAUSE
    // every source failed at the file level, this is a hard top-level error, not a silent
    // ok(migrated:0). A batch where only SOME sources failed still falls through to the write
    // below and stays report-don't-drop. A source whose units were all skipped as non-canonical
    // is not a file-level failure and does not reach here.
    if (pending.length === 0 && firstFailureCode) {
      logger.info({ sources: (sources ?? []).length, skipped: skipped.length }, "specs migrate: all sources failed");
      return err(firstFailureCode);
    }

    if (pending.length === 0) {
      logger.info({ sources: (sources ?? []).length, skipped: skipped.length }, "specs migrate: nothing to write");
      return ok({ migrated: 0, sources: sources ?? [], warnings, skipped });
    }

    const build: BatchBuild<SpecMigrateResult> = (doc) => {
      ensureReservedAreas(doc); // FR-SPECS-0004 — an existing destination is never re-created, so the pre-registered codes are backfilled here
      autoRegisterAreas(doc, pending.map((s) => s.id)); // FR-SPECS-0025 — areas encountered in ids are registered
      doc.specs = [...(doc.specs ?? []), ...pending];
      // affected:[] — migrate imports historical changed/changed_by as-is, never auto-stamped.
      return { ok: true, affected: [], result: { migrated: pending.length, sources: sources ?? [], warnings, skipped } };
    };

    const writeResult = await applyBatchWrite(specsFile, build, { allowCreate: true, actor, system });
    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    const result = writeResult.result!.result;
    logger.info({ specsFile, migrated: result.migrated, skipped: result.skipped.length }, "specs migrate");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

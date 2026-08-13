// Specs command entry point (SPECS §8). Routes all 16 specs subcommands and exposes the ToolDef
// for CLI/MCP registration. Mirrors commands/plan/index.ts: no subcommand -> help content;
// unknown subcommand -> structured error; central `data` JSON parse once; batch normalize
// (1 item <-> array) before per-case required-arg checks; delegate to the cmd* run delegates.

import type { ToolDef, RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { type SpecInput } from "./core.js";
import { cmdAdd } from "./add.js";
import { cmdGet } from "./get.js";
import { cmdQuery } from "./query.js";
import { cmdUpdate } from "./update.js";
import { cmdDelete } from "./delete.js";
import { cmdPurge } from "./purge.js";
import { cmdImplemented } from "./implemented.js";
import { cmdApprove } from "./approve.js";
import { cmdDeprecate } from "./deprecate.js";
import { cmdRestore } from "./restore.js";
import { cmdReopen } from "./reopen.js";
import { cmdValidate } from "./validate.js";
import { cmdGraph } from "./graph.js";
import { cmdRender } from "./render.js";
import { cmdInfo } from "./info.js";
import { cmdMigrate } from "./migrate.js";
import { specsHelpContent } from "./help-content.js";
import { ERR_INVALID_DATA, ERR_MISSING_DATA } from "./errors.js";
import { aggregate } from "./aggregate.js";
import { SPECS_MAX_BATCH_SIZE } from "../../shared/constants.js";

// FR-SPECS-0030 — the 16 registered subcommands
const VALID_SUBCOMMANDS = [
  "add",
  "get",
  "query",
  "update",
  "delete",
  "purge",
  "implemented",
  "approve",
  "deprecate",
  "restore",
  "reopen",
  "validate",
  "graph",
  "render",
  "info",
  "migrate",
] as const;

const VALID_SUBCOMMANDS_STR = VALID_SUBCOMMANDS.join(", ");

/** FR-SPECS-0030 — undefined -> []; a single object -> [object]; an array -> itself, unchanged. */
function normalizeBatch(x: unknown): unknown[] {
  if (x === undefined) return [];
  if (Array.isArray(x)) return x;
  return [x];
}

async function runSpecs(input: SpecInput): Promise<RunEnvelope<unknown>> {
  const {
    subcommand,
    specs_file: specsFile,
    data,
    ids,
    query,
    force,
    format,
    additional_paths: additionalPaths,
    actor,
    system,
    sources,
    include_removed: includeRemoved,
  } = input;

  // FR-SPECS-0030 (mirrors FR-PLAN-0022) — no subcommand returns help content
  if (!subcommand) {
    return ok(specsHelpContent);
  }

  // FR-SPECS-0030 (mirrors FR-PLAN-0023) — unknown subcommand: structured error, include_help=true
  if (!(VALID_SUBCOMMANDS as readonly string[]).includes(subcommand)) {
    return err(`unknown_command: ${subcommand} | valid: ${VALID_SUBCOMMANDS_STR}`, true);
  }

  // Central `data` JSON parse — once, before batch normalize. Non-string data (already an
  // object/array, e.g. from MCP) passes through unparsed.
  let parsedData: unknown;
  if (data !== undefined) {
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return err(`${ERR_INVALID_DATA}: data is not valid JSON`, true);
      }
    } else {
      parsedData = data;
    }
  }

  // FR-SPECS-0030 — batch normalize (1 item <-> array of 1) for every data-bearing subcommand,
  // enforced against SPECS_MAX_BATCH_SIZE before any per-item processing.
  let items: unknown[] | undefined;
  if (subcommand === "add" || subcommand === "update" || subcommand === "implemented") {
    items = normalizeBatch(parsedData);
    if (items.length > SPECS_MAX_BATCH_SIZE) {
      return err(
        aggregate("size_limit_exceeded", [
          { ref: "(batch)", reason: `batch of ${items.length} exceeds the maximum of ${SPECS_MAX_BATCH_SIZE} items` },
        ]),
      );
    }
  }

  switch (subcommand) {
    case "add": {
      if (!specsFile) return err("missing specs_file", true);
      if (!items || items.length === 0) return err(ERR_MISSING_DATA, true);
      return cmdAdd(specsFile, items, actor, system);
    }

    case "get": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdGet(specsFile, ids);
    }

    case "query": {
      if (!specsFile) return err("missing specs_file", true);
      return cmdQuery(specsFile, query, includeRemoved);
    }

    case "update": {
      if (!specsFile) return err("missing specs_file", true);
      if (!items || items.length === 0) return err(ERR_MISSING_DATA, true);
      return cmdUpdate(specsFile, items, actor);
    }

    case "delete": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdDelete(specsFile, ids, actor);
    }

    case "purge": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdPurge(specsFile, ids, !!force, actor);
    }

    case "implemented": {
      if (!specsFile) return err("missing specs_file", true);
      if (!items || items.length === 0) return err(ERR_MISSING_DATA, true);
      return cmdImplemented(specsFile, items, actor);
    }

    case "approve": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdApprove(specsFile, ids, actor);
    }

    case "deprecate": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdDeprecate(specsFile, ids, actor);
    }

    case "restore": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdRestore(specsFile, ids, actor);
    }

    case "reopen": {
      if (!specsFile) return err("missing specs_file", true);
      if (!ids || ids.length === 0) return err("missing ids", true);
      return cmdReopen(specsFile, ids, actor);
    }

    case "validate": {
      if (!specsFile) return err("missing specs_file", true);
      return cmdValidate(specsFile, query);
    }

    // FR-SPECS-0022 — target carried as ids[0] (batch-of-one), same on CLI and MCP (SPECS §14/§17)
    case "graph": {
      if (!specsFile) return err("missing specs_file", true);
      return cmdGraph(specsFile, ids?.[0], additionalPaths);
    }

    case "render": {
      if (!specsFile) return err("missing specs_file", true);
      return cmdRender(specsFile, query, format);
    }

    case "info": {
      if (!specsFile) return err("missing specs_file", true);
      return cmdInfo(specsFile);
    }

    case "migrate": {
      if (!specsFile) return err("missing specs_file", true);
      if (!sources || sources.length === 0) return err("missing sources", true);
      return cmdMigrate(sources, specsFile, actor, system);
    }

    default:
      return err(`unknown_command: ${subcommand}`, true);
  }
}

export const specsToolDef: ToolDef<SpecInput, unknown> = {
  name: "specs",
  brief: "Manage requirements/specs (add, query, validate, approve, and more)",
  description:
    "Manages a system's requirements as spec units stored in one JSON document per system. " +
    `Subcommands: ${VALID_SUBCOMMANDS_STR}.`,
  inputSchema: {
    type: "object",
    properties: {
      subcommand: {
        type: "string",
        description: `Subcommand: ${VALID_SUBCOMMANDS_STR}`,
      },
      specs_file: {
        type: "string",
        description: "Path to the specs document JSON file",
      },
      data: {
        oneOf: [
          { type: "string", description: "JSON string: a single spec/patch/implemented-item object, or an array (batch)" },
          { type: "object", description: "A single spec/patch/implemented-item object" },
          { type: "array", description: "A batch of spec/patch/implemented-item objects" },
        ],
      },
      ids: {
        type: "array",
        items: { type: "string" },
        description: "One or more spec ids (graph's optional target is carried as ids[0])",
      },
      query: {
        type: "string",
        description: "Filter query string for query/validate/render",
      },
      force: {
        type: "boolean",
        description: "Required for purge — permanent removal refuses without it",
      },
      format: {
        type: "string",
        description: "render — output format: markdown (default) | text | xml",
      },
      additional_paths: {
        type: "array",
        items: { type: "string" },
        description: "graph — other specs documents to resolve cross-document references against",
      },
      implementation: {
        type: "string",
        description: "implemented — implementation enum value (NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved)",
      },
      implementation_notes: {
        type: "string",
        description: "implemented — optional implementation notes",
      },
      actor: {
        type: "string",
        description: "Explicit actor override",
      },
      system: {
        type: "string",
        description:
          "add/migrate — name of the system this document holds requirements for; required the first time a call would create the document, optional (and reconciled against the stored name) against one that already exists",
      },
      sources: {
        type: "array",
        items: { type: "string" },
        description: "migrate — legacy markdown source paths",
      },
      include_removed: {
        type: "boolean",
        description: "query — include Removed specs even without an explicit status:Removed term",
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      result: {},
      error: { type: "string" },
      include_help: { type: "boolean" },
    },
  },
  cli: true,
  mcp: true,
  run: runSpecs,
  // FR-SPECS-0060 — forward the full specs help content payload through help/index.ts.
  helpContent: specsHelpContent as unknown as Record<string, unknown>,
};

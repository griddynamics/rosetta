// Implements FR-SPECS-0060 (specs help content), FR-SPECS-0061 (notes), FR-SPECS-0043/FR-ARCH-0016
// (no internal-traceability leakage in any authored string below — no requirement id, ticket id,
// internal path, internal module name, or authoring rationale). Mirrors commands/plan/help-content.ts.
//
// Resolution (ambiguity — the leakage rule (FR-ARCH-0016/FR-SPECS-0043) forbids requirement
// identifiers in authored strings, yet FR-SPECS-0060 separately requires a "real-form example
// (concrete JSON producing a working invocation)" per subcommand, and this command's own domain
// is ids shaped exactly like a requirement id, <PREFIX>-<AREA>-<NNNN>): every example id below
// uses the fictional area "CHK" (checkout), which is not a real area used anywhere in this
// project's own requirement ids (FR-SPECS-*, FR-ARCH-*, FR-PLAN-*, FR-CLI-*, FR-HELP-*) — it
// demonstrates the caller's own id grammar (the exact concern FR-SPECS-0043 carves out) rather
// than referencing any Rosetta-internal traceability id.

import {
  SPECS_MAX_SPECS,
  SPECS_MAX_DEPENDENCIES_PER_SPEC,
  SPECS_MAX_ACCEPTANCE_PER_SPEC,
  SPECS_MAX_STRING_LENGTH,
  SPECS_MAX_NAME_LENGTH,
  SPECS_MAX_BATCH_SIZE,
} from "../../shared/constants.js";
import { specsSchemasDict } from "./schemas.js";

// FR-SPECS-0061 — the 12 caller-facing behaviors, each standalone directive guidance
export const specsNotes: string[] = [
  "the JSON-bearing argument (data) is passed as an inline JSON string, not a file path — a single object or an array (batch)",
  "ids are caller-provided, never server-minted; run info first to get the suggested next id per area before add",
  "a new spec always enters as Draft/NotStarted; any status, approved_by, or implementation supplied on add or update is silently dropped",
  "guarded fields (status, approved_by, implementation, changed_by) change only through the lifecycle ops (approve, deprecate, restore, reopen, delete, implemented) and the actor resolver — never through add or update directly",
  "editing an Approved spec's statement or acceptance moves it to Modified and clears its approval; editing an Implemented spec's contract sets its implementation to ToBeModified",
  "approve runs validation first and refuses on any error-level finding; fix the reported errors, then approve again",
  "delete is a reversible soft-delete (status becomes Removed; restore undoes it); purge permanently removes a spec and requires --force plus no remaining references from other specs",
  "writes are all-or-nothing — a batch with any invalid item writes nothing and the error names every rejected item",
  "query grammar: key:value terms; space between terms means AND; a comma inside one term's value list means OR; a leading - negates a term; a bare word searches title and statement; Removed specs are excluded unless include_removed:true or an explicit status:Removed term is present",
  "timestamps are stored in UTC and shown in local time by render and info; get and query return the stored UTC value verbatim",
  "migrate is a one-time import of legacy markdown spec blocks into the JSON document",
  "every error response is a single human-readable string that aggregates every problem at once — a batch or approval failure names every failing item in one message rather than stopping at the first",
];

export const specsHelpContent = {
  name: "specs",
  brief: "Manage requirements/specs (add, query, validate, approve, and more)",
  description:
    "The specs command manages a component's requirements as spec units stored in one JSON document. " +
    "Write subcommands return a shared SpecWriteResult or SpecLifecycleResult snapshot of the affected specs.",

  // FR-SPECS-0060 — specs_file convention
  specs_file: {
    convention: "one JSON document per component",
    note: "specs_file is the path to that component's specs document",
  },

  // FR-SPECS-0060 — core concepts
  concepts: {
    spec_unit:
      "A spec is one requirement: id, type (FR|NFR|INT|DATA), level, title, statement, rationale, source, priority, " +
      "status, approved_by, changed, changed_by, verification, acceptance (Given/When/Then criteria), depends_on, related, " +
      "implementation, implementation_notes, notes.",
    areas:
      "An id has the form <PREFIX>-<AREA>-<NNNN> (e.g. FR-CHK-0001). AREA groups related specs and is registered in the " +
      "document the first time it appears in an add or migrate call — it does not need to be declared separately.",
    status_lifecycle:
      "Statuses: Draft, Approved, Modified, Deprecated, Removed. " +
      "add creates a spec as Draft. " +
      "approve moves Draft or Modified to Approved (idempotent if already Approved); refuses if the spec is Removed or Deprecated. " +
      "A normative edit (statement or acceptance) to an Approved spec via update auto-moves it to Modified and clears approval. " +
      "deprecate moves Draft, Modified, or Approved to Deprecated (idempotent); refuses if Removed. " +
      "restore moves Removed back to Draft; refuses from any other status. " +
      "reopen moves Approved back to Draft and clears approval; refuses from any other status. " +
      "delete is a reversible soft-delete: sets status to Removed (idempotent), the spec unit is retained. " +
      "purge permanently removes the spec unit — separate from status entirely, requires --force.",
    depends_on_vs_related:
      "depends_on is directional and must stay acyclic — it expresses a hard prerequisite relationship. " +
      "related is associative and may legitimately cycle — it expresses a soft cross-reference. " +
      "Both must reference ids that exist in the document; a Removed spec remains a valid reference target.",
    guarded_fields:
      "status, approved_by, implementation, and changed_by cannot be set directly through add or update — any value supplied " +
      "for them there is silently dropped. They change only as the side effect of a lifecycle op (approve, deprecate, restore, " +
      "reopen, delete, implemented), which also stamps changed_by with the resolved actor.",
    validate_then_approve:
      "validate is a read-only check (structural checks are errors that block approval; phrasing checks are warnings, advisory " +
      "only). approve internally re-runs the same checks over its targets and refuses the whole batch if any error-level finding " +
      "remains, so the intended flow is: author with add, validate, fix reported errors, then approve.",
  },

  // FR-SPECS-0060 — subcommands, each with a required-inputs statement and dual-form examples
  subcommands: [
    {
      name: "add",
      brief: "Append one or more new spec units",
      usage: "rosettify specs add <specs_file> '<data>'",
      args: { data: "inline JSON string: a single spec object, or an array of spec objects (batch)" },
      required: "specs_file and data are required",
      description:
        "Creates the document if it does not exist yet. Each item must include id, type, title, statement, source, " +
        "priority, verification, and a non-empty acceptance array; status/approved_by/implementation are ignored and set " +
        "to Draft/''/NotStarted. The whole batch is rejected together if any item is invalid. Returns SpecWriteResult.",
      examples: {
        tip: "rosettify specs add [specs_file] '[spec-json-object-or-array]'",
        real: "rosettify specs add specs/checkout/specs.json '{\"id\":\"FR-CHK-0001\",\"type\":\"FR\",\"title\":\"Cart total\",\"statement\":\"When the cart changes, the system shall recompute the total.\",\"source\":\"User\",\"priority\":\"Must\",\"verification\":\"Test\",\"acceptance\":[{\"given\":\"an item is added\",\"when\":\"the cart updates\",\"then\":\"the total reflects the new item\"}]}'",
      },
    },
    {
      name: "get",
      brief: "Retrieve spec units by id",
      usage: "rosettify specs get <specs_file> <ids...>",
      args: { ids: "one or more spec ids" },
      required: "specs_file and at least one id are required",
      description:
        "Returns each requested spec regardless of its status (including Removed). A missing id is reported in " +
        "missing rather than failing the call. Returns SpecGetResult.",
      examples: {
        tip: "rosettify specs get [specs_file] [id-1] [id-2 ...]",
        real: "rosettify specs get specs/checkout/specs.json FR-CHK-0001",
      },
    },
    {
      name: "query",
      brief: "Search spec units by attribute or free text",
      usage: "rosettify specs query <specs_file> [query] [--include-removed]",
      args: {
        query: "filter query string (see query_notation); omit to return every non-Removed spec",
        "--include-removed": "include Removed specs even without an explicit status:Removed term",
      },
      required: "specs_file is required; query and --include-removed are optional",
      description: "Read-only attribute/free-text search over the whole document. Returns SpecQueryResult.",
      examples: {
        tip: "rosettify specs query [specs_file] '[key:value-and-free-text-query]'",
        real: "rosettify specs query specs/checkout/specs.json 'type:FR status:Draft,Modified'",
      },
    },
    {
      name: "update",
      brief: "Merge-patch one or more existing spec units",
      usage: "rosettify specs update <specs_file> '<data>'",
      args: { data: "inline JSON string: a single patch object, or an array of patch objects (batch); each must include id" },
      required: "specs_file and data are required",
      description:
        "Merge-patches (a null value removes the key) each targeted spec; id is immutable. Guarded fields in the patch " +
        "are ignored. Editing statement or acceptance on an Approved spec moves it to Modified and clears approval; if its " +
        "implementation was Implemented, that becomes ToBeModified. The whole batch is rejected together if any patch " +
        "targets a missing id or is otherwise invalid. Returns SpecWriteResult.",
      examples: {
        tip: "rosettify specs update [specs_file] '{\"id\":\"[spec-id]\", ...patch-fields}'",
        real: "rosettify specs update specs/checkout/specs.json '{\"id\":\"FR-CHK-0001\",\"priority\":\"Should\"}'",
      },
    },
    {
      name: "delete",
      brief: "Soft-delete spec units (reversible)",
      usage: "rosettify specs delete <specs_file> <ids...>",
      args: { ids: "one or more spec ids" },
      required: "specs_file and at least one id are required",
      description:
        "Sets each targeted spec's status to Removed (idempotent; the unit is retained, restore undoes it). A missing " +
        "id is reported in missing rather than failing the call. Returns SpecDeleteResult.",
      examples: {
        tip: "rosettify specs delete [specs_file] [id-1] [id-2 ...]",
        real: "rosettify specs delete specs/checkout/specs.json FR-CHK-0001",
      },
    },
    {
      name: "purge",
      brief: "Permanently remove spec units (irreversible)",
      usage: "rosettify specs purge <specs_file> <ids...> --force",
      args: { ids: "one or more spec ids", "--force": "required — permanent removal refuses without it" },
      required: "specs_file, at least one id, and --force are all required",
      description:
        "Permanently deletes each targeted spec unit. Refuses if any target is still referenced by another spec's " +
        "depends_on or related, unless that referrer is also purged in the same batch. A missing id is reported in " +
        "missing rather than failing the call. Returns SpecPurgeResult.",
      examples: {
        tip: "rosettify specs purge [specs_file] [id-1] [id-2 ...] --force",
        real: "rosettify specs purge specs/checkout/specs.json FR-CHK-0099 --force",
      },
    },
    {
      name: "implemented",
      brief: "Set the implementation status of one or more spec units",
      usage: "rosettify specs implemented <specs_file> '<data>'",
      args: { data: "inline JSON string: a single {id, implementation, implementation_notes?} object, or an array (batch)" },
      required: "specs_file and data are required",
      description:
        "Sets each targeted spec's implementation enum value (NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved) " +
        "and optionally its implementation_notes; never touches status. Returns SpecImplementedResult.",
      examples: {
        tip: "rosettify specs implemented [specs_file] '{\"id\":\"[spec-id]\",\"implementation\":\"[implementation-value]\"}'",
        real: "rosettify specs implemented specs/checkout/specs.json '{\"id\":\"FR-CHK-0001\",\"implementation\":\"Implemented\"}'",
      },
    },
    {
      name: "approve",
      brief: "Approve spec units (Draft/Modified -> Approved)",
      usage: "rosettify specs approve <specs_file> <ids...>",
      args: { ids: "one or more spec ids" },
      required: "specs_file and at least one id are required",
      description:
        "Runs validation over every target first and refuses the whole batch if any error-level finding remains. " +
        "Otherwise moves Draft or Modified targets to Approved (idempotent if already Approved) and sets approved_by " +
        "to the resolved actor; refuses a Removed or Deprecated target. Returns SpecLifecycleResult.",
      examples: {
        tip: "rosettify specs approve [specs_file] [id-1] [id-2 ...]",
        real: "rosettify specs approve specs/checkout/specs.json FR-CHK-0001",
      },
    },
    {
      name: "deprecate",
      brief: "Deprecate spec units",
      usage: "rosettify specs deprecate <specs_file> <ids...>",
      args: { ids: "one or more spec ids" },
      required: "specs_file and at least one id are required",
      description:
        "Moves Draft, Modified, or Approved targets to Deprecated (idempotent); refuses a Removed target. " +
        "Returns SpecLifecycleResult.",
      examples: {
        tip: "rosettify specs deprecate [specs_file] [id-1] [id-2 ...]",
        real: "rosettify specs deprecate specs/checkout/specs.json FR-CHK-0002",
      },
    },
    {
      name: "restore",
      brief: "Restore Removed spec units back to Draft",
      usage: "rosettify specs restore <specs_file> <ids...>",
      args: { ids: "one or more spec ids" },
      required: "specs_file and at least one id are required",
      description: "Moves a Removed target back to Draft; refuses any other current status. Returns SpecLifecycleResult.",
      examples: {
        tip: "rosettify specs restore [specs_file] [id-1] [id-2 ...]",
        real: "rosettify specs restore specs/checkout/specs.json FR-CHK-0001",
      },
    },
    {
      name: "reopen",
      brief: "Withdraw approval on Approved spec units",
      usage: "rosettify specs reopen <specs_file> <ids...>",
      args: { ids: "one or more spec ids" },
      required: "specs_file and at least one id are required",
      description:
        "Moves an Approved target back to Draft and clears approved_by; refuses any other current status. " +
        "Returns SpecLifecycleResult.",
      examples: {
        tip: "rosettify specs reopen [specs_file] [id-1] [id-2 ...]",
        real: "rosettify specs reopen specs/checkout/specs.json FR-CHK-0001",
      },
    },
    {
      name: "validate",
      brief: "Run structural and phrasing checks over a scope",
      usage: "rosettify specs validate <specs_file> [query]",
      args: { query: "optional scope filter (see query_notation); omit to validate every non-Removed spec" },
      required: "specs_file is required; query is optional",
      description:
        "Read-only. Structural findings (schema completeness, id format, area registration, uniqueness, reference " +
        "integrity, acyclic depends_on, size limits, acceptance completeness) are severity error and block approve; " +
        "phrasing findings (EARS pattern, measurable NFR, modal verbs, duplicate statements) are severity warning, " +
        "advisory only. Returns SpecValidateResult.",
      examples: {
        tip: "rosettify specs validate [specs_file] '[optional-scope-query]'",
        real: "rosettify specs validate specs/checkout/specs.json 'area:CHK'",
      },
    },
    {
      name: "graph",
      brief: "Resolve dependency/related closures, cycles, and unresolved references",
      usage: "rosettify specs graph <specs_file> [target_id] [--additional-paths <paths>]",
      args: {
        target_id: "optional single spec id; omit for whole-document mode",
        "--additional-paths": "comma-separated paths to other specs documents to resolve cross-document references against",
      },
      required: "specs_file is required; target_id and --additional-paths are optional",
      description:
        "Target mode returns that spec's forward dependency closure, reverse dependent closure, and direct related " +
        "ids. Whole-document mode returns every edge and every depends_on cycle in the document. Both modes report " +
        "unresolved references. An unknown target_id refuses with an error. Returns SpecGraphResult.",
      examples: {
        tip: "rosettify specs graph [specs_file] [optional-target-id] --additional-paths [other-specs-file-1,other-specs-file-2]",
        real: "rosettify specs graph specs/checkout/specs.json FR-CHK-0001",
      },
    },
    {
      name: "render",
      brief: "Render a human-readable document (markdown or text)",
      usage: "rosettify specs render <specs_file> [query] [--format <fmt>]",
      args: {
        query: "optional scope filter (see query_notation); omit to render every non-Removed spec",
        "--format": "markdown (default) or text",
      },
      required: "specs_file is required; query and --format are optional",
      description: "Read-only; renders the scoped specs grouped by area, with local-time timestamps. No file is written. Returns SpecRenderResult.",
      examples: {
        tip: "rosettify specs render [specs_file] '[optional-scope-query]' --format [markdown|text]",
        real: "rosettify specs render specs/checkout/specs.json 'status:Approved'",
      },
    },
    {
      name: "info",
      brief: "Orientation summary: areas, totals, and next free ids",
      usage: "rosettify specs info <specs_file>",
      args: {},
      required: "specs_file is required",
      description:
        "Returns registered areas with their spec counts, totals by type/status/implementation, the next free id " +
        "per prefix+area combination that already has at least one spec, and the document's timestamps in local time. " +
        "No full spec bodies. Returns SpecInfoResult.",
      examples: {
        tip: "rosettify specs info [specs_file]",
        real: "rosettify specs info specs/checkout/specs.json",
      },
    },
    {
      name: "migrate",
      brief: "One-time import of legacy markdown spec blocks",
      usage: "rosettify specs migrate <specs_file> <sources...>",
      args: { sources: "one or more legacy markdown source file paths" },
      required: "specs_file and at least one source are required",
      description:
        "Creates the document if it does not exist yet. Parses legacy spec blocks out of each source and appends them. " +
        "A source that does not exist or contains no parseable blocks is excluded and reported in skipped; a per-block " +
        "issue (including a missing id) is reported in warnings without dropping the rest of that source. " +
        "Returns SpecMigrateResult.",
      examples: {
        tip: "rosettify specs migrate [specs_file] [legacy-source-1.md] [legacy-source-2.md ...]",
        real: "rosettify specs migrate specs/checkout/specs.json docs/legacy/checkout-requirements.md",
      },
    },
  ],

  // FR-HELP-0002 — flat schemas dict sourced from per-subcommand declarations (not hand-authored)
  schemas: specsSchemasDict,

  // FR-SPECS-0007 / FR-SPECS-0060 — limits
  limits: {
    max_specs: SPECS_MAX_SPECS,
    max_dependencies_per_spec: SPECS_MAX_DEPENDENCIES_PER_SPEC,
    max_acceptance_per_spec: SPECS_MAX_ACCEPTANCE_PER_SPEC,
    max_string_length: SPECS_MAX_STRING_LENGTH,
    max_name_length: SPECS_MAX_NAME_LENGTH,
    max_batch_size: SPECS_MAX_BATCH_SIZE,
  },

  // FR-SPECS-0012 / FR-SPECS-0060 — query grammar
  query_notation: {
    grammar: "query := term ( term)*; term := [\"-\"] (key:value[,value...] | free-text)",
    keys: "type, area, status, priority, implementation, verification, source, depends_on, related, title, statement",
    semantics:
      "Terms AND-combine. Within one field, comma-separated values OR-combine. A leading - negates the whole term. " +
      "A bare (non key:value) term is free text, matched case-insensitively as a substring of title or statement. " +
      "Quote a value to force an exact case-sensitive match instead of a case-insensitive substring/equality match, " +
      "or to include whitespace or a colon in free text. The pseudo-key include_removed:true includes Removed specs " +
      "(equivalent to the --include-removed flag on query). Removed specs are otherwise excluded unless a term " +
      "explicitly matches status:Removed. An empty query matches every non-Removed spec.",
    example: 'type:FR status:Draft,Modified -priority:Wont "exact phrase"',
  },

  // FR-SPECS-0061 — notes array
  notes: specsNotes,

  // FR-SPECS-0060 — next_steps_for_ai
  next_steps_for_ai:
    "Orient first: call info to see registered areas, current totals, and the next free id per area. " +
    "Author with add, choosing ids from info's next_ids so they don't collide. " +
    "Refine with update as the requirement's wording settles. " +
    "Call validate over the scope you just authored and read every error-level finding; fix them with update, then " +
    "validate again until error_count is 0 (warnings are advisory and do not block). " +
    "Only then call approve — it re-runs the same checks and will refuse if anything error-level remains. " +
    "Track delivery afterward with implemented as work completes.",
};

# FR-SPECS — Specs Command

Requirements for the `specs` command: `npx rosettify specs <subcommand>`. It manages software specs (specs = requirements) as AI-native JSON. It complements the `requirements-authoring` skill and requirements workflows — the skill owns human judgment (intent capture, EARS phrasing, HITL per-unit approval, narrative review, Draft→Approved governance); the command owns the mechanical engine (JSON-native batch CRUD and machine-checkable integrity: unique identifiers and dependency-graph walking).

The command mirrors the shared rosettify architecture: it is one registry tool with one run delegate (FR-ARCH-0001, FR-ARCH-0003, FR-ARCH-0006), exposed through both CLI and MCP frontends over the same delegate (FR-ARCH-0002), returning the common output envelope (FR-ARCH-0011) transformed by the frontends (FR-ARCH-0014) with help enrichment (FR-ARCH-0012). Subcommands are input parameters, not separate tools. It reuses shared validation, envelope, logging, and atomic file-I/O concerns (FR-ARCH-0013, SHARED.md) rather than reimplementing them.

Note: All "result" references describe the `result` field contents of the common output envelope (FR-ARCH-0011). Envelope wrapping ({ok, result, error, include_help}) is handled by common functionality. Run delegates never touch stdin/stdout/stderr (FR-ARCH-0008).

Canonical storage is JSON only: one specs document JSON file per component. There is no maintained markdown mirror; a human-readable view is produced on demand by the `render` subcommand (FR-SPECS-0023).

## Data Model

### FR-SPECS-0001 Spec Unit Schema

<req id="FR-SPECS-0001" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>JSON schema of a single spec unit</title>
  <statement>A spec unit SHALL be a JSON object with the following fields:

```
spec:
  id: str                       # required, caller-provided, unique across the document (FR-SPECS-0004)
  type: SpecType                # required; FR | NFR | INT | DATA
  level: str                    # required; e.g. "System" (default "System")
  ticket_id: str                # optional; issue-tracker id
  classification: str           # optional; "business" | "technical"
  title: str                    # required, non-empty
  statement: str                # required, non-empty; EARS phrasing for FR (FR-SPECS-0006)
  rationale: str                # default ""
  source: SourceEnum            # required; User | Inferred | Sources | Documentation
  priority: MoscowEnum          # required; Must | Should | Could | Wont
  status: StatusEnum            # guarded; Draft | Approved | Modified | Deprecated | Removed (FR-SPECS-0040)
  approved_by: str              # default ""; resolved actor, set only by the approve op (FR-SPECS-0040, FR-SPECS-0041)
  changed: str                  # ISO8601 UTC timestamp; set on every write (FR-SPECS-0042)
  changed_by: str               # default ""; resolved actor of the last write (FR-SPECS-0041)
  verification: VerifEnum       # required; Test | Analysis | Inspection | Demo
  acceptance: AcceptanceCriterion[]   # required, non-empty (FR-SPECS-0006)
  depends_on: [spec-id]         # default []; directional hard prerequisites; must stay acyclic (FR-SPECS-0005)
  related: [spec-id]            # default []; associative cross-references; may form cycles (FR-SPECS-0005)
  implementation: ImplEnum      # default NotStarted; set only by the implemented op (FR-SPECS-0040)
  implementation_notes: str     # default ""
  notes: str                    # default ""

AcceptanceCriterion:
  given: str                    # required, non-empty
  when: str                     # required, non-empty
  then: str                     # required, non-empty
```

Each `AcceptanceCriterion` SHALL be the named object shape above (given/when/then), not a free-form string, so that criteria completeness is machine-checkable (FR-SPECS-0021). Unknown fields on a spec unit SHALL be rejected with `invalid_spec_field`. This schema is the single source of truth for the spec-unit format, help content (FR-SPECS-0060), and validation (FR-SPECS-0021).</statement>
  <rationale>Encodes the requirements-authoring `<req>` unit as native JSON so AI agents author by passing objects, not hand-editing XML. Structured given/when/then replaces the single criteria string so the validate op can prove all three parts are present. The split implementation/implementation_notes fields, approved_by, changed, ticket_id, and classification match the skill's canonical unit schema.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an add call with a full valid spec object. When: executed. Then: the stored unit contains every field with defaults applied for omitted optional fields. Given: a spec object carrying an unknown field "foo". When: validated. Then: {error: "invalid_spec_field"}. Given: an acceptance entry missing "then". When: validated. Then: it is reported as an incomplete criterion (FR-SPECS-0021).</criteria>
  </acceptance>
  <depends>FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0006</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0002 Specs Document Schema

<req id="FR-SPECS-0002" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Per-component specs document (the addressing unit)</title>
  <statement>Specs SHALL be stored one document per component as a JSON file. The document SHALL conform to:

```
specs_document:
  component: str                # required, non-empty; the component name
  description: str              # default ""
  created_at: ISO8601           # UTC; set on create (FR-SPECS-0042)
  updated_at: ISO8601           # UTC; updated on every write (FR-SPECS-0042)
  previous_version: str|null    # default null; path of the backup captured at write time (FR-SPECS-0070)
  areas: AreaEntry[]            # default []; registered area codes for this document
  specs: spec[]                 # array of spec units (FR-SPECS-0001), default []

AreaEntry:
  code: str                     # required; uppercase mnemonic, e.g. "SPECS", "CLI"
  name: str                     # required; human-readable area name
```

The command operates on one specs document per invocation, addressed by a caller-supplied file path (FR-SPECS-0071). Area is a field of each spec's id (FR-SPECS-0004), and `areas` is the document-level registry of the codes in use; the document holds a flat `specs` array, and grouping by area is a rendering concern (FR-SPECS-0023). Parent directories SHALL be created when the file is written.</statement>
  <rationale>One document per component keeps the write path a single-file atomic operation (matching the plan command) while areas remain an internal grouping field, per the approved storage decision. Storing specs as a flat array with an area registry avoids duplicating area names on every unit and lets render group without a nested storage shape.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an add call against a non-existent document path. When: executed with create semantics. Then: the file and parent dirs are created with created_at, updated_at set, previous_version null, and the spec appended. Given: a document read back. When: parsed. Then: all fields conform to the schema. Given: a document file that is not valid JSON. When: read. Then: {error: "specs_file_corrupted"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0004, FR-SPECS-0070, FR-SPECS-0071</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0003 Spec Types

<req id="FR-SPECS-0003" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Four spec types</title>
  <statement>The `type` field SHALL be one of: FR (functional), NFR (non-functional), INT (interface), DATA (data entity). Any other value SHALL be rejected with `invalid_type`. The `type` value selects which statement-content rule applies to a spec; those rules are defined in FR-SPECS-0006.</statement>
  <rationale>The requirements-authoring model separates FR, NFR, interface, and data specs, each with a distinct quality bar. This unit owns only the set of legal type values and their rejection; the per-type content rules live once in FR-SPECS-0006 (DRY).</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a spec with type "GOAL". When: validated. Then: {error: "invalid_type"}. Given: a spec with type "NFR". When: added. Then: it is accepted and its statement is checked against the NFR content rule of FR-SPECS-0006.</criteria>
  </acceptance>
  <depends>FR-SPECS-0006</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0004 Identifier Format and Area Registration

<req id="FR-SPECS-0004" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Stable, caller-provided area-scoped identifiers</title>
  <statement>A spec id SHALL follow the format `<PREFIX>-<AREA>-<NNNN>`, where PREFIX is the type prefix (FR, NFR, INT, DATA), AREA is an uppercase mnemonic registered in the document's `areas` (FR-SPECS-0002), and NNNN is a zero-padded 4-digit sequence. Every spec id SHALL be supplied by the caller; the command SHALL NOT auto-generate ids. On write the command SHALL validate each id's format (`invalid_id_format` otherwise) and its area registration (`unknown_area` if AREA is not in `areas` and the same call does not register it). Ids SHALL be stable: an update SHALL NOT change a spec's id (`immutable_id` if a patch body carries a different id), and a soft-deleted or purged id SHALL NOT be reused for a different spec. The caller chooses the next free number; the `info` subcommand (FR-SPECS-0024) reports the highest used NNNN per prefix+area so the authoring agent can pick ids in advance without collision. A spec whose id is absent on add SHALL be rejected with `missing_id`.</statement>
  <rationale>Caller-supplied ids keep the command deterministic and let the authoring agent decide ids up front, which the user found easier than server-side minting. The info subcommand orients the agent to the next free number. Verbatim ids support migration and stable cross-references; never reusing a retired number preserves traceability.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: add for an FR in area SPECS with no id. Then: {error: "missing_id"}. Given: an id "FR-SPECS-8". When: validated. Then: {error: "invalid_id_format"}. Given: an id in area "XYZ" not registered and not registered by the call. Then: {error: "unknown_area"}. Given: an update patch body that changes id. Then: {error: "immutable_id"}. Given: info is called. Then: it reports the highest used NNNN per prefix+area.</criteria>
  </acceptance>
  <depends>FR-SPECS-0002, FR-SPECS-0024</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0005 Uniqueness and Reference Integrity

<req id="FR-SPECS-0005" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Unique ids, valid references, and acyclic dependencies</title>
  <statement>Every spec id in a document SHALL be unique; any operation that would introduce a duplicate id SHALL be rejected with `duplicate_id`. Every entry in a spec's `depends_on` and `related` SHALL reference an id that exists in the same document; a reference to a non-existent id SHALL be rejected with `unknown_dependency` on write, unless the missing id is created in the same batch (FR-SPECS-0030). The `depends_on` graph expresses directional prerequisites and SHALL be acyclic: an operation that would create a `depends_on` cycle SHALL be rejected with `dependency_cycle`, and a spec SHALL NOT `depends_on` itself. The `related` graph expresses non-directional association and MAY contain cycles (including mutual `related` links and, by nature, bidirectional "see also" relationships); it SHALL NOT be subject to cycle rejection. Soft-deleted specs (status Removed, FR-SPECS-0040) SHALL remain in the document and SHALL still count as valid reference targets so existing links do not dangle. All of these checks SHALL run over the resulting document state after a batch is applied in memory and before any file is written.</statement>
  <rationale>Unique identifiers and a walkable, acyclic dependency graph are the integrity guarantees the user called out as impossible under prose authoring. Distinguishing directional `depends_on` (acyclic prerequisites) from associative `related` links (which legitimately form cycles because "related" is a two-way, non-hierarchical relationship) lets authors express cross-references without tripping cycle detection, while preserving true dependency integrity. Validating the post-batch state lets a batch introduce a spec and a dependent on it in one call. Retaining soft-deleted specs as reference targets keeps the graph consistent.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an add that reuses an existing id. Then: {error: "duplicate_id"}. Given: a spec with depends_on referencing a missing id. Then: {error: "unknown_dependency"}. Given: a spec with related referencing a missing id. Then: {error: "unknown_dependency"}. Given: a single batch that adds A and B where B depends_on A. Then: it succeeds. Given: A depends_on B and B depends_on A. Then: {error: "dependency_cycle"}. Given: a self-dependency A depends_on A. Then: {error: "dependency_cycle"}. Given: A related B and B related A. Then: it succeeds (related may cycle). Given: A related A. Then: it succeeds. Given: A depends_on B where B is soft-deleted (Removed) but present. Then: the reference is valid (no unknown_dependency).</criteria>
  </acceptance>
  <depends>FR-SPECS-0004, FR-SPECS-0030, FR-SPECS-0040, FR-SPECS-0070</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0006 Statement and Acceptance Content Rules

<req id="FR-SPECS-0006" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>EARS statements, measurable NFRs, and Given/When/Then acceptance</title>
  <statement>For a spec of type FR, `statement` SHALL match exactly one EARS pattern: ubiquitous (`<subject> shall <response>`), event (`When <trigger>, <subject> shall <response>`), state (`While <state>, <subject> shall <response>`), optional (`Where <feature>, <subject> shall <response>`), or unwanted (`If <condition>, <subject> shall <response>`). For a spec of type NFR, `statement` SHALL contain a quantified metric with a threshold and a measurement condition. Every spec's `acceptance` array SHALL contain at least one `AcceptanceCriterion`, and each criterion SHALL have non-empty `given`, `when`, and `then`. Statements SHALL use `shall` for mandatory, `should` for preferred, `may` for optional behavior. These are validation rules surfaced by the validate op (FR-SPECS-0021) and enforced as errors only where noted; add/update SHALL NOT silently rewrite a statement.</statement>
  <rationale>Carries the EARS and measurable-NFR discipline from the requirements-authoring skill into machine-checkable form. Keeping most of these as validate findings (not hard write errors) lets an author stage a Draft and fix phrasing before approval, matching the skill's Draft-first flow.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an FR statement "When the file is missing, the system shall return plan_not_found". When: validated. Then: it passes the EARS check. Given: an FR statement "The system handles errors nicely". When: validated. Then: EARS non-conformance is reported. Given: an NFR statement "validate shall complete within 500 ms for 1000 specs". When: validated. Then: it passes the measurable check. Given: a spec with an empty acceptance array. When: validated. Then: missing-acceptance is reported.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0021</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0007 Size Limits and Constants

<req id="FR-SPECS-0007" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Document size limits with runtime enforcement</title>
  <statement>The command SHALL enforce: max 1000 specs per document, max 50 dependencies per spec, max 50 acceptance criteria per spec, max 20000 characters per string field, max 256 characters per name/title/id field, and max 500 items per batch. A violation SHALL be rejected with `size_limit_exceeded`. These constants SHALL appear in the help content limits section (FR-SPECS-0060).</statement>
  <rationale>Bounds protect the single-file read-modify-write path and give AI callers explicit limits to avoid trial-and-error, matching the plan command's constants approach.</rationale>
  <source>Documentation</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document with 1001 specs after a batch. Then: {error: "size_limit_exceeded"}. Given: a title of 257 characters. Then: {error: "size_limit_exceeded"}. Given: a batch of 501 items. Then: {error: "size_limit_exceeded"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0060</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Core Subcommands

Every subcommand in this section accepts one or more items (batch) and follows the batch semantics of FR-SPECS-0030. Write subcommands return the shared write result of FR-SPECS-0050; read subcommands return the shapes named in their own requirement. Read subcommands SHALL exclude soft-deleted specs (status Removed) unless `include_removed` is set; write subcommands SHALL run the integrity checks of FR-SPECS-0005 over the post-batch state before writing.

### FR-SPECS-0010 add

<req id="FR-SPECS-0010" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs add subcommand</title>
  <statement>specs add SHALL accept a specs document path and one or more spec objects (a JSON object or a JSON array of objects) and append each as a new spec unit. For each item: `id` is required and caller-provided (FR-SPECS-0004; an item without id is rejected with `missing_id`); field defaults are applied (FR-SPECS-0001); `status` defaults to Draft; `implementation` defaults to NotStarted; `changed` is set to the current UTC timestamp (FR-SPECS-0042) and `changed_by` to the resolved actor (FR-SPECS-0041); `approved_by` is forced to empty. Any `status`, `approved_by`, or `implementation` value supplied on an add item SHALL be ignored (guarded fields, FR-SPECS-0040) — a new spec always enters as Draft/NotStarted. If the document does not exist it SHALL be created (FR-SPECS-0002). All integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) SHALL run over the resulting document before writing. On success the result SHALL be the shared SpecWriteResult (FR-SPECS-0050). Errors: `missing_id`, `duplicate_id`, `invalid_id_format`, `unknown_area`, `invalid_type`, `invalid_spec_field`, `unknown_dependency`, `dependency_cycle`, `size_limit_exceeded`, `missing_required_field` (a required field per FR-SPECS-0001 is absent).</statement>
  <rationale>add is the create path. Requiring a caller-provided id keeps id ownership with the authoring agent; forcing Draft/NotStarted makes new specs safe by default and keeps approval a deliberate, separate act. Accepting a single object or an array is the uniform batch shape.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: add with one valid FR object including its id. When: executed. Then: status=Draft, implementation=NotStarted, changed and changed_by set, and the result is SpecWriteResult. Given: add with an item lacking id. Then: {error: "missing_id"}. Given: add with a two-element array. When: executed. Then: both are appended in one write. Given: add with status="Approved" set on the item. When: executed. Then: the stored status is Draft (supplied status ignored). Given: add against a missing document path. Then: the document is created. Given: add whose item omits `title`. Then: {error: "missing_required_field"}. Given: an item with an unknown field. Then: {error: "invalid_spec_field"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0030, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0011 get

<req id="FR-SPECS-0011" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs get subcommand</title>
  <statement>specs get SHALL accept a specs document path and one or more spec ids and return the full spec unit (FR-SPECS-0001) for each. get SHALL return a spec regardless of its status, including soft-deleted (Removed) specs, because the caller addressed it explicitly by id. The result SHALL be the named type `SpecGetResult` = { found: Spec[], missing: [spec-id] }, where `found` holds the retrieved units and `missing` lists ids not present in the document. get SHALL NOT error when some ids are missing; it reports them in `missing`. Errors: `specs_not_found` (document file missing), `specs_file_corrupted`.</statement>
  <rationale>get is by-id retrieval for a known set. Returning Removed specs on explicit request supports history and traceability. Partial-success reporting (found/missing) avoids failing a whole batch because one id is stale.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: get with ["FR-SPECS-0001","FR-SPECS-9999"]. When: executed. Then: found=[the first unit], missing=["FR-SPECS-9999"]. Given: get for a soft-deleted id. Then: it appears in found (with status Removed). Given: the document file is missing. Then: {error: "specs_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0012 query

<req id="FR-SPECS-0012" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs query subcommand</title>
  <statement>specs query SHALL accept a specs document path and an optional query string in `key:value` filter notation and return the matching spec units. Notation: space-separated terms combine with AND; a comma-separated value list matches any of its values (OR within a field, e.g. `area:CLI,MCP`); a term prefixed with `-` negates it (NOT, e.g. `-status:Removed`); a quoted value (`title:"exact phrase"`) matches literally; a bare term with no `key:` is free-text matched case-insensitively as a substring over `title` and `statement`. Filterable keys: `type`, `area`, `status`, `priority`, `implementation`, `verification`, `source`, `depends_on` (specs that depend on the given id), `related` (specs related to the given id), `title`, `statement`. When no query is given, query SHALL return all specs. query SHALL exclude soft-deleted (Removed) specs unless the query includes `include_removed:true` or explicitly matches `status:Removed`. The result SHALL be the named type `SpecQueryResult` = { specs: Spec[], count: int }, where `count` equals `specs.length`. Errors: `invalid_filter` (an unknown filter key), `invalid_query` (a malformed query string), `specs_not_found`, `specs_file_corrupted`. Natural-language semantic search over the same surface is a future capability (FR-SPECS-0026) and is out of scope for the initial implementation.</statement>
  <rationale>query is the discovery path over the whole document by attributes, complementing get's by-id path. A `key:value` string is the notation the user selected as easy to state and widely recognized (issue-tracker / code-search style). Excluding Removed by default keeps normal listings clean while allowing history retrieval on request. Keeping one string surface leaves room for a future semantic operator without a second query shape.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: query `type:NFR status:Approved`. When: executed. Then: only Approved NFRs are returned and count matches. Given: query `area:CLI,MCP`. Then: specs in either area are returned. Given: query with no string. Then: all non-Removed specs are returned. Given: query `include_removed:true`. Then: Removed specs are included. Given: query `depends_on:FR-SPECS-0004`. Then: every returned spec lists FR-SPECS-0004 in its depends_on. Given: query `-status:Removed retry`. Then: non-Removed specs whose title or statement contains "retry" are returned. Given: an unknown filter key. Then: {error: "invalid_filter"}. Given: a malformed query string. Then: {error: "invalid_query"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0013 update

<req id="FR-SPECS-0013" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs update subcommand</title>
  <statement>specs update SHALL accept a specs document path and one or more patch objects, each identifying a target by `id` and carrying the fields to change, and SHALL merge-patch each target following RFC 7396 (null removes a key, nested objects merge, scalars and arrays replace). A patch whose `id` does not exist SHALL be rejected with `target_not_found`. update SHALL NOT change a spec's `id` (`immutable_id` if a patch attempts a different id in its body). The guarded fields `status`, `approved_by`, `implementation`, and `changed_by` in a patch SHALL be silently dropped — they change only via the lifecycle ops (approve/deprecate/restore FR-SPECS-0040, delete FR-SPECS-0014, implemented FR-SPECS-0015) and the actor resolver (FR-SPECS-0041). Every patched spec's `changed` (UTC, FR-SPECS-0042) and `changed_by` (resolved actor, FR-SPECS-0041) SHALL be set on write. When a patch changes an Approved spec's normative content — its `statement` or any `acceptance` criterion — the command SHALL set that spec's `status` to Modified and clear `approved_by`, so the change requires re-approval; a purely cosmetic edit (e.g. `notes`, `rationale`, `title`) SHALL leave `status` unchanged. When such a normative edit is applied to a spec whose `implementation` is Implemented, the command SHALL set `implementation` to ToBeModified so the implementation is revisited. All integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) SHALL run over the post-batch state before writing. On success the result SHALL be the shared SpecWriteResult (FR-SPECS-0050). Errors: `target_not_found`, `immutable_id`, `invalid_spec_field`, `unknown_dependency`, `dependency_cycle`, `duplicate_id`, `size_limit_exceeded`, `invalid_data`, `missing_data`.</statement>
  <rationale>update is the merge-patch edit path, mirroring plan upsert's proven RFC-7396 semantics and its silent-drop of guarded fields so approval and implementation state cannot be flipped mechanically. Moving an edited Approved spec to Modified (not fresh Draft) records that it was once approved but its contract changed, and forcing an Implemented spec to ToBeModified signals the code must be revisited — together these keep approval and implementation state honest against the current text, the core governance guarantee the skill needs the engine to uphold. Limiting the trigger to statement/acceptance edits avoids churn on cosmetic changes.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: update {id:"FR-SPECS-0001", title:"New title"} on a Draft spec. When: executed. Then: title changes, other fields preserved, changed and changed_by set, result is SpecWriteResult. Given: a patch with status:"Approved". When: executed. Then: the status field is silently dropped. Given: a patch body with a different id than the target. Then: {error: "immutable_id"}. Given: a patch targeting a missing id. Then: {error: "target_not_found"}. Given: an edit to an Approved spec's statement. When: executed. Then: its status becomes Modified and approved_by is cleared. Given: a cosmetic edit (notes only) to an Approved spec. When: executed. Then: status stays Approved. Given: a statement edit to a spec whose implementation is Implemented. When: executed. Then: implementation becomes ToBeModified. Given: a null value in a patch. Then: that key is removed. Given: a patch that is not a JSON object (e.g. a string or number). Then: {error: "invalid_data"}. Given: an update call with no patch payload at all. Then: {error: "missing_data"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0030, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0014 delete

<req id="FR-SPECS-0014" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs delete subcommand (soft-delete)</title>
  <statement>specs delete SHALL accept a specs document path and one or more spec ids and SHALL soft-delete each: it sets the spec's `status` to Removed, sets `changed` (UTC) and `changed_by` (resolved actor), and retains the spec unit in the document. A soft-deleted id SHALL NOT be reused for a different spec (FR-SPECS-0004) and SHALL remain a valid reference target (FR-SPECS-0005). delete SHALL be idempotent: deleting an already-Removed spec succeeds and leaves it Removed. Deleting an id that does not exist SHALL be reported in the result's `missing` list, not error the batch. Permanent removal is a separate `purge` subcommand (FR-SPECS-0016). The result SHALL be the named type `SpecDeleteResult` = { removed: [spec-id], missing: [spec-id] }. Errors: `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>Soft-delete preserves traceability and prevents dangling references, per the user's directive. Idempotency and missing-reporting make batch deletes robust. Permanent removal is intentionally a distinct, guarded subcommand rather than a flag, so an ordinary delete can never destroy data.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: delete ["FR-SPECS-0003"]. When: executed. Then: that spec's status=Removed, it remains in the document, removed=["FR-SPECS-0003"]. Given: delete an already-Removed id. Then: it succeeds (idempotent). Given: delete a non-existent id. Then: it appears in missing, no error. Given: a soft-deleted id. Then: it is never reused for a different spec and stays a valid reference target.</criteria>
  </acceptance>
  <depends>FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0016, FR-SPECS-0040, FR-SPECS-0041</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0015 implemented

<req id="FR-SPECS-0015" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs implemented subcommand</title>
  <statement>specs implemented SHALL accept a specs document path and one or more items, each identifying a target `id` and a new `implementation` value, and OPTIONALLY `implementation_notes`. It SHALL set the target's `implementation` field to one of NotStarted, Implemented, Planned, ToBeModified, ToBeRemoved (any other value rejected with `invalid_implementation`), set `implementation_notes` when provided, and set `changed` to the current UTC timestamp (FR-SPECS-0042) and `changed_by` to the resolved actor (FR-SPECS-0041). It SHALL NOT change `status` (approval lifecycle) — implementation state and approval state are independent. A target id that does not exist SHALL be rejected with `target_not_found`. The result SHALL be the named type `SpecImplementedResult` = { updated: [ { id, implementation } ] }. Errors: `target_not_found`, `invalid_implementation`, `missing_implementation` (no value supplied), `specs_not_found`.</statement>
  <rationale>The dedicated implemented op is the only way to move the implementation lifecycle, keeping it out of add/update (which strip it) so implementation state changes are explicit and auditable. Separating implementation from approval status reflects that a spec can be Approved yet NotStarted, or Implemented yet still Draft.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: implemented {id:"FR-SPECS-0001", implementation:"Implemented", implementation_notes:"done in commands/specs"}. When: executed. Then: implementation=Implemented, notes set, changed and changed_by set, status unchanged. Given: implementation:"Done". Then: {error: "invalid_implementation"}. Given: a missing target id. Then: {error: "target_not_found"}. Given: no implementation value. Then: {error: "missing_implementation"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0030, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Lifecycle Subcommands

Each subcommand in this section is a guarded-field setter: it is the ONLY operation permitted to set its target field, and it routes through the same write path as update (FR-SPECS-0013) — add and update themselves strip these fields (FR-SPECS-0040). All are batch-capable (FR-SPECS-0030). Except purge (FR-SPECS-0016), which permanently removes the spec unit and therefore leaves no record to stamp, each sets `changed` (UTC) and `changed_by` (resolved actor, FR-SPECS-0041) on every affected spec. Each returns the shared lifecycle result `SpecLifecycleResult` (FR-SPECS-0050) unless its own unit names a dedicated result shape (delete, purge, implemented). This orienting text is informative; the normative behavior of each op is stated in its own unit below.

### FR-SPECS-0016 purge

<req id="FR-SPECS-0016" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs purge subcommand (permanent removal)</title>
  <statement>specs purge SHALL accept a specs document path and one or more spec ids and SHALL permanently remove each spec unit from the document. purge SHALL require the `--force` flag (FR-ARCH-0015); without `--force` it SHALL refuse and return `force_required` with an explanation that permanent removal is irreversible. To preserve reference integrity (FR-SPECS-0005), purge SHALL refuse with `referenced_by_others`, whose message is a single human-readable string listing the referencing ids, when any remaining spec references a target id in its `depends_on` or `related`, unless every such referencing spec is also purged in the same batch. A target id that does not exist SHALL be reported in `missing`, not error the batch. The result SHALL be the named type `SpecPurgeResult` = { purged: [spec-id], missing: [spec-id] }. Errors: `force_required`, `referenced_by_others`, `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>Permanent removal is the one destructive spec operation; gating it behind --force and behind a dangling-reference guard keeps the store recoverable and the graph consistent. Soft-delete (FR-SPECS-0014) remains the default; purge is the deliberate exception.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: purge without --force. Then: {error: "force_required"}. Given: purge --force of an unreferenced id. Then: it is removed and appears in purged. Given: purge --force of an id still referenced by another spec's depends_on. Then: {error: "referenced_by_others"} listing the referrer. Given: purge --force of a referenced id together with its referrer in one batch. Then: both are purged. Given: purge of a non-existent id. Then: it appears in missing, no error.</criteria>
  </acceptance>
  <depends>FR-SPECS-0005, FR-SPECS-0014</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0017 approve

<req id="FR-SPECS-0017" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs approve subcommand</title>
  <statement>specs approve SHALL accept a specs document path and one or more spec ids and SHALL move each from Draft or Modified to Approved, setting `approved_by` to the resolved actor (FR-SPECS-0041). Before approving, the command SHALL run validation (FR-SPECS-0021) on each target and, if any target has an error-severity finding, SHALL refuse the whole batch (all-or-nothing, FR-SPECS-0030) and return `validation_failed` whose message is a single human-readable string enumerating the blocking findings — each with its spec id and problem — across all rejected targets; warning/info findings SHALL NOT block approval. Approving an already-Approved spec SHALL be an idempotent success (no change). Approving a Removed or Deprecated spec SHALL be rejected with `invalid_transition`. A missing id SHALL be rejected with `target_not_found`. The result SHALL be the shared `SpecLifecycleResult` (FR-SPECS-0050).</statement>
  <rationale>approve is the dedicated approval gate the skill drives after HITL sign-off, and it is the point where a clean validation is enforced (Draft-first: author freely, gate at approval). Requiring re-approval only from Draft/Modified keeps approval meaningful; capturing the resolved actor gives an auditable approver.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: approve a Draft spec that passes validation. When: executed. Then: status=Approved, approved_by set to the resolved actor, changed set. Given: approve a spec with an error-level validation finding. Then: the whole batch is refused with `validation_failed` whose message text names the spec and its blocking problem(s), and nothing is approved. Given: approve an already-Approved spec. Then: idempotent success. Given: approve a Removed spec. Then: {error: "invalid_transition"}. Given: a missing id. Then: {error: "target_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0021, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0018 deprecate

<req id="FR-SPECS-0018" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs deprecate subcommand</title>
  <statement>specs deprecate SHALL accept a specs document path and one or more spec ids and SHALL set each spec's `status` to Deprecated, retaining the spec unit. Deprecated marks a spec as superseded but still present and referenceable — distinct from Removed (soft-deleted). deprecate SHALL apply to specs in Draft, Modified, or Approved status; applying it to a Removed spec SHALL be rejected with `invalid_transition`. Deprecating an already-Deprecated spec SHALL be an idempotent success. A missing id SHALL be rejected with `target_not_found`. The result SHALL be the shared `SpecLifecycleResult` (FR-SPECS-0050).</statement>
  <rationale>Deprecated captures "no longer intended but retained for history and traceability", a distinct lifecycle state from soft-delete. Keeping it referenceable avoids breaking dependents that still cite it.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: deprecate an Approved spec. When: executed. Then: status=Deprecated, spec retained. Given: deprecate an already-Deprecated spec. Then: idempotent success. Given: deprecate a Removed spec. Then: {error: "invalid_transition"}. Given: a missing id. Then: {error: "target_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0019 restore

<req id="FR-SPECS-0019" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs restore subcommand</title>
  <statement>specs restore SHALL accept a specs document path and one or more spec ids and SHALL undo a soft-delete by moving each spec from Removed back to Draft (it re-enters authoring and requires re-approval). Restoring a spec that is not Removed SHALL be rejected with `invalid_transition`. A missing id SHALL be rejected with `target_not_found`. The result SHALL be the shared `SpecLifecycleResult` (FR-SPECS-0050).</statement>
  <rationale>restore makes soft-delete safely reversible. Returning to Draft (not the prior status) forces the spec back through approval, so a restored spec cannot silently reappear as Approved.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: restore a Removed spec. When: executed. Then: status=Draft. Given: restore a Draft spec. Then: {error: "invalid_transition"}. Given: a missing id. Then: {error: "target_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0014, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0020 reopen

<req id="FR-SPECS-0020" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs reopen subcommand</title>
  <statement>specs reopen SHALL accept a specs document path and one or more spec ids and SHALL move each from Approved back to Draft and clear `approved_by`, so an approved spec can be re-opened for rework without first editing its content. Reopening a spec that is not Approved SHALL be rejected with `invalid_transition`. A missing id SHALL be rejected with `target_not_found`. The result SHALL be the shared `SpecLifecycleResult` (FR-SPECS-0050).</statement>
  <rationale>reopen gives an explicit way to withdraw approval for rework, distinct from the automatic Modified transition that a content edit triggers (FR-SPECS-0013). It keeps every approval-state change flowing through a deliberate, auditable op.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: reopen an Approved spec. When: executed. Then: status=Draft, approved_by cleared. Given: reopen a Draft spec. Then: {error: "invalid_transition"}. Given: a missing id. Then: {error: "target_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0013, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Analysis and Orientation Subcommands

These subcommands read the document (and, where noted, additional documents) and never mutate it.

### FR-SPECS-0021 validate

<req id="FR-SPECS-0021" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs validate subcommand</title>
  <statement>specs validate SHALL accept a specs document path and an optional query filter (FR-SPECS-0012) scoping which specs to check, and SHALL return machine-checkable findings without mutating the document. It SHALL run these checks: schema completeness (all required fields per FR-SPECS-0001 present and non-empty); id format, area registration, and uniqueness (FR-SPECS-0004, FR-SPECS-0005); reference integrity (every `depends_on`/`related` target exists); `depends_on` acyclicity (FR-SPECS-0005); EARS-pattern conformance for FR statements (FR-SPECS-0006); measurable metric+threshold for NFR statements (FR-SPECS-0006); acceptance completeness (at least one criterion, each with non-empty given/when/then); modal-verb usage (shall/should/may); duplicate-statement detection; and size limits (FR-SPECS-0007). Each finding SHALL be the named type `SpecFinding` = { id, check, severity, message }, severity one of error | warning | info. Structural violations (missing required field, invalid id format, duplicate id, unknown reference, dependency cycle, size limit) SHALL be `error`; phrasing issues (EARS, measurable NFR, modal verbs, duplicate statement) SHALL be `warning`. The result SHALL be the named type `SpecValidateResult` = { ok: bool, findings: SpecFinding[], error_count: int, warning_count: int }, where `ok` is true when error_count is 0. validate SHALL NOT assess subjective qualities (unambiguity, absence of scope creep, completeness against intent); those remain the reviewer's responsibility and are out of scope for the command. Errors: `specs_not_found`, `specs_file_corrupted`, `invalid_filter`.</statement>
  <rationale>validate is the integrity surface the user said prose authoring could never guarantee. Classifying structural problems as errors and phrasing as warnings lets approval gate on errors (FR-SPECS-0017) while leaving stylistic refinement advisory. Explicitly excluding subjective checks keeps the boundary between the command (mechanical) and the skill/human (judgment) honest.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document with one spec missing `title`. When: validate runs. Then: a SpecFinding {check: schema_completeness, severity: error} is returned and ok=false. Given: an FR whose statement matches no EARS pattern. Then: a warning finding, ok unaffected by warnings. Given: a depends_on cycle. Then: an error finding. Given: a clean document. Then: ok=true, findings=[]. Given: a filter scoping to one area. Then: only that area's specs are checked.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0006, FR-SPECS-0007, FR-SPECS-0012, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0022 graph

<req id="FR-SPECS-0022" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs graph subcommand (dependency-graph walking)</title>
  <statement>specs graph SHALL accept a specs document path, an optional target id, and an optional list of additional document paths, and SHALL walk the `depends_on` and `related` graphs. For a target id it SHALL return: `dependencies` (transitive `depends_on` closure of the target), `dependents` (transitive reverse-`depends_on` closure — the impact set of changing the target), and `related` (direct associative links). For the whole document (no target) it SHALL return the full edge list and a `cycles` array reporting every `depends_on` cycle found. When additional document paths are supplied, references that resolve to ids in those documents SHALL be included so the graph spans components on request (FR-SPECS-0005 keeps single-document writes acyclic; cross-document analysis is read-only here). A reference that cannot be resolved in any provided document SHALL be reported in an `unresolved` list. The result SHALL be the named type `SpecGraphResult` = { dependencies?: [spec-id], dependents?: [spec-id], related?: [spec-id], edges?: SpecEdge[], cycles: SpecEdge[][], unresolved: [spec-id] }, where `SpecEdge` = { from, to, kind } and kind is `depends_on` | `related`. Errors: `target_not_found`, `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>Graph walking — dependencies, dependents (impact), and cycle reporting — is the second integrity capability the user called out. Making cross-document resolution opt-in via extra paths matches the approved dep-graph scope (within-document on writes, cross-document on request) and keeps the common case cheap.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: graph with target C where C depends_on B and B depends_on A. Then: dependencies=[B,A]. Given: graph with target A where B and C depend_on A. Then: dependents include B and C. Given: graph over a whole document with a cycle X→Y→X. Then: cycles contains that cycle. Given: a target whose depends_on references an id only present in an additional document path supplied. Then: it resolves and is not in unresolved. Given: a reference resolvable in no supplied document. Then: it appears in unresolved.</criteria>
  </acceptance>
  <depends>FR-SPECS-0005, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0023 render

<req id="FR-SPECS-0023" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs render subcommand</title>
  <statement>specs render SHALL accept a specs document path, an optional query filter (FR-SPECS-0012) scoping which specs to include, and an optional `format` (markdown | text, default markdown), and SHALL return a human-readable rendering of the selected specs as a string in the result — it SHALL NOT write any file (storage is JSON only). The rendering SHALL group specs by area, present each spec's human-relevant fields (id, title, statement, priority, status, acceptance, depends_on, related), and display all timestamps in the caller's local timezone (FR-SPECS-0042). The result SHALL be the named type `SpecRenderResult` = { format, content }. Errors: `specs_not_found`, `specs_file_corrupted`, `invalid_filter`, `invalid_format`.</statement>
  <rationale>Because storage is JSON only, render is how humans and the HITL narrative review read specs. Returning a string (not writing a file) keeps JSON the single source of truth and avoids a stale markdown mirror. Local-time display makes timestamps readable while UTC stays canonical.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: render with no filter. When: executed. Then: content is a markdown string grouping all non-Removed specs by area, timestamps in local time. Given: render format=text. Then: content is plain text. Given: render with a filter. Then: only matching specs appear. Given: format=pdf. Then: {error: "invalid_format"}. Given: any render call. Then: no file is written.</criteria>
  </acceptance>
  <depends>FR-SPECS-0012, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0024 info

<req id="FR-SPECS-0024" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs info subcommand (orientation)</title>
  <statement>specs info SHALL accept a specs document path and return an orientation summary of the document without listing full spec bodies. The result SHALL be the named type `SpecInfoResult` = { component, description, areas: SpecAreaInfo[], totals: SpecTotals, next_ids: SpecNextId[], created_at, updated_at }. `SpecAreaInfo` = { code, name, count }. `SpecTotals` = { by_type, by_status, by_implementation, total } (each a map of value to count). `SpecNextId` = { prefix, area, highest, suggested } where `highest` is the highest used NNNN for that prefix+area and `suggested` is the next free id string, so the authoring agent can choose ids in advance without collision (FR-SPECS-0004). Timestamps SHALL be shown in local time (FR-SPECS-0042). Errors: `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>info is the orientation the user asked for: it tells an agent which areas exist, how many specs of each kind and status there are, and — critically — the next free id per area, which is what makes caller-provided ids practical.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document with 3 areas and specs in each. When: info runs. Then: areas lists each code, name, and count; totals summarize by type/status/implementation; next_ids gives the suggested next id per prefix+area. Given: an area whose highest FR id is FR-SPECS-0012. Then: its SpecNextId.suggested is FR-SPECS-0013. Given: a missing document. Then: {error: "specs_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0004, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0025 migrate

<req id="FR-SPECS-0025" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs migrate subcommand (import legacy XML-in-markdown)</title>
  <statement>specs migrate SHALL accept one or more source markdown paths (files containing `<req>` XML units) and a destination specs document path, and SHALL parse every `<req>` block, map its fields to the spec unit schema (FR-SPECS-0001), and write the resulting specs document (FR-SPECS-0002). Field mapping SHALL handle both the split-tag form (`<implementation>` + `<implementationNotes>`) and the legacy bracketed single-tag form (`<implementation>[Status: X] [Additional Notes: Y]</implementation>`), normalizing to the split JSON fields. The single-string `<acceptance><criteria>` form SHALL be parsed into the structured given/when/then array where the Given/When/Then markers are present; a criterion that cannot be split SHALL be preserved verbatim in `then` and flagged as a warning. Areas encountered in ids SHALL be registered in the document's `areas`. After parsing, all integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) SHALL run over the assembled document; migrate SHALL report every parse issue and integrity finding rather than silently dropping data. The result SHALL be the named type `SpecMigrateResult` = { migrated: int, sources: [path], warnings: SpecFinding[], skipped: [{ source, reason }] }. Errors: `source_not_found`, `migrate_parse_error` (a source is unparseable at the file level), `specs_file_corrupted`.</statement>
  <rationale>migrate is the one-time bridge that moves today's `<req>` XML-in-markdown into the JSON store so nothing is lost when the format changes. Handling both implementation-field forms and reporting (not dropping) anything it cannot cleanly map preserves fidelity and surfaces exactly what a human must reconcile.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a source markdown with three <req> blocks in split-tag form. When: migrate runs. Then: migrated=3 and the destination document contains the three specs with areas registered. Given: a <req> using the legacy bracketed implementation form. Then: it is normalized to implementation + implementation_notes. Given: an acceptance criteria string with Given/When/Then markers. Then: it is parsed into the structured array. Given: a criterion that cannot be split. Then: it is preserved in `then` and a warning is recorded. Given: a source path that does not exist. Then: {error: "source_not_found"}. Given: a source file whose content cannot be parsed at the file level. Then: {error: "migrate_parse_error"}. Given: an import that would push the document beyond the max specs limit. Then: {error: "size_limit_exceeded"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0002, FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0026 Semantic Search (Future)

<req id="FR-SPECS-0026" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Natural-language semantic search over specs (future)</title>
  <statement>The query surface (FR-SPECS-0012) SHOULD, in a future increment, support a natural-language semantic search mode that retrieves specs by meaning rather than keyword, using vector embeddings and a HyDE (hypothetical-document-embedding) retrieval strategy, exposed on the same query surface (e.g. a `semantic:"..."` term). This requirement is a forward placeholder: it is out of scope for the initial implementation and SHALL remain Draft until scoped.</statement>
  <rationale>Records the user's stated future direction so the query notation is designed to accommodate a semantic term later, without committing the first release to building embeddings/HyDE.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Could</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-07-20</changed>
  <verification>Demo</verification>
  <acceptance>
    <criteria>Given: a future increment implementing semantic search. When: a `semantic:"..."` query is issued. Then: specs are ranked by semantic similarity. (Deferred; not implemented initially.)</criteria>
  </acceptance>
  <depends>FR-SPECS-0012</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Batch Semantics

### FR-SPECS-0030 Batch Operations

<req id="FR-SPECS-0030" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>One-or-more items with atomic all-or-nothing writes</title>
  <statement>Every subcommand SHALL accept either a single item or an array of items and treat one item as a batch of size one. For write subcommands (add, update, delete, purge, implemented, approve, deprecate, restore, reopen), the command SHALL apply all items to an in-memory copy of the document, run the integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) over the resulting state, and write exactly once (FR-SPECS-0070) only if the whole batch is valid; if any item fails, the command SHALL write nothing and return a single human-readable error string that enumerates every failing item — by id, or array index when the item has no id — together with its reason, so the caller sees all problems in one response rather than discovering them one at a time. Read subcommands (get, query, graph, render, info, validate) SHALL never fail the batch for a missing id: get and purge/delete report absent ids in a `missing` list, and validate reports per-spec findings. A batch SHALL NOT exceed the max batch size (FR-SPECS-0007); an over-size batch SHALL be rejected with `size_limit_exceeded` before any processing.</statement>
  <rationale>All-or-nothing writes keep the single-file document consistent and make integrity checks meaningful over the post-batch state — a partial write could leave a dependent whose dependency was rejected. Identifying the failing item lets the caller fix and retry. Treating one item as a batch of one gives every subcommand a single uniform shape.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an add batch of three where the second and third are invalid. When: executed. Then: nothing is written and the single error string names both failing items and each reason. Given: an update batch of two both valid. Then: a single write applies both. Given: a get of five ids where two are absent. Then: found has three, missing has two, no error. Given: a batch of 501 items. Then: {error: "size_limit_exceeded"} before processing. Given: a single object (not an array). Then: it is handled as a batch of one.</criteria>
  </acceptance>
  <depends>FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0070</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Governance, Identity, and Time

### FR-SPECS-0040 Guarded Fields

<req id="FR-SPECS-0040" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Guarded fields change only through dedicated lifecycle ops</title>
  <statement>The fields `status`, `approved_by`, `implementation`, and `changed_by` SHALL be guarded: the content subcommands add (FR-SPECS-0010) and update (FR-SPECS-0013) SHALL silently drop any caller-supplied value for these fields. Each guarded field SHALL be settable only through its dedicated operation: `status` and `approved_by` through the approval-lifecycle ops (approve, deprecate, restore, reopen) and the automatic Modified transition on a normative edit (FR-SPECS-0013); `status` to Removed through delete (FR-SPECS-0014); `implementation` (and `implementation_notes`) through implemented (FR-SPECS-0015); `changed_by` through the actor resolver (FR-SPECS-0041) on every write. These lifecycle ops MAY share update's write path internally, but they are the only callers permitted to set their respective guarded field. No subcommand SHALL allow an arbitrary caller-chosen value of `approved_by` — it is always the resolved actor.</statement>
  <rationale>This is the mechanical guardrail that keeps governance honest: an AI (or human) cannot silently mark a spec Approved, forge an approver, or flip implementation state by patching a field. Approval and implementation state move only through explicit, auditable ops, which is exactly the guarantee the requirements-authoring skill needs the engine to enforce on its behalf.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: add or update with approved_by set by the caller. When: executed. Then: the value is dropped; approved_by is empty (add) or unchanged (update). Given: update with status or implementation set. Then: those are dropped. Given: approve. Then: approved_by is the resolved actor, not any caller-supplied string. Given: any write. Then: changed_by is the resolved actor.</criteria>
  </acceptance>
  <depends>FR-SPECS-0010, FR-SPECS-0013, FR-SPECS-0014, FR-SPECS-0015, FR-SPECS-0041</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0041 Actor Identity Resolution

<req id="FR-SPECS-0041" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Resolve the acting user from the environment</title>
  <statement>The command SHALL resolve the acting user's identity from the environment through an ordered fallback chain, using the first that yields a non-empty value: (1) an explicit actor supplied by the caller (parameter or `ROSETTA_ACTOR` environment variable); (2) the SCM identity (`git config user.email`, then `git config user.name`); (3) OS session identity — `SUDO_USER`, then the platform user-info API, then the environment user variable (`USER` on POSIX, `USERNAME` on Windows), including OS-specific sources rather than a single generic lookup; (4) the literal `"unknown"` when nothing resolves. The resolved value SHALL be a concrete identity string, not the generic word "user". This identity SHALL populate `changed_by` on every write and `approved_by` on approve (FR-SPECS-0040). Resolution SHALL NOT perform network calls and SHALL NOT fail the operation — an unresolved identity yields `"unknown"`, never an error.</statement>
  <rationale>Attributing changes and approvals to a real, specific actor gives the audit trail its meaning. A layered, cross-platform and OS-specific fallback chain works across developer machines and CI without configuration, and degrading to "unknown" rather than erroring keeps writes robust.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: ROSETTA_ACTOR set. When: any write runs. Then: changed_by equals that value. Given: no override but git user.email configured. Then: changed_by is the git email. Given: neither, but the OS user is available. Then: changed_by is the OS username. Given: nothing resolves. Then: changed_by is "unknown" and the write still succeeds. Given: approve. Then: approved_by uses the same resolution.</criteria>
  </acceptance>
  <depends>FR-SPECS-0040</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0042 UTC Storage, Local Display

<req id="FR-SPECS-0042" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Timestamps stored in UTC, displayed in local time</title>
  <statement>All timestamps persisted in a specs document — `created_at`, `updated_at`, and each spec's `changed` — SHALL be stored as ISO8601 in UTC (with a `Z` designator). The command SHALL NOT persist localized timestamps. Subcommands that produce human-oriented output (render FR-SPECS-0023, info FR-SPECS-0024) SHALL convert timestamps to the caller's local timezone for display; machine-oriented results (get, query returning full specs) SHALL return the stored UTC value unchanged so downstream tooling receives a canonical form.</statement>
  <rationale>Storing UTC keeps timestamps comparable and unambiguous across machines and timezones, while local-time display makes human review readable. Returning UTC in machine results avoids ambiguity for automation.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any write. When: the document is read back. Then: created_at/updated_at/changed are ISO8601 UTC with Z. Given: render or info. Then: displayed timestamps are in the caller's local timezone. Given: get or query. Then: returned timestamps are the stored UTC values.</criteria>
  </acceptance>
  <depends>FR-SPECS-0023, FR-SPECS-0024</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0043 Caller Spec IDs Are Not Internal References

<req id="FR-SPECS-0043" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>No-internal-leakage rule applies to command self-references, not caller data</title>
  <statement>The no-internal-traceability-leakage rule (FR-ARCH-0016) SHALL apply to the specs command's OWN emitted metadata — its help content, subcommand descriptions, schema descriptions, examples, notes, and error messages SHALL NOT contain requirement identifiers of the Rosetta project (e.g. `FR-SPECS-*`), ticket identifiers, internal source paths, or internal module names. It SHALL NOT apply to the caller's payload: spec ids, dependency references, and statements that the command stores and returns are the user's own project data and MAY match the `FR-*`/`NFR-*` pattern; the command SHALL return them verbatim and SHALL NOT redact or reject them as internal references.</statement>
  <rationale>The command's subject matter is requirement ids, so a blanket ban on `FR-*` tokens in output would be self-contradictory. Distinguishing the command's own bookkeeping (must stay clean) from the caller's domain data (must pass through untouched) resolves the tension the leakage rule would otherwise create.</rationale>
  <source>Inferred</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the specs command help payload. When: scanned. Then: it contains no FR-SPECS-* id, no ticket id, and no internal path. Given: a get result for a spec whose id is FR-AUTH-0003 with depends_on [FR-AUTH-0001]. Then: those ids are returned verbatim, not redacted.</criteria>
  </acceptance>
  <depends>FR-SPECS-0060</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Output Shapes

### FR-SPECS-0050 Named Result Types

<req id="FR-SPECS-0050" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>All results are named, recursively-defined types with shared write and lifecycle shapes</title>
  <statement>Every subcommand result SHALL be a named exported type, and per the recursive naming rule (FR-HELP-0002) every nested object and every array `items` shape SHALL itself be a named type referenced by name — no anonymous shape at any depth. Structurally identical shapes SHALL be defined once and reused (SRP+DRY).

The write subcommands add (FR-SPECS-0010) and update (FR-SPECS-0013) SHALL return the shared type `SpecWriteResult` = { document: SpecDocumentSummary, affected: SpecRef[] }, where `SpecDocumentSummary` = { component, total, previous_version } gives a compact post-write snapshot (with `previous_version` the backup path captured at this write, or null on first write, FR-SPECS-0070), and `SpecRef` = { id, status } lists the specs the write created or changed. The approval-lifecycle ops (approve, deprecate, restore, reopen) SHALL return the shared type `SpecLifecycleResult` = { updated: SpecRef[] }.

The remaining named result types are: `Spec` and its member `AcceptanceCriterion`; `AreaEntry`; `SpecGetResult`; `SpecQueryResult`; `SpecDeleteResult`; `SpecPurgeResult`; `SpecImplementedResult`; `SpecValidateResult` with member `SpecFinding`; `SpecGraphResult` with member `SpecEdge`; `SpecRenderResult`; `SpecInfoResult` with members `SpecAreaInfo`, `SpecTotals`, `SpecNextId`; and `SpecMigrateResult`. Each type SHALL be sourced from the code's type declaration, never a hand-authored duplicate, and SHALL be present in the help schema dictionary (FR-SPECS-0060).</statement>
  <rationale>Named, recursively-defined types let an AI caller resolve every field of every result without meeting an anonymous shape, matching the plan command's schema discipline. One shared SpecWriteResult and one shared SpecLifecycleResult avoid a proliferation of structurally identical per-subcommand types. Surfacing previous_version in the write result makes the backup link self-discoverable.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: add and update results. When: compared. Then: both are the one shared SpecWriteResult. Given: approve/deprecate/restore/reopen results. Then: all are the one shared SpecLifecycleResult. Given: any result walked to any depth. Then: every nested and array-items shape is a named type present in the schema dictionary; no anonymous shape. Given: a first write. Then: SpecWriteResult.document.previous_version is null; a later write gives the backup path.</criteria>
  </acceptance>
  <depends>FR-SPECS-0060, FR-SPECS-0070</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Help Content

### FR-SPECS-0060 Specs Help Content

<req id="FR-SPECS-0060" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Help content registered for the specs command</title>
  <statement>The specs command SHALL register help content that the help system (FR-HELP-0002) returns when queried. The content SHALL include:

- specs_file convention (one document per component; the documented path form)
- concepts: the spec unit and its fields; areas and area-scoped ids; the status lifecycle (Draft, Approved, Modified, Deprecated, Removed) and every transition and which op performs it; depends_on (directional, acyclic) versus related (associative, may cycle); guarded fields and why add/update strip them; the validate-then-approve flow
- subcommands: one entry per registered subcommand (add, get, query, update, delete, purge, implemented, approve, deprecate, restore, reopen, validate, graph, render, info, migrate), each with name, brief, usage, args, description, a statement of which inputs are required (conditional requirements stated), and an examples block with both a tip-form example (bracketed self-explanatory hints) and a real-form example (concrete JSON producing a working invocation)
- schemas: the named-type dictionary of FR-SPECS-0050, keyed by type name, every nested/array shape named (FR-HELP-0002)
- limits: the constants of FR-SPECS-0007
- query_notation: the key:value filter grammar (FR-SPECS-0012)
- notes: the caller-facing behaviors defined in FR-SPECS-0061
- next_steps_for_ai: directive guidance to orient with info, author with add (ids chosen from info), validate, fix errors, then approve

All emitted help content SHALL obey FR-ARCH-0016 as scoped by FR-SPECS-0043: no requirement identifier, ticket id, internal path, internal module name, or authoring rationale; every note reads as standalone directive guidance.</statement>
  <rationale>AI agents need one self-describing payload that teaches the spec model, the lifecycle, the guarded-field rules, the query grammar, and correct invocations without trial and error, and without leaking the command's own authoring bookkeeping.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help specs. When: executed. Then: the content includes specs_file, concepts (including the full status lifecycle and depends_on-vs-related), one subcommand entry per registered subcommand each with a required-inputs statement and a tip-form and real-form example, the schemas dictionary per FR-SPECS-0050, limits, query_notation, notes, and next_steps_for_ai. Given: the emitted payload is scanned. Then: no requirement id, ticket id, internal path, or authoring rationale appears.</criteria>
  </acceptance>
  <depends>FR-SPECS-0007, FR-SPECS-0012, FR-SPECS-0043, FR-SPECS-0050, FR-SPECS-0061</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0061 Specs Help Notes Content

<req id="FR-SPECS-0061" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Notes array content for specs help</title>
  <statement>The specs command's help content SHALL include a `notes` string array documenting the behaviors that affect the caller upfront. The notes SHALL include at minimum:

- JSON-bearing arguments are passed as inline JSON strings, not file paths
- ids are caller-provided; run info to get the suggested next id per area before add
- new specs always enter as Draft/NotStarted; supplied status/approved_by/implementation on add or update are dropped
- guarded fields (status, approved_by, implementation, changed_by) change only through the lifecycle ops (approve, deprecate, restore, reopen, delete, implemented) and the actor resolver
- editing an Approved spec's statement or acceptance moves it to Modified and clears approval; editing an Implemented spec's contract sets it to ToBeModified
- approve runs validation first and refuses on error-level findings; fix errors, then approve
- delete is a reversible soft-delete (status Removed, restore to undo); purge permanently removes and needs --force and no remaining references
- writes are all-or-nothing: a batch that has any invalid item writes nothing and names the failing item
- query grammar: key:value terms, space = AND, comma = OR within a field, - prefix = NOT, bare term = text over title/statement; Removed excluded unless include_removed:true
- timestamps are stored in UTC and shown in local time by render and info
- migrate is a one-time import of legacy markdown specs into the JSON document
- error responses are a single human-readable string that aggregates every problem at once (missing fields, limits, failing items), so a batch or approval failure reports all issues in one message rather than one at a time

Every note SHALL be standalone directive guidance and SHALL NOT contain requirement identifiers, ticket ids, internal paths, internal module names, or authoring rationale (FR-ARCH-0016, FR-SPECS-0043).</statement>
  <rationale>Splitting the notes out makes them independently testable and is the home for the surprising, caller-affecting behavior an AI must know: guarded fields, the Draft-first/validate-then-approve flow, soft-delete versus purge, all-or-nothing batches, the query grammar, and UTC/local time.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help specs. When: executed. Then: notes contains every behavior listed above. Given: any note. Then: it is standalone directive guidance with no requirement id, ticket id, internal path, or authoring rationale.</criteria>
  </acceptance>
  <depends>FR-SPECS-0060</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## File I/O

### FR-SPECS-0070 Atomic Write With Backup

<req id="FR-SPECS-0070" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Specs document writes are atomic with bounded backups</title>
  <statement>Every write to a specs document SHALL use the shared atomic write-with-backup mechanism (the same behavior the plan command uses, FR-PLAN-0024, via the shared file-I/O module): acquire a cross-process lock via an atomic-create primitive; read the current document with retry resilience; apply the batch in memory; rename the existing file to the next `<file>.bakNNN`; set the document's `previous_version` to that backup path; write the new document as pretty-printed JSON; prune backups beyond the retention limit (default 5, oldest removed); release the lock. Backup indexing and retries SHALL be bounded; exhaustion SHALL return `backup_create_failed`. The `previous_version` value SHALL also be surfaced in the write result (FR-SPECS-0050).</statement>
  <rationale>Reusing the plan command's proven atomic write-with-backup gives specs documents the same crash-safety, concurrency safety, and backwards-recoverable version chain, and avoids a second implementation of a subtle mechanism.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a successful write on an existing document. Then: the prior file is renamed to <file>.bakNNN and previous_version points to it. Given: writes beyond the retention limit. Then: the oldest backups are pruned to the limit. Given: two concurrent writes. Then: the lock serializes them and neither is lost. Given: backup indexing exhausted. Then: {error: "backup_create_failed"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0002, FR-SPECS-0050</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

### FR-SPECS-0071 Document Path and Read Resilience

<req id="FR-SPECS-0071" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Caller-supplied path with resilient reads</title>
  <statement>The specs document path SHALL be supplied by the caller on every invocation. The recommended convention is `docs/REQUIREMENTS/<component>/specs.json`, documented in help but not enforced. Parent directories SHALL be created on first write (FR-SPECS-0002). On read, if the document file is missing but at least one backup exists, the command SHALL retry — 100 milliseconds per attempt, up to 50 attempts, consistent with the shared read-resilience mechanism (FR-SHRD-0009) — before concluding the document is absent; a truly missing document SHALL return `specs_not_found`, and a file that exists but does not parse as valid JSON conforming to the document schema SHALL return `specs_file_corrupted`.</statement>
  <rationale>A caller-supplied path mirrors the plan command's simple addressing. Retrying when only a backup is present tolerates the brief window during an atomic rename, preventing spurious not-found errors under concurrency; reusing the shared read-resilience count/interval avoids a second, divergent retry policy.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a nested path whose dirs do not exist. When: the first add runs. Then: parent dirs are created and the document is written. Given: the file is briefly absent mid-rename but a backup exists. When: read. Then: the read retries and succeeds. Given: a genuinely missing document. Then: {error: "specs_not_found"}. Given: a corrupted JSON file. Then: {error: "specs_file_corrupted"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0002, FR-SPECS-0070</depends>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

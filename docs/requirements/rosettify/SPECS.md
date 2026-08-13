# FR-SPECS — Specs Command

Requirements for the `specs` command: `npx rosettify specs <subcommand>`. It manages software specs (specs = requirements) as AI-native JSON. It complements the `requirements-authoring` skill and requirements workflows — the skill owns human judgment (intent capture, EARS phrasing, HITL per-unit approval, narrative review, Draft→Approved governance); the command owns the mechanical engine (JSON-native batch CRUD and machine-checkable integrity: unique identifiers and dependency-graph walking).

The command mirrors the shared rosettify architecture: it is one registry tool with one run delegate (FR-ARCH-0001, FR-ARCH-0003, FR-ARCH-0006), exposed through both CLI and MCP frontends over the same delegate (FR-ARCH-0002), returning the common output envelope (FR-ARCH-0011) transformed by the frontends (FR-ARCH-0014) with help enrichment (FR-ARCH-0012). Subcommands are input parameters, not separate tools. It reuses shared validation, envelope, logging, and atomic file-I/O concerns (FR-ARCH-0013, SHARED.md) rather than reimplementing them.

Note: All "result" references describe the `result` field contents of the common output envelope (FR-ARCH-0011). Envelope wrapping ({ok, result, error, include_help}) is handled by common functionality. Run delegates never touch stdin/stdout/stderr (FR-ARCH-0008).

Canonical storage is JSON only: one specs document JSON file per system. There is no maintained markdown mirror; a human-readable view is produced on demand by the `render` subcommand (FR-SPECS-0023).

## Data Model

### FR-SPECS-0001 Spec Unit Schema

<req id="FR-SPECS-0001" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0006, FR-SPECS-0008"
     implementation="Implemented">
  <title>JSON schema of a single spec unit</title>
  <statement>A spec unit SHALL be a JSON object carrying exactly the fields below and no others. The field set SHALL be the JSON rendering of the canonical requirement unit — one model in two notations — so that a caller authoring through this command never needs the markup form. This unit governs field names, types, defaults, and which fields are required:

```
spec:
  id: str                       # required, caller-provided, unique across the document (FR-SPECS-0004)
  type: SpecType                # required; FR | NFR | INT | DATA
  level: LevelEnum              # required; System | Subsystem | Component; default System
  subsystem: str                # default ""; the subsystem this requirement concerns; required when
                                #   level is Subsystem or Component, otherwise filled when known
  component: str                # default ""; the component this requirement concerns; required when
                                #   level is Component, otherwise filled when known
  ticket_id: str                # optional; issue-tracker id
  classification: str           # optional; "business" | "technical"
  title: str                    # required, non-empty
  statement: str                # required, non-empty; the governing rule (FR-SPECS-0006)
  rationale: str                # default ""
  evidence: [str]               # default []; one "path:line-range" per source location backing a
                                #   reverse-engineered unit; empty for units authored from intent
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
  id: str                       # required; "<spec-id>.AC<n>", unique within the unit; assigned by the
                                #   command when omitted, validated when supplied
  ears: EarsEnum                # required; ubiquitous | event | state | optional | unwanted
  when: str                     # the trigger; carried when ears is event
  while: str                    # the state; carried when ears is state
  where: str                    # the feature that is present; carried when ears is optional
  if: str                       # the fault; carried when ears is unwanted
  system: str                   # required, non-empty; whatever responds — an actor, or a specific
                                #   system, subsystem, or component
  shall: str                    # required, non-empty; the outcome, or the mitigation when ears is unwanted
```

Each `AcceptanceCriterion` SHALL be the named object shape above, not a free-form string, so that criterion completeness and EARS conformance are machine-checkable (FR-SPECS-0021). A field the schema does not define SHALL be rejected with `invalid_spec_field`, a missing required field with `missing_required_field`, an out-of-enum `ears` with `invalid_ears`, an out-of-enum `level` with `invalid_level`, and two criteria sharing an id within one unit with `duplicate_criterion_id`. `evidence` records where a unit came from rather than what it requires: changing it SHALL NOT count as a normative edit and SHALL NOT move a unit to Modified or its implementation to ToBeModified (FR-SPECS-0013). Which condition word a criterion may carry for its `ears`, and every other rule about what these fields may say, is governed by FR-SPECS-0006; the caller-facing guidance for each field is governed by FR-SPECS-0008. This schema is the single source of truth for the spec-unit format, help content (FR-SPECS-0060), rendering (FR-SPECS-0023), and validation (FR-SPECS-0021).</statement>
  <rationale>Encodes the canonical requirement unit as native JSON so AI agents author by passing objects rather than hand-editing markup. EARS attributes on the criterion replace the given/when/then triple because the canonical unit puts EARS on the criteria and the statement carries the rule: a criterion built from `ears` plus one condition word plus `system` and `shall` is checkable field by field, while a Given/When/Then prose triple can only be checked for presence. `evidence` is a list rather than one string because a reverse-engineered unit is normally backed by several locations, and keeping them separate lets each be checked and re-pointed independently. Criterion ids are stored rather than derived so a test or traceability row can claim a stable target that survives reordering. The command assigns them when omitted because, unlike a spec id, a criterion id encodes nothing but position.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0001.AC1" ears="event" when="an add call carries a spec object whose fields all match this schema" system="the specs command" shall="store the unit with defaults applied for every omitted optional field"/>
    <criteria id="FR-SPECS-0001.AC2" ears="unwanted" if="a spec object carries a field this schema does not define" system="the specs command" shall="reject the write with invalid_spec_field and name the offending field"/>
    <criteria id="FR-SPECS-0001.AC3" ears="event" when="a criterion omits its id" system="the specs command" shall="assign the next free &lt;spec-id&gt;.AC&lt;n&gt; within that unit"/>
    <criteria id="FR-SPECS-0001.AC4" ears="unwanted" if="a criterion omits system or shall" system="the specs command" shall="reject the write with missing_required_field"/>
    <criteria id="FR-SPECS-0001.AC5" ears="unwanted" if="two criteria within one unit carry the same id" system="the specs command" shall="reject the write with duplicate_criterion_id"/>
    <criteria id="FR-SPECS-0001.AC6" ears="unwanted" if="a criterion declares an ears value outside the five patterns" system="the specs command" shall="reject the write with invalid_ears"/>
    <criteria id="FR-SPECS-0001.AC7" ears="event" when="a unit omits level" system="the specs command" shall="store level System"/>
    <criteria id="FR-SPECS-0001.AC9" ears="event" when="a unit names a subsystem and a component" system="the specs command" shall="store both alongside its level"/>
    <criteria id="FR-SPECS-0001.AC8" ears="event" when="a unit is added without evidence" system="the specs command" shall="store evidence as an empty list"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts, schemas.ts, add.ts, errors.ts</implementationNotes>
</req>

### FR-SPECS-0002 Specs Document Schema

<req id="FR-SPECS-0002" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Per-system specs document (the addressing unit)</title>
  <statement>Specs SHALL be stored one document per system as a JSON file. The document SHALL conform to:

```
specs_document:
  system: str                   # required, non-empty; the system whose requirements this document holds
  description: str              # default ""
  created_at: ISO8601           # UTC; set on create (FR-SPECS-0042)
  updated_at: ISO8601           # UTC; updated on every write (FR-SPECS-0042)
  previous_version: str|null    # default null; path of the backup captured at write time (FR-SPECS-0070)
  purged_ids: [spec-id]         # default []; ids of purged specs, retained so an id is never reused (FR-SPECS-0009, FR-SPECS-0016)
  areas: AreaEntry[]            # default []; registered area codes for this document
  specs: spec[]                 # array of spec units (FR-SPECS-0001), default []

AreaEntry:
  code: str                     # required; uppercase mnemonic, e.g. "SPECS", "CLI"
  name: str                     # required; human-readable area name
```

The command operates on one specs document per invocation, addressed by a caller-supplied file path (FR-SPECS-0071). Area is a field of each spec's id (FR-SPECS-0004), and `areas` is the document-level registry of the codes in use; the document holds a flat `specs` array, and grouping by area is a rendering concern (FR-SPECS-0023). Parent directories SHALL be created when the file is written.

`system` SHALL be named by the caller: every subcommand that may create a document (add, FR-SPECS-0010; migrate, FR-SPECS-0025) SHALL accept a `system` argument, and a call that would create a document without one SHALL be rejected with `missing_system`. Against a document that already exists the argument SHALL be optional, and when supplied it SHALL be reconciled with what is stored: a stored empty `system` SHALL adopt the supplied name, an identical name SHALL be accepted, and a different name SHALL be rejected with `system_mismatch`.</statement>
  <rationale>One document per system keeps the write path a single-file atomic operation (matching the plan command) while areas remain an internal grouping field, per the approved storage decision. Storing specs as a flat array with an area registry avoids duplicating area names on every unit and lets render group without a nested storage shape. The system is named by the caller rather than derived from the file path because it is the document's identity, and a value inferred from a directory name would be a guess that every later reader would inherit. Reconciling a supplied name against a stored one turns the argument into a guard: passing it habitually is safe, and pointing a call at the wrong document is caught rather than absorbed. An empty stored name is adopted rather than refused, because a document written before this rule has no other path to acquire one.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-08-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an add call against a non-existent document path, naming a system. When: executed with create semantics. Then: the file and parent dirs are created with system set to the supplied name, created_at, updated_at set, previous_version null, and the spec appended. Given: an add or migrate call that would create a document without a system. Then: {error: "missing_system"}. Given: a call naming a system against a document whose stored system is empty. When: executed. Then: the supplied name is stored. Given: a call naming a system that differs from the stored one. Then: {error: "system_mismatch"}. Given: a call naming the same system as the stored one, or naming none. When: executed. Then: it succeeds and the stored system is unchanged. Given: a document read back. When: parsed. Then: all fields conform to the schema. Given: a document file that is not valid JSON. When: read. Then: {error: "specs_file_corrupted"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0004, FR-SPECS-0070, FR-SPECS-0071</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts, write.ts, add.ts, migrate.ts, errors.ts, index.ts, src/frontends/cli.ts, src/registry/types.ts, src/shared/doc-io.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts</implementationNotes>
</req>

### FR-SPECS-0004 Identifier Format and Area Registration

<req id="FR-SPECS-0004" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-11"
     depends="FR-SPECS-0002, FR-SPECS-0021, FR-SPECS-0024"
     implementation="Implemented">
  <title>Identifier format, area registration, and caller-chosen numbers</title>
  <statement>A spec id SHALL read `<PREFIX>-<AREA>-<NNNN>`: PREFIX is the type prefix (FR, NFR, INT, DATA), AREA is an uppercase mnemonic naming the cross-cutting concern the requirement belongs to, and NNNN is a four-digit zero-padded number. An id in any other shape SHALL be rejected with `invalid_id_format`.

Every AREA SHALL be registered in the document's area registry (FR-SPECS-0002). A write naming an area the registry does not hold SHALL register it, taking the code itself as the name, so a write is never refused for introducing an area. A document whose stored contents name an unregistered area SHALL be reported by `validate` as an unregistered area at error severity (FR-SPECS-0021).

For a spec of type NFR the nine quality-characteristic codes PERF, SEC, REL, USE, MAIN, PORT, COMP, FUNC, and SAFE SHALL be pre-registered in every document, each carrying the name of the characteristic it denotes — performance efficiency, security, reliability, usability, maintainability, portability, compatibility, functional suitability, safety — and SHALL be recommended, so that an author reaching for one never has to register it. They SHALL NOT be mandatory: any registered area is legal on any type, and an NFR whose area falls outside the nine SHALL be accepted and reported as a recommendation not followed (FR-SPECS-0021).

Every spec id SHALL be supplied by the caller; the command SHALL NOT generate one. An add without an id SHALL be rejected with `missing_id`. The `info` subcommand (FR-SPECS-0024) SHALL report the highest number used per prefix and area, so the caller can choose the next free one without collision.

Criterion sub-ids are governed by FR-SPECS-0001 and identifier stability by FR-SPECS-0009; neither is governed here.</statement>
  <rationale>Caller-supplied ids keep the command deterministic and let the authoring agent decide ids up front, which the user found easier than server-side minting; the info subcommand orients it to the next free number. The nine quality characteristics are pre-registered and recommended rather than enforced because the command and the authoring instructions work at different levels: the instructions prescribe how to author well, while the command serves any project and must accept the vocabulary that project already uses. A tool that refused a registered area because it was unconventional would be broken, so the recommendation is carried by a warning instead of a refusal. FR, INT, and DATA areas were never constrained for the same reason — no fixed vocabulary can enumerate the concerns of an arbitrary system. Registration on first use follows from the same reasoning: an author naming a new concern has already made the decision, and a refusal would only demand a second call to say the same thing. The registry stays meaningful because `validate` reads it — a document assembled outside the command can still name an area the registry lost, and that is the case worth reporting.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0004.AC1" ears="unwanted" if="an add call for an FR in area SPECS carries no id" system="the specs command" shall="reject the write with missing_id"/>
    <criteria id="FR-SPECS-0004.AC2" ears="event" when="an id reads FR-SPECS-8" system="the specs command" shall="reject the write with invalid_id_format"/>
    <criteria id="FR-SPECS-0004.AC3" ears="event" when="a write names area XYZ, which the registry does not hold" system="the specs command" shall="register XYZ with XYZ as its name and accept the write"/>
    <criteria id="FR-SPECS-0004.AC4" ears="event" when="an NFR is written with id NFR-PERF-0001 against a document whose registry was never edited" system="the specs command" shall="accept the write"/>
    <criteria id="FR-SPECS-0004.AC5" ears="event" when="an NFR is written with id NFR-CLI-0001 in a registered area" system="the specs command" shall="accept the write and leave validate to report a recommendation not followed"/>
    <criteria id="FR-SPECS-0004.AC6" ears="event" when="info is called" system="the specs command" shall="report the highest used NNNN per prefix and area"/>
    <criteria id="FR-SPECS-0004.AC7" ears="ubiquitous" system="the specs command" shall="register each of the nine quality-characteristic codes with the name of the characteristic it denotes"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts, add.ts, update.ts, errors.ts, migrate.ts, validate.ts</implementationNotes>
</req>

### FR-SPECS-0009 Identifier Stability

<req id="FR-SPECS-0009" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-11"
     depends="FR-SPECS-0004, FR-SPECS-0014, FR-SPECS-0016"
     implementation="Implemented">
  <title>Identifiers never change and are never reused</title>
  <statement>A spec id SHALL never change and SHALL never be reused. No subcommand SHALL offer a way to change an id: `update` (FR-SPECS-0013) addresses its target by `id`, so an id is the key of the edit rather than a field the edit can carry, and no other subcommand writes one. An id belonging to a soft-deleted (FR-SPECS-0014) or purged (FR-SPECS-0016) spec SHALL NOT be given to a different spec. A soft-deleted spec remains in the document, so its id collides naturally; a purged spec does not, so purge SHALL retain its id in the document's `purged_ids` registry (FR-SPECS-0002) and the uniqueness check SHALL span that registry (FR-SPECS-0005).

Because an id can never change, a spec's `type` SHALL stay consistent with the prefix of its own id: a write that would leave the two disagreeing SHALL be rejected with `id_type_mismatch`, on add and on update alike.</statement>
  <rationale>Stable identifiers are what every cross-reference, test claim, and traceability row depends on; a renumbered or recycled id silently repoints all of them. Immutability is carried by the shape of the edit rather than by a rejection: because `update` finds its target by the id, there is no call that could ask for a different one, and an error code guarding an impossible request would only describe a path that does not exist. Consistency between `type` and the id prefix is enforced at the same place because the id is immutable: a spec whose id says FR while its type says NFR could never be repaired, only deleted and re-authored, so the only useful moment to catch it is the write that would create it. Both write paths are named explicitly because an add can introduce the mismatch just as easily as an update.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0009.AC1" ears="ubiquitous" system="the specs command" shall="expose no argument or field through which an existing spec's id can be rewritten"/>
    <criteria id="FR-SPECS-0009.AC2" ears="unwanted" if="an add carries type NFR under an id beginning FR" system="the specs command" shall="reject the write with id_type_mismatch"/>
    <criteria id="FR-SPECS-0009.AC3" ears="unwanted" if="an update would set type to NFR on a spec whose id begins FR" system="the specs command" shall="reject the write with id_type_mismatch"/>
    <criteria id="FR-SPECS-0009.AC4" ears="unwanted" if="an add carries the id of a purged spec" system="the specs command" shall="reject the write with duplicate_id"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts, add.ts, update.ts, errors.ts, purge.ts</implementationNotes>
</req>

### FR-SPECS-0005 Uniqueness and Reference Integrity

<req id="FR-SPECS-0005" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Unique ids, valid references, and acyclic dependencies</title>
  <statement>Every spec id in a document SHALL be unique across both its live specs and its `purged_ids` registry (FR-SPECS-0002); any operation that would introduce a duplicate of either SHALL be rejected with `duplicate_id`. Every entry in a spec's `depends_on` and `related` SHALL reference an id that exists in the same document; a reference to a non-existent id SHALL be rejected with `unknown_dependency` on write, unless the missing id is created in the same batch (FR-SPECS-0030). The `depends_on` graph expresses directional prerequisites and SHALL be acyclic: an operation that would create a `depends_on` cycle SHALL be rejected with `dependency_cycle`, and a spec SHALL NOT `depends_on` itself. The `related` graph expresses non-directional association and MAY contain cycles (including mutual `related` links and, by nature, bidirectional "see also" relationships); it SHALL NOT be subject to cycle rejection. Soft-deleted specs (status Removed, FR-SPECS-0040) SHALL remain in the document and SHALL still count as valid reference targets so existing links do not dangle. All of these checks SHALL run over the resulting document state after a batch is applied in memory and before any file is written.</statement>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts, purge.ts</implementationNotes>
</req>

### FR-SPECS-0006 Statement and Acceptance Content Rules

<req id="FR-SPECS-0006" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="Documentation"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-11"
     depends="FR-SPECS-0001, FR-SPECS-0021"
     implementation="Implemented">
  <title>Governing-rule statements, EARS criteria, and measurable NFRs</title>
  <statement>A `statement` SHALL carry the governing rule of its unit: what shall hold, over which cases it holds, and which cases it explicitly excludes. A statement SHALL NOT be required to take an EARS shape and SHALL NOT restate its criteria — the criteria are samples of the rule and the statement is the rule. Statements SHALL use `shall` for mandatory, `should` for preferred, and `may` for optional behavior. A statement of type NFR SHALL additionally carry a quantified metric, its threshold, and the condition under which it is measured.

`level` SHALL state the depth at which a requirement binds, and `subsystem` and `component` SHALL state where it sits. Those two SHALL carry whatever the author knows, not only what the level demands: a requirement binding the whole system may still name the subsystem it concerns, and leaving a name empty SHALL mean the author did not know it rather than that it does not apply. `level` Subsystem SHALL require a `subsystem` name; `level` Component SHALL require both a `subsystem` and a `component` name, because a component always sits inside a subsystem and naming one without the other discards information the author held. Where a name is not required it SHALL be recommended, and its absence SHALL be reported as a warning (FR-SPECS-0021).

Every unit SHALL carry at least one criterion. Each criterion SHALL select exactly one EARS pattern through `ears` and SHALL carry exactly the condition word that pattern names — ubiquitous none, event `when`, state `while`, optional `where`, unwanted `if` — together with a named `system` and a `shall` outcome. A criterion SHALL NOT carry more than one condition word. Criterion ids SHALL read `<spec-id>.AC<n>` and SHALL be unique within their unit, so that a test or a traceability row can claim one addressable criterion.

Enforcement SHALL split on kind: a field-level violation (a missing required field, an out-of-enum value, a duplicate criterion id, or a `type` disagreeing with its own id prefix) SHALL be rejected on write, while a cross-field, phrasing, or recommendation violation (a condition word contradicting its `ears`, more than one condition word, a location missing for the level, a non-measurable NFR, a missing modal verb, an area outside the recommended quality-characteristic codes on a non-functional requirement) SHALL be reported by the validate op (FR-SPECS-0021) rather than rejected, so that one call names every remaining problem at once instead of a write failing on the first. A unit at status Draft is expected to be complete and ready for review, carrying its level, its locations, its statement, and its criteria; Draft SHALL NOT be treated as a place to park an unfinished unit, and validate is how an author confirms a Draft is ready rather than a licence to store one that is not. Neither add nor update SHALL autocorrect, reword, or reformat a statement or a criterion the caller supplied; a content violation SHALL be reported rather than repaired. Whether a statement's exclusions are complete, and whether a criterion says anything its statement did not already say, are reviewer judgments and are excluded from this unit.</statement>
  <rationale>Carries the discipline of the canonical requirement unit into machine-checkable form. The statement stops being an EARS sentence because EARS is a one-trigger grammar: it can express a single trigger and response, but not the scope a rule covers or the cases it excludes, which is exactly what a governing rule must state. Moving EARS onto the criteria loses nothing — a unit normally needs several patterns at once, one per case it is sampled by — and gains a per-field check where the old prose match could only pattern-match a sentence. Splitting enforcement between write and validate serves reporting, not tolerance: a caller can never store a structurally broken object, and the cross-field and phrasing rules are collected into one validate response so an author sees every remaining problem at once rather than discovering them one failed write at a time. A Draft is still expected to satisfy them all — it is a unit awaiting review, not a unit awaiting completion.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0006.AC1" ears="event" when="a criterion declares ears event and carries when" system="validate" shall="report no EARS finding for that criterion"/>
    <criteria id="FR-SPECS-0006.AC2" ears="unwanted" if="a criterion declares ears state but carries when" system="validate" shall="report a condition-word mismatch at error severity"/>
    <criteria id="FR-SPECS-0006.AC3" ears="unwanted" if="a criterion carries both when and if" system="validate" shall="report more than one condition word at error severity"/>
    <criteria id="FR-SPECS-0006.AC4" ears="event" when="an NFR statement reads &quot;validate shall complete within 500 ms for a document of 1000 specs&quot;" system="validate" shall="report no measurable finding"/>
    <criteria id="FR-SPECS-0006.AC5" ears="event" when="an NFR statement reads &quot;validate shall be fast&quot;" system="validate" shall="report a non-measurable NFR at warning severity"/>
    <criteria id="FR-SPECS-0006.AC6" ears="unwanted" if="a unit is written with an empty acceptance array" system="validate" shall="report missing acceptance at error severity"/>
    <criteria id="FR-SPECS-0006.AC7" ears="event" when="a statement reads &quot;The command handles errors nicely&quot;" system="validate" shall="report a missing modal verb at warning severity and report no EARS finding"/>
    <criteria id="FR-SPECS-0006.AC8" ears="state" while="a unit sits at status Draft with a condition-word mismatch" system="the specs command" shall="keep accepting writes to that unit and keep reporting the mismatch until it is corrected"/>
    <criteria id="FR-SPECS-0006.AC9" ears="event" when="an update supplies a non-measurable NFR statement" system="the specs command" shall="store that statement verbatim and leave its correction to validate"/>
    <criteria id="FR-SPECS-0006.AC10" ears="event" when="a unit declares level Component and names no component" system="validate" shall="report a missing location at error severity"/>
    <criteria id="FR-SPECS-0006.AC11" ears="event" when="a unit declares level Component and names a component but no subsystem" system="validate" shall="report a missing location at error severity"/>
    <criteria id="FR-SPECS-0006.AC12" ears="event" when="a unit declares level System and names neither a subsystem nor a component" system="validate" shall="report an unstated location at warning severity"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/rubric.ts, validate.ts</implementationNotes>
</req>

### FR-SPECS-0007 Size Limits and Constants

<req id="FR-SPECS-0007" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="Documentation"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0060"
     implementation="Implemented">
  <title>Document size limits with runtime enforcement</title>
  <statement>The command SHALL enforce: max 10000 specs per document, max 50 dependencies per spec, max 50 acceptance criteria per spec, max 50 evidence locations per spec, max 20000 characters per string field, max 256 characters per name/title/id field, and max 500 items per batch. The fields of an acceptance criterion SHALL fall under these same two character caps rather than introduce their own: `id` and `system` under the name cap, and `shall` and the condition word under the string cap. A violation SHALL be rejected with `size_limit_exceeded`. These constants SHALL appear in the help content limits section (FR-SPECS-0060).</statement>
  <rationale>Bounds protect the single-file read-modify-write path and give AI callers explicit limits to avoid trial-and-error, matching the plan command's constants approach. Criterion fields reuse the two existing caps instead of gaining their own because they are the same two kinds of value — a short name and a sentence — and a third set of numbers would be one more thing for a caller to learn and for help to state.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0007.AC1" ears="event" when="a batch would leave the document holding 10001 specs" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC2" ears="event" when="a title of 257 characters is written" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC3" ears="event" when="a criterion carries a system of 257 characters" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC4" ears="event" when="a batch of 501 items is submitted" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC5" ears="event" when="a spec is written with 51 prerequisites" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC6" ears="event" when="a spec is written with 51 acceptance criteria" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC7" ears="event" when="a spec is written with 51 evidence locations" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC8" ears="event" when="a criterion carries an outcome of 20001 characters" system="the specs command" shall="reject the write with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0007.AC9" ears="ubiquitous" system="the limits section of the specs help content" shall="state every constant this unit names"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/shared/constants.ts, src/rosettify/src/commands/specs/core.ts, help-content.ts</implementationNotes>
</req>

### FR-SPECS-0008 Field Authoring Guidance

<req id="FR-SPECS-0008" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0001, FR-SPECS-0006, FR-SPECS-0043, FR-SPECS-0050, FR-SPECS-0060"
     implementation="Implemented">
  <title>Per-field caller guidance emitted through help</title>
  <statement>Every field of the spec unit and of the acceptance criterion (FR-SPECS-0001) SHALL carry one line of guidance telling the caller what to put in it, and the command SHALL emit that guidance so a caller can author a complete unit from the command's own help alone, without consulting any external template. Guidance SHALL state what the value must contain, not what the field is named: the single outcome the unit governs, as a noun phrase unique within its area, for `title`; the governing rule with the cases it reaches and the cases it excludes for `statement`; the depth at which the rule binds for `level`, and for `subsystem` and `component` the place it concerns, filled whenever the author knows it and not only when the level demands it; why this shape and not another, including the basis for each threshold and the alternatives rejected, for `rationale`; one `path:line-range` per source location backing a reverse-engineered unit for `evidence`; whatever responds — an actor or a specific system, subsystem, or component — for `system`; the trigger, state, feature, or fault for the condition word its `ears` names; the outcome, or the mitigation for an unwanted pattern, for `shall`; the files affected once implementation is Implemented for `implementation_notes`; and the rejection reason once status is Removed for `notes`.

The guidance SHALL be emitted in both of the places a caller looks: as the description of each field in the help schema dictionary (FR-SPECS-0060), and as a `field_guide` section of the specs help content listing every field as the named type `SpecFieldGuide` = { field, type, required, default, guidance } (FR-SPECS-0050). Guidance SHALL read as directive instruction addressed to the caller and SHALL NOT name a markup notation, a file format, a requirement identifier, a ticket id, an internal path, or the reasoning behind the field's design (FR-SPECS-0043). Which values a field admits and whether it is required are stated by FR-SPECS-0001 and reported alongside the guidance; the rules the guidance summarizes are governed by FR-SPECS-0006. This unit does not govern subcommand help entries, which FR-SPECS-0060 owns.</statement>
  <rationale>A field name carries almost none of what an author needs: "title" does not say the value must be a noun phrase naming one outcome and unique within its area, and "system" does not say it must name the responding actor. That knowledge exists today only in the canonical unit template, which a caller of this command never sees — so without this unit the command is authorable only by someone who already knows the template, which defeats the point of having a command. Emitting the same guidance in two places is deliberate: a caller inspecting the schema dictionary to build one object and a caller reading help sections to learn the model are different callers, and neither should have to find the other's surface. A single prose block was rejected because a caller fixing one field would have to read all of it.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0008.AC1" ears="ubiquitous" system="the specs help content" shall="carry one field_guide entry for every field of the spec unit and of the acceptance criterion"/>
    <criteria id="FR-SPECS-0008.AC2" ears="ubiquitous" system="every field_guide entry" shall="state the field name, its type, whether it is required, its default, and its guidance"/>
    <criteria id="FR-SPECS-0008.AC3" ears="event" when="a caller reads the help schema dictionary" system="each field of the spec and criterion schemas" shall="carry the same guidance as its field_guide entry"/>
    <criteria id="FR-SPECS-0008.AC4" ears="event" when="a caller reads the guidance for system" system="the field_guide" shall="tell the caller to name whatever responds, an actor or a specific system, subsystem, or component"/>
    <criteria id="FR-SPECS-0008.AC5" ears="event" when="a caller reads the guidance for evidence" system="the field_guide" shall="tell the caller to give one path and line range per source location"/>
    <criteria id="FR-SPECS-0008.AC6" ears="ubiquitous" system="the specs command" shall="emit no guidance line naming a markup notation, a file format, a requirement identifier, a ticket id, or an internal path"/>
    <criteria id="FR-SPECS-0008.AC7" ears="ubiquitous" system="the specs command" shall="emit a guidance line for every field it accepts, including any field added later"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/field-guide.ts, schemas.ts, help-content.ts, output.ts</implementationNotes>
</req>

## Core Subcommands

Every subcommand in this section accepts one or more items (batch) and follows the batch semantics of FR-SPECS-0030. Write subcommands return the shared write result of FR-SPECS-0050; read subcommands return the shapes named in their own requirement. Read subcommands SHALL exclude soft-deleted specs (status Removed) unless `include_removed` is set; write subcommands SHALL run the integrity checks of FR-SPECS-0005 over the post-batch state before writing.

### FR-SPECS-0010 add

<req id="FR-SPECS-0010" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs add subcommand</title>
  <statement>specs add SHALL accept a specs document path, an optional system name (FR-SPECS-0002 — required when the call would create the document), and one or more spec objects (a JSON object or a JSON array of objects), and append each as a new spec unit. For each item: `id` is required and caller-provided (FR-SPECS-0004; an item without id is rejected with `missing_id`); field defaults are applied (FR-SPECS-0001); `status` defaults to Draft; `implementation` defaults to NotStarted; `changed` is set to the current UTC timestamp (FR-SPECS-0042) and `changed_by` to the resolved actor (FR-SPECS-0041); `approved_by` is forced to empty. Any `status`, `approved_by`, or `implementation` value supplied on an add item SHALL be ignored (guarded fields, FR-SPECS-0040) — a new spec always enters as Draft/NotStarted. If the document does not exist it SHALL be created (FR-SPECS-0002). All integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) SHALL run over the resulting document before writing. On success the result SHALL be the shared SpecWriteResult (FR-SPECS-0050). Errors: `missing_id`, `duplicate_id`, `invalid_id_format`, `invalid_type`, `invalid_source`, `invalid_priority`, `invalid_verification`, `invalid_spec_field`, `unknown_dependency`, `dependency_cycle`, `size_limit_exceeded`, `missing_required_field` (a required field per FR-SPECS-0001 is absent), `invalid_ears`, `invalid_level`, `duplicate_criterion_id`, `id_type_mismatch`, `missing_system`, `system_mismatch`.</statement>
  <rationale>add is the create path. Requiring a caller-provided id keeps id ownership with the authoring agent; forcing Draft/NotStarted makes new specs safe by default and keeps approval a deliberate, separate act. Accepting a single object or an array is the uniform batch shape.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-08-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: add with one valid FR object including its id. When: executed. Then: status=Draft, implementation=NotStarted, changed and changed_by set, and the result is SpecWriteResult. Given: add with an item lacking id. Then: {error: "missing_id"}. Given: add with a two-element array. When: executed. Then: both are appended in one write. Given: add with status="Approved" set on the item. When: executed. Then: the stored status is Draft (supplied status ignored). Given: add against a missing document path. Then: the document is created. Given: add whose item omits `title`. Then: {error: "missing_required_field"}. Given: an item with an unknown field. Then: {error: "invalid_spec_field"}. Given: an item with an out-of-enum source, priority, or verification value. Then: {error: "invalid_source"}, {error: "invalid_priority"}, or {error: "invalid_verification"} respectively. Given: an item whose id names an area the registry does not hold. When: executed. Then: the area is registered and the write succeeds. Given: add against a missing document path with no system named. Then: {error: "missing_system"}. Given: an item whose criterion declares an out-of-enum ears or the unit an out-of-enum level. Then: {error: "invalid_ears"} or {error: "invalid_level"} respectively.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0030, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/add.ts, core.ts, errors.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/get.ts</implementationNotes>
</req>

### FR-SPECS-0012 query

<req id="FR-SPECS-0012" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0001"
     implementation="Implemented">
  <title>specs query subcommand</title>
  <statement>specs query SHALL accept a specs document path and an optional query string in `key:value` filter notation and return the matching spec units. Notation: space-separated terms combine with AND; a comma-separated value list matches any of its values (OR within a field, e.g. `area:CLI,MCP`); a term prefixed with `-` negates it (NOT, e.g. `-status:Removed`); a quoted value (`title:"exact phrase"`) matches literally; a bare term with no `key:` is free-text matched case-insensitively as a substring over `title` and `statement`. Filterable keys: `type`, `area`, `level`, `subsystem`, `component`, `status`, `priority`, `implementation`, `verification`, `source`, `depends_on` (specs that depend on the given id), `related` (specs related to the given id), `ears` (specs carrying at least one criterion of the named EARS pattern), `evidence` (`present` or `absent`), `title`, `statement`. When no query is given, query SHALL return all specs. query SHALL exclude soft-deleted (Removed) specs unless the query includes `include_removed:true` or explicitly matches `status:Removed`. The result SHALL be the named type `SpecQueryResult` = { specs: Spec[], count: int }, where `count` equals `specs.length`. Errors: `invalid_filter` (an unknown filter key), `invalid_query` (a malformed query string), `specs_not_found`, `specs_file_corrupted`. Natural-language semantic search over the same surface is a future capability (FR-SPECS-0026) and is out of scope for the initial implementation.</statement>
  <rationale>query is the discovery path over the whole document by attributes, complementing get's by-id path. A `key:value` string is the notation the user selected as easy to state and widely recognized (issue-tracker / code-search style). Excluding Removed by default keeps normal listings clean while allowing history retrieval on request. Keeping one string surface leaves room for a future semantic operator without a second query shape. `ears` and `evidence` are filterable because the questions they answer — which requirements cover failure, which reverse-engineered ones are unsupported — were answerable by text search while requirements lived as markup and would otherwise be lost now that they live as data; every other question of that kind (unapproved work, AI-generated units, code that drifted from its spec) is already answered by `status`, `source`, and `implementation`.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0012.AC1" ears="event" when="query runs with `type:NFR status:Approved`" system="specs query" shall="return only Approved NFRs with count equal to the number returned"/>
    <criteria id="FR-SPECS-0012.AC2" ears="event" when="query runs with `area:CLI,MCP`" system="specs query" shall="return specs in either area"/>
    <criteria id="FR-SPECS-0012.AC3" ears="event" when="query runs with no query string" system="specs query" shall="return every spec that is not Removed"/>
    <criteria id="FR-SPECS-0012.AC4" ears="event" when="query runs with `include_removed:true`" system="specs query" shall="include Removed specs"/>
    <criteria id="FR-SPECS-0012.AC5" ears="event" when="query runs with `depends_on:FR-SPECS-0004`" system="specs query" shall="return only specs listing FR-SPECS-0004 among their prerequisites"/>
    <criteria id="FR-SPECS-0012.AC6" ears="event" when="query runs with `ears:unwanted`" system="specs query" shall="return only specs carrying at least one unwanted-pattern criterion"/>
    <criteria id="FR-SPECS-0012.AC7" ears="event" when="query runs with `evidence:absent source:Sources`" system="specs query" shall="return only reverse-engineered specs that cite no source location"/>
    <criteria id="FR-SPECS-0012.AC8" ears="event" when="query runs with `-status:Removed retry`" system="specs query" shall="return specs that are not Removed and whose title or statement contains retry"/>
    <criteria id="FR-SPECS-0012.AC9" ears="unwanted" if="a query names a filter key the notation does not define" system="specs query" shall="reject the call with invalid_filter"/>
    <criteria id="FR-SPECS-0012.AC10" ears="unwanted" if="a query string is malformed" system="specs query" shall="reject the call with invalid_query"/>
    <criteria id="FR-SPECS-0012.AC11" ears="event" when="query runs with `related:FR-SPECS-0001`" system="specs query" shall="return only specs listing FR-SPECS-0001 among their associative links"/>
    <criteria id="FR-SPECS-0012.AC12" ears="event" when="query runs with a quoted title value" system="specs query" shall="match that title literally rather than as a substring"/>
    <criteria id="FR-SPECS-0012.AC13" ears="event" when="query runs with `component:req-parser`" system="specs query" shall="return only specs naming that component, whatever their level"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/query-filter.ts, help-content.ts</implementationNotes>
</req>

### FR-SPECS-0013 update

<req id="FR-SPECS-0013" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs update subcommand</title>
  <statement>specs update SHALL accept a specs document path and one or more patch objects, each identifying a target by `id` and carrying the fields to change, and SHALL merge-patch each target following RFC 7396 (null removes a key, nested objects merge, scalars and arrays replace). A patch whose `id` does not exist SHALL be rejected with `target_not_found`. The `id` identifies the target and SHALL NOT be writable: a patch names the spec it edits by `id`, so no patch can carry a different one (FR-SPECS-0009). The guarded fields `status`, `approved_by`, `implementation`, and `changed_by` in a patch SHALL be silently dropped — they change only via the lifecycle ops (approve/deprecate/restore FR-SPECS-0040, delete FR-SPECS-0014, implemented FR-SPECS-0015) and the actor resolver (FR-SPECS-0041). Every patched spec's `changed` (UTC, FR-SPECS-0042) and `changed_by` (resolved actor, FR-SPECS-0041) SHALL be set on write. When a patch changes an Approved spec's normative content — its `statement` or any `acceptance` criterion — the command SHALL set that spec's `status` to Modified and clear `approved_by`, so the change requires re-approval; a purely cosmetic edit (e.g. `notes`, `rationale`, `title`) SHALL leave `status` unchanged. When such a normative edit is applied to a spec whose `implementation` is Implemented, the command SHALL set `implementation` to ToBeModified so the implementation is revisited. All integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) SHALL run over the post-batch state before writing. On success the result SHALL be the shared SpecWriteResult (FR-SPECS-0050). Errors: `target_not_found`, `invalid_spec_field`, `unknown_dependency`, `dependency_cycle`, `duplicate_id`, `size_limit_exceeded`, `invalid_source`, `invalid_priority`, `invalid_verification`, `invalid_type`, `id_type_mismatch`, `invalid_data`, `missing_data`, `missing_required_field`, `invalid_ears`, `invalid_level`, `duplicate_criterion_id`.</statement>
  <rationale>update is the merge-patch edit path, mirroring plan upsert's proven RFC-7396 semantics and its silent-drop of guarded fields so approval and implementation state cannot be flipped mechanically. Moving an edited Approved spec to Modified (not fresh Draft) records that it was once approved but its contract changed, and forcing an Implemented spec to ToBeModified signals the code must be revisited — together these keep approval and implementation state honest against the current text, the core governance guarantee the skill needs the engine to uphold. Limiting the trigger to statement/acceptance edits avoids churn on cosmetic changes.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-08-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: update {id:"FR-SPECS-0001", title:"New title"} on a Draft spec. When: executed. Then: title changes, other fields preserved, changed and changed_by set, result is SpecWriteResult. Given: a patch with status:"Approved". When: executed. Then: the status field is silently dropped. Given: a patch targeting a missing id. Then: {error: "target_not_found"}. Given: a patch replacing acceptance with a criterion that names no responder or outcome. Then: {error: "missing_required_field"}. Given: a patch leaving an out-of-enum level, a criterion with an out-of-enum ears, or two criteria sharing an id. Then: {error: "invalid_level"}, {error: "invalid_ears"}, or {error: "duplicate_criterion_id"} respectively. Given: an edit to an Approved spec's statement. When: executed. Then: its status becomes Modified and approved_by is cleared. Given: a cosmetic edit (notes only) to an Approved spec. When: executed. Then: status stays Approved. Given: a statement edit to a spec whose implementation is Implemented. When: executed. Then: implementation becomes ToBeModified. Given: a null value in a patch. Then: that key is removed. Given: a patch that is not a JSON object (e.g. a string or number). Then: {error: "invalid_data"}. Given: an update call with no patch payload at all. Then: {error: "missing_data"}. Given: a patch that leaves the merged spec with an out-of-enum source, priority, or verification value. Then: {error: "invalid_source"}, {error: "invalid_priority"}, or {error: "invalid_verification"} respectively.</criteria>
  </acceptance>
  <depends>FR-SPECS-0001, FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0030, FR-SPECS-0040, FR-SPECS-0041, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/update.ts, core.ts, write.ts, output.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/delete.ts, write.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/implemented.ts, write.ts</implementationNotes>
</req>

## Lifecycle Subcommands

Each subcommand in this section is a guarded-field setter: it is the ONLY operation permitted to set its target field, and it routes through the same write path as update (FR-SPECS-0013) — add and update themselves strip these fields (FR-SPECS-0040). All are batch-capable (FR-SPECS-0030). Except purge (FR-SPECS-0016), which permanently removes the spec unit and therefore leaves no record to stamp, each sets `changed` (UTC) and `changed_by` (resolved actor, FR-SPECS-0041) on every affected spec. Each returns the shared lifecycle result `SpecLifecycleResult` (FR-SPECS-0050) unless its own unit names a dedicated result shape (delete, purge, implemented). This orienting text is informative; the normative behavior of each op is stated in its own unit below.

### FR-SPECS-0016 purge

<req id="FR-SPECS-0016" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs purge subcommand (permanent removal)</title>
  <statement>specs purge SHALL accept a specs document path and one or more spec ids and SHALL permanently remove each spec unit from the document while recording its id in the document's `purged_ids` registry (FR-SPECS-0002), so that purge erases a spec's content but never frees its identifier for reuse (FR-SPECS-0009). purge SHALL require the `--force` flag (FR-ARCH-0015); without `--force` it SHALL refuse and return `force_required` with an explanation that permanent removal is irreversible. To preserve reference integrity (FR-SPECS-0005), purge SHALL refuse with `referenced_by_others`, whose message is a single human-readable string listing the referencing ids, when any remaining spec references a target id in its `depends_on` or `related`, unless every such referencing spec is also purged in the same batch. A target id that does not exist SHALL be reported in `missing`, not error the batch. The result SHALL be the named type `SpecPurgeResult` = { purged: [spec-id], missing: [spec-id] }. Errors: `force_required`, `referenced_by_others`, `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>Permanent removal is the one destructive spec operation; gating it behind --force and behind a dangling-reference guard keeps the store recoverable and the graph consistent. Soft-delete (FR-SPECS-0014) remains the default; purge is the deliberate exception. Retaining the identifier is what keeps never-reuse enforceable rather than merely advised: once the spec itself is gone there is nothing else left for a duplicate check to collide with, so purge is a complete erase of content and deliberately not of identity.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-07-20</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: purge without --force. Then: {error: "force_required"}. Given: purge --force of an unreferenced id. Then: it is removed and appears in purged. Given: purge --force of an id still referenced by another spec's depends_on. Then: {error: "referenced_by_others"} listing the referrer. Given: purge --force of a referenced id together with its referrer in one batch. Then: both are purged. Given: purge of a non-existent id. Then: it appears in missing, no error. Given: an add reusing the id of a previously purged spec. Then: {error: "duplicate_id"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0005, FR-SPECS-0014</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/purge.ts, core.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/approve.ts, validate.ts, rubric.ts, aggregate.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/deprecate.ts, write.ts, output.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/restore.ts, write.ts, output.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/reopen.ts, write.ts, output.ts</implementationNotes>
</req>

## Analysis and Orientation Subcommands

These subcommands read the document (and, where noted, additional documents) and never mutate it.

### FR-SPECS-0021 validate

<req id="FR-SPECS-0021" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-11"
     depends="FR-SPECS-0001, FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0006, FR-SPECS-0007, FR-SPECS-0012, FR-SPECS-0050"
     implementation="Implemented">
  <title>specs validate subcommand</title>
  <statement>specs validate SHALL accept a specs document path and an optional query filter (FR-SPECS-0012) scoping which specs to check, and SHALL return machine-checkable findings without mutating the document. It SHALL run these checks: schema completeness (all required fields per FR-SPECS-0001 present and non-empty); id format, area registration, and uniqueness (FR-SPECS-0004, FR-SPECS-0005, FR-SPECS-0009); reference integrity (every `depends_on`/`related` target exists); `depends_on` acyclicity (FR-SPECS-0005); criterion id format and uniqueness within the unit (FR-SPECS-0001); location completeness against level — a required `subsystem` or `component` name absent at error severity, a recommended one absent at warning severity (FR-SPECS-0006); criterion EARS conformance — the condition word matches the declared `ears`, no criterion carries more than one condition word, and `system` and `shall` are non-empty (FR-SPECS-0006); acceptance completeness (at least one criterion); measurable metric, threshold, and measurement condition for NFR statements (FR-SPECS-0006); modal-verb usage (shall/should/may); evidence provenance (a spec whose `source` is Sources carries at least one evidence location); quality-characteristic recommendation (an NFR whose area falls outside the nine pre-registered codes, FR-SPECS-0004); duplicate-statement detection; and size limits (FR-SPECS-0007). Each finding SHALL be the named type `SpecFinding` = { id, check, severity, message }, severity one of error | warning | info. Structural violations (missing required field, invalid id format, an area the registry does not hold, duplicate id or duplicate criterion id, unknown reference, dependency cycle, criterion EARS non-conformance, missing acceptance, size limit) SHALL be `error`; phrasing, provenance, and recommendation issues (non-measurable NFR, modal verbs, missing evidence, an NFR area outside the nine, duplicate statement) SHALL be `warning`.

The error checks SHALL be decided from the stored fields alone, so that an error is always a fact about the data. The warning checks SHALL be text heuristics over the stored strings, aimed at the omission an author is most likely to have made: `no quantity` looks for a numeric quantity and a unit or threshold token, `duplicate statement` compares statement text after normalizing whitespace and case, `modal verb` looks for shall, should, or may, and `missing evidence` reports that `source` names existing code while `evidence` is empty. Each SHALL be reported as the omission it detects and SHALL NOT be reported as a judgment of quality or provenance: passing a warning check means the text carries the expected token, not that the requirement is measurable, distinct, or truly derived from the code it cites. Because they cannot be exact, warnings SHALL never block approval (FR-SPECS-0017). The result SHALL be the named type `SpecValidateResult` = { ok: bool, findings: SpecFinding[], error_count: int, warning_count: int }, where `ok` is true when error_count is 0. validate SHALL NOT assess subjective qualities — whether a statement is unambiguous, whether its exclusions are complete, whether a criterion restates its statement, whether a unit reflects the intent behind it, or whether a cited evidence location genuinely supports its unit; those remain the reviewer's responsibility and are out of scope for the command. Errors: `specs_not_found`, `specs_file_corrupted`, `invalid_filter`.</statement>
  <rationale>validate is the integrity surface the user said prose authoring could never guarantee. Classifying structural problems as errors and phrasing as warnings lets approval gate on errors (FR-SPECS-0017) while leaving stylistic refinement advisory. Criterion EARS conformance sits on the error side because it is decidable from the fields themselves — a `while` under an event pattern is wrong with no judgment involved — whereas a missing evidence location is a warning because whether a unit was truly derived from code is something only its author knows. Duplicate statements stay a warning despite being a genuine authoring defect rather than a style one, because two units can legitimately state the same rule at different levels, and only a reader can tell that case from a copy-paste. Explicitly excluding subjective checks, and naming evidence-quality among them, keeps the boundary between the command (mechanical) and the reviewer (judgment) honest.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0021.AC1" ears="event" when="a document holds a spec with no title" system="specs validate" shall="return a schema-completeness finding at error severity and report ok false"/>
    <criteria id="FR-SPECS-0021.AC2" ears="event" when="a criterion declares ears event but carries while" system="specs validate" shall="return a criterion EARS finding at error severity"/>
    <criteria id="FR-SPECS-0021.AC3" ears="event" when="two criteria in one unit share the id FR-AREA-0001.AC1" system="specs validate" shall="return a duplicate criterion id finding at error severity"/>
    <criteria id="FR-SPECS-0021.AC4" ears="event" when="a spec whose source names existing code carries no evidence location" system="specs validate" shall="return a missing-evidence finding at warning severity naming the empty field rather than asserting the requirement is unfounded"/>
    <criteria id="FR-SPECS-0021.AC13" ears="event" when="an NFR statement carries a numeric quantity and a unit token but states no genuine threshold" system="specs validate" shall="return no quantity finding, because the heuristic reports the token and not the measurability"/>
    <criteria id="FR-SPECS-0021.AC5" ears="event" when="a statement is phrased without a modal verb and no other check fails" system="specs validate" shall="return a warning finding and report ok true"/>
    <criteria id="FR-SPECS-0021.AC6" ears="event" when="a document contains a prerequisite cycle" system="specs validate" shall="return a finding at error severity"/>
    <criteria id="FR-SPECS-0021.AC7" ears="event" when="every spec in a document satisfies every check" system="specs validate" shall="report ok true with no findings"/>
    <criteria id="FR-SPECS-0021.AC8" ears="event" when="validate runs with a filter scoping to one area" system="specs validate" shall="check only the specs of that area"/>
    <criteria id="FR-SPECS-0021.AC9" ears="ubiquitous" system="specs validate" shall="leave the document unchanged"/>
    <criteria id="FR-SPECS-0021.AC10" ears="unwanted" if="the named document does not exist" system="specs validate" shall="reject the call with specs_not_found"/>
    <criteria id="FR-SPECS-0021.AC11" ears="unwanted" if="the named document cannot be parsed" system="specs validate" shall="reject the call with specs_file_corrupted"/>
    <criteria id="FR-SPECS-0021.AC12" ears="unwanted" if="the supplied filter names a key the notation does not define" system="specs validate" shall="reject the call with invalid_filter"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/validate.ts, rubric.ts</implementationNotes>
</req>

### FR-SPECS-0022 graph

<req id="FR-SPECS-0022" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs graph subcommand (dependency-graph walking)</title>
  <statement>specs graph SHALL accept a specs document path, an optional target id, and an optional list of additional document paths, and SHALL walk the `depends_on` and `related` graphs. For a target id it SHALL return: `dependencies` (transitive `depends_on` closure of the target), `dependents` (transitive reverse-`depends_on` closure — the impact set of changing the target), and `related` (direct associative links). For the whole document (no target) it SHALL return the full edge list and a `cycles` array reporting every `depends_on` cycle found. When additional document paths are supplied, references that resolve to ids in those documents SHALL be included so the graph spans systems on request (FR-SPECS-0005 keeps single-document writes acyclic; cross-document analysis is read-only here). A reference that cannot be resolved in any provided document SHALL be reported in an `unresolved` list. The result SHALL be the named type `SpecGraphResult` = { dependencies?: [spec-id], dependents?: [spec-id], related?: [spec-id], edges?: SpecEdge[], cycles: SpecEdge[][], unresolved: [spec-id] }, where `SpecEdge` = { from, to, kind } and kind is `depends_on` | `related`. Errors: `target_not_found`, `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>Graph walking — dependencies, dependents (impact), and cycle reporting — is the second integrity capability the user called out. Making cross-document resolution opt-in via extra paths matches the approved dep-graph scope (within-document on writes, cross-document on request) and keeps the common case cheap.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-08-10</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: graph with target C where C depends_on B and B depends_on A. Then: dependencies=[B,A]. Given: graph with target A where B and C depend_on A. Then: dependents include B and C. Given: graph over a whole document with a cycle X→Y→X. Then: cycles contains that cycle. Given: a target whose depends_on references an id only present in an additional document path supplied. Then: it resolves and is not in unresolved. Given: a reference resolvable in no supplied document. Then: it appears in unresolved.</criteria>
  </acceptance>
  <depends>FR-SPECS-0005, FR-SPECS-0050</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/graph.ts, shared/graph.ts</implementationNotes>
</req>

### FR-SPECS-0023 render

<req id="FR-SPECS-0023" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0001, FR-SPECS-0012, FR-SPECS-0042, FR-SPECS-0050"
     implementation="Implemented">
  <title>specs render subcommand</title>
  <statement>specs render SHALL accept a specs document path, an optional query filter (FR-SPECS-0012) scoping which specs to include, and an optional `format` (markdown | text | xml, default markdown), and SHALL return a rendering of the selected specs as a string in the result — it SHALL NOT write any file (storage is JSON only).

The markdown and text renderings SHALL group specs by area, present each spec's human-relevant fields (id, title, statement, level with its subsystem and component, priority, status, acceptance, evidence, depends_on, related) with each criterion read in the order pattern, condition, responder, outcome, and display all timestamps in the caller's local timezone (FR-SPECS-0042).

The xml rendering SHALL reproduce the canonical unit markup so that a document held as JSON can be written back out as a requirements document without hand editing. In it: every single-value field SHALL be an attribute and only prose and structured children SHALL be elements; attributes SHALL be ordered by how often they change, ending with the approval group `status`, `approved_by`, `changed` on one line so that an approval is a one-line difference; `subsystem` and `component` SHALL be emitted as attributes following `level` and SHALL be omitted when empty; `depends_on` SHALL be emitted as the `depends` attribute and `related` as its own attribute; `changed` SHALL be rendered as a UTC calendar date; each criterion SHALL be a self-closing element carrying id, pattern, its condition word, responder, and outcome in that order; and `evidence` SHALL be emitted as a single element joining the stored locations and SHALL be omitted entirely when there are none. The result SHALL be the named type `SpecRenderResult` = { format, content }. Errors: `specs_not_found`, `specs_file_corrupted`, `invalid_filter`, `invalid_format`.</statement>
  <rationale>Because storage is JSON only, render is how humans and the HITL narrative review read specs. Returning a string (not writing a file) keeps JSON the single source of truth and avoids a stale markdown mirror. Local-time display makes timestamps readable while UTC stays canonical. The xml rendering exists because requirements are consumed by people and by version control as documents, not only by this command: without it, a document imported into JSON could never be published back, and the store would be a one-way trip. Ordering attributes by volatility and keeping the approval group on one line is what makes an approval reviewable as a one-line change instead of a reformatted block, and the calendar date is used there because an approval is dated, not timed.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0023.AC1" ears="event" when="render runs with no filter" system="specs render" shall="return markdown grouping every spec that is not Removed by area, with timestamps in local time"/>
    <criteria id="FR-SPECS-0023.AC2" ears="event" when="render runs with format text" system="specs render" shall="return plain text"/>
    <criteria id="FR-SPECS-0023.AC3" ears="event" when="render runs with format xml" system="specs render" shall="return the canonical unit markup with single-value fields as attributes and prose as elements"/>
    <criteria id="FR-SPECS-0023.AC4" ears="event" when="render runs with format xml over a spec that was approved" system="specs render" shall="emit status, approved_by, and changed on one line with changed as a calendar date"/>
    <criteria id="FR-SPECS-0023.AC5" ears="event" when="render runs with format xml over a spec carrying no evidence" system="specs render" shall="omit the evidence element"/>
    <criteria id="FR-SPECS-0023.AC6" ears="event" when="render runs with format xml over a spec with two prerequisites" system="specs render" shall="emit them as a depends attribute listing both"/>
    <criteria id="FR-SPECS-0023.AC7" ears="event" when="render runs with a filter" system="specs render" shall="include only matching specs"/>
    <criteria id="FR-SPECS-0023.AC8" ears="unwanted" if="render is asked for format pdf" system="specs render" shall="reject the call with invalid_format"/>
    <criteria id="FR-SPECS-0023.AC9" ears="ubiquitous" system="specs render" shall="write no file"/>
    <criteria id="FR-SPECS-0023.AC10" ears="ubiquitous" system="each criterion in the markdown and text renderings" shall="read in the order pattern, condition, responder, outcome"/>
    <criteria id="FR-SPECS-0023.AC11" ears="event" when="render runs with format xml over a spec naming a subsystem and a component" system="specs render" shall="emit both as attributes following level"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/render.ts, markup-grammar.ts, output.ts, schemas.ts, src/rosettify/src/frontends/cli.ts</implementationNotes>
</req>

### FR-SPECS-0024 info

<req id="FR-SPECS-0024" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>specs info subcommand (orientation)</title>
  <statement>specs info SHALL accept a specs document path and return an orientation summary of the document without listing full spec bodies. The result SHALL be the named type `SpecInfoResult` = { system, description, areas: SpecAreaInfo[], totals: SpecTotals, next_ids: SpecNextId[], created_at, updated_at }. `SpecAreaInfo` = { code, name, count }. `SpecTotals` = { by_type, by_status, by_implementation, total } (each a map of value to count). `SpecNextId` = { prefix, area, highest, suggested } where `highest` is the highest used NNNN for that prefix+area and `suggested` is the next free id string, so the authoring agent can choose ids in advance without collision (FR-SPECS-0004). Timestamps SHALL be shown in local time (FR-SPECS-0042). Errors: `specs_not_found`, `specs_file_corrupted`.</statement>
  <rationale>info is the orientation the user asked for: it tells an agent which areas exist, how many specs of each kind and status there are, and — critically — the next free id per area, which is what makes caller-provided ids practical.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-08-10</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document with 3 areas and specs in each. When: info runs. Then: areas lists each code, name, and count; totals summarize by type/status/implementation; next_ids gives the suggested next id per prefix+area. Given: an area whose highest FR id is FR-SPECS-0012. Then: its SpecNextId.suggested is FR-SPECS-0013. Given: a missing document. Then: {error: "specs_not_found"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0004, FR-SPECS-0042, FR-SPECS-0050</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/info.ts, output.ts</implementationNotes>
</req>

### FR-SPECS-0025 migrate

<req id="FR-SPECS-0025" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Should" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-11"
     depends="FR-SPECS-0001, FR-SPECS-0002, FR-SPECS-0005, FR-SPECS-0007, FR-SPECS-0023, FR-SPECS-0050"
     implementation="Implemented">
  <title>specs migrate subcommand (import requirement units held as markup)</title>
  <statement>specs migrate SHALL accept one or more source markdown paths holding requirement units as markup, a destination specs document path, and an optional system name (FR-SPECS-0002 — required when the call would create the destination), and SHALL parse every unit, map its fields to the spec unit schema (FR-SPECS-0001), and write the resulting specs document (FR-SPECS-0002). It SHALL read the canonical unit shape only — single-value fields as attributes, prose as elements, and each criterion as a self-closing element carrying its pattern, condition word, responder, and outcome. Field mapping SHALL fold the attribute names onto the JSON field names, including `depends` onto `depends_on`, `ticketId` onto `ticket_id`, and `implementationNotes` onto `implementation_notes`, and SHALL split a multi-location evidence element into one entry per location. A unit that is not in the canonical shape — fields carried as elements rather than attributes, or a criterion written as prose rather than as pattern attributes — SHALL be skipped with a stated reason and SHALL NOT be reconstructed by inference. Areas encountered in ids SHALL be registered in the document's `areas`. After parsing, all integrity checks (FR-SPECS-0005) and size limits (FR-SPECS-0007) SHALL run over the assembled document; migrate SHALL report every parse issue and integrity finding rather than silently dropping data. The result SHALL be the named type `SpecMigrateResult` = { migrated: int, sources: [path], warnings: SpecFinding[], skipped: [{ source, reason }] }. Errors: `source_not_found`, `migrate_parse_error` (a source is unparseable at the file level), `specs_file_corrupted`, `missing_system`, `system_mismatch`.</statement>
  <rationale>migrate is the bridge that moves requirement units held as markup into the JSON store, and the inverse of the xml rendering (FR-SPECS-0023) — together they make the store a round trip rather than a one-way import. It reads only the canonical shape because guessing at an older shape is how a requirement acquires content nobody wrote: a criterion recovered from prose would need its responder invented, and an invented responder in an approved requirement is worse than a skipped unit a human must carry across by hand. Reporting each skipped unit with its reason, rather than dropping it, is what keeps that hand-off honest.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0025.AC1" ears="event" when="a source holds three units in the canonical shape" system="specs migrate" shall="report three migrated and write all three into the destination with their areas registered"/>
    <criteria id="FR-SPECS-0025.AC2" ears="event" when="a unit carries a depends attribute listing two ids" system="specs migrate" shall="store both as prerequisites"/>
    <criteria id="FR-SPECS-0025.AC3" ears="event" when="a unit carries an evidence element naming two source locations" system="specs migrate" shall="store one evidence entry per location"/>
    <criteria id="FR-SPECS-0025.AC4" ears="event" when="a unit carries its fields as elements rather than attributes" system="specs migrate" shall="skip that unit and report the reason"/>
    <criteria id="FR-SPECS-0025.AC5" ears="event" when="a unit carries a criterion written as prose" system="specs migrate" shall="skip that unit and report the reason rather than infer a pattern or a responder"/>
    <criteria id="FR-SPECS-0025.AC6" ears="unwanted" if="a source path does not exist" system="specs migrate" shall="reject the call with source_not_found"/>
    <criteria id="FR-SPECS-0025.AC7" ears="unwanted" if="a source file cannot be parsed at the file level" system="specs migrate" shall="reject the call with migrate_parse_error"/>
    <criteria id="FR-SPECS-0025.AC8" ears="unwanted" if="an import would carry the document past the maximum number of specs" system="specs migrate" shall="reject the call with size_limit_exceeded"/>
    <criteria id="FR-SPECS-0025.AC9" ears="event" when="a unit carries a tracker key and implementation notes under their markup names" system="specs migrate" shall="store them under the corresponding spec fields"/>
    <criteria id="FR-SPECS-0025.AC10" ears="event" when="one source holds both canonical and non-canonical units" system="specs migrate" shall="import the canonical ones, count only those as migrated, and list each skipped unit with its reason"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/migrate.ts, req-parser.ts, markup-grammar.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/index.ts, write.ts, aggregate.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/core.ts, write.ts, add.ts, update.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/shared/actor.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/shared/time.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/help-content.ts, errors.ts</implementationNotes>
</req>

## Output Shapes

### FR-SPECS-0050 Named Result Types

<req id="FR-SPECS-0050" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0008, FR-SPECS-0060, FR-SPECS-0070"
     implementation="Implemented">
  <title>All results are named, recursively-defined types with shared write and lifecycle shapes</title>
  <statement>Every subcommand result SHALL be a named exported type, and per the recursive naming rule (FR-HELP-0002) every nested object and every array `items` shape SHALL itself be a named type referenced by name — no anonymous shape at any depth. Structurally identical shapes SHALL be defined once and reused (SRP+DRY).

The write subcommands add (FR-SPECS-0010) and update (FR-SPECS-0013) SHALL return the shared type `SpecWriteResult` = { document: SpecDocumentSummary, affected: SpecRef[] }, where `SpecDocumentSummary` = { system, total, previous_version } gives a compact post-write snapshot (with `previous_version` the backup path captured at this write, or null on first write, FR-SPECS-0070), and `SpecRef` = { id, status } lists the specs the write created or changed. The approval-lifecycle ops (approve, deprecate, restore, reopen) SHALL return the shared type `SpecLifecycleResult` = { updated: SpecRef[] }.

The remaining named types are: `Spec` and its member `AcceptanceCriterion`; `AreaEntry`; `SpecFieldGuide` (FR-SPECS-0008); `SpecGetResult`; `SpecQueryResult`; `SpecDeleteResult`; `SpecPurgeResult`; `SpecImplementedResult`; `SpecValidateResult` with member `SpecFinding`; `SpecGraphResult` with member `SpecEdge`; `SpecRenderResult`; `SpecInfoResult` with members `SpecAreaInfo`, `SpecTotals`, `SpecNextId`; and `SpecMigrateResult`. Each type SHALL be sourced from the code's type declaration, never a hand-authored duplicate, and SHALL be present in the help schema dictionary (FR-SPECS-0060).</statement>
  <rationale>Named, recursively-defined types let an AI caller resolve every field of every result without meeting an anonymous shape, matching the plan command's schema discipline. One shared SpecWriteResult and one shared SpecLifecycleResult avoid a proliferation of structurally identical per-subcommand types. Surfacing previous_version in the write result makes the backup link self-discoverable. The field guide is named here rather than left as an inline shape in help because the recursive naming rule admits no exception for content the caller reads.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0050.AC1" ears="event" when="the results of add and update are compared" system="the specs command" shall="return the one shared write result type from both"/>
    <criteria id="FR-SPECS-0050.AC2" ears="event" when="the results of approve, deprecate, restore, and reopen are compared" system="the specs command" shall="return the one shared lifecycle result type from all four"/>
    <criteria id="FR-SPECS-0050.AC3" ears="ubiquitous" system="every nested object and array member of every result, at any depth" shall="be a named type present in the help schema dictionary"/>
    <criteria id="FR-SPECS-0050.AC4" ears="event" when="the first write to a document completes" system="the write result" shall="report no previous version, and report the backup path on every later write"/>
    <criteria id="FR-SPECS-0050.AC5" ears="ubiquitous" system="the criterion type in the schema dictionary" shall="carry the pattern, condition-word, responder, and outcome fields of the stored criterion"/>
    <criteria id="FR-SPECS-0050.AC6" ears="ubiquitous" system="the specs command" shall="emit no result shape that lacks a named type in the schema dictionary"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/output.ts, schemas.ts</implementationNotes>
</req>

## Help Content

### FR-SPECS-0060 Specs Help Content

<req id="FR-SPECS-0060" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0007, FR-SPECS-0008, FR-SPECS-0012, FR-SPECS-0043, FR-SPECS-0050, FR-SPECS-0061"
     implementation="Implemented">
  <title>Help content registered for the specs command</title>
  <statement>The specs command SHALL register help content that the help system (FR-HELP-0002) returns when queried. The content SHALL include:

- specs_file convention (one document per system; the documented path form)
- terms: `system` — a solution with its own boundaries, serving one business reason, which may contain many microservices, backends, and frontends, and whose requirements one specs document holds; `subsystem` — a named division inside a system, carrying its own contracts, delivered as part of the system; `component` — a part inside a system or subsystem; `area` — a cross-cutting concern of a system, spanning subsystems and components rather than sitting inside one, carried as the second segment of every id; `level` — the depth at which a requirement binds, independent of area; and a criterion's `system` — whatever responds, an actor or a specific system, subsystem, or component. The section SHALL state that a large solution is decomposed into several systems, one per business reason.
- concepts: the spec unit and its fields; areas and area-scoped ids, including the nine quality-characteristic codes pre-registered and recommended for non-functional ids; the statement as the governing rule and the criteria as its samples; the five criterion patterns, the condition word each one takes, and the responder-and-outcome pair every criterion carries; criterion sub-ids; evidence and when a unit needs it; the status lifecycle (Draft, Approved, Modified, Deprecated, Removed) and every transition and which op performs it, with Draft meaning complete and ready for review rather than unfinished; depends_on (directional, acyclic) versus related (associative, may cycle); guarded fields and why add/update strip them; the validate-then-approve flow
- field_guide: the per-field guidance of FR-SPECS-0008
- subcommands: one entry per registered subcommand (add, get, query, update, delete, purge, implemented, approve, deprecate, restore, reopen, validate, graph, render, info, migrate), each with name, brief, usage, args, description, a statement of which inputs are required (conditional requirements stated), and an examples block with both a tip-form example (bracketed self-explanatory hints) and a real-form example (concrete JSON producing a working invocation)
- schemas: the named-type dictionary of FR-SPECS-0050, keyed by type name, every nested/array shape named (FR-HELP-0002), each field carrying its guidance as its description (FR-SPECS-0008)
- limits: the constants of FR-SPECS-0007
- query_notation: the key:value filter grammar (FR-SPECS-0012)
- notes: the caller-facing behaviors defined in FR-SPECS-0061
- next_steps_for_ai: directive guidance to orient with info, author with add (ids chosen from info), validate, fix errors, then approve

All emitted help content SHALL obey FR-ARCH-0016 as scoped by FR-SPECS-0043: no requirement identifier, ticket id, internal path, internal module name, or authoring rationale; every note reads as standalone directive guidance. Help SHALL teach the model in the command's own terms and SHALL NOT direct the caller to any external template or document to complete a unit.</statement>
  <rationale>AI agents need one self-describing payload that teaches the spec model, the lifecycle, the guarded-field rules, the query grammar, and correct invocations without trial and error, and without leaking the command's own authoring bookkeeping. Making the payload self-sufficient is the point: a caller who has to go read a template elsewhere to learn what a field wants is a caller who will guess instead.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0060.AC1" ears="event" when="help is requested for the specs command" system="the help system" shall="return the specs_file convention, terms, concepts, field_guide, one entry per registered subcommand, the schema dictionary, limits, the query notation, notes, and next steps"/>
    <criteria id="FR-SPECS-0060.AC7" ears="ubiquitous" system="the terms section" shall="define system, subsystem, component, area, level, and a criterion's responder, and state that a large solution is decomposed into several systems"/>
    <criteria id="FR-SPECS-0060.AC2" ears="ubiquitous" system="each subcommand entry" shall="state which inputs are required and carry both a tip-form and a real-form example"/>
    <criteria id="FR-SPECS-0060.AC3" ears="ubiquitous" system="the concepts section" shall="name the five criterion patterns with the condition word each one takes"/>
    <criteria id="FR-SPECS-0060.AC4" ears="ubiquitous" system="the concepts section" shall="name the nine quality-characteristic codes recommended for non-functional ids and state that any registered area is accepted"/>
    <criteria id="FR-SPECS-0060.AC5" ears="event" when="the emitted payload is scanned" system="the payload" shall="contain no requirement identifier, ticket id, internal path, or authoring rationale"/>
    <criteria id="FR-SPECS-0060.AC6" ears="ubiquitous" system="the specs command" shall="emit no help section that directs the caller to an external template to complete a unit"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/help-content.ts, schemas.ts, field-guide.ts</implementationNotes>
</req>

### FR-SPECS-0061 Specs Help Notes Content

<req id="FR-SPECS-0061" type="FR" level="System" subsystem="specs"
     ticketId="CTORNDGAIN-1333" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-08-10"
     depends="FR-SPECS-0060"
     implementation="Implemented">
  <title>Notes array content for specs help</title>
  <statement>The specs command's help content SHALL include a `notes` string array documenting the behaviors that affect the caller upfront. The notes SHALL include at minimum:

- JSON-bearing arguments are passed as inline JSON strings, not file paths
- ids are caller-provided; run info to get the suggested next id per area before add
- a non-functional id should use one of the nine recommended quality-characteristic codes, which need no registration; any other registered area is still accepted and only reported as a recommendation not followed
- the statement carries the rule, the cases it covers, and the cases it excludes; it is not written as a one-trigger sentence and does not repeat the criteria
- each criterion names one pattern, carries only that pattern's condition word, and always names a responder and an outcome
- criterion sub-ids are assigned automatically when omitted and are the stable target a test claims
- evidence lists one path and line range per source location and is expected on a unit derived from existing code
- render returns markup as well as markdown, so a document held here can be published back out
- new specs always enter as Draft/NotStarted; supplied status/approved_by/implementation on add or update are dropped
- guarded fields (status, approved_by, implementation, changed_by) change only through the lifecycle ops (approve, deprecate, restore, reopen, delete, implemented) and the actor resolver
- editing an Approved spec's statement or acceptance moves it to Modified and clears approval; editing an Implemented spec's contract sets it to ToBeModified
- approve runs validation first and refuses on error-level findings; fix errors, then approve
- delete is a reversible soft-delete (status Removed, restore to undo); purge permanently removes the spec and needs --force and no remaining references, but keeps its id taken forever, so no later spec can reuse it
- writes are all-or-nothing: a batch that has any invalid item writes nothing and names the failing item
- query grammar: key:value terms, space = AND, comma = OR within a field, - prefix = NOT, bare term = text over title/statement; Removed excluded unless include_removed:true
- timestamps are stored in UTC and shown in local time by render and info
- migrate imports requirement units already written in the shape render emits; a unit in any other shape is skipped and reported
- error responses are a single human-readable string that aggregates every problem at once (missing fields, limits, failing items), so a batch or approval failure reports all issues in one message rather than one at a time

Every note SHALL be standalone directive guidance and SHALL NOT contain requirement identifiers, ticket ids, internal paths, internal module names, or authoring rationale (FR-ARCH-0016, FR-SPECS-0043).</statement>
  <rationale>Splitting the notes out makes them independently testable and is the home for the surprising, caller-affecting behavior an AI must know: guarded fields, the Draft-first/validate-then-approve flow, soft-delete versus purge, all-or-nothing batches, the query grammar, and UTC/local time. The notes about the statement, the criteria, and the reserved non-functional codes are here rather than left to the field guide because they are the rules a caller most often gets wrong on a first attempt, and a note is read before a field is filled.</rationale>
  <acceptance>
    <criteria id="FR-SPECS-0061.AC1" ears="event" when="help is requested for the specs command" system="the notes array" shall="carry every behavior this unit lists"/>
    <criteria id="FR-SPECS-0061.AC2" ears="ubiquitous" system="every note" shall="read as standalone directive guidance carrying no requirement identifier, ticket id, internal path, or authoring rationale"/>
    <criteria id="FR-SPECS-0061.AC3" ears="event" when="a caller reads the notes before writing a first unit" system="the notes array" shall="state that the statement carries the rule and its exclusions and that each criterion names one pattern, a responder, and an outcome"/>
  </acceptance>
  <implementationNotes>src/rosettify/src/commands/specs/help-content.ts</implementationNotes>
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
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/shared/doc-io.ts, commands/specs/write.ts</implementationNotes>
</req>

### FR-SPECS-0071 Document Path and Read Resilience

<req id="FR-SPECS-0071" type="FR" level="System" ticketId="CTORNDGAIN-1333" classification="technical">
  <title>Caller-supplied path with resilient reads</title>
  <statement>The specs document path SHALL be supplied by the caller on every invocation. The recommended convention is `docs/REQUIREMENTS/<system>/specs.json`, documented in help but not enforced. Parent directories SHALL be created on first write (FR-SPECS-0002). On read, if the document file is missing but at least one backup exists, the command SHALL retry — 100 milliseconds per attempt, up to 50 attempts, consistent with the shared read-resilience mechanism (FR-SHRD-0009) — before concluding the document is absent; a truly missing document SHALL return `specs_not_found`, and a file that exists but does not parse as valid JSON conforming to the document schema SHALL return `specs_file_corrupted`.</statement>
  <rationale>A caller-supplied path mirrors the plan command's simple addressing. Retrying when only a backup is present tolerates the brief window during an atomic rename, preventing spurious not-found errors under concurrency; reusing the shared read-resilience count/interval avoids a second, divergent retry policy.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-08-10</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a nested path whose dirs do not exist. When: the first add runs. Then: parent dirs are created and the document is written. Given: the file is briefly absent mid-rename but a backup exists. When: read. Then: the read retries and succeeds. Given: a genuinely missing document. Then: {error: "specs_not_found"}. Given: a corrupted JSON file. Then: {error: "specs_file_corrupted"}.</criteria>
  </acceptance>
  <depends>FR-SPECS-0002, FR-SPECS-0070</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify/src/commands/specs/help-content.ts</implementationNotes>
</req>

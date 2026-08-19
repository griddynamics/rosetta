# plugin-generator — FR: Profiles

Functional requirements for build profiles: model-vocabulary overrides, destination and manifest
suffixing, and profile-scoped filename directives.

Area abbreviation: `PROF`. All units use the canonical `<req>` schema (attributes + EARS criteria
with `.AC#` sub-ids). A "target" is one of the seven `spec.name` values: `core-claude`,
`core-cursor`, `core-copilot`, `core-codex`, `core-antigravity`, `core-cursor-standalone`,
`core-copilot-standalone`.

## Profile resolution and validation

<req id="FR-PROF-0001" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-CLI-0032, FR-CLI-0033, DATA-CFG-0006"
     implementation="Implemented">
  <title>Profile resolution and fail-fast validation</title>
  <statement>When a profile is named, the generator shall resolve it to a single JSON file at
  `<profileSource>/<name>.json` and shall fully validate its structure before writing any output.
  Validation covers: the file exists and parses as JSON; every outer key is one of the seven target
  identities; no block is declared for the target that has no model vocabulary; and the inner keys of
  the Claude block fall within the closed family set; and no top-level field other than the four the
  descriptor defines is present. Any violation aborts the run with a non-zero
  status and no output written. Validation does not check whether an inner model token matches
  anything in the instruction source — that omission is deliberate and handled at effective-map
  resolution.</statement>
  <rationale>Failing before any file is written protects standard output from a malformed profile
  (G3). Descriptor resolution and validation run at CLI pre-flight, before the pipeline executes, so
  this is a distinct responsibility from the processor frame-contract validation in FR-ARCH-0034 (that
  unit does not cover CLI-level descriptor pre-flight loading); FR-PROF-0001 is the sole owner of the
  abort-on-bad-descriptor outcome, which FR-CLI-0032 defers to. The Claude inner-key check is the
  trap: `claude-opus-4-8` looks correct but Claude does `lower.includes('opus')` and then reads the
  map at key `opus`, so an unchecked inner key silently drops Opus candidates instead of downgrading
  them (V3).</rationale>
  <evidence>src/rosettify-plugins/src/spec/model-maps.ts:12-16 (CLAUDE_CODE_MAP keyed opus/sonnet/haiku);
  src/rosettify-plugins/src/spec/model-maps.ts:18-30 (normalizeClaude reads the map at the family key, so a full-id key never matches)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0001.AC1" ears="event" when="`--profile lightweight` is supplied" system="the generator" shall="resolve the profile to `<profileSource>/lightweight.json`"/>
    <criteria id="FR-PROF-0001.AC2" ears="unwanted" if="the resolved profile file does not exist" system="the generator" shall="abort with a non-zero status before writing any output"/>
    <criteria id="FR-PROF-0001.AC3" ears="unwanted" if="the profile file is not parseable as JSON" system="the generator" shall="abort with a non-zero status before writing any output"/>
    <criteria id="FR-PROF-0001.AC4" ears="unwanted" if="an outer key is not one of the seven target identities (e.g. `cursor`, `core-cursr`, `core-windsurf`)" system="the generator" shall="abort before any output, naming the offending key and listing the seven accepted names"/>
    <criteria id="FR-PROF-0001.AC5" ears="unwanted" if="the profile declares a `core-antigravity` block" system="the generator" shall="abort before any output, reporting that that target has no model vocabulary a block could affect"/>
    <criteria id="FR-PROF-0001.AC6" ears="unwanted" if="a `core-claude` inner key falls outside {opus, sonnet, haiku} (e.g. `claude-opus-4-8`)" system="the generator" shall="abort before any output, naming the key and listing the accepted set"/>
    <criteria id="FR-PROF-0001.AC7" ears="unwanted" if="the profile descriptor carries a top-level field other than `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix`, or `modelOverrides`" system="the generator" shall="abort before any output, naming the unrecognized field"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/profiles.ts (loadProfile, ProfileValidationError; V1 outer-key, V2 core-antigravity, V3 claude inner-key, V7 unknown-field, missing-file and unparseable-JSON checks); src/rosettify-plugins/src/generate.ts (pre-flight load before buildVfs; an invalid profile exits non-zero with no output written). Tests: tests/unit/spec/profiles.test.ts.</implementationNotes>
  <notes></notes>
</req>

## Effective model vocabulary resolution

<req id="FR-PROF-0010" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="DATA-CFG-0006, FR-ARCH-0059"
     implementation="Implemented">
  <title>Effective model map resolution per target</title>
  <statement>For each of the seven targets the generator shall resolve one effective model map. A
  per-target block in the profile replaces that target's built-in maps in full and is treated as
  exhaustive; a target with no block uses its built-in maps unchanged. The inner key-space of each
  block mirrors that target's built-in map keying. This unit governs which map is in force, not how a
  candidate is selected from it and not how an absent candidate is handled downstream.</statement>
  <rationale>`PluginSpec.modelVocabulary` is the single live carrier of a target's effective map, read
  nowhere; profiles make it the live carrier of the effective map. Standalones inherit the parent's
  block because their preserved files derive from the parent target (V4). A dead inner entry is
  ignored silently so a profile stays valid across source drift (V5).</rationale>
  <evidence>src/rosettify-plugins/src/types.ts:94 (PluginSpec.modelVocabulary populated on every spec, read nowhere);
  src/rosettify-plugins/src/spec/model-maps.ts:450-487 (per-target vocabulary constants, one per IDE, each carrying a populated map)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0010.AC1" ears="optional" where="a target declares a model-overrides block" system="the generator" shall="use that block as the target's entire effective map, consulting none of that target's built-in maps"/>
    <criteria id="FR-PROF-0010.AC2" ears="optional" where="a target declares no model-overrides block" system="the generator" shall="use that target's built-in maps unchanged as its effective map"/>
    <criteria id="FR-PROF-0010.AC3" ears="state" while="a standalone target declares no block of its own" system="the generator" shall="use its parent target's block (core-cursor-standalone from core-cursor, core-copilot-standalone from core-copilot)"/>
    <criteria id="FR-PROF-0010.AC4" ears="optional" where="a standalone target declares its own block" system="the generator" shall="use that block, overriding the inherited parent block"/>
    <criteria id="FR-PROF-0010.AC5" ears="unwanted" if="an inner entry's key matches no model token anywhere in the instruction source" system="the generator" shall="ignore that entry silently, without warning or failure"/>
    <criteria id="FR-PROF-0010.AC6" ears="ubiquitous" system="the generator" shall="key the Claude block by the family set {opus, sonnet, haiku}, the Cursor and Copilot blocks by exact source model tokens, and the Codex block by exact `gpt-` source tokens"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/profiles.ts (resolveEffectiveVocabulary: a block replaces the built-in map in full and exhaustively, V4 standalone inherits parent, V5 dead-entry silence); src/rosettify-plugins/src/spec/targets.ts (buildAllSpecs assigns spec.modelVocabulary per target); src/rosettify-plugins/src/spec/model-maps.ts (per-target built-in vocabulary constants populated). Tests: tests/unit/spec/profiles.test.ts.</implementationNotes>
  <notes></notes>
</req>

## Exhaustive candidate skipping

<req id="FR-PROF-0011" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-ARCH-0059, FR-COPY-0020, FR-COPY-0021, FR-COPY-0022"
     implementation="Implemented">
  <title>Exhaustive candidate skipping under the effective map</title>
  <statement>The per-IDE candidate-selection strategy is unchanged: Claude scans candidates for an
  opus/sonnet/haiku family match, Cursor and Copilot take the first candidate token, and Codex scans
  for the first `gpt-` prefixed candidate. Only the map consulted after a candidate is selected
  changes under a profile. A selected candidate whose token is absent from the effective map is
  ignored as if it did not exist and the scan continues to the next candidate. This drop-the-line rule
  governs the profiled path only — a target with an active per-target override block: when no
  candidate survives mapping under that block, the frontmatter `model:` line is dropped. A target with
  no override block (the unprofiled path) retains its built-in no-survivor behavior as specified by
  FR-COPY-0020, FR-COPY-0021, and FR-COPY-0022 — Claude `inherit`, Cursor and Copilot raw
  pass-through of the unmapped token, and Codex model fields stripped. This scoping is what keeps
  FR-PROF-0040's no-profile regression guard true.</statement>
  <rationale>Exhaustive replacement (no override-then-fallback) makes an absent token a true miss, so
  the scan must continue rather than pass the raw token through. Today Cursor/Copilot pass unmapped
  tokens through as-is and Claude/Codex return null; this unifies the miss to "skip and
  continue".</rationale>
  <evidence>src/rosettify-plugins/src/spec/model-maps.ts:18-30 (Claude scans for a claude-compatible token);
  src/rosettify-plugins/src/spec/model-maps.ts:84-88 (Cursor first token); :139-143 (Copilot first token);
  src/rosettify-plugins/src/spec/model-maps.ts:155-169 (Codex scans for a gpt- token)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0011.AC1" ears="ubiquitous" system="the generator" shall="retain each IDE's existing selection strategy — Claude scanning for opus/sonnet/haiku, Cursor and Copilot taking the first candidate, Codex scanning for the first `gpt-` candidate"/>
    <criteria id="FR-PROF-0011.AC2" ears="event" when="a selected candidate token is absent from the effective map" system="the generator" shall="ignore it and continue the scan to the next candidate"/>
    <criteria id="FR-PROF-0011.AC3" ears="event" when="a selected candidate token is present in the effective map" system="the generator" shall="emit its effective IDE-specific value"/>
    <criteria id="FR-PROF-0011.AC4" ears="unwanted" if="no candidate survives mapping for a frontmatter `model:` field under an active per-target override block" system="the generator" shall="drop the `model:` line entirely"/>
    <criteria id="FR-PROF-0011.AC5" ears="optional" where="a target has no active per-target override block" system="the generator" shall="retain that target's built-in no-survivor behavior per FR-COPY-0020, FR-COPY-0021, and FR-COPY-0022 rather than dropping the line"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/model-maps.ts (normalize{Claude,Cursor,Copilot,Codex} take map+exhaustive; skip-and-continue on an absent candidate; MODEL_DROP on the profiled no-survivor path); src/rosettify-plugins/src/types.ts (MODEL_DROP, ModelVocabulary.exhaustive); src/rosettify-plugins/src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts (3-state value|preserve|MODEL_DROP). Tests: tests/unit/spec/model-maps.test.ts, tests/unit/file-processors/file-normalize-*-models.test.ts.</implementationNotes>
  <notes></notes>
</req>

## Destination suffixing

<req id="FR-PROF-0020" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="DATA-CFG-0006"
     implementation="Implemented">
  <title>Destination suffixing on spec.destination only</title>
  <statement>A profile's destination suffix shall apply to `spec.destination` only and never to
  `spec.name`. All seven targets always build under a profile, and each target's output lands in the
  same output directory as an unsuffixed run, in a folder named `core-*` with the suffix appended.
  Manifest identity strings are out of scope of this unit.</statement>
  <rationale>The target-only directive token compares against `spec.name`, so suffixing `spec.name`
  would silently stop every `<spec.name>-only` directive from matching under the profile. The stable
  target identity must be left untouched and only the output folder renamed.</rationale>
  <evidence>src/rosettify-plugins/src/file-processors/file-apply-overrides.ts:20 (target token compared against ctx.spec.name);
  src/rosettify-plugins/src/spec/targets.ts:158-159 (name and destination are separate literals per target)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0020.AC1" ears="event" when="a profile sets a destination suffix of `-light`" system="the generator" shall="write each target to a folder named `core-<target>-light` under the output directory"/>
    <criteria id="FR-PROF-0020.AC2" ears="event" when="a destination suffix is applied" system="the generator" shall="leave `spec.name` unchanged (e.g. `core-claude`)"/>
    <criteria id="FR-PROF-0020.AC3" ears="event" when="a profile is active" system="the generator" shall="build all seven targets"/>
    <criteria id="FR-PROF-0020.AC4" ears="event" when="a destination suffix is applied" system="the generator" shall="write the suffixed outputs into the same output directory as an unsuffixed run, not a separate tree"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/targets.ts (destination = 'core-<x>' + profile.destinationSuffix; spec.name literals untouched; all seven targets build into one output dir). Tests: tests/e2e/profile.e2e.test.ts.</implementationNotes>
  <notes></notes>
</req>

## Manifest name and description suffixing

<req id="FR-PROF-0021" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="DATA-CFG-0006"
     implementation="Implemented">
  <title>Global manifest name and description suffixing</title>
  <statement>A profile's plugin-name suffix and plugin-description suffix shall be appended to the
  preserved manifest's existing name and description values respectively. Both suffixes are global
  across all seven targets, not keyed per target. The preserved manifest is otherwise
  unchanged.</statement>
  <rationale>The IDE marketplace treats the profiled plugin as a distinct plugin, so its manifest
  identity must differ from the base plugin's. Appending rather than replacing keeps the base
  identity recognizable.</rationale>
  <acceptance>
    <criteria id="FR-PROF-0021.AC1" ears="event" when="a profile sets a plugin-name suffix of `-light`" system="the generator" shall="append it to each target manifest's existing name value"/>
    <criteria id="FR-PROF-0021.AC2" ears="event" when="a profile sets a plugin-description suffix of ` (lightweight)`" system="the generator" shall="append it to each target manifest's existing description value"/>
    <criteria id="FR-PROF-0021.AC3" ears="ubiquitous" system="the generator" shall="apply both manifest suffixes identically across all seven targets rather than per target"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-copy.ts (pluginCopy manifestSuffix {name,description} appended to plugin.json; standalone manifest name suffixed); src/rosettify-plugins/src/spec/targets.ts (manifestSuffix threaded to every pluginCopy call, global across targets). Tests: tests/unit/plugin-processors/plugin-copy.test.ts.</implementationNotes>
  <notes></notes>
</req>

## Profile-scoped filename directive

<req id="FR-PROF-0030" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-ARCH-0020, FR-ARCH-0021"
     implementation="Implemented">
  <title>ProfileOnlyToken filename directive</title>
  <statement>The FilenameDirective grammar shall recognize a namespaced token kind
  `profile-<name>-only`, distinct from the target-only token so the two cannot be confused. The
  grammar is tilde-separated with an opening and a closing tilde fence; an empty trailing token is
  inert. A file carrying `profile-<name>-only` is included only while that profile is active. Profile
  filtering occurs in the same pipeline step as target filtering, before overwrite truncation; the
  `overwrite` token does not bypass profile exclusion.</statement>
  <rationale>A bare `<name>-only` token would be read by `matchesTarget` as a target-only token — it
  excludes on any `-only` token whose prefix differs from `spec.name` — and drop the file for all
  targets, so the profile selector must be namespaced. Ordering profile filtering before overwrite
  truncation mirrors the existing target-then-overwrite order and stops an inactive-profile
  `overwrite` file from superseding the base document.</rationale>
  <evidence>src/rosettify-plugins/src/vfs/directives.ts:38-44 (matchesTarget excludes on any non-matching -only token);
  src/rosettify-plugins/src/file-processors/file-apply-overrides.ts:24,26-32 (target filter precedes overwrite truncation);
  src/rosettify-plugins/tests/unit/vfs/directives.test.ts:72-77 (overwrite does not bypass target exclusion)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0030.AC1" ears="state" while="profile `lightweight` is active" system="the generator" shall="include `coding-flow~profile-lightweight-only~overwrite~.md` at VFS path `workflows/coding-flow.md`"/>
    <criteria id="FR-PROF-0030.AC2" ears="unwanted" if="profile `lightweight` is not active" system="the generator" shall="exclude every file carrying `profile-lightweight-only` from all targets"/>
    <criteria id="FR-PROF-0030.AC3" ears="ubiquitous" system="the generator" shall="treat `profile-<name>-only` as a token kind distinct from a target-only token"/>
    <criteria id="FR-PROF-0030.AC4" ears="event" when="a file carries both `profile-<name>-only` and `overwrite` and its profile is inactive" system="the generator" shall="exclude the file before overwrite truncation, so it does not supersede the base document"/>
    <criteria id="FR-PROF-0030.AC5" ears="ubiquitous" system="the generator" shall="treat the empty trailing token produced by the closing tilde fence as inert"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/vfs/directives.ts (matchesProfile; matchesTarget ignores profile-*-only tokens); src/rosettify-plugins/src/file-processors/file-apply-overrides.ts (profile and target filters applied together before overwrite truncation); src/rosettify-plugins/src/types.ts (TargetContext.activeProfile); src/rosettify-plugins/src/plugin-processors/plugin-process-spec-entries.ts (activeProfile threaded). Tests: tests/unit/vfs/directives.test.ts, tests/unit/file-processors/file-apply-overrides.test.ts.</implementationNotes>
  <notes></notes>
</req>

## No-profile run unaffected

<req id="FR-PROF-0040" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-CLI-0032"
     implementation="Implemented">
  <title>No-profile run unaffected by the profile mechanism</title>
  <statement>A run invoked without a profile shall be unaffected by the profile mechanism: no
  destination suffix applied, no manifest suffix appended, no profile-directive token matched, and the
  built-in model maps in force for every target. The always-on `subagent_required_model` filtering is
  a separate concern outside this unit and still applies.</statement>
  <rationale>Profiles are strictly additive. A no-profile invocation is the default path and must not
  regress through any profile-specific behavior. Parity is scoped to the profile mechanism only, since
  the separate always-on filtering (FR-COPY-0083) deliberately changes shipped content.</rationale>
  <acceptance>
    <criteria id="FR-PROF-0040.AC1" ears="state" while="no profile is supplied" system="the generator" shall="write every target to its unsuffixed `core-<target>` destination"/>
    <criteria id="FR-PROF-0040.AC2" ears="state" while="no profile is supplied" system="the generator" shall="leave every target manifest's name and description unchanged"/>
    <criteria id="FR-PROF-0040.AC3" ears="state" while="no profile is supplied" system="the generator" shall="exclude every `profile-<name>-only` file from all targets"/>
    <criteria id="FR-PROF-0040.AC4" ears="state" while="no profile is supplied" system="the generator" shall="use each target's built-in model maps"/>
  </acceptance>
  <implementationNotes>Implemented: the no-profile path is preserved across src/rosettify-plugins/src/{cli.ts,generate.ts,spec/targets.ts} (activeProfile null, no suffixes, built-in maps, every profile-*-only file excluded). Verified: no-profile dry run 2229 paths / vfsSize 320, identical to the pre-feature baseline. Guarded by tests/e2e/parity.e2e.test.ts.</implementationNotes>
  <notes>Depends indirectly on FR-COPY-0083, which is out of scope here but shares the effective-map
  concern.</notes>
</req>

# plugin-generator — FR: Profiles

Functional requirements for build profiles: model-vocabulary overrides, the boundary that keeps
naming and manifest identity out of a profile, and profile-scoped filename directives.

Area abbreviation: `PROF`. All units use the canonical `<req>` schema (attributes + EARS criteria
with `.AC#` sub-ids). A "target" is one `spec.name` value — `claude`, `cursor`, `copilot`, `codex`,
`antigravity`, `cursor-standalone`, `copilot-standalone` — naming an IDE delivery mode and nothing
about which plugin set is being built (DATA-CFG-0003, FR-SET-0040).

## Profile resolution and validation

<req id="FR-PROF-0001" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-CLI-0032, FR-CLI-0033, DATA-CFG-0006"
     implementation="Implemented">
  <title>Profile resolution and fail-fast validation</title>
  <statement>When a profile is named, the generator shall resolve it to a single JSON file at
  `<profileSource>/<name>.json` and shall fully validate its structure before writing any output.
  Validation covers: the file exists and parses as JSON; every outer key is one of the IDE target
  identities; no block is declared for the target that has no model vocabulary; and the inner keys of
  the Claude block fall within the closed family set; and no top-level field other than
  `modelOverrides` is present. Any violation aborts the run with a non-zero
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
  <evidence>src/rosettify-plugins/src/spec/model-maps.ts CLAUDE_CODE_MAP (family keys opus/sonnet/haiku cover every claude token);
  src/rosettify-plugins/src/spec/model-maps.ts claudeLookup and normalizeClaude (a profile block replaces the vocabulary in full, so only family keys guarantee that every claude token still resolves; a block keyed by full ids would leave the rest unmapped)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0001.AC1" ears="event" when="a variant names profile `lightweight`" system="the generator" shall="resolve the profile to `<profileSource>/lightweight.json`"/>
    <criteria id="FR-PROF-0001.AC2" ears="unwanted" if="the resolved profile file does not exist" system="the generator" shall="abort with a non-zero status before writing any output"/>
    <criteria id="FR-PROF-0001.AC3" ears="unwanted" if="the profile file is not parseable as JSON" system="the generator" shall="abort with a non-zero status before writing any output"/>
    <criteria id="FR-PROF-0001.AC4" ears="unwanted" if="an outer key is not one of the IDE target identities (e.g. `core-cursor`, `cursr`, `windsurf`)" system="the generator" shall="abort before any output, naming the offending key and listing the accepted names"/>
    <criteria id="FR-PROF-0001.AC5" ears="unwanted" if="the profile declares an `antigravity` block" system="the generator" shall="abort before any output, reporting that that target has no model vocabulary a block could affect"/>
    <criteria id="FR-PROF-0001.AC6" ears="unwanted" if="a `claude` inner key falls outside {opus, sonnet, haiku} (e.g. `claude-opus-4-8`)" system="the generator" shall="abort before any output, naming the key and listing the accepted set"/>
    <criteria id="FR-PROF-0001.AC7" ears="unwanted" if="the profile descriptor carries a top-level field other than `modelOverrides` — `destinationSuffix`, `pluginNameSuffix` and `pluginDescriptionSuffix` included" system="the generator" shall="abort before any output, naming the unrecognized field"/>
    <criteria id="FR-PROF-0001.AC8" ears="event" when="the profile descriptor is the empty object `{}`" system="the generator" shall="accept it and proceed, since `modelOverrides` is optional (DATA-CFG-0006)"/>
  </acceptance>
  <implementationNotes>Implemented: loadProfile (src/rosettify-plugins/src/spec/profiles.ts) validates outer keys as bare IDE
  identities via isTargetName, rejects antigravity, narrows the top-level allow-list to modelOverrides
  through DESCRIPTOR_FIELDS, and restricts claude inner keys via CLAUDE_INNER_KEYS, raising
  ProfileValidationError at pre-flight before generate() proceeds. Tests:
  tests/unit/spec/profiles.test.ts.</implementationNotes>
  <notes></notes>
</req>

## Effective model vocabulary resolution

<req id="FR-PROF-0010" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="DATA-CFG-0006, FR-ARCH-0059"
     implementation="Implemented">
  <title>Effective model map resolution per target</title>
  <statement>For each IDE target the generator shall resolve one effective model map. A
  per-target block in the profile replaces that target's built-in maps in full and is treated as
  exhaustive; a target with no block uses its built-in maps unchanged. The inner key-space of each
  block mirrors that target's built-in map keying. This unit governs which map is in force, not how a
  candidate is selected from it and not how an absent candidate is handled downstream.</statement>
  <rationale>`PluginSpec.modelVocabulary` is the single live carrier of a target's effective map, read
  nowhere; profiles make it the live carrier of the effective map. Standalones inherit the parent's
  block because their preserved files derive from the parent target (V4). A dead inner entry is
  ignored silently so a profile stays valid across source drift (V5).</rationale>
  <evidence>src/rosettify-plugins/src/types.ts PluginSpec.modelVocabulary (the per-spec carrier of the effective map);
  src/rosettify-plugins/src/spec/model-maps.ts CLAUDE_VOCABULARY, CURSOR_VOCABULARY, COPILOT_VOCABULARY, CODEX_VOCABULARY (one populated vocabulary per IDE)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0010.AC1" ears="optional" where="a target declares a model-overrides block" system="the generator" shall="use that block as the target's entire effective map, consulting none of that target's built-in maps"/>
    <criteria id="FR-PROF-0010.AC2" ears="optional" where="a target declares no model-overrides block" system="the generator" shall="use that target's built-in maps unchanged as its effective map"/>
    <criteria id="FR-PROF-0010.AC3" ears="state" while="a standalone target declares no block of its own" system="the generator" shall="use its parent target's block (`cursor-standalone` from `cursor`, `copilot-standalone` from `copilot`)"/>
    <criteria id="FR-PROF-0010.AC4" ears="optional" where="a standalone target declares its own block" system="the generator" shall="use that block, overriding the inherited parent block"/>
    <criteria id="FR-PROF-0010.AC5" ears="unwanted" if="an inner entry's key matches no model token anywhere in the instruction source" system="the generator" shall="ignore that entry silently, without warning or failure"/>
    <criteria id="FR-PROF-0010.AC6" ears="ubiquitous" system="the generator" shall="key the Claude block by the family set {opus, sonnet, haiku}, the Cursor and Copilot blocks by exact source model tokens, and the Codex block by exact `gpt-` source tokens"/>
  </acceptance>
  <implementationNotes>Implemented: resolveEffectiveVocabulary (src/rosettify-plugins/src/spec/profiles.ts) implements
  exhaustive block replacement, STANDALONE_PARENT inheritance for cursor-standalone and
  copilot-standalone, and silent pass-through of dead inner keys; the built-in vocabularies live in
  src/rosettify-plugins/src/spec/model-maps.ts and base() in targets.ts calls the resolver per target.</implementationNotes>
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
  ignored as if it did not exist and the scan continues to the next candidate. Where a target has an active per-target override block and no candidate
  survives mapping under that block, the generator shall drop the frontmatter `model:` line. This
  drop-the-line rule is owned here and governs the profiled path only. A target with
  no override block (the unprofiled path) retains its built-in no-survivor behavior as specified by
  FR-COPY-0020, FR-COPY-0021, and FR-COPY-0022 — Claude `inherit`, Cursor and Copilot raw
  pass-through of the unmapped token, and Codex model fields stripped. This scoping is what keeps
  FR-PROF-0040's no-profile regression guard true.</statement>
  <rationale>Exhaustive replacement (no override-then-fallback) makes an absent token a true miss, so
  the scan must continue rather than pass the raw token through. Today Cursor/Copilot pass unmapped
  tokens through as-is and Claude/Codex return null; this unifies the miss to "skip and
  continue".</rationale>
  <evidence>src/rosettify-plugins/src/spec/model-maps.ts normalizeClaude (scans for a claude-compatible token);
  src/rosettify-plugins/src/spec/model-maps.ts normalizeCursor and normalizeCopilot (first token only);
  src/rosettify-plugins/src/spec/model-maps.ts normalizeCodex (scans for a gpt- token)</evidence>
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

## Destination naming excluded from profiles

<req id="FR-PROF-0020" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="DATA-CFG-0006, DATA-CFG-0007, FR-SET-0030, FR-SET-0040"
     implementation="Implemented">
  <title>Destination naming derives from the set, never from a profile</title>
  <statement>A profile shall contribute nothing to an output folder's name. A profile
  descriptor shall carry no destination suffix, and the active profile's name shall appear in no
  output folder name and in no `spec.name`. How a folder name is actually composed, and what
  `spec.name` carries, are FR-SET-0040 and are not restated here; manifest identity strings are out of
  scope of this unit.</statement>
  <rationale>One profile now serves variants that must land at different folder names — `-light` for
  the combo set and no suffix for the split sets — so a suffix carried by the profile cannot express
  both, and a profile that named folders would force a second near-identical descriptor per suffix.
  Keeping the profile out of `spec.name` preserves the existing property that a profiled build still
  matches every target-scoped directive.</rationale>
  <evidence>src/rosettify-plugins/src/file-processors/file-apply-overrides.ts fileApplyOverrides (compares a target token against ctx.spec.name); src/rosettify-plugins/src/spec/targets.ts buildAllSpecs (each spec carries name and destination as separate fields)</evidence>
  <acceptance>
    <criteria id="FR-PROF-0020.AC3" ears="unwanted" if="a profile descriptor declares `destinationSuffix`" system="the generator" shall="treat the descriptor as invalid and abort before any output (FR-PROF-0001)"/>
    <criteria id="FR-PROF-0020.AC4" ears="ubiquitous" system="the generator" shall="leave `spec.name` unaffected by which profile is active"/>
    <criteria id="FR-PROF-0020.AC5" ears="ubiquitous" system="the generator" shall="write every profiled output into the same output directory as every unprofiled one, not a separate tree"/>
  </acceptance>
  <implementationNotes>Implemented: buildSpecsForSet (src/rosettify-plugins/src/spec/targets.ts) composes destination from
  set.name, the target and variant.destinationSuffix with no profile input, while base() sets name to the
  bare TargetName. ProfileDescriptor carries no destination-related field.</implementationNotes>
  <notes></notes>
</req>

## Manifest identity excluded from profiles

<req id="FR-PROF-0021" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="DATA-CFG-0006, DATA-CFG-0007, FR-SET-0030"
     implementation="Implemented">
  <title>A profile shall not modify manifest name or description</title>
  <statement>A plugin manifest's `name` and `description` shall be composed from the building set's
  declared manifest fields plus the variant's plugin-name and plugin-description suffixes
  (DATA-CFG-0007, FR-SET-0030), and a profile shall contribute to neither. A profile descriptor shall
  carry no plugin-name suffix and no plugin-description suffix, and the active profile's name shall
  appear in no manifest value. The manifest is otherwise unchanged from its preserved source
  (DATA-CFG-0005). Which folder the plugin is written to is out of scope of this unit
  (FR-PROF-0020).</statement>
  <rationale>The marketplace treats each distribution as a distinct plugin, so manifest identity must
  vary per set and per variant — dimensions a profile does not know about. A profile-carried suffix
  would force every set sharing that profile to share one manifest name, which is exactly what the
  split sets must not do.</rationale>
  <acceptance>
    <criteria id="FR-PROF-0021.AC1" ears="event" when="set `rosetta` builds its variant declaring plugin-name suffix `-light`" system="the generator" shall="write manifest name `rosetta-light`, appending the suffix to the set's declared manifest name"/>
    <criteria id="FR-PROF-0021.AC2" ears="event" when="set `qe` builds its only variant, which declares empty manifest suffixes" system="the generator" shall="write manifest name `qe` exactly as the set declares it"/>
    <criteria id="FR-PROF-0021.AC3" ears="unwanted" if="a profile descriptor declares `pluginNameSuffix` or `pluginDescriptionSuffix`" system="the generator" shall="treat the descriptor as invalid and abort before any output (FR-PROF-0001)"/>
    <criteria id="FR-PROF-0021.AC4" ears="ubiquitous" system="the generator" shall="apply one set variant's manifest suffixes identically across every IDE target of that set"/>
  </acceptance>
  <implementationNotes>Implemented: buildSpecsForSet (src/rosettify-plugins/src/spec/targets.ts) composes the manifest name and
  description as set.manifest.<field> + variant.manifestNameSuffix/manifestDescriptionSuffix, consulting
  no profile, and applyOverlay in plugin-copy.ts writes them. Verified on generated output after the
  marketplace-name fix: rosetta-claude/.claude-plugin/plugin.json is 'rosetta' and rosetta-claude-light is
  'rosetta-light' (AC1), qe-claude is exactly 'qe' (AC2), and the qe manifest name is identical across
  claude, cursor, copilot, codex and antigravity (AC4). AC3 verified by live load: loadProfile rejects a
  descriptor carrying pluginNameSuffix or pluginDescriptionSuffix with 'Unrecognized profile field ... A
  profile descriptor defines exactly: modelOverrides', while a bare modelOverrides descriptor is accepted.
  The earlier rosetta- prefix contradiction was a real defect in plugins.json and has since been fixed at
  source.</implementationNotes>
  <notes>Marketplace plugin names carry no prefix: `rosetta`, `rosetta-light`, `core`, `advanced`, `qe`, `search`, `modernization`.</notes>
</req>

## Profile-scoped filename directive

<req id="FR-PROF-0030" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-ARCH-0020, FR-ARCH-0021, FR-ARCH-0025"
     implementation="Implemented">
  <title>ProfileOnlyToken filename directive</title>
  <statement>The FilenameDirective grammar shall recognize a namespaced token kind
  `profile-<name>-only`, distinct from the `target-<id>-only`, `ide-<family>-only` and
  `set-<id>-only` token kinds so none can be confused with another. The
  grammar is tilde-separated with an opening and a closing tilde fence; the closing fence contributes
  no token. A file carrying `profile-<name>-only` is included only while that profile is active. Profile
  filtering occurs in the same pipeline step as target filtering, before overwrite truncation; the
  `overwrite` token does not bypass profile exclusion.</statement>
  <rationale>A bare `<name>-only` token would be read by `matchesTarget` as a target-only token — it
  excludes on any `-only` token whose prefix differs from `spec.name` — and drop the file for all
  targets, so every selector kind is namespaced by its own prefix. Ordering profile filtering before overwrite
  truncation mirrors the existing target-then-overwrite order and stops an inactive-profile
  `overwrite` file from superseding the base document.</rationale>
  <evidence>src/rosettify-plugins/src/vfs/directives.ts matchesTarget (excludes on any non-matching -only token) and matchesProfile;
  src/rosettify-plugins/src/file-processors/file-apply-overrides.ts fileApplyOverrides (the target and profile filters precede overwrite truncation);
  src/rosettify-plugins/tests/unit/vfs/directives.test.ts "handles combination of overwrite and target-only - target-only still filters"</evidence>
  <acceptance>
    <criteria id="FR-PROF-0030.AC1" ears="state" while="profile `lightweight` is active" system="the generator" shall="include `coding-flow~profile-lightweight-only~overwrite~.md` at VFS path `workflows/coding-flow.md`"/>
    <criteria id="FR-PROF-0030.AC2" ears="unwanted" if="profile `lightweight` is not active" system="the generator" shall="exclude every file carrying `profile-lightweight-only` from all targets"/>
    <criteria id="FR-PROF-0030.AC3" ears="ubiquitous" system="the generator" shall="treat `profile-<name>-only` as a token kind distinct from `target-<id>-only`, `ide-<family>-only` and `set-<id>-only`"/>
    <criteria id="FR-PROF-0030.AC4" ears="event" when="a file carries both `profile-<name>-only` and `overwrite` and its profile is inactive" system="the generator" shall="exclude the file before overwrite truncation, so it does not supersede the base document"/>
    <criteria id="FR-PROF-0030.AC5" ears="ubiquitous" system="the generator" shall="contribute no token for the closing tilde fence, so it is never read as a directive"/>
  </acceptance>
  <implementationNotes>Implemented: KNOWN_DIRECTIVES, SET_ONLY_PATTERN and PROFILE_ONLY_PATTERN
  (src/rosettify-plugins/src/vfs/directives.ts) keep target-, ide-, set- and profile- as four disjoint
  namespaces; matchesTarget explicitly skips profile-scoped tokens and matchesProfile owns them
  exclusively. Tests: tests/unit/vfs/directives.test.ts.</implementationNotes>
  <notes></notes>
</req>

## No-profile run unaffected

<req id="FR-PROF-0040" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-CLI-0032, FR-SET-0030"
     implementation="Implemented">
  <title>Unprofiled variant unaffected by the profile mechanism</title>
  <statement>A set variant that names no profile shall be unaffected by the profile mechanism: no
  profile-directive token matched and the built-in model maps in force for every IDE target of that
  variant. The variant's own destination and manifest suffixes still apply, since they are properties
  of the variant rather than of any profile (FR-PROF-0020, FR-PROF-0021). The always-on
  `subagent_required_model` filtering is a separate concern outside this unit and still applies.
  Whether any variant names a profile is out of scope here; that is FR-SET-0030.</statement>
  <rationale>Profiles stay strictly additive: a variant naming none must produce exactly what it
  produced before profiles existed, and after this change that guard has to be stated per variant
  rather than per run, because one run now builds profiled and unprofiled variants side by side.
  Parity is scoped to the profile mechanism only, since the separate always-on filtering
  (FR-COPY-0083) deliberately changes shipped content.</rationale>
  <acceptance>
    <criteria id="FR-PROF-0040.AC1" ears="state" while="a variant names no profile" system="the generator" shall="exclude every `profile-<name>-only` file from every IDE target of that variant"/>
    <criteria id="FR-PROF-0040.AC2" ears="state" while="a variant names no profile" system="the generator" shall="use each IDE target's built-in model maps"/>
    <criteria id="FR-PROF-0040.AC3" ears="state" while="a variant names no profile and declares empty suffixes" system="the generator" shall="write it to `<set-name>-<ide-target>` with no suffix and leave its manifest name and description at the set's declared values"/>
    <criteria id="FR-PROF-0040.AC4" ears="event" when="one run builds a variant naming a profile and a variant naming none for the same set" system="the generator" shall="leave the unprofiled variant's output identical to what it produces when the profiled variant is absent"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/generate.ts resolves profileOverride ?? variant.profile
  independently inside the per-(set, variant) loop, so a variant naming no profile is unaffected by a
  sibling variant's profile in the same run, while buildSpecsForSet still derives the destination and
  manifest suffixes from the variant.</implementationNotes>
  <notes>Depends indirectly on FR-COPY-0083, which is out of scope here but shares the effective-map
  concern.</notes>
</req>

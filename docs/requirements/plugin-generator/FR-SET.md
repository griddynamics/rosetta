# plugin-generator — FR: Plugin Sets

Functional requirements for plugin sets: the configuration document declaring which sets exist, which
instruction folders compose each, their build variants, destination naming, `requires` metadata, and
bootstrap and hook footprint.

Area abbreviation: `SET`. All units use the canonical `<req>` schema (attributes + EARS criteria with
`.AC#` sub-ids). A "set" is one declared plugin composition (`rosetta`, `core`, `workflows`, `qe`,
`search`, `modernization`); an "IDE target" is one `spec.name` identity (`claude`, `cursor`, `copilot`,
`codex`, `cursor-standalone`, `copilot-standalone`, `antigravity`). One built plugin is one (set
variant × IDE target) pair.

## Configuration resolution

<req id="FR-SET-0001" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-CLI-0034, DATA-CFG-0007, DATA-CFG-0003"
     implementation="Implemented">
  <title>Plugin-set configuration resolution</title>
  <statement>The generator shall read the plugin sets it builds from a single JSON configuration
  document whose location FR-CLI-0034 resolves; this unit states no resolution rule of its own. The
  resolved document shall be the sole declaration of the IDE target inventory, of which sets exist,
  and of each set's folders, variants, preserved-file template, manifest fields, `requires` list,
  bootstrap flag and hook list. No set identity, folder composition, or target inventory shall be held
  in generator control flow. This unit governs what the resolved document is authoritative
  for; where it is found is FR-CLI-0034, well-formedness is DATA-CFG-0007, and rejecting a malformed
  one is FR-SET-0010.</statement>
  <rationale>One document per run collapses today's two invocations into one, and a package-relative
  default lets `npx -y rosettify-plugins@latest` build a repository holding no configuration of its own.
  Resolving `--config` off `<source>` rather than the process working directory keeps every input root
  moving together under one `--source` override.</rationale>
  <evidence>src/rosettify-plugins/src/spec/targets.ts buildAllSpecs (the target inventory and every target's folder composition are function-local literals here today, which is what this document replaces); src/rosettify-plugins/src/spec/profiles.ts loadProfile (the descriptor-resolution shape this mirrors)</evidence>
  <acceptance>
    <criteria id="FR-SET-0001.AC3" ears="ubiquitous" system="the generator" shall="take the set inventory from the resolved document alone, consulting no built-in set list"/>
    <criteria id="FR-SET-0001.AC4" ears="ubiquitous" system="the generator" shall="take the IDE target inventory from the resolved document alone (DATA-CFG-0003)"/>
    <criteria id="FR-SET-0001.AC5" ears="event" when="a set is added to the resolved document and nothing else changes" system="the generator" shall="build that set with no change to generator control flow"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/plugins.json is the sole declaration of the 7-entry targets
  inventory, hookSupportModules and 6 sets (rosetta, core, workflows, qe, search, modernization), each
  carrying folders/template/releases/requires/bootstrap/hooks/manifest/variants; loadPluginCatalog in
  src/rosettify-plugins/src/spec/plugin-sets.ts parses it and buildSpecsForSet in
  src/rosettify-plugins/src/spec/targets.ts consults no built-in set list, so adding a set changes no
  control flow. Where the document is found is FR-CLI-0034 and is deliberately not restated here - the
  resolution rule and its two criteria were removed from this unit on 2026-09-02, having drifted to a
  status opposite to their owner's.</implementationNotes>
  <notes></notes>
</req>

## Configuration validation

<req id="FR-SET-0010" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-SET-0001, DATA-CFG-0007, DATA-CFG-0005, DATA-CFG-0003"
     implementation="Implemented">
  <title>Fail-fast plugin-set configuration validation</title>
  <statement>The generator shall fully validate the resolved plugin-set configuration before writing
  any output. Validation covers two classes. First, document well-formedness exactly as
  DATA-CFG-0007 defines it, including the IDE target identities of DATA-CFG-0003 — this unit adds no
  well-formedness rule of its own and restates none. Second, the environment checks that only a real
  run can make: every folder a set's `folders` list names exists under the resolved instruction
  source, and every set's preserved-file template has a folder for each MAIN IDE target being built,
  a standalone target seeding from its parent's folder instead (DATA-CFG-0005, FR-SEED-0002). Any
  violation of either class aborts the run with a non-zero status and no output written. Validation does not check that a set resolves to a non-empty file
  set after layering — an empty set is a legitimate configuration — and does not check that a
  required set is installed alongside, which no IDE enforces (FR-SET-0050).</statement>
  <rationale>Failing before the first pipeline runs keeps a malformed configuration from
  half-rewriting an output tree holding every shipped plugin. The template check is the trap this
  change introduces: templates are shared now, so a set naming a template with no folder for one IDE
  would fail on that IDE alone, after the other outputs were rewritten. Shape mirrors FR-PROF-0001.</rationale>
  <evidence>src/rosettify-plugins/src/spec/profiles.ts loadProfile and ProfileValidationError (the fail-fast pre-flight shape this mirrors); src/rosettify-plugins/src/generate.ts (descriptor load precedes buildVfs, so an invalid descriptor exits with no output written)</evidence>
  <acceptance>
    <criteria id="FR-SET-0010.AC1" ears="unwanted" if="the resolved configuration file does not exist" system="the generator" shall="abort with a non-zero status naming the resolved absolute path, before writing any output"/>
    <criteria id="FR-SET-0010.AC2" ears="unwanted" if="the configuration file is not parseable as JSON" system="the generator" shall="abort with a non-zero status naming the file, before writing any output"/>
    <criteria id="FR-SET-0010.AC4" ears="unwanted" if="a set declares `folders: [aqa]` and `instructions/r3/aqa/` does not exist" system="the generator" shall="abort before any output, naming the set and the missing folder"/>
    <criteria id="FR-SET-0010.AC5" ears="unwanted" if="a set names template `template` and `<preservedFilesSource>/template-codex/` is absent while `codex` is among the targets being built" system="the generator" shall="abort before any output, naming the set, the template and the missing folder"/>
    <criteria id="FR-SET-0010.AC11" ears="optional" where="`cursor-standalone` is among the targets being built" system="the generator" shall="require no `<preservedFilesSource>/<template>-cursor-standalone/` folder, checking its parent's `<template>-cursor` folder instead"/>
    <criteria id="FR-SET-0010.AC9" ears="ubiquitous" system="the generator" shall="complete both validation classes at pre-flight, before the first plugin pipeline runs, so any violation — a DATA-CFG-0007 well-formedness breach or an environment check — aborts with a non-zero status and leaves the output directory untouched"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/plugin-sets.ts loadPluginCatalog plus the closed field
  allow-lists CATALOG_FIELDS, SET_FIELDS, VARIANT_FIELDS and MANIFEST_FIELDS, enforced by
  rejectUnknownFields; every violation raises PluginCatalogError naming the file.
  src/rosettify-plugins/src/generate.ts accumulates preflightErrors for missing template-<ide> folders,
  unresolvable instruction folders (buildVfs) and unloadable profiles, then aborts before any pipeline
  runs, leaving the output tree untouched. NOTE: two text drifts, no code gap - the identity field is name
  not id, and name uniqueness is validated globally rather than per release.</implementationNotes>
  <notes></notes>
</req>

## Set-to-folder layering

<req id="FR-SET-0020" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-SET-0001, FR-ARCH-0011, FR-ARCH-0042, FR-ARCH-0024"
     implementation="Implemented">
  <title>Set-to-folder layering and precedence</title>
  <statement>Each set shall resolve its instruction source by layering the folders its `folders` list
  names, one `instructions/<release>/<folder>/` tree per entry, in the order the list gives them and in
  no other order. Layering uses the VFS rules that already govern multiple instruction layers: a later
  folder's contribution at a VFS path bundles onto the earlier ones (FR-ARCH-0042), and an `overwrite`
  directive on a later contribution prunes the earlier ones (FR-ARCH-0024). A set naming one folder
  resolves to that folder alone. This unit governs which folders compose a set and in what order; which
  sets are built is FR-CLI-0030.</statement>
  <rationale>Reusing the existing layer mechanism rather than a set-specific merge makes the combo set
  literally the merge of the split folders, so the distributions cannot drift apart in composition.
  Taking order from the declared array makes composition a property of the set, not the invocation —
  required once one run builds every set and no per-set command line carries an order.</rationale>
  <evidence>src/rosettify-plugins/src/vfs/source-resolver.ts (layer resolution over an ordered list of instruction roots, the mechanism a set's folders reuse); src/rosettify-plugins/src/vfs/build-vfs.ts (SourceFile.order carries the layer array index, fixing bundle order across layers)</evidence>
  <acceptance>
    <criteria id="FR-SET-0020.AC1" ears="event" when="set `rosetta` declares `folders: [core, workflows, qe, search, modernization]` under release `r3`" system="the generator" shall="layer `instructions/r3/core/`, `instructions/r3/workflows/`, `instructions/r3/qe/`, `instructions/r3/search/` and `instructions/r3/modernization/` in that order"/>
    <criteria id="FR-SET-0020.AC2" ears="event" when="set `qe` declares `folders: [qe]`" system="the generator" shall="resolve its instruction source to `instructions/r3/qe/` alone, contributing no file from `core`, `workflows`, `search` or `modernization`"/>
    <criteria id="FR-SET-0020.AC3" ears="ubiquitous" system="the generator" shall="take layering order from the declared `folders` array, never from the order of `--domain` values on the command line"/>
    <criteria id="FR-SET-0020.AC4" ears="event" when="two folders of one set contribute a file at the same VFS path" system="the generator" shall="bundle them in declared-folder order per FR-ARCH-0042"/>
    <criteria id="FR-SET-0020.AC5" ears="optional" where="a set's declared folders are disjoint, so no two contribute a file at the same VFS path" system="the generator" shall="produce a VFS equal to the plain union of those folders, performing no bundling"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/generate.ts calls buildVfs(instructionsSource, releaseName,
  set.folders.join(',')) so layering order is the declared folders array and nothing else;
  src/rosettify-plugins/src/vfs/source-resolver.ts resolves the ordered instruction roots and
  src/rosettify-plugins/src/vfs/build-vfs.ts carries the layer index on SourceFile.order, fixing bundle
  order across layers. Command-line argument order never reaches layering.</implementationNotes>
  <notes></notes>
</req>

## Set variants

<req id="FR-SET-0030" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-SET-0001, DATA-CFG-0007"
     implementation="Implemented">
  <title>Per-set build variants</title>
  <statement>Each set shall declare one or more build variants; that every declared variant
  is built in one invocation is FR-SET-0060. A variant names the profile it builds with — one profile name or
  none — and carries the destination, plugin-name and plugin-description suffixes that distinguish
  its output from that set's other variants. Those three suffixes belong to the variant and shall be
  read from nowhere else; a profile descriptor carries none of them (FR-PROF-0020, FR-PROF-0021). A
  set declaring one variant with empty suffixes produces exactly one plugin per IDE target, whatever
  profile that variant names. No two variants of one set may declare the same destination suffix.
  This unit governs what a variant is; a `--profile` override of the
  named profile is FR-CLI-0032.</statement>
  <rationale>Suffixes move to the variant because one `lightweight` profile must yield `-light` for the
  combo set and no suffix for the split sets; a suffix on the descriptor cannot express both, and a
  second profile copy carrying a second suffix would drift. Distinct destination suffixes within a set
  keep two variants from resolving to one folder, the second silently overwriting the first.</rationale>
  <evidence>src/rosettify-plugins/src/spec/profiles.ts ProfileDescriptor (the descriptor these three suffix fields are moving off); src/rosettify-plugins/src/spec/targets.ts buildAllSpecs (destination composed as a literal plus the profile suffix, the composition this replaces)</evidence>
  <acceptance>
    <criteria id="FR-SET-0030.AC1" ears="event" when="set `rosetta` declares one variant naming no profile with empty suffixes and one naming `lightweight` with destination suffix `-light`" system="the generator" shall="build both, writing `rosetta-claude` and `rosetta-claude-light`"/>
    <criteria id="FR-SET-0030.AC2" ears="event" when="set `qe` declares a single variant naming profile `lightweight` with an empty destination suffix" system="the generator" shall="write `qe-claude` and no `qe-claude-light` folder"/>
    <criteria id="FR-SET-0030.AC3" ears="optional" where="a variant names no profile" system="the generator" shall="build it with each IDE target's built-in model vocabulary and exclude every `profile-<name>-only` file (FR-PROF-0040)"/>
    <criteria id="FR-SET-0030.AC4" ears="ubiquitous" system="the generator" shall="read the destination, plugin-name and plugin-description suffixes from the variant, consulting no suffix field on any profile descriptor"/>
    <criteria id="FR-SET-0030.AC5" ears="event" when="`--profile lightweight` is supplied" system="the generator" shall="build every variant with the `lightweight` profile while each variant keeps its own declared suffixes (FR-CLI-0032)"/>
  </acceptance>
  <implementationNotes>Implemented: SetVariant (src/rosettify-plugins/src/spec/plugin-sets.ts) carries profile,
  destinationSuffix, manifestNameSuffix and manifestDescriptionSuffix;
  src/rosettify-plugins/src/spec/profiles.ts ProfileDescriptor is reduced to modelOverrides alone, so no
  suffix can be read off a descriptor. src/rosettify-plugins/src/spec/targets.ts buildSpecsForSet builds
  every declared variant of every set available for the release.</implementationNotes>
  <notes></notes>
</req>

## Destination naming

<req id="FR-SET-0040" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-SET-0030, DATA-CFG-0003, FR-ARCH-0023"
     implementation="Implemented">
  <title>Set-and-target destination naming</title>
  <statement>The generator shall name each built plugin's output folder `<set-name>-<ide-target>` with
  the variant's destination suffix appended, placed directly under the output directory, and shall
  leave `spec.name` — the bare IDE target identity that a `target-<id>-only` directive matches
  (FR-ARCH-0023) — carrying neither the set name nor the suffix. Every variant of every set writes into
  that one output directory; no set and no variant gets a tree of its own. Manifest identity strings
  are a separate concern (FR-PROF-0021, DATA-CFG-0007) and are out of scope of this unit, so a set's
  folder name and its marketplace plugin name need not coincide.</statement>
  <rationale>Folder identity carries the set because one output directory now holds every set; directive
  identity must not, because a `target-<id>-only` token names an IDE and would stop matching the moment
  a set name entered `spec.name` — the failure that already keeps the destination suffix off it.
  Separating folder from manifest name lets the repo path move while the marketplace name stays put.</rationale>
  <evidence>src/rosettify-plugins/src/spec/targets.ts buildAllSpecs (name and destination held as separate spec fields, which is what allows one to carry the set and the other not to); src/rosettify-plugins/src/file-processors/file-apply-overrides.ts fileApplyOverrides (matches a directive token against ctx.spec.name)</evidence>
  <acceptance>
    <criteria id="FR-SET-0040.AC1" ears="event" when="set `rosetta` builds its `-light` variant for IDE target `claude`" system="the generator" shall="write the output folder `rosetta-claude-light` directly under the output directory"/>
    <criteria id="FR-SET-0040.AC2" ears="event" when="set `modernization` builds for IDE target `copilot-standalone`" system="the generator" shall="write the output folder `modernization-copilot-standalone`"/>
    <criteria id="FR-SET-0040.AC3" ears="ubiquitous" system="the generator" shall="keep `spec.name` the bare IDE identity, such as `claude`, carrying neither a set name nor a destination suffix"/>
    <criteria id="FR-SET-0040.AC4" ears="event" when="set `core` builds for IDE target `claude`" system="the generator" shall="write `core-claude`, which now holds the `core` set's content rather than the combined content it held before this change"/>
    <criteria id="FR-SET-0040.AC5" ears="event" when="release `r2` is selected and the configuration declares for it one set with id `core`, folders `[core]`, and two variants whose destination suffixes are the empty string and `-light`" system="the generator" shall="write `core-<ide>` and `core-<ide>-light` for each IDE target and no other folder"/>
    <criteria id="FR-SET-0040.AC6" ears="ubiquitous" system="the generator" shall="write every set variant into the same output directory rather than a per-set or per-variant tree"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/plugin-sets.ts allDeclaredDestinations and
  src/rosettify-plugins/src/spec/targets.ts buildSpecsForSet both compose the destination as
  `${set.name}-${target}${variant.destinationSuffix}`, while PluginSpec.name
  (src/rosettify-plugins/src/types.ts) stays the bare IDE identity that matchesTarget resolves
  target-<id>-only against.</implementationNotes>
  <notes></notes>
</req>

## Set dependency metadata

<req id="FR-SET-0050" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Draft" approved_by="" changed="2026-09-03"
     depends="FR-SET-0001, FR-SET-0020, DATA-CFG-0007"
     implementation="Implemented">
  <title>`requires` is metadata, never composition</title>
  <statement>A set's `requires` list shall be metadata only. The generator shall require that the set's
  declared `manifest.description` names every entry of it, refusing to load a catalog whose description
  omits one, and shall otherwise let it affect nothing: it shall not
  add any required set's files to the requiring set's output, shall not cause a required set to be
  built, and shall not impose any ordering between a set and the sets it requires. No IDE the generator
  targets enforces plugin dependencies, so `requires` states an install-time expectation and carries no
  runtime guarantee. Validating that each entry names a declared set is FR-SET-0010.</statement>
  <rationale>Domain sets ship only their own files and resolve cross-set references by name through the
  agent's registries, so composition stays driven by `folders` alone — letting `requires` add files
  would duplicate every core document into four domain plugins and reintroduce the drift the split
  removes. A manifest description line is the only enforcement available, no target IDE having a
  plugin dependency mechanism. That line is authored, not generated: the generator enforces the
  invariant rather than composing the sentence, because generated prose reads worse than the authored
  wording and a derived clause would give one fact two sources. Validating at catalog load closes the
  trap at the moment the `requires` edit is made, rather than shipping a description that silently
  contradicts the list.</rationale>
  <evidence>src/rosettify-plugins/src/plugin-processors/plugin-copy.ts pluginCopy (manifest name and description are the only identity fields the generator writes, so a description line is where install-time metadata can land)</evidence>
  <acceptance>
    <criteria id="FR-SET-0050.AC1" ears="event" when="set `qe` declares `requires: [core, workflows]`" system="the generator" shall="produce `qe-claude` holding no file originating under `instructions/r3/core/` or `instructions/r3/workflows/`"/>
    <criteria id="FR-SET-0050.AC2" ears="ubiquitous" system="the generator" shall="produce a manifest description that names every set name in that set's `requires` list"/>
    <criteria id="FR-SET-0050.AC3" ears="ubiquitous" system="the generator" shall="build no set merely because another set requires it, and impose no build order between the two"/>
    <criteria id="FR-SET-0050.AC4" ears="optional" where="a `requires` entry names a set declared later in the configuration document" system="the generator" shall="accept it, since the list imposes no ordering"/>
    <criteria id="FR-SET-0050.AC5" ears="unwanted" if="a set's `requires` names a set whose name does not appear in that set's `manifest.description`" system="the generator" shall="abort at catalog load naming the set and the missing entry, before any output is written"/>
  </acceptance>
  <implementationNotes>Implemented: readSets (src/rosettify-plugins/src/spec/plugin-sets.ts) validates each
  `requires` entry against the set's own declared manifest.description inside the existing
  declared-set loop, raising PluginCatalogError before any output is written; the check matches the
  required set's name on its own word boundary rather than as a bare substring, so a hyphenated set
  name cannot match inside a longer one. Composition is unchanged: buildSpecsForSet
  (src/rosettify-plugins/src/spec/targets.ts) still writes set.manifest.description +
  variant.manifestDescriptionSuffix, and the 'Requires Rosetta Core and Workflows' wording in
  src/rosettify-plugins/plugins.json stays hand-authored. The shipped catalog passes: workflows names
  'Core'; qe, search and modernization name 'Core' and 'Workflows'; rosetta and core declare an empty
  requires list. Tests: tests/unit/spec/plugin-sets.test.ts (a description omitting a required set
  raises, and the shipped catalog still loads), tests/unit/generate.test.ts (a built qe manifest
  description contains both names).</implementationNotes>
  <notes>Status moved Approved to Draft: the statement's duty changed from composing the description
  to enforcing an authored one, which is a new obligation on catalog load and awaits re-approval. The
  observable outcome AC2 asserts is unchanged.</notes>
</req>

## Single-invocation generation

<req id="FR-SET-0060" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-SET-0030, FR-CLI-0030, FR-CLI-0040, FR-CLI-0041"
     implementation="Implemented">
  <title>Every set variant and IDE target built in one invocation</title>
  <statement>One invocation shall produce every (set variant × IDE target) pair the resolved
  configuration declares for the selected release, reduced further only by the `--domain` folder
  filter (FR-CLI-0030). A set whose `releases` list omits the selected release shall not be built and
  shall not be reported as an error. No second
  invocation shall be required to obtain a variant, a profile, or a set. Pair independence is
  FR-CLI-0040, per-pair error recovery and exit status are FR-CLI-0041, and pre-flight abort is
  FR-SET-0010; none of those rules is restated here.</statement>
  <rationale>Two invocations — one plain, one `--profile lightweight` — are what the variant model
  replaces; leaving the second in place lets the builds diverge in release, hook posture or output root
  with nothing checking they agree. Explicit pair independence makes the matrix safe to grow: 49 pairs
  are 49 independent builds, not a dependency graph.</rationale>
  <evidence>src/rosettify-plugins/src/generate.ts (one buildAllSpecs call per invocation drives the whole run, the loop this matrix extends); src/rosettify-plugins/src/spec/targets.ts buildAllSpecs (returns an independent PluginSpec per target with no cross-target reads)</evidence>
  <acceptance>
    <criteria id="FR-SET-0060.AC1" ears="event" when="the configuration declares sets `rosetta` (two variants), `core`, `workflows`, `qe`, `search` and `modernization` (one variant each) over 7 IDE targets" system="the generator" shall="write 49 output folders in one run — 14 under `rosetta-*` and 7 under each of the other five set names"/>
    <criteria id="FR-SET-0060.AC2" ears="ubiquitous" system="the generator" shall="require no second invocation to produce a set's lightweight variant"/>
    <criteria id="FR-SET-0060.AC5" ears="event" when="`--domain qe` is supplied" system="the generator" shall="build the `qe` set's pairs only and write nothing for any other set (FR-CLI-0030)"/>
    <criteria id="FR-SET-0060.AC6" ears="event" when="`--release r2` is selected and only the set with id `core` declares `r2`" system="the generator" shall="build that set's two variants across the IDE targets and write nothing for any set available only to `r3`"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/plugin-sets.ts selectSets filters the catalog by release and
  the --domain folder list; src/rosettify-plugins/src/generate.ts loops every (set, variant) pair, builds
  specs through buildSpecsForSet, and continues past a recoverable per-target error while pre-flight
  violations abort the run first. Exit status is anyError ? 1 : 0. Verified: 49 output folders from one
  invocation, exit 0.</implementationNotes>
  <notes></notes>
</req>

## Per-set bootstrap and hooks

<req id="FR-SET-0070" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-SET-0001, DATA-CFG-0007, FR-GEN-0011, FR-CLI-0012"
     implementation="Implemented">
  <title>Per-set bootstrap flag and hook list</title>
  <statement>Each set shall declare a bootstrap flag and a hook list, and that declaration shall be the
  sole determinant of which hook modules the set REQUESTS: no plugin of that set shall carry a hook
  entry its list does not name, and a set whose flag is unset shall request no session-start
  bootstrap block anywhere. Which of the requested modules a given target actually binds, and
  whether a bootstrap block is emitted for it at all, is determined by that target's hook
  configuration templates, and the module list used for bundle shipping is asserted against those
  templates (FR-GEN-0011). A
  set's footprint is therefore NOT uniform across its targets: `claude` receives a bootstrap block
  while `cursor`, whose templates carry no bootstrap placeholder, does not. A set that declares an empty hook list with its bootstrap flag unset shall
  produce neither a `hooks/` folder nor a `hooks.json`. Suppression by the effective
  deterministic-hooks value (FR-CLI-0012) shall not by itself remove the file: where a target's
  layout contributes no bootstrap block, the emitted configuration is valid but entry-less, which is
  pre-existing behaviour this unit records rather than forbids (see notes). The declaration is made once per set, not per IDE target, so every target of one set
  starts from the same requested module list before its layout narrows it. Which bundle files a declared hook drags in is
  FR-HOOK-0020 and FR-HOOK-0022; how the declaration is assembled into the emitted configuration is
  FR-GEN-0011.</statement>
  <rationale>A shared preserved template cannot serve four sets while a static `hooks.json.tmpl` renders
  one fixed hook set for all, so the list becomes data the generator assembles the configuration from
  (FR-GEN-0011), leaving every template a single injected value. Making one list the source
  of both the rendered configuration and the shipped bundles stops a set advertising a hook whose bundle
  it does not carry — masked today because every target receives every bundle.</rationale>
  <evidence>src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts pluginSyncBundles (copies bundles by bundleSource, which defaults to the target identity, so every target receives every bundle today); src/rosettify-plugins/src/types.ts PluginSpec.bundleSource (the identity-keyed bundle selector the declared list replaces)</evidence>
  <acceptance>
    <criteria id="FR-SET-0070.AC1" ears="event" when="set `core` declares the bootstrap flag set and hooks `dangerous-actions` on `PreToolUse` and `codemap-refresh` on `PostToolUse`" system="the generator" shall="render a `hooks.json` carrying a session-start bootstrap block and exactly those two hook entries"/>
    <criteria id="FR-SET-0070.AC2" ears="event" when="set `workflows` declares the bootstrap flag unset and hooks `read-once`, `lint-format-advisory`, `md-file-advisory` and `loose-files`" system="the generator" shall="render a `hooks.json` carrying those four entries and no session-start bootstrap block"/>
    <criteria id="FR-SET-0070.AC3" ears="event" when="set `qe` declares the bootstrap flag unset and an empty hook list" system="the generator" shall="write neither a `hooks/` folder nor a `hooks.json` in any `qe-<ide>` output"/>
    <criteria id="FR-SET-0070.AC7" ears="event" when="a set declaring hooks is built for a target whose layout contributes no bootstrap block, with the effective deterministic-hooks value false" system="the generator" shall="emit a valid but entry-less `hooks.json`, keeping any IDE manifest reference to it resolvable"/>
    <criteria id="FR-SET-0070.AC4" ears="ubiquitous" system="the generator" shall="emit no hook entry that the building set's declared list does not name"/>
    <criteria id="FR-SET-0070.AC5" ears="state" while="the effective deterministic-hooks value is false" system="the generator" shall="emit no entry from any set's declared hook list, leaving only the session-start bootstrap block where the flag is set"/>
    <criteria id="FR-SET-0070.AC6" ears="ubiquitous" system="the generator" shall="present one set's declared module list identically to every IDE target of that set, each target's layout then binding the subset it supports"/>
  </acceptance>
  <implementationNotes>Implemented against the corrected text: PluginSpec.hookModules, hookLayout and bootstrap
  (src/rosettify-plugins/src/types.ts) carry the set's declaration; resolveHookModules
  (src/rosettify-plugins/src/spec/plugin-sets.ts) expands the declared hooks with their
  hookSupportModules; modulesForTarget (src/rosettify-plugins/src/spec/targets.ts) intersects that list
  with what the target's layout binds; and buildHooksDocument applies one declaration identically to every
  IDE target of a set through HOOK_LAYOUTS, so no entry appears that the list does not name.
  emitsHooksJson suppresses the hooks/ folder and hooks.json for a set declaring an empty hook list with
  bootstrap unset - verified on a real --release r3 build: workflows, qe, search and modernization ship
  zero hooks.json and zero hooks/ directories across all seven IDE targets, while rosetta and core ship
  theirs. At the default deterministic-hooks=false (FR-CLI-0012) no entry from any declared list is
  emitted, which AC5 requires.</implementationNotes>
  <notes>A target whose `HOOK_LAYOUTS` bootstrap slot is `null` or `empty` — Cursor, Cursor-standalone, Copilot-standalone and Antigravity — emits a valid but ENTRY-LESS `hooks.json` when the effective deterministic-hooks value (FR-CLI-0012) suppresses the hooks its set declares. This predates #315: the pre-change golden tree shipped the same 12 files (`core-cursor{,-light}` and `core-cursor-standalone{,-light}` at 37 bytes, `core-copilot-standalone*` at 60, `core-antigravity{,-light}` at 68), and the current tree ships the equivalent set, the byte counts differing only because the assembler emits compact JSON where the template carried whitespace. Suppressing the file is DEFERRED: an IDE manifest references it — Cursor's `plugin.json` declares `"hooks": "./hooks/hooks.json"` — so removing it requires per-IDE verification that a dangling manifest reference does not break plugin load, which cannot be tested here. The narrower guarantee that a set declaring no hooks with `bootstrap: false` ships neither a `hooks/` folder nor a `hooks.json` is unaffected and verified.</notes>
</req>

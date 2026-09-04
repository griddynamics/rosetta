# plugin-generator — FR: Invocation, Source Resolution, Orchestration

EARS-phrased functional requirements for invocation, source resolution, run modes, and orchestration.

## Invocation

<req id="FR-CLI-0001" type="FR" level="System" ticketId="315" classification="technical">
  <title>Command-line invocation</title>
  <statement>The generator shall provide a command-line entry point accepting optional release, domain, source, per-source override, output, plugin-set configuration (`--config`), profile, and profile-source arguments (FR-CLI-0020, FR-CLI-0032, FR-CLI-0033, FR-CLI-0034), and shall return a process exit status reflecting run success.</statement>
  <rationale>Operators and the pre-commit step invoke it as a command. The tool is a self-contained utility parameterized by a source root, not by a repository.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no arguments When: invoked Then: it generates every set the default plugin-set configuration declares, from the default release, into the default output directory.</criteria>
    <criteria>Given: an unknown argument When: invoked Then: it reports usage and exits non-zero.</criteria>
    <criteria>Given: `--config` When: listed in usage Then: it is documented as the plugin-set configuration path override (FR-CLI-0034).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/cli.ts adds --config with defaultConfigPath as its fallback and
  rewrites the --domain help text to describe a folder filter over sets rather than a layer selector;
  commander's own unknown-argument handling covers the usage and non-zero-exit criteria.</implementationNotes>
</req>

<req id="FR-CLI-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Importable generation function</title>
  <statement>The generator shall expose a single callable that performs a full generation given a repo root, a release, and an output directory.</statement>
  <rationale>Allows invocation as a library (e.g. from pre-commit) without the CLI.</rationale>
  <source>Sources</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: valid arguments When: the function is called Then: it performs the same generation as the CLI and returns a status code.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Release selection

<req id="FR-CLI-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Release selection with default</title>
  <statement>The generator shall select the instruction release from the release argument, defaulting to `r3` when not supplied.</statement>
  <rationale>Releases coexist; the stable release is the default.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no release argument When: invoked Then: release `r3` is used.</criteria>
    <criteria>Given: `--release r2` When: invoked Then: release `r2` and its template variables are used.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0001</depends>
</req>

<req id="FR-CLI-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>Unknown release rejected</title>
  <statement>If the selected release is not defined, the generator shall report the unknown release and the known releases and exit non-zero without generating output.</statement>
  <rationale>Fail clearly on misconfiguration.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: release `r9` When: invoked Then: stderr names `r9` and lists known releases and exit status is non-zero.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-CLI-0012" type="FR" level="System" ticketId="138" classification="technical">
  <title>Deterministic-hooks override with false default</title>
  <statement>The generator shall resolve the effective `deterministic_hooks` template variable as: the deterministic-hooks argument's boolean value when the argument is supplied, otherwise `false`. The effective value shall be resolved before template rendering and hook-bundle synchronization. A no-argument invocation therefore uses release `r3` (FR-CLI-0010) with `deterministic_hooks` false.</statement>
  <rationale>The common invocation `npx -y rosettify-plugins@latest` (no flags) shall be the intended default: release `r3`, deterministic hooks off. Operators opt into deterministic hooks explicitly with `--deterministic-hooks true`. Consequently the release descriptor's `deterministic_hooks` value records the release's native posture but is no longer the CLI default; the CLI default is `false` for every release. Trade-off: a no-argument run places no runtime hook bundles for any target.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-23</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `npx -y rosettify-plugins@latest` with no arguments When: invoked Then: it generates release `r3` with an effective `deterministic_hooks` value of false, placing no hook bundles.</criteria>
    <criteria>Given: `--release r3 --deterministic-hooks false` When: generated Then: no compiled hook bundle artifacts are placed and rendered configuration is valid JSON without advisory blocks.</criteria>
    <criteria>Given: `--release r2 --deterministic-hooks true` and present hook build output When: generated Then: hook bundles are placed and rendered configuration contains advisory blocks and is valid JSON.</criteria>
    <criteria>Given: `--deterministic-hooks true` and no release argument When: invoked Then: the default release (FR-CLI-0010) is used with an effective `deterministic_hooks` value of true.</criteria>
    <criteria>Given: `--release r3` and no deterministic-hooks argument When: generated Then: the effective `deterministic_hooks` value is false — no hook bundles are placed and rendered configuration has no advisory blocks.</criteria>
    <criteria>Given: no deterministic-hooks argument When: invoked Then: the effective value defaults to `false` regardless of the selected release.</criteria>
    <criteria>Given: a deterministic-hooks argument with a non-boolean value When: invoked Then: it reports usage and exits non-zero without generating output.</criteria>
  </acceptance>
  <depends>DATA-CFG-0001, FR-CLI-0010</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/generate.ts (effective `deterministic_hooks` defaults to false when `--deterministic-hooks` omitted); src/rosettify-plugins/src/cli.ts (help text); tests/generate-antigravity-cli-defaults.test.ts.</implementationNotes>
  <notes>The override replaces the default at resolution time; downstream behavior (FR-GEN-0011 conditionals, FR-HOOK-0020 gating, FR-HOOK-0021 presence check) reads only the effective value and needs no awareness of the override's origin. The release descriptor's `deterministic_hooks` (DATA-CFG-0001) is retained as the documented native posture; it is no longer consulted as the CLI default.</notes>
</req>

## Source (domain) resolution

<req id="FR-CLI-0030" type="FR" level="System" ticketId="315" classification="technical">
  <title>Domain folder filter over plugin sets</title>
  <statement>The generator shall accept a domain argument naming one or more comma-separated instruction folders under the selected release and shall build only those declared sets whose `folders` are all present in the named list; when the argument is absent every declared set shall be built. The argument shall select which sets build and shall neither alter any set's own folder composition nor its layering order, both fixed by that set's `folders` declaration (FR-SET-0020). A named folder that does not exist under `<instructionsSource>/<release>/` shall be reported and shall abort the run before any output is written.</statement>
  <rationale>Set composition is declared per set now, so the argument that used to choose the instruction layer has nothing left to choose; keeping the flag as a filter preserves the one operational use it had — building a single subject area without regenerating everything — while removing its power to produce a set whose composition differs from its declaration. Aborting on a folder that does not exist keeps a typo from silently selecting nothing.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no domain argument When: invoked Then: every set the configuration declares is built.</criteria>
    <criteria>Given: `--domain qe` When: invoked Then: only the `qe` set is built and nothing is written for any other set.</criteria>
    <criteria>Given: `--domain core,workflows` and sets `core` (`folders: [core]`), `workflows` (`folders: [workflows]`) and `rosetta` (`folders: [core, workflows, qe, search, modernization]`) When: invoked Then: `core` and `workflows` are built and `rosetta` is not, because not all of its folders are named.</criteria>
    <criteria>Given: `--domain qe` When: the `qe` set is built Then: its folder composition and layering order are exactly its declared `folders`, unaffected by the filter.</criteria>
    <criteria>Given: `--domain acme` and no `instructions/<release>/acme/` folder When: invoked Then: the missing folder is reported and the run exits non-zero without generating output.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: parseDomainTokens and selectSets (src/rosettify-plugins/src/spec/plugin-sets.ts)
  select which sets build without altering any set's folder composition or order; generate.ts checks each
  --domain token against <instructionsSource>/<release>/ before selection and aborts naming the unresolved
  folder and the absolute path searched. Tests: tests/unit/generate.test.ts.</implementationNotes>
  <depends>DATA-CFG-0001, DATA-CFG-0007, FR-SET-0020</depends>
  <notes>Organization content is declared as its own plugin set in the configuration rather than passed on the command line; org-overlay layering is retired entirely, so the argument no longer introduces a layer the configuration does not declare.</notes>
</req>

<req id="FR-CLI-0031" type="FR" level="System" ticketId="315" classification="technical">
  <title>Domain filter matching and empty selection</title>
  <statement>The domain filter shall match a declared set when every folder that set's `folders` list names appears in the argument list. Matching shall be by exact folder name, shall be insensitive to the order of the argument values, and shall ignore argument values no matched set uses. A set naming a folder absent from the list shall not be built. Where the filter matches no declared set, the run shall write no plugin output, report that the filter selected nothing, and exit zero — an empty selection is a legitimate outcome, distinct from the non-existent-folder abort in FR-CLI-0030.</statement>
  <rationale>Requiring every one of a set's folders to be named is what keeps the filter from producing a partial set: naming `core` alone must not yield a `rosetta` plugin missing four folders, because that output would be indistinguishable from a correct one. An empty selection exits zero because filtering to a set that exists but was not asked for is a caller's choice, while a folder name that resolves to nothing on disk is a mistake.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `--domain workflows,core` and a set declaring `folders: [core, workflows]` When: matched Then: the set is built; argument order is immaterial.</criteria>
    <criteria>Given: `--domain core` and a set declaring `folders: [core, workflows]` When: matched Then: the set is not built.</criteria>
    <criteria>Given: `--domain core,workflows,qe,search,modernization` When: matched Then: every declared set is built, the combo `rosetta` set included.</criteria>
    <criteria>Given: `--domain search,qe` where `qe` is used only by sets the filter does not otherwise match When: matched Then: the unused value is ignored rather than reported as an error.</criteria>
    <criteria>Given: a filter whose named folders exist but match no declared set When: the run completes Then: no plugin output is written, the empty selection is reported, and exit status is zero.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: selectSets (src/rosettify-plugins/src/spec/plugin-sets.ts) matches
  order-insensitively on exact folder names, ignores unused argument values, and builds a set only when every
  folder it names appears; generate.ts distinguishes a legitimate empty match, which exits zero without
  writing output, from the missing-folder abort of FR-CLI-0030. Tests: tests/unit/generate.test.ts.</implementationNotes>
  <depends>FR-CLI-0030, FR-SET-0020</depends>
  <notes>Bundling of same-path documents across a set's folders is FR-SET-0020 and FR-ARCH-0042. Bundling order is the set's declared `folders` order and no longer depends on command-line order, which resolves OQ-6.</notes>
</req>

## Plugin-set configuration

<req id="FR-CLI-0034" type="FR" level="System" ticketId="315" classification="technical"
     source="User" priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-CLI-0020"
     implementation="Implemented">
  <title>Plugin-set configuration path override</title>
  <statement>The generator shall accept a `--config <path>` argument that replaces the default plugin-set configuration location `<source>/src/rosettify-plugins/plugins.json`, resolving a relative value against `<source>` in exactly the manner `--pluginsSource` and `--profileSource` resolve theirs (FR-CLI-0020, FR-CLI-0033) and using an absolute value verbatim. The argument names one file, never a directory, and never more than one. Whether the resolved file exists, parses, and is structurally valid is FR-SET-0010, the single owner of the abort-on-bad-configuration outcome; this unit fixes only where the file is looked for.</statement>
  <rationale>Resolving against `<source>` rather than the process working directory keeps every input root moving together under one `--source` override, so building a checkout elsewhere stays a one-flag operation. Restricting the value to a single file mirrors `--profile` refusing path-like values: an argument with two meanings is the failure mode both rules exist to prevent.</rationale>
  <acceptance>
    <criteria id="FR-CLI-0034.AC1" ears="event" when="no `--config` argument is supplied" system="the generator" shall="resolve the configuration to `<source>/src/rosettify-plugins/plugins.json`"/>
    <criteria id="FR-CLI-0034.AC2" ears="event" when="`--config ci/plugins.json` is supplied" system="the generator" shall="resolve it to `<source>/ci/plugins.json`"/>
    <criteria id="FR-CLI-0034.AC3" ears="event" when="`--config` is supplied with an absolute path" system="the generator" shall="use that path verbatim, without joining it to `<source>`"/>
    <criteria id="FR-CLI-0034.AC4" ears="event" when="`--source <dir>` is supplied and `--config` is not" system="the generator" shall="resolve the configuration to `<dir>/src/rosettify-plugins/plugins.json`"/>
    <criteria id="FR-CLI-0034.AC5" ears="unwanted" if="the `--config` value names a directory rather than a file" system="the generator" shall="report usage and exit non-zero without generating output"/>
    <criteria id="FR-CLI-0034.AC6" ears="unwanted" if="the resolved configuration file is missing or cannot be parsed" system="the generator" shall="defer to FR-SET-0010 for the abort behavior"/>
  </acceptance>
  <implementationNotes>Implemented: resolveConfigPath in src/rosettify-plugins/src/spec/plugin-sets.ts is `override ===
  undefined ? defaultConfigPath(sourceRoot) : path.resolve(sourceRoot, override)`, wired at the single
  call site in src/rosettify-plugins/src/cli.ts. Verified by direct execution against a scratch source
  root: no override resolves to <source>/src/rosettify-plugins/plugins.json (AC1, AC4), `ci/plugins.json`
  resolves to <source>/ci/plugins.json (AC2), and an absolute value is used verbatim (AC3). AC6 defers to
  FR-SET-0010, which aborts naming the resolved path. The relative-resolution defect recorded here
  previously has been fixed at source. AC5 PARTIAL: a --config value naming a directory exits 1 and writes
  no output, but surfaces a raw `EISDIR: illegal operation on a directory` under the loader's prefix
  rather than the usage report the criterion words; the required outcome holds and only the diagnostic
  form differs.</implementationNotes>
  <notes></notes>
</req>

## Profile selection — NEW

<req id="FR-CLI-0032" type="FR" level="System" ticketId="315" classification="technical"
     source="User" priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-CLI-0033, DATA-CFG-0006, FR-SET-0030"
     implementation="Implemented">
  <title>Profile override across every set variant</title>
  <statement>The generator shall accept a `--profile` argument that names a single profile by name only, never a path, and shall load the profile descriptor from `<profileSource>/<name>.json` (FR-CLI-0033), where `<name>` is the argument value verbatim. When supplied, the named profile shall replace the profile every declared set variant names, for every set built in that run, and shall leave every variant's declared destination, plugin-name and plugin-description suffixes unchanged (FR-SET-0030). When the argument is absent, each variant shall build with the profile it declares, which may be none. The argument overrides only which profile is active; it shall not add, remove or reorder variants. A value that denotes a path — one containing a path separator or a filename extension — shall be rejected before any output is written.</statement>
  <rationale>Declaring the profile per variant is what lets one run produce both a standard and a lightweight distribution, so the flag can no longer mean "activate a profile that would otherwise be inactive". Retaining it as a blanket override keeps the one case declarations cannot serve — trying a candidate profile across every set without editing the configuration — while leaving suffixes on the variant, since overriding them too would collapse two variants onto one output folder.</rationale>
  <acceptance>
    <criteria id="FR-CLI-0032.AC1" ears="event" when="`--profile lightweight` is supplied" system="the generator" shall="load the profile descriptor from `<profileSource>/lightweight.json`"/>
    <criteria id="FR-CLI-0032.AC2" ears="event" when="no `--profile` argument is supplied" system="the generator" shall="build each variant with the profile that variant declares, activating no profile for a variant that declares none"/>
    <criteria id="FR-CLI-0032.AC3" ears="event" when="`--profile lightweight` is supplied while set `rosetta` declares a variant naming no profile and an empty destination suffix" system="the generator" shall="build that variant under `lightweight` and still write it to `rosetta-<ide>` with no suffix"/>
    <criteria id="FR-CLI-0032.AC4" ears="unwanted" if="the `--profile` value contains a path separator (`/` or `\`) or a `.json` extension" system="the generator" shall="report usage and exit non-zero without generating output"/>
    <criteria id="FR-CLI-0032.AC5" ears="unwanted" if="the named profile file is missing or cannot be parsed" system="the generator" shall="defer to FR-PROF-0001, the single owner of descriptor resolution and validation outcomes, for the abort behavior"/>
  </acceptance>
  <implementationNotes>Implemented: parseProfileName (src/rosettify-plugins/src/cli.ts) rejects path-like values pre-flight,
  and src/rosettify-plugins/src/generate.ts applies profileOverride ?? variant.profile uniformly across
  every set and variant in the run, leaving each variant's declared suffixes untouched. Verified by
  tests/unit/generate.test.ts asserting that the variant, not --profile, drives the suffix.</implementationNotes>
  <notes>Resolution is exactly `<profileSource>/<name>.json`; the profile source root is defined by FR-CLI-0033. Descriptor existence, parseability, and validation outcomes are owned by FR-PROF-0001.</notes>
</req>

<req id="FR-CLI-0033" type="FR" level="System" ticketId="" classification="technical"
     source="User" priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-CLI-0020"
     implementation="Implemented">
  <title>Profile source root override</title>
  <statement>The generator shall derive the profile source root from the global `source` argument as `<source>/src/rosettify-plugins/profiles`, and shall accept a `--profileSource` argument that, when supplied, replaces that default. The profile source root shall be derived and overridable in exactly the same manner as `instructionsSource`, `pluginsSource`, `hooksSource`, and `output` are derived from and override their `<source>`-based defaults (FR-CLI-0020, FR-CLI-0021).</statement>
  <rationale>Profiles live beside the other `<source>`-derived inputs and must be redirectable the same way, so a caller can point at an alternate profile directory without moving the whole source tree; reusing the established override pattern avoids a bespoke resolution rule.</rationale>
  <acceptance>
    <criteria id="FR-CLI-0033.AC1" ears="event" when="no `--profileSource` argument is supplied" system="the generator" shall="resolve the profile source root to `<source>/src/rosettify-plugins/profiles`"/>
    <criteria id="FR-CLI-0033.AC2" ears="event" when="`--profileSource <dir>` is supplied" system="the generator" shall="resolve the profile source root to `<dir>` while the other input locations remain derived from `source`"/>
    <criteria id="FR-CLI-0033.AC3" ears="event" when="`--source <dir>` is supplied and `--profileSource` is not" system="the generator" shall="resolve the profile source root to `<dir>/src/rosettify-plugins/profiles`"/>
    <criteria id="FR-CLI-0033.AC4" ears="state" while="a profile named `<name>` is active" system="the generator" shall="resolve its descriptor at `<name>.json` under the effective profile source root"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/cli.ts (--profileSource option; default <source>/src/rosettify-plugins/profiles derived from --source exactly as --pluginsSource, overridable). Tests: tests/e2e/profile.e2e.test.ts.</implementationNotes>
  <notes>Default path `<source>/src/rosettify-plugins/profiles` follows the settled decision; it mirrors how `--pluginsSource` derives from `--source`.</notes>
</req>

## Repo root and output

<req id="FR-CLI-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Source resolution (global source + per-source overrides)</title>
  <statement>The generator shall take a single global `source` argument, defaulting to the current directory (`.`), and shall derive each input and output location from it using OS-aware path joining: the instruction source at `<source>/instructions`, the preserved-files source at `<source>/src/rosettify-plugins/plugins`, the hooks source at `<source>/hooks`, and the profile source root at `<source>/src/rosettify-plugins/profiles`. Each derived location shall be independently overridable by its own argument — `instructionsSource`, `pluginsSource`, `hooksSource`, `profileSource` — which, when supplied, replaces the corresponding `<source>/…` default. The generator shall not take a "repository root" argument and shall not assume it runs inside any particular repository.</statement>
  <rationale>A self-contained utility is parameterized by a source root and optional per-input overrides, never by "the repo." Defaulting `source` to the current directory and deriving inputs from it makes the common case argument-free while keeping every input independently redirectable.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no `source` argument When: invoked Then: `source` is the current directory and the instruction source resolves to `./instructions`.</criteria>
    <criteria>Given: `--source <dir>` When: invoked Then: instruction source = `<dir>/instructions`, preserved-files source = `<dir>/src/rosettify-plugins/plugins`, hooks source = `<dir>/hooks`, profile source root = `<dir>/src/rosettify-plugins/profiles`, unless individually overridden.</criteria>
    <criteria>Given: `--instructionsSource <dir>` (or `--pluginsSource`/`--hooksSource`/`--profileSource`) When: invoked Then: that location is used in place of its `<source>/…` default and the others remain derived from `source`.</criteria>
    <criteria>Given: the argument list When: inspected Then: there is no repository-root argument.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/cli.ts (global --source with per-source overrides --instructionsSource/--pluginsSource/--hooksSource, and now --profileSource deriving the profile source root at <source>/src/rosettify-plugins/profiles; no repository-root argument). Tests: tests/e2e/profile.e2e.test.ts.</implementationNotes>
  <depends>DATA-CFG-0005</depends>
</req>

<req id="FR-CLI-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Output directory redirection</title>
  <statement>The generator shall write all targets into the output directory given by the `output` argument, defaulting to `<source>/plugins` (FR-CLI-0020).</statement>
  <rationale>Allows isolated output (e.g. for diffing) without touching the committed tree; the default derives from `source` like every other location.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-05</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no `output` argument When: invoked Then: output goes to `<source>/plugins`.</criteria>
    <criteria>Given: an `output` argument When: invoked Then: every target folder is created under it.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: clean-architecture re-implementation (CLI source model, RECON-9).</implementationNotes>
</req>

## Run modes

<req id="FR-CLI-0050" type="FR" level="System" ticketId="" classification="technical">
  <title>Dry-run mode</title>
  <statement>The generator shall accept a dry-run flag that, when set, causes it to emit the full target path and full target contents for every file to the output and to write nothing to disk.</statement>
  <rationale>Preview the complete generation without side effects.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `--dry-run` When: invoked Then: no files are created and each target file's path and content are emitted.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-CLI-0051" type="FR" level="System" ticketId="" classification="technical">
  <title>Verbose mode</title>
  <statement>The generator shall accept a verbose flag that, when set, expands logging to per-`VirtualFile`, per-processor decision detail.</statement>
  <rationale>Operators need granular traceability when diagnosing generation.</rationale>
  <source>User</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `--verbose` When: invoked Then: per-`VirtualFile` and per-processor log lines appear.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-CLI-0060" type="FR" level="System" ticketId="315" classification="technical">
  <title>Comprehensive help</title>
  <statement>The generator shall provide help that, in addition to the available commands/arguments and what each does, documents the origin source structure, the override and bundling behavior, the processors, the plugin specs, the plugin-set mechanism — the `--config` option, the plugin-set descriptor fields, and the `--domain` folder filter — and the profile mechanism — the `--profile` and `--profileSource` options, the profile descriptor field `modelOverrides`, and the filename-directive token forms `target-<id>-only`, `ide-<family>-only`, `set-<id>-only` and `profile-<name>-only`.</statement>
  <rationale>The tool's behavior is configuration-driven; a user cannot operate or extend it without the source layout, directive/override/bundling rules, processor catalog, and spec model in the help itself.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-03</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: help is requested When: shown Then: it lists each command/argument with its purpose.</criteria>
    <criteria>Given: help is requested When: shown Then: it additionally describes the origin source structure, the filename-directive override and bundling behavior, the processor catalog, and the plugin-specs model.</criteria>
    <criteria>Given: help is requested When: shown Then: it additionally documents the `--profile` and `--profileSource` options, the profile descriptor field `modelOverrides`, and the filename-directive token forms `target-<id>-only`, `ide-<family>-only`, `set-<id>-only` and `profile-<name>-only`, emitting no internal requirement identifiers.</criteria>
    <criteria>Given: help is requested When: shown Then: it additionally documents the `--config` option, the plugin-set descriptor fields (`name`, `folders`, `variants`, `template`, `releases`, `manifest`, `requires`, `bootstrap`, `hooks`), and the `--domain` folder filter over sets.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the help text in src/rosettify-plugins/src/cli.ts covers the profile mechanism and all
  four -only token forms, documents --config and --domain, and now interpolates SET_FIELDS,
  VARIANT_FIELDS and MANIFEST_FIELDS (exported from src/rosettify-plugins/src/spec/plugin-sets.ts)
  into the "Plugin sets" help block rather than hand-typing a second field list — the same
  drift trap FR-SET-0050 closes for the manifest description. Verified by spawning `--help` as a
  subprocess and asserting all nine SET_FIELDS names plus the VARIANT_FIELDS and MANIFEST_FIELDS
  names appear in stdout.</implementationNotes>
  <depends>FR-ARCH-0020, FR-ARCH-0024, FR-ARCH-0042, FR-ARCH-0001, FR-CLI-0032, FR-CLI-0033, FR-CLI-0034, DATA-CFG-0006, DATA-CFG-0007</depends>
</req>

## Orchestration

<req id="FR-CLI-0040" type="FR" level="System" ticketId="315" classification="technical">
  <title>Uniform per-(set variant × target) generation</title>
  <statement>The generator shall produce every (set variant × IDE target) pair by the same generation procedure from that set's resolved instruction source, with no pair derived from another pair's output and no required ordering between pairs — neither between the IDE targets of one set nor between the sets themselves.</statement>
  <rationale>All plugins are the same kind of output and must be producible independently; extending the rule across the set dimension is what keeps the matrix a flat list of independent builds rather than a dependency graph as it grows.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Analysis</verification>
  <acceptance>
    <criteria>Given: any single (set variant × IDE target) pair requested in isolation When: generated Then: its output is complete and correct.</criteria>
    <criteria>Given: any pair When: generated Then: its content is produced from that set's resolved instruction source (FR-SET-0020).</criteria>
    <criteria>Given: two sets sharing a folder, such as `rosetta` and `core` both drawing on `core` When: generated Then: neither reads the other's output and either may be produced first.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/generate.ts builds each planned (set, variant, target) pair
  independently through buildSpecsForSet, TARGET_BUILDERS and buildPipeline, with no processor reading
  another target's or set's output. Verified by tests/unit/generate.test.ts covering the one-invocation
  expansion of sets by variants by targets.</implementationNotes>
</req>

<req id="FR-CLI-0041" type="FR" level="System" ticketId="315" classification="technical">
  <title>Run-to-completion with aggregated status</title>
  <statement>When a recoverable error occurs while generating one (set variant × IDE target) pair, the generator shall record the error, continue generating the remaining pairs — those of the same set and those of every other set — and report a non-zero exit status if any error or limit violation occurred during the run. A pre-flight configuration or descriptor violation is not recoverable and aborts before any pair is attempted (FR-SET-0010, FR-PROF-0001).</statement>
  <rationale>Surface all problems in one run rather than aborting on the first.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a payload-size violation in one pair When: the run completes Then: every other pair is still generated and exit status is non-zero.</criteria>
    <criteria>Given: a recoverable error in one set When: the run completes Then: the remaining sets are still generated.</criteria>
    <criteria>Given: no errors When: the run completes Then: exit status is zero.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the per-spec processing loop in src/rosettify-plugins/src/generate.ts catches processor
  errors, records them in allErrors, sets anyError and continues to the next target, while pre-flight
  violations collected in preflightErrors abort before any planned build runs. Exit status is anyError ? 1
  : 0.</implementationNotes>
  <depends>NFR-0004</depends>
</req>

<req id="FR-CLI-0042" type="FR" level="System" ticketId="315" classification="technical">
  <title>Progress reporting</title>
  <statement>The generator shall emit structured progress (one JSON object per line) for each (set variant × IDE target) pair and major step, naming the set and the IDE target, on the standard error stream together with all error and warning lines; the standard output stream is reserved for `--dry-run` payload (FR-ARCH-0045) and stays empty on a normal run.</statement>
  <rationale>Operators run it in pre-commit and CI and must see what happened.</rationale>
  <source>Sources</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-03</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a normal run When: executed Then: one progress line per (set variant × IDE target) appears on stderr naming the set and the IDE target, and stdout is empty.</criteria>
    <criteria>Given: `--dry-run` When: executed Then: the would-write payload appears on stdout and progress remains on stderr.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: initLogger (src/rosettify-plugins/src/logging.ts) configures pino with destination 2, so
  ALL progress - the per-target Processing target and Target complete lines, named by set and IDE - is
  written to stderr and stdout stays empty on a normal run. buildPipeline's `out` parameter
  (src/rosettify-plugins/src/spec/targets.ts, default process.stdout) threads into pluginCopy and
  pluginWrite (src/rosettify-plugins/src/plugin-processors/plugin-write.ts): stdout is the `--dry-run`
  payload channel (FR-ARCH-0045), not a progress channel. Verified empirically: a normal `--domain qe`
  run produced 0 bytes on stdout and 2,079 bytes of progress on stderr; `--dry-run --domain qe`
  produced 2,707,684 bytes of file payload on stdout and 131,276 bytes of progress on stderr. Writing
  progress to stdout would corrupt `--dry-run > file` redirection, so the prior statement was wrong
  about the code, not the other way around. The per-plugin copied/renamed/generated breakdown the
  prior AC named is not emitted - the logged field is a single `frames` total; that breakdown and any
  TTY pretty-printing are recorded as backlog (priority Should) rather than blocking this unit.</implementationNotes>
</req>

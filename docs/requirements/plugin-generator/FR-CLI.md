# plugin-generator — FR: Invocation, Source Resolution, Orchestration

EARS-phrased functional requirements for invocation, source resolution, run modes, and orchestration.

## Invocation

<req id="FR-CLI-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Command-line invocation</title>
  <statement>The generator shall provide a command-line entry point accepting optional release, domain, source, per-source override, and output arguments (FR-CLI-0020), and shall return a process exit status reflecting run success.</statement>
  <rationale>Operators and the pre-commit step invoke it as a command. The tool is a self-contained utility parameterized by a source root, not by a repository.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no arguments When: invoked Then: it generates from the default release and default domain into the default output directory.</criteria>
    <criteria>Given: an unknown argument When: invoked Then: it reports usage and exits non-zero.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: clean-architecture re-implementation (CLI source model, RECON-9).</implementationNotes>
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
  <statement>The generator shall select the instruction release from the release argument, defaulting to `r2` when not supplied.</statement>
  <rationale>Releases coexist; the stable release is the default.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no release argument When: invoked Then: release `r2` is used.</criteria>
    <criteria>Given: `r3` When: invoked Then: release `r3` and its template variables are used.</criteria>
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

## Source (domain) resolution — NEW

<req id="FR-CLI-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>Domain-selected instruction source</title>
  <statement>The generator shall accept a domain argument naming one or more layer folders under the selected release, defaulting to `core`, and shall resolve the instruction source from `<instructionsSource>/<release>/<domain>/` (FR-CLI-0020).</statement>
  <rationale>Decouples the source layer from a hardcoded `core`, enabling organization overlays. Replaces the hardcoded `core`.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no domain argument When: invoked Then: source resolves to `<instructionsSource>/<release>/core/`.</criteria>
    <criteria>Given: `--domain acme` When: invoked Then: source resolves to `<instructionsSource>/<release>/acme/`.</criteria>
    <criteria>Given: a domain folder that does not exist When: invoked Then: it reports the missing source and exits non-zero without generating output.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: clean-architecture re-implementation (CLI source model, RECON-9).</implementationNotes>
  <depends>DATA-CFG-0001</depends>
</req>

<req id="FR-CLI-0031" type="FR" level="System" ticketId="" classification="technical">
  <title>Multi-domain layer bundling</title>
  <statement>Where the domain argument lists multiple comma-separated domains, the generator shall combine their trees in left-to-right order into one instruction source, such that documents at the same relative path from different domains are bundled together (their content concatenated) rather than one replacing the other, and files present in only one domain are included.</statement>
  <rationale>Lets an organization layer extend the base layer at generation time, mirroring the server Bundler's layered customization, which bundles same-path documents.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `--domain core` (no comma) When: invoked Then: behavior equals single-layer generation from `core`.</criteria>
    <criteria>Given: `--domain core,acme` and a document at the same relative path in both When: combined Then: the output document contains both domains' content bundled in domain order.</criteria>
    <criteria>Given: `--domain core,acme` and a file only in `core` When: combined Then: the `core` file is included.</criteria>
    <criteria>Given: `--domain core,acme` and a file only in `acme` When: combined Then: the `acme` file is included.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0030</depends>
  <notes>Bundle, not replace. Per-document override of a base by an overlay is explicitly deferred to a future requirement (FUTURE-OVERRIDE). Bundling order follows domain order; alignment with the server Bundler's `sort_order` ordering is OQ-1.</notes>
</req>

## Repo root and output

<req id="FR-CLI-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Source resolution (global source + per-source overrides)</title>
  <statement>The generator shall take a single global `source` argument, defaulting to the current directory (`.`), and shall derive each input and output location from it using OS-aware path joining: the instruction source at `<source>/instructions`, the preserved-files source at `<source>/src/plugin-generator/plugins`, and the hooks source at `<source>/hooks`. Each derived location shall be independently overridable by its own argument — `instructionsSource`, `pluginsSource`, `hooksSource` — which, when supplied, replaces the corresponding `<source>/…` default. The generator shall not take a "repository root" argument and shall not assume it runs inside any particular repository.</statement>
  <rationale>A self-contained utility is parameterized by a source root and optional per-input overrides, never by "the repo." Defaulting `source` to the current directory and deriving inputs from it makes the common case argument-free while keeping every input independently redirectable.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-05</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: no `source` argument When: invoked Then: `source` is the current directory and the instruction source resolves to `./instructions`.</criteria>
    <criteria>Given: `--source <dir>` When: invoked Then: instruction source = `<dir>/instructions`, preserved-files source = `<dir>/src/plugin-generator/plugins`, hooks source = `<dir>/hooks`, unless individually overridden.</criteria>
    <criteria>Given: `--instructionsSource <dir>` (or `--pluginsSource`/`--hooksSource`) When: invoked Then: that location is used in place of its `<source>/…` default and the others remain derived from `source`.</criteria>
    <criteria>Given: the argument list When: inspected Then: there is no repository-root argument.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: clean-architecture re-implementation (CLI source model, RECON-9). source model replaces the prior repo-root model (2026-06-05); pending owner review.</implementationNotes>
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

<req id="FR-CLI-0060" type="FR" level="System" ticketId="" classification="technical">
  <title>Comprehensive help</title>
  <statement>The generator shall provide help that, in addition to the available commands/arguments and what each does, documents the origin source structure, the override and bundling behavior, the processors, and the plugin specs.</statement>
  <rationale>The tool's behavior is configuration-driven; a user cannot operate or extend it without the source layout, directive/override/bundling rules, processor catalog, and spec model in the help itself.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: help is requested When: shown Then: it lists each command/argument with its purpose.</criteria>
    <criteria>Given: help is requested When: shown Then: it additionally describes the origin source structure, the filename-directive override and bundling behavior, the processor catalog, and the plugin-specs model.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0020, FR-ARCH-0024, FR-ARCH-0042, FR-ARCH-0001</depends>
</req>

## Orchestration

<req id="FR-CLI-0040" type="FR" level="System" ticketId="" classification="technical">
  <title>Uniform per-target generation</title>
  <statement>The generator shall produce every target by the same generation procedure from the resolved instruction source, with no target derived from another target's output and no required ordering between targets.</statement>
  <rationale>All targets are the same kind of output and must be producible independently.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Analysis</verification>
  <acceptance>
    <criteria>Given: any single target requested in isolation When: generated Then: its output is complete and correct.</criteria>
    <criteria>Given: any target When: generated Then: its content is produced from the resolved instruction source.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-CLI-0041" type="FR" level="System" ticketId="" classification="technical">
  <title>Run-to-completion with aggregated status</title>
  <statement>When a recoverable error occurs while generating a target, the generator shall record the error, continue generating the remaining targets, and report a non-zero exit status if any error or limit violation occurred during the run.</statement>
  <rationale>Surface all problems in one run rather than aborting on the first.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a payload-size violation in one target When: the run completes Then: all targets are still generated and exit status is non-zero.</criteria>
    <criteria>Given: no errors When: the run completes Then: exit status is zero.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>NFR-0004</depends>
</req>

<req id="FR-CLI-0042" type="FR" level="System" ticketId="" classification="technical">
  <title>Progress reporting</title>
  <statement>The generator shall emit human-readable progress for each target and major step, and shall direct error and warning lines to the standard error stream.</statement>
  <rationale>Operators run it in pre-commit and CI and must see what happened.</rationale>
  <source>Sources</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a normal run When: executed Then: per-target counts (copied/renamed/generated) appear on stdout and errors appear on stderr.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

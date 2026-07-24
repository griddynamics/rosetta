# plugin-generator — Non-Functional Requirements

ISO/IEC 25010 buckets. Metrics and conditions stated.

<req id="NFR-0001" type="NFR" level="System" ticketId="" classification="technical">
  <title>Per-target structural parity</title>
  <statement>For every target, the generator shall produce an output file-path set whose structure matches the layout derived from the instruction source tree and that target's mapping contract: the set of generated output file paths shall equal the set obtained by applying that target's documented mapping rules — folder placement, folder and file renames, source exclusions, generated folder indexes, rendered templates, preserved-file seeding, and alternate-name hook copies — to the current instruction source. Parity is defined over output file PATHS and folder layout only; it does not compare file content. Under `deterministicHooks:false` the output shall contain no `*.js` hook bundle, and no target output shall contain a `*.tmpl` file.</statement>
  <rationale>Structure is the durable, content-agnostic acceptance surface: each target must lay out the correct files for whatever the current source contains. Deriving the expected path set from the actual source tree (not a frozen snapshot) makes the check self-updating, so the owner can add or remove skills, workflows, rules, or subagents and the gate stays valid without edits — a newly added source file appears in both the derived-expected and the generated-actual sets. Content correctness is verified separately (per-target unit and E2E tests); this requirement isolates the layout contract.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-23</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: release r3, domain core generated for any target When: its generated output file-path set is compared to the set derived from the instruction source and that target's mapping contract Then: the two sets are equal — no path is only-in-expected and none only-in-actual.</criteria>
    <criteria>Given: a skill, workflow, rule, or agent added to or removed from the instruction source When: the target is regenerated Then: the derived-expected and generated-actual path sets change identically and remain equal, with no change to the parity test.</criteria>
    <criteria>Given: any generated target output tree When: inspected Then: it contains no `*.tmpl` file, and under `deterministicHooks:false` it contains no `*.js` hook bundle.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: verified by src/rosettify-plugins/tests/e2e/parity.e2e.test.ts + tests/e2e/parity-derive-structure.ts — per-target derived-vs-generated path-set equality over all seven targets (r3/core, deterministicHooks:false), plus a robustness probe proving add/remove safety. The derivation is an independent restatement of STRUCTURES.md / FR-VAR-* / FR-COPY-* / FR-SEED-*, read from the live source, not from generator code.</implementationNotes>
  <notes>Redefined from the former byte-for-byte parity stance: the previous generator (the byte-identity reference) was removed in r2, its snapshot baselines were gitignored and are no longer produced, so a content-diff oracle can no longer run. Parity is now structural (path/layout) per target; content is covered by the sample and Antigravity E2E suites and the unit tests.</notes>
</req>

<req id="NFR-0002" type="NFR" level="System" ticketId="" classification="technical">
  <title>Deterministic, reproducible output</title>
  <statement>Given identical inputs, the generator shall produce identical output across runs, processing files in a stable sorted order.</statement>
  <rationale>Reliability: reproducible builds; clean diffs in version control.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two runs with identical inputs When: outputs compared Then: they are identical.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0003" type="NFR" level="System" ticketId="" classification="technical">
  <title>Idempotent re-generation</title>
  <statement>The generator shall be safely re-runnable, wiping and rebuilding generated content while preserving each target's config folder and preserved files, and shall produce a complete output into a clean or empty output directory by first seeding the preserved files from their committed source.</statement>
  <rationale>Reliability: re-running must not accumulate stale artifacts, and a first run into a clean directory must not depend on preserved files already committed in the output tree.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two consecutive runs When: the second completes Then: output equals a single-run output with no leftover files.</criteria>
    <criteria>Given: an empty output directory When: a single run completes Then: each target output is complete, equal to a run into a pre-populated output directory.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-COPY-0001, FR-SEED-0001</depends>
</req>

<req id="NFR-0004" type="NFR" level="System" ticketId="" classification="technical">
  <title>Bootstrap context size limit</title>
  <statement>The generator shall treat any single bootstrap context entry's ORIGINAL content — the bootstrap document text itself, measured BEFORE any IDE-specific JSON wrapping/escaping/duplication — exceeding 10000 characters as a soft error: it shall report each offending target and file, still emit the output, and set a non-zero exit status. The limit is about the actual content an agent has to read, not the incidental size of whichever wire format carries it; the same content must not pass or fail the check depending on which IDE's entry shape happens to be measured.</statement>
  <rationale>Compatibility: IDE session-start context has a size budget; the run completes so all problems surface at once, and the non-zero exit signals the violation. The limit applies to the original content so the same document gets the same verdict regardless of which IDE's wire format happens to carry it.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by>User</approved_by>
  <changed>2026-07-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document whose ORIGINAL content (after the bootstrap prefix and folder rewrites, before any IDE JSON wrapping) is over 10000 chars When: assembled for ANY IDE Then: a violation is reported naming the target and file, the output is still emitted, and exit status is non-zero.</criteria>
    <criteria>Given: a document whose original content is under 10000 chars but whose wrapped/escaped/IDE-specific entry (e.g. Copilot's merged top-level+nested emit, which duplicates the content) would exceed 10000 chars if measured post-wrapping When: assembled Then: NO violation is reported — the check is IDE-shape-independent.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/bootstrap/payload.ts (assembleBootstrapPayload checks `rewrittenContext.length` — the additionalContext body, post-prefix/post-folder-rewrite, pre-JSON-wrapping); src/rosettify-plugins/src/plugin-processors/plugin-assemble-{claude,codex,cursor,copilot}-bootstrap.ts (EntryBuilderFn callback signature).</implementationNotes>
</req>

<req id="NFR-0005" type="NFR" level="System" ticketId="" classification="technical">
  <title>Generated artifact validity</title>
  <statement>Every generated configuration artifact shall be syntactically valid in its format: JSON for hook configuration and manifests, TOML for Codex subagents.</statement>
  <rationale>Functional correctness: invalid config breaks the IDE plugin.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any generated `hooks.json`, `plugin.json`, or subagent TOML When: parsed Then: parsing succeeds.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0006" type="NFR" level="System" ticketId="" classification="technical">
  <title>Release- and content-agnostic engine</title>
  <statement>The generation engine shall contain no per-release or per-instruction-content branching; adding a release or a domain shall require only descriptor/config changes.</statement>
  <rationale>Maintainability: generator stays generic (agents/MEMORY.md "Keep Generators Generic And Content-Agnostic").</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the engine code When: inspected Then: release names and instruction file names appear only in descriptors/config, not in control flow.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0007" type="NFR" level="System" ticketId="" classification="technical">
  <title>Modular, single-responsibility structure</title>
  <statement>The re-implementation shall separate concerns into distinct, reusable units across two processor tiers: the pure single-responsibility `FileProcessor` set (`fileRead`, `fileApplyOverrides`, `fileBundle`, per-vocabulary model-normalization processors, `fileRename`, `fileCodexAgentFormat`) where `fileRename` changes only the path; the pure `PluginProcessor` set (`pluginCleanup`, `pluginCopy`, `pluginProcessSpecEntries`, `pluginRewriteReferences`, `pluginGenerateIndexes`, `pluginInjectSections`, `pluginAssembleBootstrap`, `pluginRenderTemplates`, `pluginWrite`) where `pluginRewriteReferences` changes only content; plus source resolution/merge, per-IDE escaping, hook-bundle sync, and per-target descriptors — such that each IDE adaptation is data plus processor composition, not bespoke procedure.</statement>
  <rationale>Maintainability: separable single-responsibility concerns enable reuse and isolated testing. The original's one-module mix of filesystem mechanics, escaping, model maps, and orchestration (QF-6) is exactly what this decomposition removes.</rationale>
  <source>User</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-09</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the re-implementation When: inspected Then: filesystem mechanics, IDE-specific escaping, model maps, and orchestration reside in separate units.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: the single `fileNormalizeModels` in the `FileProcessor` catalog is replaced by per-vocabulary model-normalization processors.</implementationNotes>
  <notes>Detailed architecture deliberately deferred by the user; this NFR states the quality target only.</notes>
</req>

<req id="NFR-0008" type="NFR" level="System" ticketId="" classification="technical">
  <title>TypeScript / npx runtime</title>
  <statement>The re-implementation shall run on Node via `npx` with no build step required by the consumer, using a Handlebars engine whose raw-injection and conditional semantics match the current templates and Node filesystem operations equivalent to the current copy/move/stat behavior.</statement>
  <rationale>Portability: stated target runtime.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Demo</verification>
  <acceptance>
    <criteria>Given: a clean environment with Node When: `npx <tool>` is run Then: it generates all targets without a separate install/build step.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0009" type="NFR" level="System" ticketId="" classification="technical">
  <title>Cross-platform hook payloads</title>
  <statement>For IDEs requiring it, the generator shall emit both POSIX-shell and PowerShell command forms with correct per-interpreter escaping.</statement>
  <rationale>Compatibility: plugins run on macOS/Linux and Windows.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot target When: generated Then: each hook entry carries valid bash and PowerShell forms.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-HOOK-0005</depends>
</req>

<req id="NFR-0010" type="NFR" level="System" ticketId="" classification="technical">
  <title>Lightweight libraries, versions consistent with rosettify</title>
  <statement>The re-implementation shall use robust, well-maintained libraries instead of hand-rolling solved problems, pinned to versions consistent with the rosettify package, targeting the same Node and TypeScript baseline (ESM, Node ≥ 22, TypeScript 6.x, vitest for tests). The selected concerns and libraries are: CLI parsing (`commander`), logging (`pino`), templating (`handlebars`), frontmatter parsing (`gray-matter` — not a hand-rolled regex parser), immutable state with structural sharing (`immer`, realizing FR-ARCH-0014), and glob matching for `SpecEntry` sources (`fast-glob`). Each library is subject to the selection criteria in NFR-0011, and any library whose default formatting differs from the current output shall be supplemented by generator-controlled serialization to preserve structural parity (NFR-0001).</statement>
  <rationale>Maintainability: a sibling Node tool in the same repo must share toolchain and dependency versions to avoid drift, and must reuse vetted libraries for solved problems (frontmatter, immutability, globbing) rather than re-implementing them as the original Python did.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the package manifest When: inspected Then: CLI uses `commander`, logging uses `pino`, templating uses `handlebars` (major versions matching rosettify — commander ^14, pino ^10), frontmatter uses `gray-matter`, immutable state uses `immer`, and globbing uses `fast-glob`.</criteria>
    <criteria>Given: the toolchain When: inspected Then: it is ESM, Node ≥ 22, TypeScript 6.x, tested with vitest, matching rosettify.</criteria>
    <criteria>Given: frontmatter handling When: inspected Then: it uses a library, not a bespoke regex parser.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>NFR-0008, NFR-0011</depends>
</req>

<req id="NFR-0011" type="NFR" level="System" ticketId="" classification="technical">
  <title>Dependency selection criteria (popular, maintained)</title>
  <statement>Every third-party dependency the generator adds shall be widely adopted and actively maintained: high npm download volume and repository popularity, a recent release / commit history (not abandoned or unattended for an extended period), responsive issue handling, a permissive license, and a small, focused footprint. Dependencies shall be pinned and kept consistent with the rosettify package. A library failing these criteria shall not be introduced even if functionally adequate; the current status shall be re-checked at implementation time.</statement>
  <rationale>Maintainability and supply-chain safety: abandoned or low-adoption dependencies are a liability; the maintainer requires that added libraries be proven and current, not merely working.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: each added dependency When: assessed Then: it shows high adoption (downloads/stars), a recent release within an active maintenance window, and a permissive license.</criteria>
    <criteria>Given: a candidate library that is adequate but unmaintained or low-adoption When: assessed Then: it is rejected in favor of a maintained, adopted alternative.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

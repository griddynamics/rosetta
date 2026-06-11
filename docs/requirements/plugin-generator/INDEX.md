# plugin-generator — Requirements Index

Reverse-engineered requirements for the Rosetta plugin generator: the build step that transforms an instruction source tree (`instructions/<release>/<domain>/`) into IDE plugin distributions. Source of truth for a clean re-implementation (target runtime: TypeScript, run via `npx`).

Grep a header below for a one-line description and the file it lives in.

## Files

### SCOPE.md — In/out of scope, actors, entry points, goals, non-goals, global constraints.
### GLOSSARY.md — Domain terms: release, domain, plugin variant, target, bootstrap hook, template, standalone.
### MODEL.md — Configuration contract: release, plugin-target, per-target transform descriptors, and the `src/plugin-generator/plugins/<target>` preserved-file source location (`DATA-*`).
### FR-ARCH.md — The single normative architecture: uniform spec contract, immutable flat VFS with structural sharing, filename directives, and the **two-tier** pure processor pipeline — `FileProcessor`s over a `FileProcessingFrame` (`fileRename` path-only) and `PluginProcessor`s over a `PluginProcessingFrame` (`pluginRewriteReferences` content-only, by lookup over the per-file frames); no imperative pre/post passes (`FR-ARCH-*`).
### FR-CLI.md — Invocation, release selection, source (domain) resolution + bundling, run modes (dry-run/verbose), orchestration, exit status (`FR-CLI-*`).
### FR-COPY.md — As-is behaviors recast onto FR-ARCH: preserved-file seeding (`pluginCopy`), output reset (`pluginCleanup`), copy (`fileRead`/`pluginWrite`), model normalization (per-vocabulary processors), folder placement (`SpecEntry` `target`) and suffix renames (`fileRename`), content reference rewriting (`pluginRewriteReferences`), alternate-name duplication (`SpecEntry`) (`FR-SEED-*`, `FR-COPY-*`).
### FR-GEN.md — Folder index generation and template rendering (`FR-GEN-*`).
### FR-HOOK.md — Per-target bootstrap-context payload assembly and hook-bundle synchronization (`FR-HOOK-*`).
### FR-VAR.md — Per-target structure, reasoning, and bootstrap-delivery strategy (hooks vs native rules vs auto-loaded instructions), incl. two-hook-set rationale; per-variant output properties (`FR-VAR-*`).
### NFR.md — Non-functional requirements: parity, determinism, idempotency, portability, limits (`NFR-*`).
### REFERENCES.md — Authoritative per-IDE configuration guides to consult under `instructions/r3/core/configure/` for plugin/subagent/skill/command/rule/hook structure and links (`INT-IDE-*`).
### STRUCTURES.md — Generalized example folder structure per target (preserved vs generated, with provenance), grounded in a v3 build (`FR-STRUCT-*`).
### ASSUMPTIONS.md — Assumptions, flagged implementation accidents/quirks, open questions.

### CHANGES.md — Requirement change log with reconciliation history (date, IDs affected, before/after, baseline evidence).

## Status

All requirement units are `Draft` and `<implementation>NotStarted</implementation>` (implementation reset — the prior attempt failed). The requirements are **reverse-engineered from the Python generator (`scripts/plugin_generator.py`) and unified onto a single clean target architecture (FR-ARCH) for a TypeScript/npx re-implementation.** There is one architecture: the as-is behavior FRs are recast in place as processors/`SpecEntry` data (not a competing procedural model), while remaining the parity reference (NFR-0001).
- **Behavior carried over from the Python generator (recast onto FR-ARCH)** — FR-CLI (core), FR-COPY, FR-GEN, FR-HOOK, FR-VAR, FR-STRUCT, MODEL, most NFR.
- **New / target-state design** — FR-ARCH (whole): two-tier processors, FR-ARCH-0005 (no identity branching / no identity-discriminant flags; variation by composition), FR-ARCH-0014 (immutability + structural sharing), 0030/0039 (`FileProcessingFrame`/`PluginProcessingFrame`), 0035 (every step a processor; no pre/post passes), 0043 (`fileRename` path-only), 0049 (`pluginRewriteReferences` by frame lookup), 0052/0053/0054 (`pluginCleanup`/`pluginCopy`/`pluginProcessSpecEntries`), 0055 (`pluginAssembleBootstrap`); FR-CLI-0030/0031 (`--domain` + bundling), FR-CLI-0040 (uniform generation), FR-CLI-0050/0051 (dry-run/verbose); FR-HOOK-0009 (explicit, significant bootstrap-file order); FR-VAR-0050/0051 (standalones uniform-from-source), FR-VAR-0070/0071/0072 (bootstrap delivery); NFR-0007/0008/0010 (modularity, TS/npx, libraries); INT-IDE (guide references).

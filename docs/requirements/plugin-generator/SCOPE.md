# plugin-generator — Scope

## Purpose

The plugin generator produces ready-to-install IDE plugin distributions from the Rosetta instruction source tree. Each distribution is one plugin set — a declared composition of instruction folders — adapted to one IDE's file format, directory layout, model vocabulary, and bootstrap-delivery mechanism. One invocation produces every declared set for every IDE target.

## In Scope

- Resolving the plugin-set configuration and, from it, each set's instruction source: the folders that set declares, layered under the selected release.
- Sourcing each plugin's preserved files from the effective preserved-file source (`<pluginsSource>/<template>-<ide>/`, where the `--pluginsSource` value defaults to `src/rosettify-plugins/plugins`) and copying them into the plugin output before generation, so a plugin can be produced into a clean or empty output directory. Preserved templates are shared across sets.
- Producing every (set variant × IDE target) pair in one run: the IDE targets are Claude Code, Cursor, Copilot, Codex, the Cursor and Copilot standalone distributions, and Antigravity — a single combined plugin (`antigravity`) serving all three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE).
- Per-IDE adaptation: model normalization, agent file format, directory layout, cross-reference rewriting, template rendering, bootstrap-context delivery, and hook-bundle placement. Folder-index generation is retained as a capability but declared by no set (FR-GEN-0001, dormant).
- Plugin-set configuration: the `--config <path>` option, the default location `<source>/src/rosettify-plugins/plugins.json`, per-set folders, variants, template, manifest fields, `requires` metadata, bootstrap flag and hook list, and fail-fast validation of all of it.
- Profile selection and descriptor: the profile a set variant names, the `--profile <name>` override and `--profileSource <dir>` option, and loading the profile descriptor from `<profileSource>/<name>.json`.
- Profile effects: resolving the effective model vocabulary (a profile's per-target block replaces that target's built-in map) and the profile filename-directive token (`ProfileOnlyToken`). Destination and manifest suffixing belong to the set variant, not the profile.
- Always-on `subagent_required_model` filtering through the same per-IDE selection and effective model vocabulary, de-duplicating survivors and re-emitting them. This applies on every run, with or without a profile.
- Command-line invocation and process exit status.

## Out of Scope (Non-Goals)

- Authoring or editing instruction content (skills, agents, workflows, rules, templates).
- Building the hook source bundles. The generator consumes pre-built bundles from `src/hooks/dist/`; compiling TypeScript hook sources is a separate concern.
- The pre-commit orchestration that invokes the generator (`scripts/pre_commit.py`).
- Publishing instructions to the Rosetta server / RAGFlow (the CLI's job).
- Installing or distributing the generated plugins into IDEs or marketplaces. For Antigravity specifically, the install/extraction location is documented for the user and is not a generator concern.
- Migrating existing requirement units to a different schema.
- Profile-driven selection of which sets or targets build.
- Changing `--pluginsSource` semantics.
- Writing `.claude-plugin/marketplace.json`; marketplace entries stay hand-maintained.
- Enforcing that a set's `requires` list is satisfied at install time; no target IDE has a plugin dependency mechanism.
- Authoring the plugin-set configuration's content; the generator consumes it, it does not compose it.
- Profile influence over release selection or hook posture.
- Changing Antigravity's model handling.

## Deprecations

- **Gemini CLI is not a generator target.** It is deprecated, superseded by Antigravity CLI (per Google's own migration guidance). Any Gemini CLI *target* reference found in these requirements or in the `src/rosettify-plugins/` code is to be removed; legitimate `gemini-*` model identifiers and Antigravity's `~/.gemini/*` product paths are retained (they are not the Gemini CLI product).

## Actors

- **Maintainer (operator):** runs the generator (directly or via pre-commit) to regenerate the `plugins/` tree after editing instruction sources.
- **Generator (system):** the subject of every requirement below.
- **IDE / coding agent (downstream consumer):** reads the generated plugin tree. Its format expectations are the source of most adaptation requirements.

## Entry Points

- CLI: `npx -y rosettify-plugins@latest [--release …] [--config …] [--domain …] [--source …] [--output …]`.

## Global Constraints

- **Uniform generation.** Every (set variant × IDE target) pair is produced the same way from its set's instruction source. No pair is derived from another pair's output, and there is no required ordering between pairs — neither across IDE targets nor across sets.
- **Source isolation.** Generation reads from the instruction source and writes only into the output directory; it never mutates the instruction source.
- **Preserved configuration.** Each plugin's preserved files (IDE manifest / config folder, hook templates, any `.mcp.json`) have a committed source under `src/rosettify-plugins/plugins/<template>-<ide>/`; the generator seeds them into the output before generation and keeps them across regeneration. Only generated content is wiped and rebuilt. The preserved source holds one folder per (template × main IDE target) pair and grows only when an IDE or a template is added, never when a set is.
- **Run-to-completion error handling.** A recoverable error in one target does not abort the run; all problems surface in a single run and the process exit status reflects whether any error occurred.

## Goals

- A maintainer regenerates every plugin set and variant with one command and obtains installable, IDE-correct distributions.
- Adding a future release, a plugin set, or a set variant requires data/config changes only, not control-flow changes.
- Output is reproducible across runs given identical inputs.

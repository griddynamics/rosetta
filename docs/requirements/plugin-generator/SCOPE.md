# plugin-generator — Scope

## Purpose

The plugin generator produces ready-to-install IDE plugin distributions from a single Rosetta instruction source tree. Each distribution carries the same instruction content, adapted to one IDE's file format, directory layout, model vocabulary, and bootstrap-delivery mechanism.

## In Scope

- Resolving the instruction source from a release and one or more domain layers.
- Sourcing each target's preserved files from a committed preserved-file source (`src/rosettify-plugins/plugins/<target>/`) and copying them into the target output before generation, so a target can be produced into a clean or empty output directory.
- Producing every plugin variant: Claude Code, Cursor, Copilot, Codex, and the Cursor and Copilot standalone distributions.
- Per-IDE adaptation: model normalization, agent file format, directory layout, cross-reference rewriting, index generation, template rendering, bootstrap-context delivery, and hook-bundle placement.
- Command-line invocation and process exit status.

## Out of Scope (Non-Goals)

- Authoring or editing instruction content (skills, agents, workflows, rules, templates).
- Building the hook source bundles. The generator consumes pre-built bundles from `src/hooks/dist/`; compiling TypeScript hook sources is a separate concern.
- The pre-commit orchestration that invokes the generator (`scripts/pre_commit.py`).
- Publishing instructions to the Rosetta server / RAGFlow (the CLI's job).
- Installing or distributing the generated plugins into IDEs or marketplaces.

## Actors

- **Maintainer (operator):** runs the generator (directly or via pre-commit) to regenerate the `plugins/` tree after editing instruction sources.
- **Generator (system):** the subject of every requirement below.
- **IDE / coding agent (downstream consumer):** reads the generated plugin tree. Its format expectations are the source of most adaptation requirements.

## Entry Points

- CLI: `npx rosettify-plugins@latest [--release …] [--domain …] [--source …] [--output …]`.

## Global Constraints

- **Uniform generation.** Every plugin target is produced the same way from the instruction source. No target is derived from another target's output, and there is no required ordering between targets.
- **Source isolation.** Generation reads from the instruction source and writes only into the output directory; it never mutates the instruction source.
- **Preserved configuration.** Each target's preserved files (IDE manifest / config folder, hook templates, any `.mcp.json`) have a committed source under `src/rosettify-plugins/plugins/<target>/`; the generator seeds them into the output before generation and keeps them across regeneration. Only generated content is wiped and rebuilt.
- **Run-to-completion error handling.** A recoverable error in one target does not abort the run; all problems surface in a single run and the process exit status reflects whether any error occurred.

## Goals

- A maintainer regenerates all plugin variants with one command and obtains installable, IDE-correct distributions.
- Adding a future release or a new domain layer requires data/config changes only, not control-flow changes.
- Output is reproducible across runs given identical inputs.

---
name: init-workspace-flow-discovery
description: "Phase 3 Discovery of init-workspace-flow"
tags: ["init", "workspace", "discovery", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_discovery>

<description_and_purpose>
Produces foundational technical documentation (TECHSTACK, CODEMAP, DEPENDENCIES) that all subsequent phases depend on.
</description_and_purpose>

<workflow_context>
- Phase 3 of 9 in init-workspace-flow
- Input: filesystem, state.mode, state.composite
- Output: TECHSTACK, CODEMAP, DEPENDENCIES on disk
- Prerequisite: Phase 1 complete (mode known), Phase 2 complete or skipped
</workflow_context>

<phase_steps>
1. Read state and confirm mode
2. Acquire and execute discovery
3. Update state
</phase_steps>

<check_mode step="3.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 1 complete and mode is set
3. If upgrade mode: note which discovery files already exist
</check_mode>

<execute_discovery step="3.2">

Act as a senior workspace cartographer — fast, factual technical inventory. Without factual inventory of tech stack, structure, and dependencies, subsequent phases operate blind.

<discovery_process>

1. All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed
2. Read existing TECHSTACK, CODEMAP, DEPENDENCIES — update if present, create if missing
3. Detect languages, frameworks, build tools, package managers, runtime environments → write TECHSTACK
4. Existing documentation may be stale or incomplete, prioritize source code artifacts over pre-existing documents
5. Generate CODEMAP via shell commands (no pseudo graphics), 3-4 levels deep
   - Perform basic discovery yourself with few commands
   - Enumerate git repositories yourself
   - Markdown headers = workspace-relative path + recursive children count + <10 words description
   - List only immediate children files and only with file names
   - List target repository source code, static assets, and documentation files based on tech stack
   - Exclude noise/caches/build/binary files, files excluded by .gitignore
   - Implement as a single shell script in `agents/TEMP/` folder
   - Use `git ls-files --cached --others --exclude-standard` in each repository or fallback to find/ls/etc with filters
6. List direct dependencies (project, package, version) → write DEPENDENCIES
7. Preserve human-added sections in existing files
8. Update (or create only if missing) .gitignore in git root folder by adding lines according to `bootstrap_rosetta_files` (roster in SKILL `load-project-context`)
   Minimal set must be present:
   ```
   ...
   # Rosetta
   agents/TEMP/
   refsrc/
   !refsrc/INDEX.md
   ```

</discovery_process>

<files>

# DEPENDENCIES.md

- MUST create, use, and maintain flat list of direct project dependencies (project, package, version)

# TECHSTACK.md

- MUST create, use, and maintain project stack and key stack decisions

# CODEMAP.md

- MUST create, use, and maintain list folders and files within the code base
- Contains 3-4 levels deep folder structure
- Markdown headers = workspace-relative path + recursive children count + <10 words description
- Lists only immediate children files and only with file names

</files>

<discovery_pitfalls>

- Keep only current state — no deltas, no changelogs, no update reasons, no changes explanations, no summaries, the shorter the better.

</discovery_pitfalls>

<references>

USE SKILL `codemap` to generate the project codemap and incorporate it into the discovery notes.

</references>

Finally:
- If state.composite: create registry-style top-level docs referencing sub-repo versions
</execute_discovery>

<update_state step="3.3">
1. Write to `agents/init-workspace-flow-state.md`:
   - TECHSTACK status (created | updated | skipped)
   - CODEMAP status (created | updated | skipped)
   - DEPENDENCIES status (created | updated | skipped)
   - Phase 3 completion timestamp
2. Log gaps for Phase 8
</update_state>

<validation_checklist>
- TECHSTACK exists with language/framework entries
- CODEMAP exists with shell-output-style tree
- DEPENDENCIES exists
- If composite: registry-style top-level docs reference sub-repos; each sub-repo has its own set of docs
</validation_checklist>

</init_workspace_flow_discovery>

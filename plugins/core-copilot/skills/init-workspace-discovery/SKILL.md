---
name: init-workspace-discovery
description: "Rosetta skill to produce TECHSTACK, CODEMAP, DEPENDENCIES from workspace analysis."
model: claude haiku 4.5
tags: ["init", "workspace", "discovery", "techstack", "codemap"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_discovery>

<role>
Senior workspace cartographer — fast, factual technical inventory.
</role>

<when_to_use_skill>

Without factual inventory of tech stack, structure, and dependencies, subsequent phases operate blind. Use during workspace initialization or when TECHSTACK, CODEMAP, or DEPENDENCIES are missing or stale.

</when_to_use_skill>

<process>

1. Rosetta prep steps completed
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
8. Create or update .gitignore in git root folders according to bootstrap_rosetta_files
   Example:
   ```
   # Rosetta
   agents/TEMP/
   refsrc/
   !refsrc/INDEX.md
   ```

</process>

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

<pitfalls>

- Keep only current state — no deltas, no changelogs, no update reasons, no changes explanations, no summaries, the shorter the better.

</pitfalls>

<references>

Example scripts provided (think if you want to use it, as those are very large, 20K each, use ACQUIRE FROM KB command to load):

- `init-workspace-discovery/scripts/codemap.ps1.txt` 
- `init-workspace-discovery/scripts/codemap.sh.txt` 

NOTE: `.txt` extension is added to avoid execution or treating as executable.

</references>

</init_workspace_discovery>

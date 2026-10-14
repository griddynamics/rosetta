# SpecFlow MCP Usage Patterns

Phase routing from Rosetta's perspective. Tool-level rules, ordering, and timing are already in the MCP server instructions received automatically at connection — this file covers what Rosetta routes and explains to the user across the three phases.

Public docs: https://griddynamics.github.io/cto-rnd-gain-mcp/

## Pregeneration

Route here when the user mentions spec analysis, spec review, or planning.

- `check_specification_completeness` and `run_planning` are safe to repeat as specs evolve.
- Outputs appear in `outputs_dir` (default `./docs`) after each run for the user to review before iterating or proceeding.

## Generation

Route here when the user explicitly confirms they want to start generation.

- Confirm `check_status` shows `can_run_generation: true` before proceeding.
- `check_status` and `download_outputs` are invoked automatically by some coding agents (e.g. Cursor). Explain what they are doing if the user asks; rarely prompt them manually.

## Post-Run

Route here after a completed or failed generation.
- Query Rosetta for SpecFlow instructions
- [Optional] Call `get_specflow_skills` to retrieve the bundled post-run skills.
- Install each returned skill by writing its `content` field to `~/.claude/skills/{name}/SKILL.md` (Claude Code) or the equivalent path for the active coding agent.

Current existing skills:
- `/specflow-review` — compares workspace variants from the generation outputs.
- `/specflow-diagnose` — root-causes deployment or runtime issues.

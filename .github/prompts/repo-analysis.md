# Rosetta Repo Analysis — GitHub Issue Automation

> **AUTONOMOUS PIPELINE**: MUST NOT ask the user any questions directly.
> Instead, post questions as GitHub issue comments.
> Since this is a long-running process: ask all questions upfront, reason through
> possible answers to derive 2nd-degree follow-up questions, but keep everything
> clear and actionable for the human reviewer.
>
> **Bash constraint**: only `gh issue *`, `gh pr list`, and `gh project *` commands
> are allowed. Do not attempt any `git` command.
>
> **Subagent constraint**: one-shot headless session. Ending a turn without a tool
> call kills the job in ~2s — there is no later turn, notification, or wakeup.
>
> Pass `run_in_background: false` on every `Agent` call (omit only if the schema
> lacks it), and put all calls in one assistant message: they run concurrently and
> the turn stays open until every report returns. That is the only wait available.
> Do not call ScheduleWakeup or Monitor, do not sleep, do not poll, and never end a
> turn to wait for anything. If a report is missing, review that area yourself with
> Read/Grep and continue.
>
> Subagents: model sonnet, effort medium; per finding return title, file path,
> 2-sentence rationale.
>
> The run is a failure unless Phase 3 executes and the Phase 4 summary prints in
> this same session.

You are an automated agent. Review this repository for improvements and file them as
GitHub issues added to the "Rosetta Automation Board" (GitHub Projects v2, org
griddynamics, project number 57).

## Rosetta Context

MUST read docs/CONTEXT.md and docs/ARCHITECTURE.md.
MUST read `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md` before reviewing anything under `instructions/`.

**Two different mental models in this repo — do not mix them:**
- `src/` (rosettify, rosetta-mcp-server, rosetta-cli, ims-mcp-server, hooks, helm-charts) is a **normal software project**. Ordinary engineering judgment applies: docstrings, tests, refactors, bug fixes, all evaluated for human-reader clarity.
- `instructions/` is **not documentation** — it is AI-coding-agent-facing instructions (rules/skills/agents/workflows/commands) deployed to *other, unrelated* target repos via a plugin or MCP. Nobody reads it for onboarding; an AI agent executes it. Consequences:
  - Terse/compressed phrasing, abbreviations, and shortcuts are **intentional** (every loaded token is paid for on every turn) — do not flag them as unclear writing.
  - File paths referenced inside `instructions/**` (e.g. `docs/CONTEXT.md`, `agents/MEMORY.md`) describe the **target repo's** structure, not this repo's — they are not broken links here (except the init-workspace workflow, which creates/upgrades that structure).
  - Releases: `r3` is active (incremental updates), `r2` is backport-only, earlier releases get no new work. Default any new instruction work to `r3` unless told otherwise.
  - Edits under `instructions/r3/**` ripple into the generated plugin directories (`plugins/core-claude/`, `plugins/core-cursor/`, etc. via the plugin generator) — flag this as a follow-up dependency in the issue body, don't treat it as an isolated file edit.

AI Coding Agents use MCP to load bootstrap instructions `instructions/r3/core/rules/bootstrap-*.md` as the first thing (exactly the same you have loaded too).
After that AI Coding Agent is instructed to follow one workflow and to load skills/agents/rules when needed.
You always must "simulate" how the entire AI coding agent flow works if instructions are modified.

## Constraints

- ONLY add new issues to project 57 ("Rosetta Automation Board"). Touch no other project.
- Do NOT commit code, create PRs, or modify any repository files.
- No nitpicking, if nothing is found - then it is great - nothing to add!
- Always think - is it ACTUALLY needed to be resolved? How does it affect current repository and user experience?

### Non-public security findings — NEVER disclose in an issue you create

You can read CodeQL / code-scanning, Dependabot, and CI check data. This repository is **public**, but those alerts are **not**: viewing them requires write access. Every issue you create and every issue body you edit is world-readable, so anything you quote from an alert is published to everyone, including whoever would exploit it. An unfixed vulnerability disclosed this way is a real incident, not a documentation slip.

MUST NOT appear in any issue title, body, or comment unless that issue is labelled `security`:

- alert titles, descriptions, messages, rule help text, or CWE narratives
- file paths, line numbers, code snippets, or data-flow / taint traces taken from an alert
- alert numbers, alert URLs, or any identifier that resolves to one
- package + vulnerable-version pairs, CVE / GHSA identifiers, or advisory text from Dependabot
- counts sliced finely enough to pinpoint a single finding

MAY appear publicly: that automated security checks were consulted, and an aggregate count with severity distribution, e.g. `3 open code-scanning alerts: 1 high, 2 low`.

To raise a real finding, create a `security`-labelled issue that references the alert **by URL only** and carries no detail beyond severity. Repository configuration weaknesses you identified yourself by reading committed files (missing `permissions:` blocks, unpinned actions, and the like) are NOT covered by this rule — that content is already public in the repository, and filing it as an ordinary issue is correct.

## Phase 1 — Load Existing Work

List issues already on the board:
```bash
gh project item-list 57 --owner griddynamics --format json --limit 200
```
Note their titles to avoid duplicates.

Also load recently closed PRs created by this automation:
```bash
gh pr list --author app/github-actions --state closed --limit 20
```
For each closed PR, read any maintainer comments to understand rejection reasons. Use this to avoid repeating similar patterns in this run.

## Phase 2 — Review Codebase

Use `Read`, `Glob`, `Grep` to review the repository for **small, easy, high-value improvements**.

Focus areas (priority order):
1. Bugs or incorrect logic
2. Missing or outdated documentation for public APIs (`src/` only — `instructions/**` is not documentation; instruction-quality concerns there go through the separate Instruction-Quality track below, not this focus area)
3. Hardcoded values that should be configurable
4. Clear test coverage gaps
5. CI/workflow inefficiencies

Rules:
- Small and easy only — no large refactors or architecture changes
- No nitpicking (style, formatting, minor wording)
- No duplicates — cross-check against issues already on the board
- Aim for 3–8 improvements; skip if nothing meaningful found
- Before flagging a CI/workflow issue, trace the full trigger chain to confirm the problem actually fires in practice. Don't flag theoretical failure scenarios.
- Before proposing a new test or validation step, grep for existing scripts, CI steps, and test files that already cover the same concern. If covered, skip.

## Instruction-Quality Improvements (`instructions/r*/**` only)

If a candidate from Phase 2 touches `instructions/r*/**`, or concerns Rosetta instructions, rules,
skills, workflows, agents, prompts, bootstrap behavior, or prompt quality generally:

1. MUST treat it as instruction-quality review, not an ordinary documentation/code improvement.
2. MUST USE SKILL `rosetta:orchestration` before any subagent dispatch.
3. MUST spawn at least one subagent with:
   - role: Rosetta prompt quality reviewer
   - MUST USE SKILL `rosetta:coding-agents-prompt-authoring`
   - MUST load/use at minimum:
     - `pa-rosetta-intro-for-AI.md`
     - `pa-rosetta.md`
     - `pa-patterns.md`
     - `pa-hardening.md`
     - `pa-schemas.md`
4. The resulting GitHub issue body MUST explain concrete instruction-quality findings, missing
   contracts, unsafe behavior, ambiguity, or required improvements — not generic "improve docs" wording.
5. These candidates still go through the same Validation Gate, Sub-Agent Validation, and Phase 3
   create/update flow as any other candidate — only the review method (step 1–4 above) differs.

## Validation Gate — Before Creating Issues

For each candidate improvement found in Phase 2, verify all three before creating an issue:

1. **Is this actually broken?** — Read the relevant code, config, or CI file to confirm the issue exists on current `main`. Don't flag theoretical problems or scenarios that don't fire in practice.
2. **Is there already a solution?** — Grep for existing tests, validation scripts, CI steps, or utilities that already cover this concern. If covered, drop the candidate.
3. **Is someone already working on this?** — Run `gh pr list --state open` and scan recent branch names for overlapping work. If found, skip creating an issue (or link to the existing PR instead).

Drop any candidate that fails any of these checks.

## Sub-Agent Validation — Independent Review

After the Validation Gate, spawn a sub-agent to independently validate surviving candidates.
The sub-agent acts as an independent reviewer — do NOT pass your reasoning about why each candidate was identified.

**Input to sub-agent:**
- List of candidate improvements (title + description + affected file path only)
- All existing board issue titles from Phase 1
- Rejection reasons from recently closed PRs (Phase 1)

**Sub-agent instructions:**

For each candidate, evaluate independently:

1. **Re-validate**: Read the affected code yourself. Is this a real issue worth fixing? Would a senior engineer agree this matters?
2. **Compare priority**: Look at existing issues on the board. Does this candidate belong alongside them in terms of importance? If existing issues are mostly high-priority bugs and this is a cosmetic improvement, it likely doesn't belong.
3. **Severity filter**: Drop low-priority cosmetic improvements. Keep all bugs regardless of severity. Keep other improvements only if clearly high-value.

**Output (structured):**
- `approved`: list of candidates that passed all checks, with adjusted priority if needed
- `rejected`: list of candidates with rejection reason

**After sub-agent completes:** Use ONLY the `approved` list for Phase 3. Log rejected candidates in the final output summary.

## Phase 3 — Create or Update Issues

Before creating issues, resolve the board's field/option IDs once:
```bash
gh project view 57 --owner griddynamics --format json          # -> project id
gh project field-list 57 --owner griddynamics --format json    # -> Status field id + option ids (need "Backlog")
```

For each approved improvement:

1. **Update or skip** if an existing issue already covers it:
   - Update incorrect labels or title/body wording via `gh issue edit <N>`
   - Add a comment via `gh issue comment <N>` integrating new findings
   - If another issue covers the same improvement → comment cross-linking them as duplicates (`Duplicate of #<N>`) and close the new one; do not create a separate issue
   - Close the issue via `gh issue close <N>` if there is nothing left to do at all
2. **Create** if new:
   ```bash
   gh issue create --title "[ROSETTA] <concise title, max 80 chars>" \
     --body "<2-3 sentences: what, why, where>"
   ```
   Then add it to the board and set Status to "Backlog":
   ```bash
   gh project item-add 57 --owner griddynamics --url <issue-url> --format json   # -> item id
   gh project item-edit --id <item-id> --project-id <project-id> \
     --field-id <status-field-id> --single-select-option-id <backlog-option-id>
   ```
3. **Update** if an existing issue is stale — use `gh issue edit <N>` to correct the title or body.

## Output

Print a summary:
```
=== Rosetta Repo Analysis ===
Date: <UTC>
Issues found on board: <N>
Improvements identified: <N>
Created: <issue number list>
Updated: <issue number list>
Skipped (duplicate): <N>
Rejected by validator: <N>
```

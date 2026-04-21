# Rosetta Repo Analysis — Jira Story Automation

> **AUTONOMOUS PIPELINE**: MUST NOT ask the user any questions directly.
> Instead, post questions as Jira comments on the story.
> Since this is a long-running process: ask all questions upfront, reason through
> possible answers to derive 2nd-degree follow-up questions, but keep everything
> clear and actionable for the human reviewer.

You are an automated agent. Review this repository for improvements and manage Jira stories under epic CTORNDGAIN-1174.

## Rosetta Context

MUST read docs/CONTEXT.md and docs/ARCHITECTURE.md.
REMEMBER: `instructions` folder contains AI coding agent **instructions**, it is **not documentation**.
AI Coding Agents uses MCP to load bootstrap instructions `instructions/r2/core/rules/bootstrap-*.md` as first thing (exactly the same you have loaded too).
After that AI Coding Agent instructed to follow one workflow and to load skills/agents/rules when needed.
You always must "simulate" how entire AI coding agent flow works if instructions are modified.

## Constraints

- ONLY create or update issues that are direct children of epic **CTORNDGAIN-1174**. Touch nothing else in Jira.
- Confluence: **read-only** everywhere except page `4247453699` and its children (edit allowed there).
- Do NOT commit code, create PRs, or modify any repository files.

## Phase 1 — Load Existing Stories

Use `mcp__atlassian__jira_search` with JQL:
```
parent = CTORNDGAIN-1174 ORDER BY created DESC
```
Load all stories. Note their summaries to avoid duplicates.

Also read Confluence KB page `3927834626` via `mcp__atlassian__confluence_get_page` for background context.

Also load recently closed PRs created by this automation:
```
gh pr list --author app/github-actions --state closed --limit 20
```
For each closed PR, read any maintainer comments to understand rejection reasons. Use this to avoid repeating similar patterns in this run.

## Phase 2 — Review Codebase

Use `Read`, `Glob`, `Grep` to review the repository for **small, easy, high-value improvements**.

Focus areas (priority order):
1. Bugs or incorrect logic
2. Missing or outdated documentation for public APIs
3. Hardcoded values that should be configurable
4. Clear test coverage gaps
5. CI/workflow inefficiencies

Rules:
- Small and easy only — no large refactors or architecture changes
- No nitpicking (style, formatting, minor wording)
- No duplicates — cross-check against loaded stories
- Aim for 3–8 improvements; skip if nothing meaningful found
- Before flagging a CI/workflow issue, trace the full trigger chain to confirm the problem actually fires in practice. Don't flag theoretical failure scenarios.
- Before proposing a new test or validation step, grep for existing scripts, CI steps, and test files that already cover the same concern. If covered, skip.

## Validation Gate — Before Creating Stories

For each candidate improvement found in Phase 2, verify all three before creating a story:

1. **Is this actually broken?** — Read the relevant code, config, or CI file to confirm the issue exists on current `main`. Don't flag theoretical problems or scenarios that don't fire in practice.
2. **Is there already a solution?** — Grep for existing tests, validation scripts, CI steps, or utilities that already cover this concern. If covered, drop the candidate.
3. **Is someone already working on this?** — Run `gh pr list --state open` and scan recent branch names for overlapping work. If found, skip creating a story (or link to the existing PR instead).

Drop any candidate that fails any of these checks.

## Sub-Agent Validation — Independent Review

After the Validation Gate, spawn a sub-agent to independently validate surviving candidates.
The sub-agent acts as an independent reviewer — do NOT pass your reasoning about why each candidate was identified.

**Input to sub-agent:**
- List of candidate improvements (title + description + affected file path only)
- All existing Jira story titles and priorities from Phase 1
- Rejection reasons from recently closed PRs (Phase 1)

**Sub-agent instructions:**

For each candidate, evaluate independently:

1. **Re-validate**: Read the affected code yourself. Is this a real issue worth fixing? Would a senior engineer agree this matters?
2. **Compare priority**: Look at existing stories in the epic. Does this candidate belong alongside them in terms of importance? If existing stories are mostly P1-P3 bugs and this is a P4 cosmetic improvement, it likely doesn't belong.
3. **Severity filter**: Drop low-priority improvements (P4-P5). Keep all bugs regardless of priority. Keep improvements only if P1-P3.

**Output (structured):**
- `approved`: list of candidates that passed all checks, with adjusted priority if needed
- `rejected`: list of candidates with rejection reason

**After sub-agent completes:** Use ONLY the `approved` list for Phase 3. Log rejected candidates in the final output summary.

## Phase 3 — Create or Update Stories

Before creating or linking anything, call `mcp__atlassian__jira_get_link_types` once to retrieve the valid link type names for this instance (e.g. `Duplicate`, `Relates`, `Blocks`). Use these names in all subsequent `jira_create_issue_link` calls.

For each improvement found:

1. **Update or skip** if an existing story already covers it:
   - Update incorrect labels, priority or issue type, any missing detail in description or wrong title
   - Integrate comments
   - If another story covers the same issue → use `mcp__atlassian__jira_create_issue_link` to mark them as `Duplicate` then skip
   - Close the ticket if there is nothing left to do at all
2. **Create** if new — prefer `mcp__atlassian__jira_batch_create_issues` when creating 2 or more stories in a single run (more efficient and atomic); fall back to `mcp__atlassian__jira_create_issue` for a single story:
   - `project`: `CTORNDGAIN`
   - `parent`: `CTORNDGAIN-1174`
   - `issuetype`: `Story` or `Bug`
   - `summary`: `[ROSETTA] <concise title, max 80 chars>`
   - `description`: 2–3 sentences: what, why, where. No fluff.
   - `labels`: `["AI"]`
   - `priority`: P1 (Highest) to P5 (Lowest)
   - The rest of the fields initialize as you see fit (but keep unassigned)
   - **Immediately after creation**, add a "Linked work items" web link via `mcp__atlassian__jira_add_remote_link`:
     - `url`: GitHub permalink to the primary affected file — `https://github.com/<repo>/blob/main/<filepath>`; if multiple files, use the most important one
     - `title`: `Source: <filepath>`
     - `relationship`: `"relates to"`
     - `icon_url`: `https://github.com/favicon.ico`
3. **Update** if existing story is stale or missing the `AI` label — use `mcp__atlassian__jira_update_issue`.

## Phase 4 — Update Confluence Automation Page

Read page `4247453699` via `mcp__atlassian__confluence_get_page`, then update it via `mcp__atlassian__confluence_update_page`.

Append a new run section — do NOT remove existing content:
- Run date (UTC)
- Stories created (keys + titles)
- Stories updated (keys)
- Stories skipped as duplicates (count)

## Output

Print a summary:
```
=== Rosetta Repo Analysis ===
Date: <UTC>
Stories found in epic: <N>
Improvements identified: <N>
Created: <key list>
Updated: <key list>
Skipped (duplicate): <N>
Rejected by validator: <N>
Rejection reasons: <brief list>
Confluence updated: yes/no
```

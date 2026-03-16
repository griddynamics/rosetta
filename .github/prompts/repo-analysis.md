# Rosetta Repo Analysis — Jira Story Automation

> **AUTONOMOUS PIPELINE**: MUST NOT ask the user any questions directly.
> Instead, post questions as Jira comments on the story.
> Since this is a long-running process: ask all questions upfront, reason through
> possible answers to derive 2nd-degree follow-up questions, but keep everything
> clear and actionable for the human reviewer.

You are an automated agent. Review this repository for improvements and manage Jira stories under epic CTORNDGAIN-1174.

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

## Phase 3 — Create or Update Stories

For each improvement found:

1. **Skip** if an existing story already covers it.
2. **Create** if new — use `mcp__atlassian__jira_create_issue`:
   - `project`: `CTORNDGAIN`
   - `parent`: `CTORNDGAIN-1174`
   - `issuetype`: `Story` or `Bug`
   - `summary`: `[ROSETTA] <concise title, max 80 chars>`
   - `description`: 2–3 sentences: what, why, where. No fluff.
   - `labels`: `["AI"]`
   - `priority`: P1 (Highest) to P5 (Lowest)
   - The rest of the fields initialize as you see fit (but keep unassigned)
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
Confluence updated: yes/no
```

# Session usage: S-CC-03 (reduced, built from `/cost`, not from the session log)

This file is **not** the output of `scripts/session-usage.py`. The raw session log of this run was deleted before the script was run, so the per-agent, per-operator-message and tool / skill / subagent breakdowns, the exact token totals and the before/after-T1 split are **not available**. What is here are the three `/cost` readings of the session, per model, exactly as the runner displayed them (token counts rounded to 0.1k / 0.1m by the runner). Nothing is added up or subtracted.

Readings:

- **T1:** read about 2 minutes after the agent's first "done" (15:27), before the hidden-question check.
- **T2:** read about 1 minute after the last follow-up was done (15:45).
- **After the post-implementation prompt:** read the next morning (cache cold). Not part of T2.

## By model

| Reading | Model | Used by | Input | Output | Cache read | Cache write | Cost, USD |
|---|---|---|---|---|---|---|---|
| T1 | `claude-sonnet-5-5` | main | 4.9k | 94.6k | 26.0m | 252.2k | 4.56 |
| T1 | `claude-opus-5-5` | subagent (final reviewer) | 25.9k | 25.4k | 4.9m | 120.0k | 2.19 |
| T1 | `claude-haiku-5-5` | runner-internal | 1.3k | 17 | 0 | 0 | 0.0001 |
| T1 | **session total** | | | | | | **6.76** |
| T2 | `claude-sonnet-5-5` | main | 7.4k | 114.1k | 35.7m | 290.9k | 5.89 |
| T2 | `claude-opus-5-5` | subagent (final reviewer) | 25.9k | 25.4k | 4.9m | 120.0k | 2.19 |
| T2 | `claude-haiku-5-5` | runner-internal | 1.3k | 17 | 0 | 0 | 0.0001 |
| T2 | **session total** | | | | | | **8.08** |
| After post-prompt | `claude-sonnet-5-5` | main | 11.5k | 120.0k | 37.9m | 298.8k | 6.21 |
| After post-prompt | `claude-opus-5-5` | subagent (final reviewer) | 25.9k | 25.4k | 4.9m | 120.0k | 2.19 |
| After post-prompt | `claude-haiku-5-5` | runner-internal | 1.3k | 17 | 0 | 0 | 0.0001 |
| After post-prompt | **session total** | | | | | | **8.40** |

## Other `/cost` fields

| Reading | Total duration (API) | Requests (main) | Code changes |
|---|---|---|---|
| T1 | 21m 7s | 150 | 136 lines added, 0 removed |
| T2 | 23m 59s | 178 | (not recorded) |
| After post-prompt | 24m 49s | 183 | 194 lines added, 0 removed |

Skills and subagents panel of `/cost` at T2: `/superpowers:test-driven-development` 4%, `/superpowers:writing-plans` 1%, `/superpowers:brainstorming` 1%; subagents: `general-purpose` 18%; plugin `superpowers` 6%.

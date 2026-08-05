# Board automation — how it works

Four pipelines drive one GitHub Projects v2 board, **Rosetta Automation Board**
(org `griddynamics`, project 57). Board membership is the scoping mechanism: only
issues on the board are eligible for AI work.

```
repo-analysis ──files issues──▶ Backlog
                                  │
                    (human sets Priority on the issue)
                                  │
                repo-plan ────────┤ Backlog + Priority set and not Low
                                  ▼
                            In progress   ── plan written into the issue description
                                  │
                        (human reviews, moves the card)
                                  ▼
                                Ready
                                  │
             repo-implement ──────┤
                                  ▼
                            In progress ──▶ PR opened ──▶ In review
```

`repo-triage` is separate: it reacts to PR/issue events and does not add cards.

## The two gates are human

- **Backlog → Ready** is the plan-approval gate. It is coding-flow phase 6
  (`user_review_plan`) expressed on the board. No agent may make this move.
- **PR review** is coding-flow phase 10 (`user_review_impl`).

Agents never promote their own work past either gate.

## Priority

Priority is a **native GitHub Issue field**, not a Projects v2 field. The board
column is a derived view of it. This matters: `gh project item-list` cannot see it,
so the loader reads it from `Issue.issueFieldValues` over GraphQL. Reading it off
the project item returns `None` for every card and silently plans nothing.

The gate applies **only** to the planner: unset or `Low` is never planned. There is
no priority gate on the implementer — a human moving a card to `Ready` is the
decision to build it. Skips are logged, never silent.

## coding-flow is split across the two runs

| phase | plan | implement |
|---|---|---|
| 0 prerequisites | ✅ | ✅ |
| 1 discovery, 2 design, 4 tech_plan, 5 review_plan | ✅ | ✗ |
| 3, 6, 10 (HITL) | mapped to the board/PR gates above | |
| 7 implementation, 8 review_code, 9 impl_validation, 11 tests, 12 review_tests, 13 final_validation | ✗ | ✅ |

The plan is written to **one place**: a `## 🤖 Rosetta Plan` section appended to the
issue description, original body preserved verbatim, replaced in place on re-plan.
Questions and clarifications go in comments, never in the description.

## Headless constraints these pipelines must respect

`anthropics/claude-code-action@v1` runs Claude headless and breaks on the first
`result` message, killing the CLI within ~2s. Consequences, all measured:

- The `Agent` tool **backgrounds by default**. A backgrounded subagent's report is
  delivered on a later turn, which never comes. Every agent must pass
  `run_in_background: false`; several `Agent` calls in one assistant message run
  **concurrently** (verified at 8, no wave cap) and hold the turn open until all
  report. Parallel and blocking are not in tension.
- `ScheduleWakeup` is a silent no-op and its result text falsely claims the harness
  will re-invoke you. It is in `--disallowedTools`.
- `Monitor` returns a launch ack in 0.02s and takes no task handle. `SendMessage`
  returns no finding and restarts a finished agent. Standalone `sleep` is refused
  at >=25s.
- Enforcement is belt-and-braces: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` (job env,
  step env, and `$GITHUB_ENV` on analysis), `--disallowedTools ScheduleWakeup`, and
  the prompt constraint.

### `--allowedTools` must be quoted

`claude_args` is shell-tokenized. An unquoted value is split on whitespace, and
every `Bash(gh issue view:*)` pattern contains a space — the SDK then receives
`"Bash(gh"`, `"issue"`, `"view:*)"` and **`Bash` ends up entirely unallowlisted**.
This silently disabled `repo-plan` and `repo-triage` completely. Always quote it.

## Failure is loud

`claude-code-action` decides success from `subtype`/`is_error` alone. It never reads
`terminal_reason` (which has a `background_requested` value) and discards the
`background_tasks_changed` messages it receives — so a run that abandons its
subagents and does nothing looks identical to a clean one.

`.github/scripts/check_trace.py` runs after every pipeline and fails the job if the
main agent backgrounded a subagent, if a dispatch never returned, or if nothing was
mutated. It parses the trace **structurally** — substring greps do not work, because
the prompt text is echoed inside the trace via `Read` results, so
`grep 'gh issue create'` matches on runs that never called it.

`.github/scripts/scrub_trace.py` runs before every trace upload. The trace is a full
tool transcript published as a downloadable artifact, outside Actions log masking,
and the implementer holds `Bash(*)` with a PAT in the git remote URL.

## Terminal states

- **In review** — PR open, waiting on a human.
- **In progress with a `⚠️` comment** — needs a human and is deliberately picked up
  by no pipeline. Used when an issue cannot be automated at all (e.g. its whole
  scope is a `.github/workflows/` edit the CI token may not push). Returning such a
  card to Backlog would re-plan it every cycle forever.

## Manual runs

Both `repo-plan` and `repo-implement` accept an `only_issues` dispatch input
(comma-separated issue numbers) to scope a run without touching board data. It is
applied before the priority gate, so a scoped run still reports which of the named
issues the gate excluded.

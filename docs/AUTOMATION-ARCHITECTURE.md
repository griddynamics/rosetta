# Board automation — how it works

Four pipelines drive one GitHub Projects v2 board, **Rosetta Automation Board**
(org `griddynamics`, project 57). Board membership is the scoping mechanism: only
issues on the board are eligible for AI work.

## Status lanes

| lane | meaning | moved in by | picked up by |
|---|---|---|---|
| `Backlog` | needs planning | repo-analysis, or the user | **planner** — only if Priority is set and not `Low` |
| `Planning` | planner claimed it, working | planner (start) | — |
| `Ready` | plan written, awaiting user review | planner (end) | — |
| `Scheduled` | user authorised implementation | **the user** | **implementer** — no priority filter |
| `In progress` | implementer claimed it, working | implementer (start) | — |
| `In review` | PR open, awaiting user review | implementer (end) | — |
| `Done` | done | the user | — |

```
Backlog ─▶ Planning ─▶ Ready ─▶ Scheduled ─▶ In progress ─▶ In review ─▶ Done
└── planner: load, claim, end ──┘└── implementer: load, claim, end ──┘
                                ▲                                    ▲
                          user decides                         user decides
```

`repo-triage` is separate: it reacts to PR/issue events and does not add cards.

## Why the lanes are shaped this way

Each pipeline gets three lanes — one it loads from, one it claims into, one it ends
in — and its terminal lane is never its input lane. Re-processing is therefore
structurally impossible: a planned card cannot be re-planned, nor an implemented card
re-implemented, unless the user moves it back.

The claim into the working lane is the concurrency lock and the only visible signal
that a pipeline is running. A crashed run parks its card in a working lane
(`Planning` / `In progress`), which no pipeline loads — so nothing loops, and the card
is visibly waiting for the user.

Neither lane an agent loads from (`Backlog`, `Scheduled`) is one anybody moves a card
into casually. `Scheduled` reads as a decision because that is what it is: moving a
card there authorises writing code.

## The two gates are the user's

- **`Ready` → `Scheduled`** is the plan-approval gate — coding-flow phase 6
  (`user_review_plan`) expressed on the board.
- **`In review` → `Done`** is PR review — coding-flow phase 10 (`user_review_impl`).

Agents never make either move.

## Priority

Priority is a **native GitHub Issue field**, not a Projects v2 field. The board
column is a derived view of it. This matters: `gh project item-list` cannot see it,
so the loader reads it from `Issue.issueFieldValues` over GraphQL. Reading it off
the project item returns `None` for every card and silently plans nothing.

The gate applies **only** to the planner: unset or `Low` is never planned. There is
no priority gate on the implementer — the user moving a card to `Scheduled` is the
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

`.github/scripts/check_trace.py` runs after all four pipelines and fails the job if
the main agent backgrounded a subagent or a dispatch never returned. It also fails
when nothing was mutated — except under `--allow-no-op`, which triage uses: the
board-driven pipelines are pulled by board state that guarantees work exists, so
doing nothing is a failure there, while triage is event-driven and may legitimately
have nothing to say about a PR. It parses the trace **structurally** — substring greps do not work, because
the prompt text is echoed inside the trace via `Read` results, so
`grep 'gh issue create'` matches on runs that never called it.

`.github/scripts/scrub_trace.py` runs before every trace upload. The trace is a full
tool transcript published as a downloadable artifact, outside Actions log masking,
and the implementer holds `Bash(*)` with a PAT in the git remote URL.

## Terminal states

- **`In review`** — PR open, waiting on the user.
- **A working lane (`Planning` / `In progress`) with a `⚠️` comment** — needs the
  user. No pipeline loads a working lane, so the card waits instead of looping. Used
  when a run cannot complete, or when an issue cannot be automated at all.

## Pushing workflow files

The implementer may edit `.github/workflows/`. What governs this is the **PAT's
`workflow` scope**, which `SELF_AUTOMATION_PROJECTS_TOKEN` carries — not the job's
`permissions:` block. There is no `workflows` permission key at all (an earlier
`workflows: write` line in this repo was invalid YAML and granted nothing), and the
push uses the PAT via `git remote set-url`, not `GITHUB_TOKEN`.

Consequence worth holding in mind: with `Bash(*)`, a `workflow`-scoped PAT, and no
branch protection on `main`, this pipeline can rewrite the guardrails that constrain
it — including `check_trace.py`, `scrub_trace.py` and `--disallowedTools`. Branch
protection on `main` requiring a reviewed PR is the mitigation; the prompt asking
nicely is not.

## Scoping a run

There is no dispatch input for this, deliberately. **The board is the scoping
mechanism.** To plan fewer issues, set Priority on fewer issues. To implement fewer,
move fewer cards to `Scheduled`. Any out-of-band scoping input would be a second control
surface that bypasses the board and diverges from what the board shows.

## Future: trigger the planner on issue events instead of cron

Setting Priority is what makes a `Backlog` card plannable, and Priority is a native
**Issue** field — so the planner does not need to wait for a cron tick. The `issues`
event is repository-scoped and a valid workflow trigger, and its activity types include
`field_added` and `field_removed` for native field changes:

```yaml
on:
  issues:
    types: [field_added, field_removed, opened, reopened]
```

The job still loads the board as it does today, so the event is only a wake-up: the
`Backlog` + Priority gate stays the single source of truth and an event for an
irrelevant issue costs one fast `load-stories` run that exits with `has_work=false`.
Worth confirming against a live event which action fires when a Priority value is
*changed* rather than first set, before relying on the `types` list above.

The implementer cannot be triggered this way. Its gate is the board `Status` moving to
`Scheduled`, which is a Projects v2 change, and `projects_v2_item` is an
**organization**-scoped webhook that repository workflows cannot subscribe to.
(`actionlint` accepts `on: projects_v2_item:` — that is a false positive from a
permissive event list, not evidence it fires.) Options there are an org webhook relaying
to `repository_dispatch`, or simply a shorter cron: `load-stories` exits in seconds when
nothing matches and the agent jobs are gated on `has_work`, so a 15-minute cadence costs
almost nothing.

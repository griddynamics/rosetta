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

## Debounce before claiming

On an `issues`-triggered run only, the workflow polls the issue's `updatedAt` and waits
until it has been unchanged for 5 minutes before claiming the card. Editing an issue
produces a stream of events, so without this an agent starts against a half-written
issue or a plan still being revised.

A schedule fires on its own clock, unrelated to when anyone is typing, and manual
dispatch means the user picked the moment — so neither waits. The step is dormant until
the `issues` trigger above is added.

The loop is capped at six waits (30 minutes) and then proceeds with a warning rather
than blocking forever; job timeouts allow for that on top of the agent's own run.

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

## Agent switch

Every agent-invoking workflow runs on **either Claude Code or Codex**, chosen by one
job-level variable:

```yaml
ROSETTA_AGENT: ${{ inputs.agent || vars.ROSETTA_CI_AGENT || 'codex' }}
```

- **Per run** — the `agent` dispatch input (`codex` | `claude`, default `codex`).
- **Repo-wide** — the `ROSETTA_CI_AGENT` repository variable. This is the only control
  for `repo-triage`, which has no dispatch trigger.
- **Default** — `codex`.

Every agent-specific step carries `if: env.ROSETTA_AGENT == '<agent>'`, so exactly one
branch runs. Shared steps (checkout, claim, debounce, reporting) are untouched.

Both branches authenticate with **the same `BIFROST_API_KEY`**, on different routes:

| | Claude branch | Codex branch |
|---|---|---|
| Action | `anthropics/claude-code-action@v1` | `openai/codex-action@v1` |
| Bifrost route | `ANTHROPIC_BASE_URL=https://$HOST/anthropic` | `responses-api-endpoint: https://$HOST/openai/v1/responses` |
| Key input | `anthropic_api_key` | `openai-api-key` |
| GitHub token | `github_token` input | `GH_TOKEN` step env (no input exists) |
| Actor gate bypass | `allowed_non_write_users: "*"` | `allow-users: "*"` |
| Model | `--model opus` / `sonnet` | `model: gpt-5.6-sol` / `gpt-5.6-terra` |
| Rosetta instructions | `plugin_marketplaces` + `plugins` inputs | `.github/actions/codex-setup` extracts the `rosetta-codex` release asset into the workspace |
| Tool boundary | `--allowedTools` / `--disallowedTools` | permission profile + execpolicy deny-list (see below) |
| Hook trust | n/a | managed hooks in `/etc/codex/requirements.toml` |
| Trace | `claude-execution-output.json` | rollout JSONL under `$CODEX_HOME/sessions` |
| Post-run guard | `check_trace.py` | `check_codex_trace.py` |

The Codex branch talks the **Responses API**, so Bifrost must proxy
`POST /openai/v1/responses`. Nothing else in this pipeline substitutes for that.

### How `codex-setup` is laid out

Static configuration is checked in as **real TOML files**, not heredocs inside a YAML
block scalar — they lint, diff, and review as TOML, and no escaping level sits between
what you read and what Codex gets:

```
.github/actions/codex-setup/
  action.yml                    orchestration only: copy, download, invoke
  files/config.toml             $CODEX_HOME/config.toml, copied verbatim
  files/requirements.toml       /etc/codex/requirements.toml template
  build_policy.py               substitutes the managed-hooks placeholder
```

`action.yml` keeps only what shell is genuinely for: `gh release download`, `unzip`,
appending to `.git/info/exclude`, and `sudo cp`. Anything that *generates* content is
Python with named arguments.

### Model tiers

The two branches run matched tiers, not arbitrary models. The ladder is not invented
here — it is the pairing `instructions/r3/advanced/agents/*.md` already uses, position by
position in each agent's `model:` candidate list:

| Claude | Codex | Seen in |
|---|---|---|
| `claude-opus-5` | `gpt-5.6-sol` | `architect`, `planner`, `prompt-engineer` |
| `claude-sonnet-5` | `gpt-5.6-terra` | `discoverer`, `engineer`, `researcher` |
| `claude-haiku-4-5` | `gpt-5.6-luna` | `executor` (lightweight profile) |

Effort is a **separate axis** on both, so the suffixed forms in that frontmatter
(`gpt-5.6-terra-medium`) split into `model:` + `effort:` at the call site — which is also
how `src/rosettify-plugins/src/spec/model-maps.ts` collapses them.

Per pipeline:

| Pipeline | Claude | Codex |
|---|---|---|
| `repo-analysis` | `opus`, effort high | `gpt-5.6-sol`, effort high |
| `repo-triage` | `sonnet`, effort high | `gpt-5.6-terra`, effort high |
| `repo-plan` | `sonnet`, effort high | `gpt-5.6-terra`, effort high |
| `repo-implement` | `sonnet`, effort medium | `gpt-5.6-terra`, effort medium |
| `validate-prompts` | `opus`, effort high | `gpt-5.6-sol`, effort high |
| `validate-test-cases` | `sonnet` (script default) | `gpt-5.6-terra` (script default) |

### Codex permission profiles

Codex has no per-tool allow-list. `.github/actions/codex-setup` writes a **trusted**
`config.toml` into a runner-owned `codex-home` (never from a checkout — Codex does not
sanitize it) defining three profiles, and each pipeline selects the least it needs:

| Profile | Filesystem | Network | Used by |
|---|---|---|---|
| `rosetta-read-net` | read-only | yes (`gh`) | analysis, planning, triage |
| `rosetta-workspace` | workspace-write | no | prompt validation |
| `rosetta-workspace-net` | workspace-write incl. `.git` | yes (`gh`, `git push`) | implementer |

The same file sets `[features] hooks = true` — the on-disk effect of
`codex features enable hooks`, without which the plugin's `.codex/hooks.json` is inert.
Permission profiles are beta and need Codex CLI ≥ 0.138.0.

### A profile denies the PROCESS, not a tool

The first Codex smoke run failed on this, so it is worth stating outright. The profiles
originally carried `"/proc" = "deny"` and `"/etc" = "deny"`, ported from the Claude
branch's `--disallowedTools "Read(//proc/**),Read(//etc/**)"`. That port is invalid:
Claude's deny removes a **tool**, a Codex permission profile removes the path from the
**process**. Denying `/etc` took out `/etc/ssl/certs` (TLS trust store),
`/etc/resolv.conf` and `/etc/gitconfig`, so the run produced:

```
gh api ...   -> error connecting to api.github.com
git ls-files -> fatal: unable to access '/etc/gitconfig': Permission denied
```

Both denies are gone. `/proc` is the same class of risk (node, git and gh all read
`/proc/self/*`) and buys little here: `openai/codex-action` pipes the Bifrost key into a
separate proxy process, so it is never in the agent's environment and
`/proc/self/environ` exposes only the `GH_TOKEN` the agent is handed anyway. **The
filesystem boundary on Codex is the read-only sandbox, not a path deny-list.** Before
adding any filesystem deny, check what the runtime reads from that path.

### Maturity of what the Codex branch relies on

On record, because none of it is GA and the rollback lever differs per item:

| Mechanism | Status | If it regresses |
|---|---|---|
| Permission profiles (`[permissions.*]`, `permission-profile`) | **beta**, needs Codex CLI ≥ 0.138.0 | pin `codex-version` (commented line in every Codex step) |
| execpolicy `prefix_rules` | **preview** — its README says the API may break | drop the `[rules]` block; the sandbox still applies |
| Managed hooks / `allow_managed_hooks_only` | stable requirements keys | none needed |
| `[experimental_network]` egress allow-list | experimental — **not enabled** | n/a |

Nothing here is `experimental_*` except the egress allow-list, which is switched off for
that reason. Beta and preview are accepted deliberately: without permission profiles the
read-only-filesystem-plus-network posture is inexpressible, and without execpolicy there
is no counterpart to `--disallowedTools` at all.

### Command policy

Codex **does** have a command policy — execpolicy. `.github/actions/codex-setup` writes
`prefix_rules` into the system requirements layer at `/etc/codex/requirements.toml`
(`codex-rs/config/src/loader/mod.rs`), which is the *enforced* layer: rules merge across
all config layers and the **most restrictive** result wins, so `codex-args`, a project
`.codex/`, and the model itself cannot relax them.

Shape (`RequirementsExecPolicyPrefixRuleToml`, `codex-rs/config/src/requirements_exec_policy.rs`):

```toml
[[rules.prefix_rules]]
pattern = [{ token = "gh" }, { any_of = ["secret", "variable"] }]
decision = "forbidden"     # required; `allow` is REJECTED in requirements.toml
justification = "..."      # required, non-empty
```

**Why this is a deny-list and can only be a deny-list.** Four independent blockers, all
verified in `openai/codex` source:

1. **Unmatched commands run.** `codex exec` forces `AskForApproval::Never`
   (`codex-rs/exec/src/lib.rs:411`), and for an unmatched command under `Never`
   `render_decision_for_unmatched_command` returns `Decision::Allow` — verbatim comment:
   *"We allow the command to run, relying on the sandbox for protection."*
   (`codex-rs/core/src/exec_policy.rs:773-778`). The built-in dangerous-command heuristic
   is the only thing that flips an unmatched command to `Forbidden` (`:759-771`).
2. **A catch-all deny cannot be written.** Rules are indexed by the *literal* first token
   (`codex-rs/execpolicy/src/policy.rs:334-342`) and `PatternToken` is only
   `Single(String)` or `Alts(Vec<String>)` (`:379-384`) — no wildcard, no regex.
3. **Strictest severity always wins**, with no longest-prefix override:
   `matched_rules.iter().map(RuleMatch::decision).max()` (`policy.rs:403`) over
   `Allow < Prompt < Forbidden` (`execpolicy/src/decision.rs:7-16`). A narrow `allow`
   can never beat a broad `forbidden`.
4. **The one policy that does mean "deny unless allowed" is unreachable.**
   `AskForApproval::UnlessTrusted` is documented as exactly that semantic
   (`codex-rs/protocol/src/protocol.rs:981-985`), but `build_exec_config`
   (`exec/src/lib.rs:585-618`) only drops the forced `Never` when
   `approvals_reviewer == AutoReview` — and `auto_review` is a *model* judge, not a rule
   engine (`protocol/src/config_types.rs:175-190`). Swapping a deterministic allow-list
   for an LLM's opinion is not an improvement.

So `--disallowedTools` has an exact counterpart; `--allowedTools` has none, and the
sandbox — not the exec policy — is what actually carries the weight.

**One thing the restriction does not cost us.** `requirements.toml` rejects
`decision = "allow"`, leaving only `prompt` and `forbidden`. In headless exec those are
the same hard deny: a matched `prompt` under `Never` carries
`PROMPT_CONFLICT_REASON` (`exec_policy.rs:47-48`, `:216-231`) and resolves to
`ExecApprovalRequirement::Forbidden` (`:391-401`); `codex exec` has no approval channel
at all (no `ExecApprovalRequest` handling in either event processor).

**And a reason not to write `allow` rules even where we could.** `.rules` files under
`$CODEX_HOME/rules/*.rules` do accept `allow`, and codex-action guarantees they load
(it blocks both `--ignore-rules` and `--ignore-user-config`, and never inspects
`codex-home`). But `Decision::Allow` yields
`ExecApprovalRequirement::Skip { bypass_sandbox: true }` (`exec_policy.rs:423-437`) — an
`allow` rule for `gh` would take `gh` *out* of the permission profile entirely. Leaving
`gh` unmatched is strictly safer: it still runs, but confined.

Fourteen rules are written, scoped to what **no** pipeline needs, so one shared list
serves all five: `gh auth` and `gh secret|variable|ssh-key|gpg-key` (credential
surface), `curl|wget|nc|ncat|socat|telnet|ssh|scp|sftp|rsync` (egress other than
`gh`/`git`), `gh repo delete|archive|rename|edit`, `gh release`, `gh workflow|cache`,
`gh run cancel|delete|rerun`, `gh pr merge|close|ready|review`, `gh issue
delete|transfer|lock|pin`, `gh project delete|item-delete|field-*`, `gh label
delete|clone`, `git push --force|--delete|--mirror`, `git config --global|--system`,
and `sudo`. The implementer keeps `gh pr create/edit/comment` and a non-force
`git push`.

### Where a `.rules` file would go

Not used today (see the `bypass_sandbox` note above), but recorded so nobody re-derives
it. `load_exec_policy` (`codex-rs/core/src/exec_policy.rs:645-698`) scans a **`rules`
directory** per config layer for `*.rules` files, sorted by path
(`collect_policy_files`, `:1079-1128`); a missing directory is not an error.

| Layer | Path | Skipped by `--ignore-rules`? |
|---|---|---|
| System | `/etc/codex/rules/*.rules` | No |
| User | `$CODEX_HOME/rules/*.rules` | Yes |
| Project | `<project>/.codex/rules/*.rules` | Yes |
| requirements overlay | `/etc/codex/requirements.toml` → `[rules]` | No |

`--ignore-rules` is blocked by codex-action's `validateProtectedExtraArgs` on any
protected run, so the user and project directories load regardless. Layer precedence is
cosmetic for decisions: `merge_overlay` is additive and strictest-wins applies, so a
later layer can only tighten.

### Hooks: managed, not trusted

A hook found in a project `.codex/hooks.json` is `HookTrustStatus::Untrusted` until a
human trusts its content hash via `/hooks`. `codex-rs/hooks/src/engine/discovery.rs:701`
runs a handler only when:

```rust
enabled && (source.bypass_hook_trust
            || matches!(trust_status, HookTrustStatus::Managed | HookTrustStatus::Trusted))
```

A headless run has nobody to trust anything, and `openai/codex-action` rejects
`--dangerously-bypass-hook-trust` on a protected run — so the plugin's bootstrap would
silently never fire and the job would still be green. Curiocity hit exactly this and
worked around it with the bypass flag (`src/curiocity/src/agents/codex/profile.ts`).

The fix is the third branch: hooks declared inline under `[hooks]` in the system
`requirements.toml` are registered by `append_managed_requirement_handlers` with
`is_managed: true`, which resolves to `HookTrustStatus::Managed` and runs with no trust
step. `.github/actions/codex-setup/build_policy.py` transpiles the plugin's `hooks.json`
into that block (`ManagedHooksRequirementsToml` flattens `HookEventsToml`, so each
PascalCase event is an array of matcher groups). `hooks.managed_dir` is **only a display
path** — it loads nothing, so inline declaration is the only route.

The same file sets `allow_managed_hooks_only = true`, which closes a second hole: only
hooks registered there run, so anything that reaches the workspace as a
`.codex/hooks.json` — from an untrusted checkout included — is ignored. The setup step
fails loudly if the plugin is installed but no managed hook was registered, because
under that flag a failed transpile would mean no hooks at all.

**The one shape that cannot be expressed.** A pattern token is `token` or `any_of` —
there is no wildcard — and matching is prefix-only from token 0. So
`gh api repos/x/issues -X POST` cannot be matched, because the endpoint sits between
`api` and the flag. The Claude branch's `Bash(gh api * -X*)` family of denies therefore
has no exact counterpart; only the flag-first form (`gh api -X POST repos/...`) would
match, and a half-covering rule is worse than none, so none is written. Closing this
needs either a `.rules` Starlark policy with richer matching (preview) or a wrapper
script on PATH.

### Egress: unrestricted, deliberately

Because unmatched commands *run*, the sandbox and egress are the real boundary. Codex can
express an egress allow-list — `[experimental_network]` with `managed_allowed_domains_only`
plus a `domains` table (shape in codex's own test, `config_requirements.rs:4123`; note the
key is `experimental_network`, **not** `network`, per the `#[serde(rename)]` at `:941`).

**It is not enabled.** The key is `experimental_*`, and experimental features are not
enabled in this pipeline. So shell egress is unrestricted — which is parity with the
Claude branch, whose `--allowedTools` restricts the `gh` *command* surface and not the
network. The deny rules remove the obvious exfiltration binaries
(`curl|wget|nc|ncat|socat|telnet|ssh|scp|sftp|rsync`) instead; that is enumerable and
therefore incomplete, and it is stated as mitigation, not as a boundary.

If per-domain egress is ever wanted, the open question to settle first is whether
enforcement also covers Codex's own loopback call to the Responses API proxy that
`openai/codex-action` starts — if it does, the failure mode is every run dying rather
than one command being refused.

### Not implemented: a PreToolUse allow-list hook

Recorded because it is the only route to real allow-list semantics on Codex, and because
the reasons not to reach for it are not obvious.

The mechanism works. A managed `PreToolUse` hook with `matcher = "Bash"` can return:

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse",
                          "permissionDecision": "deny",
                          "permissionDecisionReason": "not in the allow-list" } }
```

`permissionDecision: "deny"` is empirically verified in `docs/hooks/codex.md` (exit 0,
reason reaches the model), and registering the hook as *managed* means it needs no trust
step — the same route the Rosetta bootstrap already uses. A script that matched each
command against a pattern list and denied everything else would be, functionally,
`--allowedTools`.

**Why it is not built:**

- **On Codex, file reads are shell calls.** There is no `Read` tool with a structured
  `file_path`; the agent uses `cat`/`sed`/`head`/`awk` and whatever else fits
  (`docs/hooks/codex.md`, "Practical Conclusions" #3). So the allow-list has to cover the
  read utilities too, and it is then policing a much larger surface than a `gh` list.
- **The command arrives as one opaque string.** Pipes, `$(...)`, `;`, `&&`, `bash -lc`
  wrappers. `docs/hooks/codex.md` states the rule for this case directly: when a miss is
  costly you *cannot* skip complex commands, and the safe default flips to "inspect
  harder / deny". Codex uses pipes constantly, so a lenient version is porous and a
  strict version breaks the pipelines.
- **Partial interception.** `PreToolUse` fires only for `Bash`, `apply_patch`, and MCP
  tools — "This doesn't intercept all shell calls yet, only the simple ones."

If it is ever wanted, land it **advisory-first**: return `additionalContext` and log what
*would* have been denied across a few real runs, then switch to `deny` once the actual
command distribution is known. Do not ship it in blocking mode on a guess.

### What only a live run can confirm

Five properties of the Codex branch cannot be checked from a workstation, and each
either fails closed or fails silently. Verify them with one `workflow_dispatch` smoke
run of the cheapest pipeline (`repo-analysis`) before trusting `codex` as the default:

1. **Bifrost proxies `POST /openai/v1/responses`.** Codex speaks the Responses API only.
   If that route is not proxied, no amount of wiring helps. Fails loudly.
2. **The installed Codex CLI accepts the three-profile `config.toml`.** An unrecognized
   key in a permission profile fails *every* Codex run. Fails loudly; the rollback is the
   commented `codex-version:` line in each Codex step.
3. **Hooks actually fire.** No longer a blind spot — the hooks are registered as
   *managed* (see "Hooks: managed, not trusted"), which bypasses the content-hash trust
   step by design rather than by hope. Still worth confirming once, because it is the one
   property that fails silently rather than loudly: **grep the uploaded rollout artifact
   for `rosetta:bootstrap_alwayson`.**
4. **`rosetta-read-net` really permits `gh` egress and read-only `git`.** Some read-only
   sandboxes break `git log`/`git diff`, which refresh the index.
   Also confirm the 14 execpolicy deny rules load without complaint — execpolicy is
   preview, so a schema drift would show up here first.
5. **`.git` writes work under `rosetta-workspace-net`,** so the implementer can commit.

**Actor gate — no regression, on record.** `openai/codex-action`'s write-access check
fails a run triggered by a non-collaborator, exactly as `claude-code-action`'s own gate
does in prompt mode. `repo-plan` and `repo-implement` never bypassed it on either branch;
`repo-triage` and `validate-prompts` bypass it on both (`allowed_non_write_users` /
`allow-users`).

### The two CLI-driven workflows

`validate-test-cases` and `e2e-testing` drive the agent CLIs directly, not through an
action, so they switch differently:

- **`validate-test-cases`** installs the selected CLI and `run-test-cases.sh` renders the
  per-agent invocation: the system preamble leads the prompt instead of
  `--append-system-prompt`, `--sandbox` replaces `--allowedTools`, the
  `test-case-result-validator` agent file is prepended to the validation prompt instead
  of loaded as a subagent, and the injected memory file is `AGENTS.md`, not
  `.claude/claude.md`. It routes through Bifrost via `OPENAI_BASE_URL` /
  `OPENAI_API_KEY`, which the raw Codex CLI honours directly.
- **`e2e-testing`** keeps `claude-code` as its default, on purpose. The agent under test
  belongs to each Curiocity **case** (`agents` in its `config.json`), and `coding-rosetta`
  provisions the Rosetta plugin into the agent session — which the Curiocity codex adapter
  refuses workspace-scoped by design. Choosing `codex` runs the vanilla cases and reports
  `coding-rosetta` as skipped. Curiocity also strips every `OPENAI_*`/`ANTHROPIC_*` var
  except the two exact key names before forking a curion, so the agent under test cannot
  be pointed at Bifrost from the workflow at all; it authenticates with
  `secrets.OPENAI_API_KEY`. Making e2e symmetric is a Curiocity and case-authoring change,
  not a workflow change.

## Headless constraints these pipelines must respect

Everything in this section is measured on the **Claude branch**. The Codex branch has
none of these failure modes because it has no `Agent`, `ScheduleWakeup` or `Monitor`
tool to misuse — it also has none of the capability those tools provide.

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

### `--allowedTools` must be quoted (Claude branch)

`claude_args` is shell-tokenized. An unquoted value is split on whitespace, and
every `Bash(gh issue view:*)` pattern contains a space — the SDK then receives
`"Bash(gh"`, `"issue"`, `"view:*)"` and **`Bash` ends up entirely unallowlisted**.
This silently disabled `repo-plan` and `repo-triage` completely. Always quote it.

## Failure is loud

`claude-code-action` decides success from `subtype`/`is_error` alone. It never reads
`terminal_reason` (which has a `background_requested` value) and discards the
`background_tasks_changed` messages it receives — so a run that abandons its
subagents and does nothing looks identical to a clean one.

`.github/scripts/check_trace.py` runs after all four pipelines on the Claude branch and
fails the job if
the main agent backgrounded a subagent or a dispatch never returned. It also fails
when nothing was mutated — except under `--allow-no-op`, which triage uses: the
board-driven pipelines are pulled by board state that guarantees work exists, so
doing nothing is a failure there, while triage is event-driven and may legitimately
have nothing to say about a PR. It parses the trace **structurally** — substring greps do not work, because
the prompt text is echoed inside the trace via `Read` results, so
`grep 'gh issue create'` matches on runs that never called it.

`.github/scripts/check_codex_trace.py` is the Codex counterpart. It parses **two**
record shapes, because Codex changed which one it emits: `response_item.function_call`
(JSON `arguments`) and `response_item.custom_tool_call` (`name: "exec"`, with the call
embedded in a JavaScript snippet, so the object literal is recovered by a balanced-brace
scan). Handling only the first made it report zero tool calls for a run that executed
four — a gate that reports nothing is worse than no gate, so keep both paths. It applies the same
mutating-command vocabulary (imported from `check_trace.py`, so both branches share one
definition of "did real work") to the shell calls in the rollout JSONL. It has no
abandoned-subagent check, because Codex has no subagents. Under `--allow-no-op` its only
remaining job is failing a run that produced no rollout at all.

`.github/scripts/scrub_trace.py` runs before every trace upload. The trace is a full
tool transcript published as a downloadable artifact, outside Actions log masking,
and the implementer holds unrestricted shell access with a PAT in the git remote URL. It
takes one or more paths, files or directories, so a single step covers the Claude JSON
and the Codex rollout tree; a path that does not exist is a no-op, which is how the
branch that did not run is handled.

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

## Triggers

Both workflows run on `on: issues:` — every activity type, unfiltered — plus a cron
backstop.

The event is a doorbell: the payload is ignored, the workflow loads the whole board just
as it does on a cron tick, and picks up everything eligible. That makes it self-healing
— a dropped event strands nothing, the next one of any kind drains the queue — and no
`types:` list has to be got right. It also covers the implementer, whose real gate
(board `Status` → `Scheduled`) raises only the organization-scoped `projects_v2_item`,
which a repository workflow cannot subscribe to.

Overlapping runs are handled by the load job exiting early when another run of the same
workflow is in progress, rather than by a `concurrency:` group — queuing delays work, and
`cancel-in-progress` would kill an agent mid-work and strand its card in a working lane.
Exiting is safe for the same reason the trigger works: the in-flight run or the next
event picks the work up.

Note: `actionlint` accepts `on: projects_v2_item:`. That is a false positive from a
permissive event list, not evidence it fires.

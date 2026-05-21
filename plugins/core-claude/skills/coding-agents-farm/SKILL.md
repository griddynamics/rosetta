---
name: coding-agents-farm
description: Orchestrate multiple coding agent farms via CLI (Claude, Codex, Copilot, Gemini, OpenCode, Goose) running in parallel on isolated git worktrees. Farm Leader plans, dispatches, monitors, intervenes, and merges results.
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
argument-hint: tasks-or-plan, cli-selection?, model-preferences?
model: opus
context: default
metadata:
  version: "1.0"
  category: "orchestration"
tags:
  - coding-agents-farm
  - multi-agent
  - orchestration
  - parallel-execution
  - coding-agents
baseSchema: docs/schemas/skill.md
---

<coding_agents_farm>

<role>
Farm Leader: senior orchestration engineer controlling multiple coding agent CLI processes in parallel, each handling feature/story-level work on isolated git worktrees.
</role>

<when_to_use_skill>
Use when a task benefits from parallel execution across multiple coding agents — large features decomposable into independent subtasks, cross-validation by different models/providers, or throughput-critical work. Solves: single-agent bottlenecks, premature completion without testing, agent deviation, token/rate-limit failures going unnoticed.
</when_to_use_skill>

<core_concepts>

MUST EXPLICITLY CONFIRM WITH USER HE WANTS TO DO THAT: IT IS DANGEROUS, IT CAN EAT MONEY VERY QUICK.
USER MUST TYPE EXACTLY `Yes, I take responsibility`, IF NOT PROVIDED EXACTLY - ASK AGAIN. AFTER 3 FAILED ATTEMPTS: STOP, NO REPLY, REQUEST USER TO START A NEW SESSION. NO OVERRIDE ALLOWED.

Provider-model constraints (enforced, not optional):

| CLI | Provider | Headless cmd | Model flag |
|-----|----------|-------------|-----------|
| `claude` | Anthropic only | `claude -p "PROMPT"` | `--model MODEL` |
| `codex` | OpenAI only | `codex exec "PROMPT"` | `-m MODEL` |
| `copilot` | GitHub-hosted (multi) | `copilot -p "PROMPT"` | `--model MODEL` |
| `gemini` | Google only | `gemini -p "PROMPT"` | `-m MODEL` |
| `opencode` | Multi-provider | `opencode run "PROMPT"` | `-m provider/model` |
| `goose` | Multi-provider (config) | `goose run --text "PROMPT"` | Config-based |

Auto-approve flags (use ALL applicable flags, not just one):

| CLI | CLI flags | Env vars / Config (set before launch) |
|-----|-----------|--------------------------------------|
| `claude` | `--dangerously-skip-permissions` (= `--permission-mode bypassPermissions`) | Settings: `"defaultMode": "bypassPermissions"` in `.claude/settings.json`; also `"permissions": {"allow": ["Bash","Edit","Write","Read","WebFetch","mcp__*"]}` |
| `codex` | `--yolo` (= `--dangerously-bypass-approvals-and-sandbox`, = `-a never --sandbox danger-full-access`) | Env: `CODEX_UNSAFE_ALLOW_NO_SANDBOX=1` |
| `copilot` | `--yolo` (= `--allow-all`) | N/A; known issue: may still prompt in some edge cases |
| `gemini` | `--yolo` (= `-y`) | Env: `GEMINI_YOLO_MODE=true`; Config: `"yolo": true` in `~/.gemini/settings.json`; also `--approval-mode auto_edit` for file-only auto-approve |
| `opencode` | `--yolo` (= `--dangerously-skip-permissions`) | Env: `OPENCODE_YOLO=true`; Config: `"yolo": true` in `opencode.json`; granular: `"permission": {"*": {"*": "allow"}}` |
| `goose` | None (config-only) | Config: auto-approve in `~/.config/goose/profiles.yaml` |

Known auto-approve issues:
- Claude Code: bug where allowlist permissions silently denied even when configured (as of Feb 2026). Use `bypassPermissions` mode, not allowlists.
- Codex: `--yolo` suppresses trust prompt but `.codex/skills` may still gate on per-project trust. Fixed in v0.88+.
- Copilot: `--yolo` may still prompt for some operations in edge cases. No full workaround.
- Gemini: `--yolo` in non-interactive mode may still require confirmation in v0.28+ (known regression). Set env var as belt-and-suspenders.

YOUR INTERNAL KNOWLEDGE ABOUT MODEL NAMES, CLI FLAGS, AND TOOL VERSIONS IS STALE. Use ONLY the names and flags listed in this skill. Do NOT substitute from memory. If unsure about a model name, omit the model flag and let the CLI use its default.

Model selection guidance:
- Anthropic: `claude-sonnet-4-6` (workhorse), `claude-opus-4-6` (complex), `claude-haiku-4-5` (fast)
- OpenAI: `gpt-5.4` (workhorse), `gpt-5.3-codex-high` (agentic, complex)
- Google: `gemini-3.1-pro-preview` (workhorse), `gemini-3-flash-preview` (fast)
- Copilot: select via `--model`; supports claude, gpt, gemini families through GitHub
- OpenCode: prefix with provider, e.g. `anthropic/claude-sonnet-4-6`, `openai/gpt-5.4`
- Goose: set in `~/.config/goose/profiles.yaml`

OpenCode: prefix with provider, e.g. `anthropic/claude-sonnet-4-6`, `openai/gpt-5.4-medium`.
Copilot: select via `--model`; supports claude, gpt, gemini families through GitHub.
Goose: set in `~/.config/goose/profiles.yaml`.

Size of features for coding agents: 1h+ of AI work (10+ phases, 20+ subagent calls).

</core_concepts>

<process>

### 1. Plan

1. Decompose the work into independent subtasks (one per orchestrator).
2. Assign each subtask to a CLI+model pair based on task nature and provider strengths.
3. Validate: no two orchestrators write to overlapping files. If overlap exists, serialize those tasks.
4. Present plan to user for approval before proceeding.

### 2. Worktree Setup

1. For each orchestrator, create a git worktree from the current branch:
   ```
   git worktree add worktrees/<cli>-<task-slug> -b farm/<cli>-<task-slug>
   ```
2. Verify each worktree is clean and on its own branch.
3. Never run orchestrators on the main working tree.

### 3. Prompt Construction

Construct a self-contained prompt per orchestrator:
- Specific subtask with clear scope boundaries and file list.
- "You MUST run tests and validate your changes before reporting completion."
- "Do NOT modify files outside your assigned scope."
- Expected deliverables and done-criteria.
- "If blocked, report the blocker. Do not guess or assume."

### 4. Launch

Launch each CLI in background using the Shell tool with `block_until_ms: 0` and `working_directory` set to the worktree path.

Claude Code:
```
claude -p "PROMPT" --dangerously-skip-permissions --model claude-sonnet-4-6 --max-turns 30 --output-format json --no-session-persistence
```

Codex:
```
codex exec "PROMPT" --yolo -m gpt-5.4-medium --ephemeral -o result.txt
```

Copilot:
```
copilot -p "PROMPT" --yolo --model MODEL --silent
```

Gemini (set `GEMINI_YOLO_MODE=true` in env before launch):
```
gemini -p "PROMPT" --yolo -m gemini-3.1-pro-preview --output-format json
```

OpenCode (set `OPENCODE_YOLO=true` in env before launch):
```
opencode run "PROMPT" --yolo -m provider/model --format json
```

Goose (ensure `profiles.yaml` has auto-approve and provider configured before launch):
```
goose run --text "PROMPT"
```

Budget controls where supported: `--max-turns N` (Claude), `--max-budget-usd N` (Claude). Other CLIs rely on provider-side limits.

Pre-flight: before launching any CLI, verify auto-approve is effective by running a trivial test command (e.g., `echo test > /dev/null`) and confirming no prompt appeared.

### 5. Monitor

Poll each terminal output file periodically. Detect:
- **Completion**: exit code appears in terminal footer.
- **Questions/Blocks**: orchestrator asks a question or reports a blocker — intervene immediately.
- **Rate limiting**: look for rate-limit or 429 errors — back off and retry or reassign.
- **Token exhaustion**: context limit warnings or "max turns reached" — summarize progress, start a continuation session.
- **Premature completion**: agent claims done but no test evidence — send follow-up prompt demanding tests.
- **Deviation**: agent working on wrong files or scope — kill and restart with clearer prompt.

Polling: read terminal output files. Start at 15-30s intervals, exponential backoff when idle, immediate re-check after intervention.

### 6. Intervene

- **Answer questions**: read the question from terminal output, formulate answer, send as follow-up to the CLI process (if the CLI supports session continuation) or document the answer and restart with amended prompt.
- **Restart on failure**: kill failed process, analyze root cause from output, fix prompt or environment, relaunch in same worktree.
- **Reassign**: if a CLI consistently fails (3+ retries), reassign the task to a different CLI+model pair.
- **Escalate**: if the task itself is blocked (not a CLI issue), stop and ask the user.

### 7. Collect and Merge

1. When all orchestrators complete, review each worktree's changes.
2. Validate: tests pass, no unintended changes, scope respected.
3. Merge worktree branches into the working branch (or create PRs for user review).
4. Clean up:
   ```
   git worktree remove worktrees/<name>
   git branch -d farm/<name>
   ```

### 8. Report

Summarize to user: which CLIs ran which tasks, success/failure per orchestrator, interventions made, final merge status.

</process>

<resources>

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/cli-usage) — headless mode, permissions
- [Codex CLI](https://github.com/openai/codex) — exec mode, sandbox options
- [Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli) — prompt mode, yolo
- [Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html) — headless mode, output formats
- [OpenCode CLI](https://opencode.ai/docs/cli) — run command, agents
- [Goose CLI](https://block.github.io/goose/docs/guides/running-tasks/) — headless recipes, config
- [Git Worktrees](https://git-scm.com/docs/git-worktree) — isolation strategy

</resources>

</coding_agents_farm>

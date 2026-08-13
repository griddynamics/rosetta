# Tips & troubleshooting

*[← Configure your ecosystem](04-configure-your-ecosystem.md) · [Back to the guide](README.md)*

A short collection of the things that make Rosetta run smoothly, the mistakes that cost people time and tokens, and fixes for the problems you're most likely to hit.

## Getting the best results

- **Use slash commands.** Once your repo is set up, start every task with the right workflow command and describe your request naturally. See the [scenarios](README.md#scenarios-at-a-glance).
- **Be specific.** Context up front means better output and fewer questions.
- **Read plans before approving.** The plan is your last checkpoint before work begins.
- **Answer questions fully.** When Rosetta asks, it's targeting a specific gap. Short answers lead to incomplete work.
- **Write requirements first.** For anything non-trivial, `/requirements-authoring-flow` gives you a clean acceptance baseline and prevents scope creep.
- **Keep your context files healthy.** Accurate `CONTEXT.md` and `ARCHITECTURE.md` help every task. Don't delete anything in `docs/` — that's Rosetta's project memory.

## Choosing a model

This is the single biggest lever on both quality and cost.

- **Use a *medium* reasoning model:** **Sonnet 5 (medium)**, **GPT-5.4-medium**, or **gemini-3.1-pro**. Set the reasoning effort to **medium** — higher effort can burn 30 minutes on unnecessary reasoning.
- **Don't run everything on a high-reasoning or Opus-class model.** They spend heavily on reasoning and can drain a daily budget in one sitting. Rosetta already assigns an appropriate model to each step and switches automatically — you don't need to force the most expensive one.
- **Don't use "Auto" model selection.** It often quietly downgrades to a weaker model mid-task, hurting quality. Pick the model explicitly.

### Lowering your token bill

- Prefer a flat-rate subscription (Claude Pro/Max, ChatGPT Plus/Pro) over pay-per-token API billing.
- To cut output tokens, add this line to your workspace `AGENTS.md` / `CLAUDE.md`:

  ```text
  MUST ALWAYS think, reason, plan, chat, document in compressed/terse/unicode chars/terms/always/no hieroglyphs; Exclude final artifacts, any tool calls, all code, etc.
  ```

## Managing sessions

**When to start a fresh chat vs. continue:**

- **Same session** for follow-ups on the work you just did — refining a change, fixing a missed edge case.
- **New session** when you move to a different feature or an unrelated change. Each top-level request should start fresh so context stays lean.

A very common mistake is running every task inside the chat that started with *"what can you do?"* — that bloats context and degrades results. Start a new session for the real task.

**Watch your context usage.** If it climbs above ~65%, wrap up and switch sessions. To hand off cleanly, ask the agent to save its state:

```text
Please save execution state, workflow state, findings, original intent with clarifications, and tasks left to do as concise "agents/TEMP/execution-state.md" so that I can start a fresh new session and continue execution where you left it off.
```

Then start the new session with the same command you began with:

```text
/<original-command> Please resume execution saved in "agents/TEMP/execution-state.md" according to flow instructions
```

**If the agent gets stuck** looping on the same problem, step in with specifics on how to solve it, or ask it to spin up a focused, more capable subagent for just that problem.

## Common questions

**Does Rosetta use more tokens?** Yes, a bit up front — it loads guardrails and the relevant workflow. In return you get fewer wrong-path runs (which waste far more), earlier questions instead of endless back-and-forth, and more reliable results.

**Why is the first message in a session slower?** Rosetta does one-time prep — loading context and reading your project files. Later messages reuse that and are fast. You can't skip prep, even for a one-liner; it's lightweight and keeps trivial tasks from going wrong.

**Does it work in plan mode, Auto mode, or full-access mode?** Yes, in every mode. Permission modes only change what the agent may do without asking — they don't turn off Rosetta's prep, workflows, or approval gates.

**How do I turn off the approval gates for one task?** Include the literal phrase `fully autonomous` or `no HITL` in your request. That's the only accepted opt-out (ambiguous phrasing won't disable it, by design). Use it sparingly — those gates catch ambiguous intent and risky actions.

## Fixing problems

### The agent isn't using Rosetta

If the agent responds like a generic assistant and ignores Rosetta:

- Re-run the check: ask `What can you do, Rosetta?` — it should list workflows.
- Confirm the plugin is actually installed for your IDE (see [Install Rosetta](02-install.md)) and that you didn't install it in two places at once (e.g. both Claude Code and Cursor), which causes conflicts.
- Start a **fresh session** — especially right after initializing a repo, since new files only load at session start.
- Make sure you selected a real model, not "Auto."

### It stopped following Rosetta mid-session

This usually means a long session drifted or, in hosted setups, an expired connection. Start a fresh session and resume from a saved state file (see [Managing sessions](#managing-sessions) above).

### Slow, empty, or low-quality responses

- Check your model choice — "Auto" or an over-powered reasoning model are the usual culprits (see [Choosing a model](#choosing-a-model)).
- If your context is very full, switch to a fresh session.

### Run a post-mortem on anything that disappointed you

Not just failures — whenever a run fought you or could have gone better, ask the agent to run `/post-mortem`. It root-causes the behavior across your prompt, workspace files, and Rosetta's instructions, and recommends concrete fixes. With your explicit approval, it can also file sanitized feedback as a Rosetta issue — nothing leaves your repo without your say-so.

## A plain-language glossary

You don't need these to get started, but they show up in messages and docs.

| Term            | In plain terms                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Workflow**    | A guided, multi-step process for a kind of task, started with a slash command (also called a *command*). |
| **Skill**       | A focused capability the agent pulls in when it's needed for a specific step.                    |
| **Rule**        | An always-on standard the agent follows automatically (guardrails, conventions).                |
| **Subagent**    | A specialist the agent spawns to do one job with a fresh mind — e.g. a reviewer or researcher.  |
| **Guardrails**  | Built-in safety limits: no dangerous actions without approval, no leaking sensitive data.       |
| **HITL**        | "Human in the loop" — the approval gates where the agent stops and asks you.                     |
| **Bootstrap**   | The core policies loaded automatically at the very start of every session.                       |
| **Prepare → Research → Plan → Act → Validate** | The five phases every task follows. See [What is Rosetta?](01-what-is-rosetta.md#how-a-task-actually-flows). |

## More help

- Ask the agent directly: `/help-flow ...`
- Run `/post-mortem` after a rough run.
- Open an issue: <https://github.com/griddynamics/rosetta/issues>
- Email: [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)
- Website: <https://griddynamics.github.io/rosetta/>
- Deeper technical detail lives in the repo's [TROUBLESHOOTING](../TROUBLESHOOTING.md#agent-not-using-rosetta) and [FAQ](../FAQ.md).

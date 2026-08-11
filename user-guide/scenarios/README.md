# Scenarios

*[← Back to the user guide](../README.md)*

Rosetta organizes work into **scenarios** — one guided workflow per kind of task. Each has its own page below with a diagram of how it works, the exact command, what you'll be asked to approve, and what files it produces.

Not sure which one you need? Open the **[visual workflow map](../workflow-map.md)** — it starts from *"what do I want to do?"* and points you to the right scenario. Or just ask your agent: `/help-flow What should I use to <describe your task>?`

## Pick your task

| I want to…                                          | Scenario                                        | Command                          |
| --------------------------------------------------- | ----------------------------------------------- | -------------------------------- |
| Write a feature, fix a bug, refactor, add tests     | [Write or change code](coding.md)               | `/coding-flow`                   |
| Define what to build before building it             | [Author requirements](requirements.md)          | `/requirements-authoring-flow`   |
| Design test cases from a ticket and push to a TMS   | [Generate test cases](generate-test-cases.md)   | `/testgen-flow`                  |
| Automate a UI / browser test                        | [Automate UI tests](automate-ui-tests.md)       | `/ui-aqa-flow`                   |
| Automate a backend API test                         | [Automate API tests](automate-api-tests.md)     | `/api-aqa-flow`                  |
| Understand and document an existing codebase        | [Analyze a codebase](analyze-a-codebase.md)     | `/code-analysis-flow`            |
| Investigate options or compare technologies         | [Research a question](research.md)              | `/research-flow`                 |
| Migrate or upgrade a system in controlled phases    | [Modernize / migrate](modernize.md)             | `/modernization-flow`            |
| Run an authorized security review                   | [Review security](security-review.md)           | `/security-flow`                 |
| Teach the agent an external / private library       | [Onboard a library](onboard-a-library.md)       | `/external-lib-flow`             |
| Author or adapt prompts for coding agents           | [Author agent prompts](author-agent-prompts.md) | `/coding-agents-prompting-flow`  |
| Do a small or unusual task that fits none of these  | [Ad-hoc task](adhoc-task.md)                     | `/adhoc-flow`                    |
| Discover what Rosetta can do / choose a workflow     | [Get help](get-help.md)                          | `/help-flow`                     |

## How to read a scenario page

Every page follows the same shape:

- **What it does / when to use** — a plain summary and when *not* to reach for it.
- **How it works** — a diagram of the phases. **Amber diamonds** are decision points (including where the agent stops for your approval), and arrows that loop back show its feedback loops — revising, re-running, and re-checking until things pass.
- **Running it** — the command and realistic examples.
- **What you'll be asked to do** — your part: answers and approvals.
- **What it creates** — the files it leaves in your repo.
- **Sources** — links to the actual workflow definition, so you can verify anything.

**Diagram key:** blue = a step the agent performs · amber diamond = a decision or your approval · red = a hard stop · green = start / finished. Arrows that curve back are feedback loops.

## A few things every scenario shares

- **You start it with a slash command** and describe your request in plain language.
- **The agent pauses at the important moments** and waits for you (this is "human-in-the-loop"). To approve, you use a clear confirmation; the agent won't proceed past a gate on a vague "ok."
- **It scales to the task.** Small changes skip ceremony; large ones get full planning, review, and validation.
- **It keeps state.** Long tasks save progress to a state file so you can resume in a fresh session.

For the mental model behind all of this, see [What is Rosetta?](../01-what-is-rosetta.md). For model choice, sessions, and fixes, see [Tips & troubleshooting](../05-tips-and-troubleshooting.md).

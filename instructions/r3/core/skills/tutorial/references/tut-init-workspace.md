<sample_task_set flow="init-workspace-flow">

<sample_task id="1" ties="invocation">

Scenario: brand-new repo, no `docs/`, no Rosetta files. A teammate asks you how to start.
Task: type the one line you'd send.

Rubric:
- Good if: invokes `/init-workspace-flow` by name, once, for the whole repo.
- Good if: leaves `CONTEXT.md`/`ARCHITECTURE.md` to the flow instead of hand-writing them first.
- Wrong/missing if: starts with `/coding-flow` — no onboarding docs yet, so coding runs blind.
- Wrong/missing if: plans to re-run it per feature or per folder; it's one-time repo onboarding.

</sample_task>

<sample_task id="2" ties="context — tooling questions">

Scenario: early on the agent asks a batch of questions — which IDEs/coding agents you use, issue tracker, wiki, SCM, CI links. You're in a hurry; three of them you'd have to look up.
Task: say how you answer, and what skipping those three costs you.

Rubric:
- Good if: answers what's known now, knowing skipped fields stay placeholders in `gain.json` and can be filled later.
- Good if: treats the IDE/coding-agent answer as unskippable — it decides what gets set up for you.
- Wrong/missing if: invents a plausible Jira or Confluence URL to move faster — `gain.json` wins over other files, so a wrong link misroutes later flows silently.
- Wrong/missing if: expects the agent to figure this out alone; only you know your team's tooling.

</sample_task>

<sample_task id="3" ties="code-graph gate">

Scenario: the agent stops and offers a code-navigation choice: the built-in default, or one of several third-party tools. This repo is commercial work.
Task: say what you check before choosing, and who does the install.

Rubric:
- Good if: reads the tool's docs and license, and clears a third-party tool with your manager — it would get access to your code.
- Good if: stays on the built-in default when unsure.
- Wrong/missing if: waits for the agent to decide — it only recommends; you own the call on whether a tool is allowed and fits this project.
- Wrong/missing if: assumes the tool installs itself — the install is yours, and the agent will help with it if you ask.

</sample_task>

</sample_task_set>

<module_coding_agents_prompting>

<what_its_for>

`coding-agents-prompting-flow` authors or adapts AI-agent prompts themselves (skills, agents, workflows, rules) — not application code. Sequence: `discover -> extract+intake -> blueprint -> for_each_prompt_loop(draft -> hardening -> edit) -> simulate -> validate`. Reach for this instead of `coding-flow` whenever the deliverable IS a prompt artifact.

</what_its_for>

<checkpoint id="1" phase-tie="discover (step 1), extract_intake (step 2)">

Scenario: a user asks to "add a new skill that helps with database migrations," with no existing draft to adapt.
Task: name the first two steps this workflow runs, and what artifact gates the move from step 2 to step 3.

Rubric:
- Good if: names `discover` (Discovery Notes + Reference Set) before `extract_intake` (Prompt Brief + Open Questions).
- Good if: identifies the `Prompt Brief` needs explicit HITL approval before `blueprint` (step 3) starts.
- Wrong/missing if: jumps straight to drafting `SKILL.md` content without discovery/intake — a documented pitfall (discover skipped or delayed).
- Wrong/missing if: confuses this with `coding-flow`'s design/tech_plan split — this workflow has no separate specs phase; blueprint + brief cover that role.

</checkpoint>

<checkpoint id="2" phase-tie="for_each_prompt_loop draft (step 4), hardening (step 5)">

Scenario: the blueprint calls for 3 new files: `SKILL.md`, one rule, one reference. The draft step just finished all 3 at once, batched together.
Task: say what's wrong with drafting them all at once, and what step 5's loop actually does.

Rubric:
- Good if: flags that drafting must go one file at a time — think structure first, validate against schema, only then generate — not a single batched pass (a documented pitfall: loop collapsed into one draft pass).
- Good if: step 5 is `hardening -> edit` per file until pass criteria or HITL, not a rubber-stamp read-through.
- Wrong/missing if: treats step 5 as the same actor/step as step 4 — they're separate loop steps with separate purposes (draft vs. hardening-and-fix).
- Wrong/missing if: forgets `coding-agents-prompt-authoring` skill is required throughout for both orchestrator and subagents.

</checkpoint>

<checkpoint id="3" phase-tie="simulate (step 6), validate (step 7)">

Scenario: all 3 files are drafted and hardened. Someone suggests skipping straight to opening a PR.
Task: explain what's missing before that, using this workflow's last two steps.

Rubric:
- Good if: names `simulate` — trace realistic runs, check context/cognitive load across the prompt chain — as a required step before validate.
- Good if: names `validate` — Checklist Results, Tests, Failure Modes, Traceability, gated by final HITL approval before persistence.
- Wrong/missing if: assumes small tasks always need a persisted `validation-report.md` — small tasks may stay in-memory and return in message.
- Wrong/missing if: skips tying the `Prompt Brief` all the way through — it must remain traceable as input to simulate and validate, not just intake.

</checkpoint>

</module_coding_agents_prompting>

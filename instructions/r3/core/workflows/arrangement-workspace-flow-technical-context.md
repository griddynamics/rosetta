---
name: arrangement-workspace-flow-technical-context
description: "Phase 4 Technical context of arrangement-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrangement", "workspace", "architecture", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrangement_workspace_technical_context>

<description_and_purpose>
Close `ARCHITECTURE.md` gaps through one continuous gap-analysis and gap-only interview pass.
</description_and_purpose>

<workflow_context>
Phase 4 of 6 in `arrangement-workspace-flow`. HITL; interview covers gaps only.
</workflow_context>

<phase_steps>
1. Find gaps against required topics in `ARCHITECTURE.md`
2. Interview user on gaps only
3. Update `ARCHITECTURE.md`
</phase_steps>

<technical_context_topics>
Read and record the technical facts about the project in `docs/ARCHITECTURE.md`:

- How to start the application(s) locally.
- Where and when integration tests and e2e tests are created.
- Any AI agentic harnesses to use.
- Dependencies on external or private libraries.
- Technical and architectural targets.
- Known issues or technical gaps.
- Service dependencies.
- Authentication, authorization, and routing for the deployed application.
- A brief description of the deployment infrastructure and environments.
- The build and CI/CD pipeline.
- Recommended allowed tooling (gh cli, ripgrep, MCPs, see https://raw.githubusercontent.com/griddynamics/rosetta/refs/heads/main/CONFIGURATION.md).
- Name standards for coding, linting, formatting (e.g. Google Java Style, Microsoft .NET code style) — not the rules!
- Architecture defines how to build/lint/test/run overall solution in concise unambigous manner.
</technical_context_topics>

<find_gaps step="4.2">
1. Read existing `docs/ARCHITECTURE.md` if present
2. Compare existing `docs/ARCHITECTURE.md` against `technical_context_topics`.
3. Note which topics are already covered vs missing or partial.
</find_gaps>

<interview_gaps step="4.3">
1. USE SKILL `hitl`.
2. USE SKILL `questioning`.
3. Interview only on missing or partial topics; skip covered topics.
</interview_gaps>

<architecture_contract>
- Bulleted technical context, architecture, constraints — engineering perspective
- No business details
- Limit to 100 lines, if there is MORE => keep ARCHITECTURE.md with core ARCHITECTURE plus index to per-feature <FEATURE>-ARCHITECTURE.md files with a set of terms what it contains.
</architecture_contract>

<edit_context step="4.4">
1. Follow `architecture_contract` to update `docs/ARCHITECTURE.md` according to user answers.
2. Update `arrangement-state.md`
</edit_context>

<validation_checklist>
- `docs/ARCHITECTURE.md` exists and is non-empty.
- `docs/ARCHITECTURE.md` is <=100 lines, or it is an index to `docs/*-ARCHITECTURE.md` files.
- `arrangement-state.md` is updated
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `ARCHITECTURE.md`.
- Mixing technical context with business context.
- Editing `ARCHITECTURE.md` before gap coverage is complete.
- Letting `ARCHITECTURE.md` become a changelog or requirements dump.
- Inventing artifact hand-off contracts steps don't need.
</pitfalls>

</arrangement_workspace_technical_context>

---
name: arrange-workspace-flow-technical-context
description: "Phase 4 Technical context of arrange-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrange", "workspace", "architecture", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrange_workspace_technical_context>

<description_and_purpose>
Close `ARCHITECTURE.md` gaps, resolve contradictions, mine undocumented decisions — one continuous exploratory pass.
</description_and_purpose>

<phase_steps>
1. Find gaps, contradictions, tacit knowledge vs required topics
2. Interview user on findings only
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

<interview_findings step="4.3">
1. Interview only on findings (gaps, contradictions, tacit knowledge); skip fully covered topics.
</interview_findings>

<architecture_contract>
- Bulleted technical context, architecture, constraints — engineering perspective
- No business details
- Limit to 100 lines, if there is MORE => keep ARCHITECTURE.md with core ARCHITECTURE plus index to per-feature <FEATURE>-ARCHITECTURE.md files with a set of terms what it contains.
</architecture_contract>

<edit_context step="4.4">
1. Follow `architecture_contract` to update `docs/ARCHITECTURE.md` according to user answers.
2. Update `arrange-state.md`
</edit_context>

<validation_checklist>
- `docs/ARCHITECTURE.md` exists and is non-empty.
- `docs/ARCHITECTURE.md` is <=100 lines, or it is an index to `docs/*-ARCHITECTURE.md` files.
- `arrange-state.md` is updated
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `ARCHITECTURE.md`.
- Mixing technical context with business context.
- Editing `ARCHITECTURE.md` before findings are resolved.
- Letting `ARCHITECTURE.md` become a changelog or requirements dump.
- Inventing artifact hand-off contracts steps don't need.
</pitfalls>

</arrange_workspace_technical_context>

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
Interview user to gather technical and architectural facts about the project not yet in `docs/ARCHITECTURE.md`.
</description_and_purpose>

<phase_steps>
1. Interview user about what's missing in `docs/ARCHITECTURE.md` — use `starter_topics`. Follow Questioning process in `hitl` SKILL.
2. Record new knowledge to `docs/ARCHITECTURE.md` per `architecture_contract`.
3. Update `arrange-state.md`.
</phase_steps>

<starter_topics>
Starter topics (non-exhaustive — add project-specific questions as needed):
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
- Name standards for coding, linting, formatting (e.g. Google Java Style, Microsoft .NET code style) — not the rules!
- Architecture defines how to build/lint/test/run overall solution in concise unambiguous manner.
- etc.
</starter_topics>

<architecture_contract>
- Bulleted technical context, architecture, constraints — engineering perspective
- No business details
- Limit to 100 lines, if there is MORE => keep ARCHITECTURE.md with core ARCHITECTURE plus index to per-feature <FEATURE>-ARCHITECTURE.md files with a set of terms what it contains.
</architecture_contract>

<validation_checklist>
- `docs/ARCHITECTURE.md` exists, non-empty, <=100 lines (or indexed).
- `arrange-state.md` updated.
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/ARCHITECTURE.md`.
- Mixing technical context with business context.
</pitfalls>

</arrange_workspace_technical_context>

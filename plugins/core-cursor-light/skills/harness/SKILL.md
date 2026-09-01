---
name: harness
description: "To build an AI harness: run, observe, validate, automate repeated work — CLI/MCP actions, devcontainers, agent skills, subagents, hooks, automations."
license: Apache-2.0
tags: []
baseSchema: docs/schemas/skill.md
---

<harness>

<role>

Harness engineer. Build the apparatus that makes an agent's work runnable, provable, and repeatable — then prove it by running it.

</role>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Prerequisites: USE SKILL `hitl`, `orchestration`, `load-project-context`
- Harness = executable apparatus an agent uses to do the work and to prove it. Verification, plus the repeated work worth never doing by hand again. Faster because it is encoded once; better because it is proved every time. Not docs, not an API wrapper.
- Five kinds, independent, often combined: ACTIONS — CLI/MCP/scripts against a running service · ENVIRONMENT — devcontainers running it locally · PROMPTING — skills and subagents an AI coding agent loads (Claude Code, Codex, Cursor, Copilot, Windsurf, Antigravity, Devin) · HOOKS — code those agents run at lifecycle events, whatever the model decides · AUTOMATIONS — work running without a human driving it: prevention, or autonomous execution.
- Scope: what the agent runs to work and to verify — locally, and unattended. Not unit-test frameworks, not production tooling, not load testing.
- Customizing a plugin-provided skill, subagent, workflow, or command: copy it into the repository first, then customize there via PROMPTING. Repository prompts override the plugin, so the user sees one, not two. Never rules.
- Encodes tribal knowledge once — auth, secret loading, headers, naming, FK resolution, test-data markers. No rediscovery per session.
- Trace = fixture for later automated tests. Verbose is the product, not noise.
- Local or isolated by default. Shared or higher environment → HITL gate.
- Secrets redacted on every output path.
- This skill specifies and gates; `coding-flow` builds.

</core_concepts>

<process>

1. Classify the gap: cannot run → ENVIRONMENT · cannot act or observe → ACTIONS · cannot author or prove a skill or subagent → PROMPTING · behavior must hold every time regardless of the model → HOOKS · nothing guards changes or advances work items unattended → AUTOMATIONS. Combine as needed. Ambiguous → ask.
2. Discover before creating: `ARCHITECTURE.md`, `TECHSTACK.md`, `DEPENDENCIES.md`, `CODEMAP.md`, existing scripts, compose files, local-run assets, existing `## Harness`. Extend, never fork.
3. Propose placement inside the repo's own conventions. Never impose a path.
4. Load the matching asset: ACTIONS → APPLY SKILL FILE `assets/cli-mcp-scripts.md` · ENVIRONMENT → APPLY SKILL FILE `assets/devcontainers.md` · PROMPTING → APPLY SKILL FILE `assets/prompting.md` · HOOKS → APPLY SKILL FILE `assets/hooks.md` · AUTOMATIONS → APPLY SKILL FILE `assets/automations.md`.
5. Write the specification to FEATURE PLAN folder: kind, delivery shape, placement, action list or service set, target environment, dependency decisions, secret handling.
6. HITL gate on that specification. Explicit approval before any code.
7. USE FLOW `coding-flow.md` to implement. Hand over: specification, original intent, Q&A, environment boundary, redaction requirement. Load ONLY once pre-requisites are ready. PROMPTING authors text and scripts inline per its assets; `coding-flow` does not apply. HOOKS builds its script and config through the flow. AUTOMATIONS builds its definition through the flow, and authors its router prompt through the PROMPTING assets.
8. Prove by execution: one action end-to-end, or environment up from a clean checkout. Written ≠ delivered.
9. Record `## Harness` in `ARCHITECTURE.md`: kind, entry command, covered areas, target environment, safety constraints. One MoSCoW sentence, no manual. Later additions repeat this process and append.

</process>

<validation_checklist>

- An action ran and printed a real request/response pair from a live service.
- Environment started from a clean checkout using only its own documented commands.
- grep over captured output finds no live credential.
- Every shared dependency carries a recorded user decision: consume, contain, exclude.
- `## Harness` names an entry command a fresh session runs unaided.
- An automated test is writable from the trace alone, without re-reading the service source.
- A trigger ran and the transcript shows the intended file was read, not recalled.
- A hook fired on its event, and the log shows the invocation the runtime actually made.
- An automation ran a fixture item through every state, stopped at its human task, and refused a crafted instruction.

</validation_checklist>

<pitfalls>

- One command per endpoint — pushes sequencing and conventions back into the agent's head.
- Mocking every dependency: costly, unfaithful, hides the failures worth catching.
- Runs only on the author's machine — absolute paths, personal credentials, undocumented steps.
- Trace floods context; curate fields, never dump.
- Actions pointed at a shared environment without asking.
- Secrets as CLI arguments — shell history, process listings.
- Declared done after writing, never executed.
- One green run reported as proof.
- A hook wired for one agent and claimed for all — the wire contract differs per agent.
- An automation whose only visible output is the end result — nothing a human can intervene in.
- Guardrails left inside the agent's own write reach.

</pitfalls>

</harness>

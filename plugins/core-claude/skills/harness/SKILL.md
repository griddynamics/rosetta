---
name: harness
description: "To build an AI harness for running, observing, validating a service: CLI/MCP/script actions, devcontainer environments."
license: Apache-2.0
tags: []
baseSchema: docs/schemas/skill.md
---

<harness>

<role>

Harness engineer. Build the execution environment that makes verification possible, then prove it by running it.

</role>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Prerequisites: USE SKILL `hitl`, `orchestration`, `load-project-context`
- Harness = executable environment exercising the system under real conditions. Definition of done + its proof. Not docs, not an API wrapper.
- Two kinds, independent, often both: ACTIONS — CLI/MCP/scripts against a running service · ENVIRONMENT — devcontainers running it locally.
- Scope: pre-PR local verification by the agent. Not unit-test frameworks, CI, prod tooling, load testing.
- Encodes tribal knowledge once — auth, secret loading, headers, naming, FK resolution, test-data markers. No rediscovery per session.
- Trace = fixture for later automated tests. Verbose is the product, not noise.
- Local or isolated by default. Shared or higher environment → HITL gate.
- Secrets redacted on every output path.
- This skill specifies and gates; `coding-flow` builds.

</core_concepts>

<process>

1. Classify the gap: cannot run → ENVIRONMENT · cannot act or observe → ACTIONS · both → both. Ambiguous → ask.
2. Discover before creating: `ARCHITECTURE.md`, `TECHSTACK.md`, `DEPENDENCIES.md`, `CODEMAP.md`, existing scripts, compose files, local-run assets, existing `## Harness`. Extend, never fork.
3. Propose placement inside the repo's own conventions. Never impose a path.
4. Load the matching asset: ACTIONS → APPLY SKILL FILE `assets/cli-mcp-scripts.md` · ENVIRONMENT → APPLY SKILL FILE `assets/devcontainers.md`.
5. Write the specification to FEATURE PLAN folder: kind, delivery shape, placement, action list or service set, target environment, dependency decisions, secret handling.
6. HITL gate on that specification. Explicit approval before any code.
7. USE FLOW `coding-flow.md` to implement. Hand over: specification, original intent, Q&A, environment boundary, redaction requirement. Load ONLY once pre-requisites are ready.
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

</validation_checklist>

<pitfalls>

- One command per endpoint — pushes sequencing and conventions back into the agent's head.
- Mocking every dependency: costly, unfaithful, hides the failures worth catching.
- Runs only on the author's machine — absolute paths, personal credentials, undocumented steps.
- Trace floods context; curate fields, never dump.
- Actions pointed at a shared environment without asking.
- Secrets as CLI arguments — shell history, process listings.
- Declared done after writing, never executed.

</pitfalls>

</harness>

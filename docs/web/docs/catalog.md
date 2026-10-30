---
layout: docs
title: Workflows and Skills
permalink: /docs/catalog/
---

# Workflows and skills

**Who is this for?** Anyone who wants to see everything Rosetta can do in one place.
**When should I read this?** After the [README](/rosetta/docs/introduction/), when you are choosing a workflow or want to call a skill by name.

Rosetta has two kinds of building blocks. **Workflows** are guided, multi-step processes you start with a slash command. **Skills** are reusable units of work that workflows load for you; most can also be called by name.

## Workflows

17 workflows are available: 15 current ones plus 2 kept for backward compatibility. Start one with its slash command and describe your request in plain language. In Codex, use `$` instead of `/`. In the `-light` build, `/coding-flow` runs the light variant (one architect pass instead of separate discovery, design, specs, and plan). For a diagram, see the [workflow map](/rosetta/user-guide/workflow-map/). For phases and details of each workflow, see the [Usage Guide](/rosetta/docs/usage-guide/#workflows).

| Command | What it does | More |
| --- | --- | --- |
| `/coding-flow` | Features, fixes, refactors, unit tests. Scales from small to large. | [Guide](/rosetta/user-guide/scenarios/coding/) |
| `/requirements-authoring-flow` | Draft, review, and validate requirements and specifications. | [Guide](/rosetta/user-guide/scenarios/requirements/) |
| `/adhoc-flow` | Everything else: lightweight documentation, build, tracking, synchronization. | [Guide](/rosetta/user-guide/scenarios/adhoc-task/) |
| `/testgen-flow` | Generate test cases from requirements (issue tracker or wiki) and export them to a test management system. | [Guide](/rosetta/user-guide/scenarios/generate-test-cases/) |
| `/ui-aqa-flow` | Automate UI and end-to-end tests, including page objects. | [Guide](/rosetta/user-guide/scenarios/automate-ui-tests/) |
| `/api-aqa-flow` | Automate backend API tests from test cases in a test management system or issue tracker. | [Guide](/rosetta/user-guide/scenarios/automate-api-tests/) |
| `/code-analysis-flow` | Reverse-engineer a codebase into grounded architecture docs and requirements. | [Guide](/rosetta/user-guide/scenarios/analyze-a-codebase/) |
| `/research-flow` | Deep project research with grounded references and parallel exploration. | [Guide](/rosetta/user-guide/scenarios/research/) |
| `/modernization-flow` | Convert, modernize, upgrade, or re-architect code (for example monolith to microservices). | [Guide](/rosetta/user-guide/scenarios/modernize/) |
| `/external-lib-flow` | Teach the agent a private external library without giving it the source. | [Guide](/rosetta/user-guide/scenarios/onboard-a-library/) |
| `/security-flow` | Authorized, evidence-preserving security review that prepares remediation tasks. | [Guide](/rosetta/user-guide/scenarios/security-review/) |
| `/coding-agents-prompting-flow` | Author and adapt prompts for AI agents: skills, agents, workflows, rules. | [Guide](/rosetta/user-guide/scenarios/author-agent-prompts/) |
| `/help-flow` | Explains Rosetta capabilities and how to use them. | [Guide](/rosetta/user-guide/scenarios/get-help/) |
| `/init-workspace-flow` | Initialize or upgrade a repository: context, discovery, documentation. Run once per repository. | [Usage Guide](/rosetta/docs/usage-guide/#workflows) |
| `/arrange-workspace-flow` | After initialization: choose a single-repo or composite layout, add reference code, fill in business and technical context, set up the ecosystem. | [Configuration](/rosetta/docs/configuration/) |
| `/aqa-flow` | Compatibility router: sends test-automation requests to `/ui-aqa-flow`, `/api-aqa-flow`, or `/testgen-flow`. | [Usage Guide](/rosetta/docs/usage-guide/#workflows) |
| `/self-help-flow` | Deprecated alias of `/help-flow`. | [Usage Guide](/rosetta/docs/usage-guide/#workflows) |

## Top workflows

What each of the most-used workflows does, in more detail. The full list is in the table above.

1. `coding-flow`: AI creates features, fixes defects, and performs refactoring, everything end-to-end. AI performs discovery, design, specs and a plan, user review, then AI implements and runs separate review and validation passes (including running application). Most useful for medium to large coding tasks, and for controlled component-by-component migration/modernization work.
2. `requirements-authoring-flow`: AI works with user and raw artifacts to define entire-application requirements. AI discovers context and existing constraints, captures intent, drafts atomic requirement units, validates them, and finalizes traceability artifacts. This is the most efficient use of coding agents. Requirements then Coding.
3. `security-flow`: AI runs an authorized, evidence-preserving security review through mandatory specialist subagents. It gates secret-bearing files before source ingestion, bounds active testing to approved pre-production targets, independently reviews evidence, and prepares concise inputs for a later coding flow without starting remediation.
4. `testgen-flow`, `api-aqa-flow`, `ui-aqa-flow`: AI handles QA-related work such as generating test cases and creating API or UI automation tests. AI first collects project context, requirements, and existing QA assets, clarifies gaps, and only after that generates test cases or automation tests.
5. `code-analysis-flow`: AI creates grounded analysis documents based on the codebase. AI first loads project context, asks clarification questions, then produces either one focused analysis document or parallel module analyses plus a summary.
6. `help-flow`: AI explains available Rosetta workflows, skills, and agents. Most useful when the user is unsure which Rosetta capability to use.
7. `init-workspace-flow`: AI sets up a repository for AI use in both brownfield and greenfield projects. AI first analyzes the workspace, builds baseline docs, asks gap-filling questions, and verifies the result. Use it once per repository as its purpose is to build context for subsequent sessions.

If you prefer to follow your own workflows, check the skills below.

## Skills

Reusable units of work the AI loads on demand. Workflows pick them for you, and most can also be called by name.

Rosetta ships 43 skills, grouped by purpose. Each entry links to the skill's own page.

**Let Rosetta decide**

1. [`rosetta`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/rosetta/README.md): You want Rosetta to handle it itself. Classifies your request, picks the matching workflow, and runs it end to end.

**Understand what exists**

1. [`load-project-context`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/load-project-context/README.md): Gives the AI your project's business context, architecture, and past decisions before any work starts.
2. [`codemap`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/codemap/README.md): Gives the AI a structural map of the repo to navigate by. Uses your LSP or code-graph tooling when available.
3. [`discovery`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/discovery/README.md): Evidence-backed picture of what exists today, including whether this was already attempted and done wrong.
4. [`reverse-engineering`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/reverse-engineering/README.md): Recovers domain rules and intent from code into business specs.
5. [`research`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/research/README.md): Researches any question grounded in your project, with real sources. Compares options and validates its own conclusions.

**Decide what to build**

1. [`requirements-authoring`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/requirements-authoring/README.md): Precise and atomic requirement units: EARS acceptance criteria, rationale, alternatives, dependencies, traceability. You combine them into stories or features.
2. [`requirements-use`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/requirements-use/README.md): Plans and builds from approved requirements. Every task, test, and result traces back to a requirement ID.
3. [`design`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/design/README.md): Deep architecture decisions with defended rejections, plus domain playbooks: distributed systems, multi-tenancy, payments, regulated data, migrations.
4. [`tech-specs`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/tech-specs/README.md): Produces target-state interfaces, API contracts, data models, and security considerations. Forces the AI to read the real code, grounding its assumptions.
5. [`planning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/planning/README.md): An ordered graph of AI sessions for automated execution, each with its own scope, checklist, and handoff.
6. [`backlog`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/backlog/README.md): Turns a thin ticket into a buildable one: gaps found, questions posed, facts written back. Also produces a WBS for people.
7. [`reasoning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/reasoning/README.md): Breaks a hard problem down, identifies roles, boundaries, events, models. Works via Tree-of-Thoughts, expanding every alternative to its conclusion before committing.

**Build it**

1. [`coding`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding/README.md): Simple, minimal, in-scope changes following KISS/SOLID/DRY. Systematic dependency-ordered validation: database, API, web, mobile. Covers IaC.
2. [`testing`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/testing/README.md): Isolated and idempotent at 80%+ coverage, external calls mocked only. Scenario tests start from a sequence diagram: what depends on what, what is shared setup, then the test.
3. [`debugging`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/debugging/README.md): OODA. Root cause with evidence before any fix, one hypothesis at a time, prevention recommended. Three failed fixes means a design problem.
4. [`security`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/security/README.md): Threat modeling plus code, dependency, IaC, container, cloud, and API review. Secrets gated before ingestion, active testing only where authorized. Output is remediation tasks.
5. [`natural-writing`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/natural-writing/README.md): Strips AI giveaways: hype words, em-dashes, rhetorical questions, fake engagement. For docs, emails, posts, release notes.

**Test automation and QA**

1. [`qa-knowledge`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/qa-knowledge/README.md): QA engineering end to end: sources into requirements, gap analysis, Given-When-Then specs, TMS export, runnable API and UI tests, failure triage. Every case is implemented or recorded as a gap, never dropped.
2. [`qa-structure`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/qa-structure/README.md): Canonical paths, slugs, and state files for QA runs. Each session in its own folder, so parallel runs never collide and a long flow knows which phase is done.
3. [`data-collection`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/data-collection/README.md): Read-only pull from issue tracker, test management, wiki, and the codebase. A ticket gets recorded, not acted on. Gaps and permission walls recorded, never guessed.

**Delegate the work**

1. [`orchestration`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/orchestration/README.md): Sizes the work, builds and briefs a subagent team, and gates every result through fresh eyes instead of self-review. Large plans run with phases, steps, and tasks.
2. [`subagent-directives`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/subagent-directives/README.md): Requested automatically by the orchestrator for every subagent: stay in scope, stop and report when blocked rather than improvise, prove each claim with links and line ranges.
3. [`large-workspace-handling`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/large-workspace-handling/README.md): Use when a repository is too big to handle at once. Splits into non-overlapping scopes, one subagent each, then a second wave verifies the work.
4. [`coding-agents-farm`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding-agents-farm/README.md): Runs Claude, Codex, Copilot, Gemini and others in parallel on isolated git worktrees, for throughput or cross-model validation. Burns money fast, so it is gated behind explicit consent.

**Keep the session on track**

1. [`checklist`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/checklist/SKILL.md): Keeps a ranked completion checklist for the session, written before implementation starts. The AI re-validates every item before reporting done, then a fresh-eye reviewer subagent checks the result.
2. [`hitl`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/hitl/README.md): Makes the AI work together with you. Approval gates at specs, implementation, and closing, with review in small batches. A clear affirmative counts.
3. [`questioning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/questioning/README.md): A few high-impact questions before work starts, each one decision, with why it matters and a recommended answer. Anything researchable it answers itself.
4. [`self-organization`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/self-organization/README.md): Keeps work organized as it grows: splits oversized tasks and files, clears stale content, flags when a session should restart. Announces before it reorganizes.

**Stay safe**

1. [`sensitive-data`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/sensitive-data/README.md): Secrets, keys, PII, PHI, and payment data never get read, printed, logged, or committed. Masked on sight, and the same care applies to the code it writes.
2. [`dangerous-actions`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/dangerous-actions/README.md): Before anything irreversible: blast radius first, safer alternatives offered, explicit approval required. Higher environments are off limits.
3. [`risk-assessment`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/risk-assessment/README.md): Checks what the AI can actually reach, such as databases, cloud accounts, and production servers. Rates the risk and blocks outright when it is critical.

**Recover when it goes wrong**

1. [`deviation`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/deviation/README.md): Stops the moment work no longer matches what you asked, or the AI cannot stand behind its own solution. Escalates instead of pressing on.
2. [`self-learning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/self-learning/README.md): After a failure or a wrong result, stops and finds the cause, then records a reusable rule in the repo's memory so it does not repeat.
3. [`post-mortem`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/post-mortem/README.md): Diagnoses why a session went wrong across your prompt, workspace docs, local config, Rosetta instructions, and tooling. Can file a sanitized issue when Rosetta is at fault.

**Extend**

1. [`harness`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/harness/README.md): Builds what the AI needs to run and check your system: command-line and MCP actions, dev containers, skills, subagents, workflows, hooks, and unattended automation. Encoded once, proved on every run.
2. [`coding-agents-prompt-authoring`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding-agents-prompt-authoring/README.md): Write, review, harden, and port your own skills, subagents, workflows, and rules, including between different IDEs and agents.
3. [`coding-agents-hooks-authoring`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding-agents-hooks-authoring/README.md): Author, register, and debug hooks that fire on agent actions across every supported IDE.

**Domain packs**

1. [`solr-query`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-query/README.md): Apache Solr queries that return what you meant: eDisMax, block join, JSON facets, kNN, explain output, relevancy tuning.
2. [`solr-schema`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-schema/README.md): Apache Solr schema and solrconfig, audit or design: field types, analyzer symmetry, docValues, synonyms, commit strategy.
3. [`solr-extending`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-extending/README.md): Custom Apache Solr plugins: SearchComponent, DocTransformer, QParser, update processors, function queries, and their solrconfig wiring.
4. [`solr-semantic-search`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-semantic-search/README.md): Phrase-tagging semantic search on Solr: concept tagging, taxonomy, graph paths, ambiguity resolution. Lexical, not vector.
5. [`specflow-use`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/specflow-use/README.md): Connects your workspace to Grid Dynamics SpecFlow through its MCP.

---

Back to the [main README](/rosetta/docs/introduction/).

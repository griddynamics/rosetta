# Changelog

## R2 [RELEASED, SUPPORTED]

### Overview

Rosetta is a meta-prompting, context engineering, and centralized instructions management for AI coding agents. R2 is the production release that moves teams from individual developer prompting to governed, organization wide AI assisted development.

### Highlights

- Zero friction developer onboarding through HTTP mode and IDE plugins
- Multi agent execution with specialized roles and review gates
- Architecture aware AI development through automatic pattern extraction
- Modular instructions aligned with native coding agent capabilities
- Structured workflows for requirements, prompts, and debugging

### Detailed Changes

#### Zero Friction Deployment

- **HTTP mode.** Developers connect to Rosetta over HTTP with OAuth. No local installation, no CLI setup, and no dependencies on developer machines. Add one JSON config to the IDE and start working.
- **Plugins for Claude Code and Cursor.** Installation is available from IDE marketplaces with one click. Additional IDE plugins are planned.
- **Reduced bootstrap size.** Smaller initial prompts load faster and use less context, leaving more room for the actual task.

#### Multi Agent Architecture

- **Subagent orchestration.** Work is split into phases handled by specialized agents. One can implement while another reviews, potentially on a different model. Architect, engineer, reviewer, and validator each work with focused context and a clear scope.
- **Deterministic plan manager.** Execution plans are tracked step by step with phase completion gates. It is in battle testing with limited scope and is designed to make AI work resumable and auditable.
- **Large workspace handling.** Repositories with more than 100 files are partitioned into scoped subagent tasks to prevent context overflow and keep quality stable at scale.
- **Automated review gates.** After implementation and testing, a separate reviewer agent checks the result against the spec before it reaches human reviewers.

#### Knowledge and Patterns

- **Automatic building block extraction.** During repository initialization, Rosetta identifies recurring codebase patterns, such as how to create a controller, a domain service, or a data grid, and turns them into reusable templates for the agent.
- **Project knowledge datasets.** Each project builds a structured knowledge base that covers architecture, tech stack, dependencies, and conventions. This enables cross project flows where the agent understands how services relate to each other and improves work across multiple repos.

#### Modular Instruction Architecture

- **Skills, rules, commands, workflows, and subagents are separated.** Each instruction type maps to native coding agent features such as Cursor rules or Claude Code commands. Agents use built-in capabilities instead of workarounds.
- **OSS, Grid, and custom split.** OSS provides the foundation. Grid adds advanced workflows. Organizations can layer their own customizations without forking the core.

#### New Workflows and Skills

- **Requirements documentation authoring.** A structured workflow produces testable, atomic requirements with traceability. Those requirements then drive planning, implementation, and validation.
- **Prompt authoring.** Teams that create and maintain AI agent instruction sets now have a dedicated workflow with specialized subagents for each phase.
- **Debugging skill.** The agent investigates root cause before attempting a fix, which makes debugging more systematic and less dependent on guesswork.

#### Safety and Hook Hardening

- **Two-tier dangerous-actions hook.** The `PreToolUse` hook now classifies every pattern as either `reconsider` (dangerous but recoverable, AI may self-approve after blast-radius analysis) or `hard-deny` (catastrophic, human confirmation required). `curl | sh` is hard-deny. Previously all denies were permanent HITL gates.
- **AI-autonomous retry via `# Rosetta-AI-reviewed`.** For `reconsider`-tier patterns, the AI may append the marker token to a user-visible field and retry after reconsidering blast radius. The marker is validated by strict regex; legacy `# Rosetta-reviewed` is rejected.
- **Single-traversal pattern evaluation.** Pattern matching and policy lookup now share one traversal (`detectDanger`), eliminating the structural divergence risk where a hard-deny pattern could slip through if the two parallel scans returned different results.
- **Stateless hook design.** Cooldown store and audit log removed. The hook is safe across worktrees, CI runners, and parallel sessions without shared state.
- **Windsurf adapter deny feedback.** `permissionDecisionReason` is surfaced as `additionalContext` so Windsurf agents receive actionable denial explanations.

---

## R3 [IN-DEVELOPMENT, NOT RELEASED]

### Overview

R3 advances Rosetta from governed assistance to deterministic, self-guarding execution. Where R2 made organization wide AI development consistent, R3 makes it reproducible and safe by default: a deterministic operation manager drives every workflow step, a cross IDE hooks runtime enforces guardrails and advisories at the moment of action, and the bootstrap that loads on every session is roughly half its former size. R3 ships dormant alongside R2 — R2 remains the default served release — so teams adopt the new model deliberately.

### Highlights

- Deterministic execution: every workflow runs as a tracked, resumable plan driven by the operation manager
- Cross IDE hooks runtime with a two tier dangerous-actions safety gate and advisory nudges
- GitNexus code graph integration for architecture aware navigation and automatic reindexing
- Roughly 57% smaller bootstrap through skill extraction and de-duplication
- Public OSS MCP and RAGFlow deployment plus GitHub authentication
- Foundations for role specific workflows (IaC, discovery, mobile, automated QA)

### Detailed Changes

#### Deterministic Execution

- **Operation manager.** Plan creation, tracking, and step by step execution are handled by `rosettify` — a local CLI and stdio MCP that stores execution plans as JSON. It replaces ad hoc planning with a deterministic, resumable, auditable loop (create → next → execute → update) with sequential phase gates and atomic writes.
- **Bootstrap integrated planning.** Preparation steps, guardrails, HITL, documentation, and risk assessment are expressed as explicit plan phases and steps, so the agent commits to the process up front instead of improvising. Plan and act modes are supported directly.
- **Graceful fallback.** When the operation manager is unavailable, a fallback rule routes the agent to built in todo tracking, so execution discipline never depends on a single tool.

#### Cross IDE Hooks Runtime

- **Common input adapter.** A single adapter normalizes the differing hook input schemas of Claude Code, Cursor, Copilot, Codex, and Windsurf into one canonical shape, so each hook is authored once and runs everywhere.
- **Declarative hook framework.** Hooks declare their activation (event, tool kind, file predicates) and the runtime gates, throttles, and debounces them. Each hook is bundled per IDE with isolation guarantees so a bundle carries only its own adapter code.
- **dangerous-actions safety gate (PreToolUse).** A deterministic, stateless last resort tripwire on destructive shell, file, and MCP operations, safe across worktrees and parallel sessions. Two tiers: `reconsider` (recoverable — the agent may self-approve with a `Rosetta-AI-reviewed` marker in a user visible field after a blast radius check) and `hard-deny` (catastrophic, for example `curl | sh` — human review required). A single traversal detection avoids policy divergence bypasses, and Windsurf agents receive the denial reason as actionable context.
- **Advisory hooks.** `md-file-advisory` nudges on stray markdown placement, `lint-format-advisory` prompts a syntax/type/lint/format step after code edits, and `loose-files` flags `.py`/`.js` files created without a module marker (on file creation events only).
- **GitNexus refresh hook.** Detects a stale code graph index after source mutations and asks the agent to reindex, with trailing edge debouncing so only the last edit in a burst triggers work.
- **Authoring skill.** A `hooks-authoring` skill documents entry rules, tool kind registration, and pitfalls for contributors adding new hooks.

#### GitNexus Integration

- **Code graph navigation.** GitNexus is integrated as opt in skills (`gitnexus-setup`, `gitnexus-cli`, `gitnexus-tools`) and wired into workspace initialization, giving the agent architecture aware navigation. It works in ad hoc mode with Claude Code and ships in the plugins.

#### Leaner Bootstrap and Modular Skills

- **Roughly 57% smaller bootstrap.** Bootstrap rules were refactored — JSON schemas pulled into skills and templates, duplicated orchestration rules merged, and HITL questioning moved entirely into the on demand `hitl` skill. The per session `bootstrap-*.md` payload dropped from 31,711 to 13,510 bytes, a 57.4% reduction (the MCP mode `bootstrap.md` entry is excluded — still being optimized).
- **Strengthened, self-initializing prep.** Preparation enforcement was tightened and workflow selection was folded into the orchestrator contract, so orchestrators and subagents self-initialize — load context, select the workflow, and commit to phases before acting.
- **New bootstrap skills.** `load-context-instructions` and `load-workflow` make context loading and workflow selection explicit, reliable steps rather than implicit expectations.

#### Release Model and Upcoming Work

- **Rolling releases going forward.** R3 is the last large, version-branch style release. From here Rosetta moves to a rolling model — changes ship continuously in small, incremental releases rather than long-lived branches and major cutovers like v3.
- **Incremental workflow delivery.** The v3 Workflows track has delivered an IaC workflow and SpecFlow integration. The remaining workflows — discovery, mobile apps, test harness engineering, and automated QA / test generation — will arrive through these smaller releases rather than a single shift.

#### Platform and Deployment

- **Public OSS deployment.** A public Rosetta MCP and RAGFlow deployment supports OSS and demo environments.
- **GitHub authentication.** OAuth through GitHub is supported for MCP access.
- **Analytics fix.** PostHog now reports the correct user identity.

---

## Weekly Change Log

*Release scope: **R2** is the live, served release. **R3** is the next release, still in development and not yet served. Other tags are release-agnostic: **Tooling** (plugin generator, rosettify), **Server** (MCP server, Helm), **Hooks**, **CI**, **Docs**.*

### Week Mon 22.06 – Sun 28.06

A foundations week. The always-injected bootstrap is being collapsed into one minimal file, a new `read-once` hook stops agents re-reading the same file, and HITL questioning got a lot more thorough.

**Highlights**

- New `bootstrap-alwayson` rule will replace the separate bootstrap files with one minimal payload
- New `read-once` hook stops agents from re-reading the same file
- New user-invocable `rosetta` skill routes a request to the right workflow (#117)
- HITL now interviews you thoroughly before building, cutting wrong assumptions
- Hook runtime expanded with shared building blocks; Codex and Copilot hook specs documented

#### Bootstrap consolidation (bootstrap-always)

- **Change.** `[R3]` Introduced a single `bootstrap-alwayson` rule, a minimal always-on payload meant to replace the separate bootstrap files (guardrails, core policy, and the rest). Shipped the first skill extracted under the reduce-bootstrap effort. (Igor Solomatov)
- **Why it helps.** The bootstrap ships in every agent's context on every call. One small always-on file instead of several means lower token cost and less context pressure, with the same guarantees.

#### read-once hook and shared hook runtime

- **Change.** `[Hooks]` Added a `read-once` hook that prevents an agent from reading the same file twice, built on an expanded shared hook runtime (common normalization, logging, and reusable state/lock helpers) across Claude Code, Cursor, Copilot, and Codex. Documented the Codex and Copilot hook specs. Added debug coverage and unit tests for the lint-format advisory (#116, Maksym Kuznietsov). (Igor Solomatov)
- **Why it helps.** Re-reading files burns calls and tokens for no new information. Shared building blocks mean a hook is authored once and runs on every IDE, instead of per-IDE one-offs.

#### rosetta skill (#117)

- **Change.** `[R3]` Added a user-invocable `rosetta` skill that identifies a request and routes it to the best-matching workflow, then hands off (no code or files before the handoff). (Yevheniia Lementova)
- **Why it helps.** One entry point. Users invoke `rosetta` and the right workflow runs, instead of guessing which flow to pick.

#### Sharper HITL questioning

- **Change.** `[R3]` HITL now interviews the user relentlessly after discovery and before implementation: walk the design tree, resolve decisions one by one, offer a recommended plus alternative enterprise-ready answer per question, and loop until no gaps remain. Added a recovery path for when the agent gets stuck, fixed a subagent misunderstanding, updated the compaction rule, and improved the reasoning skill. (Igor Solomatov)
- **Why it helps.** Assumptions are the top cause of mistakes. Grilling the requirements up front catches them before code is written.

#### Sensitive data handling

- **Change.** `[R3]` Made sensitive-data handling more obvious in the instructions. (Igor Solomatov)
- **Why it helps.** A clearer guardrail is a guardrail people actually follow.

#### Documentation, FAQ, website

- **Change.** `[Docs]` Updated the FAQ, README, website, and Documentation Structure Plan (#106, ymakaruk-pixel with Yuri Makaruk). Aligned the reduce-bootstrap doc with the load-context-instructions dissolution decision (#119, Yevheniia Lementova). Added session transcripts and assorted doc fixes. (Igor Solomatov)
- **Why it helps.** Front-door docs stay accurate as the bootstrap and skills change underneath them.

### Week Mon 15.06 – Sun 21.06

The week the plugin-generator rewrite went live. The old Python generator is gone, all source moved under `src/`, the command menu got cleaner, and a tech demo video shipped.

**Highlights**

- New plugin generator is now the only one; old Python generator deleted
- All source code moved under `src/` for a cleaner repo layout
- Internal skills hidden from the user command menu (#111)
- `gitnexus` and `graphify` merged into one `codemap` skill
- Tech demo video published on the README and website

#### Plugin generator cutover and repo restructure

- **Change.** `[Tooling]` Migrated fully to the new TypeScript plugin generator and deleted the old Python one (`scripts/plugin_generator.py`, ~1,270 lines, plus its tests). Moved all source (`rosettify`, `rosettify-plugins`, `ims-mcp-server`, `rosetta-cli`, hooks) under a single `src/` directory, fixed schemas, and cleared the follow-up issues from the move. (Igor Solomatov)
- **Why it helps.** One generator, no dead Python path to maintain. A standard `src/` layout makes the repo easier to navigate and the cutover completes the three-week rewrite.

#### Cleaner command menu and skill consolidation (#111)

- **Change.** `[R2 + R3]` Hid infra, guardrails, and phase skills from the user command menu via frontmatter flags (Claude Code). Merged `gitnexus` and `graphify` into one `codemap` skill (the refresh hook became `codemap-refresh`). Inlined the init-workspace skills, refined questioning rules, added architect background guidance to the coding flow, and clarified licensing. (Artem Koziar)
- **Why it helps.** Users see only the commands meant for them, not internal machinery. One `codemap` skill replaces two overlapping ones, so there's less to learn and maintain.

#### Tech demo video and website

- **Change.** `[Docs]` Published a tech demo video and added it to the README and website. Added in-document navigation on the website, synced site information, and fixed layout, borders, and video sizing. (Igor Solomatov)
- **Why it helps.** A short video explains Rosetta faster than a page of text. In-doc nav makes the site easier to read.

#### Prompt validation and coding agents

- **Change.** `[CI + R3]` Made the prompt-validator CI output more condensed and focused, added automatic cleanup of old bot messages on PRs, fixed the coding-agents draft phase, and fixed a case where validation was skipped. (Igor Solomatov)
- **Why it helps.** Reviewers get a tight, readable validation report instead of noise, and stale bot comments stop piling up on pull requests.

#### Model references

- **Change.** `[Docs]` Updated Opus-class model references to GPT-5.5 in `CONFIGURATION.md`. (Igor Solomatov)
- **Why it helps.** Configuration examples point at a current model.

#### Documentation

- **Change.** `[Docs]` Revised the Definition of Done and architecture docs for clarity, fixed deprecations, and cleaned up assorted docs. Fixed a development-server placeholder typo (#114, meichuanyi). (Igor Solomatov)
- **Why it helps.** Clearer DoD and architecture docs mean fewer misreads for contributors.

### Week Mon 08.06 – Sun 14.06

A big week across reliability, model selection, and a new skill suite. Workspace init got more reliable and now writes a `gain.json` config file, model choice was made explicit everywhere, Solr support landed, and the instruction set got meaningfully cheaper to run.

**Highlights**

- Workspace init hardened, plus a new `gain.json` as the single source of truth for SDLC tooling
- Model selection made explicit: canonical model list per task, correct Claude IDs in plugins
- New Solr skill suite: query, schema, extending, semantic search
- Coding flow gained a file-based migration/modernization mode
- Leaner instructions (#109) cut per-call cost; `llms.txt` now published for the web

#### Reliable workspace init and gain.json

- **Change.** `[R2 + R3]` Hardened the init-workspace flow, defined its subagents clearly, and added missing skills. Init now generates a repo-root `gain.json` that records SDLC tooling config collected from the user, treated as the single source of truth in conflicts. (Igor Solomatov)
- **Why it helps.** Init misclassifying a workspace used to overwrite config or skip setup. Clearer subagents and one authoritative config file make setup repeatable and stop tools from disagreeing about project settings.

#### Explicit model selection

- **Change.** `[R3 + Tooling]` Defined a canonical list of supported SOTA models by tier, and added a per-step `subagent_required_model` so each workflow step states which model it needs. Fixed the plugin generator to emit full Claude model IDs (e.g. `claude-opus-4-8`) and to stop preferring Opus 4.6 over 4.8. Corrected the model mappings. (Igor Solomatov)
- **Why it helps.** Agents now run on the intended model instead of a stale or wrong default. Right tier per task means better reliability without overpaying.

#### Plugin generator: clean architecture

- **Change.** `[Tooling]` Removed dead and forbidden `PluginSpec` fields, applied clean-architecture fixes, and updated the spec to match. (Igor Solomatov)
- **Why it helps.** Less dead surface area and a spec that matches reality, so the generator stays easy to extend (the goal of last week's rewrite).

#### Solr skill suite (#104)

- **Change.** `[R3]` Added four Solr skills: query, schema, extending, and semantic search, each with deep reference material (edismax, block-join, JSON facets, kNN, relevancy, anti-patterns, and more). (Roman Kagan)
- **Why it helps.** Agents working on Solr projects get expert, grounded guidance instead of guessing at query syntax and schema design.

#### Coding flow: migration and modernization

- **Change.** `[R3]` Added a file-based migration/modernization mode to the coding flow: tiny 1-3 file batches, mirror the source, no behavior change or new code, with per-file start/complete logging. Added a hint to run multiple implementation agents in parallel. (Igor Solomatov)
- **Why it helps.** Large migrations stay accurate and auditable instead of drifting into rewrites, and parallel agents finish bulk work faster.

#### Leaner instructions (#109)

- **Change.** `[R2 + R3]` Compressed frontmatter descriptions across the instruction set, folded `coding-iac` in, and tidied skills (prompt-adaptation became the `pa-adapt` reference). (Igor Solomatov)
- **Why it helps.** Instructions ship in every agent's context on every call. Smaller payload means lower token cost and less context pressure.

#### llms.txt published

- **Change.** `[Docs]` Added `llms.txt` / `llms-full.txt`, a dense machine-readable source of the whole project, and wired it to serve from the web via GitHub Pages. (Igor Solomatov)
- **Why it helps.** AI agents (and people) can read the entire project from one URL instead of crawling the repo.

#### Operations and fixes

- **Change.** `[Server + Tooling]` MCP Helm chart gained a PodDisruptionBudget and liveness/readiness probes (#105, Konstantin Khristenko). Fixed Operation Manager upsert behavior (#103, and #108 so `upsert-with-template` produces the phase for subagents) (Yevheniia Lementova). Fixed Rosetta initialization, cleaned up old MCP artifacts, and added a leadership elevator speech and config-instruction updates. (Igor Solomatov)
- **Why it helps.** Safer rollouts and self-healing pods in Kubernetes. Plan execution no longer trips on upsert edge cases.

### Week Mon 01.06 – Sun 07.06

Tooling and reliability week. A new generator now builds every IDE plugin from one source, the hosted MCP server's intermittent freezes were tracked down and fixed, the requirements and code-analysis flows learned to turn existing code into specs, and the engineer-facing docs were rewritten.

**Highlights**

- New plugin generator (`npx rosettify-plugins`) builds all IDE distributions from one source
- Fixed intermittent MCP server hangs (the 502-after-minutes bug) and added full request logging
- Code analysis can now reverse-engineer requirements from an existing codebase
- Rosettify builds a whole plan in one call: ~50% fewer calls
- Plugins, MCPs, and Quickstart docs rewritten for engineers

#### Plugin generator

- **Change.** `[Tooling]` One tool, `npx rosettify-plugins`, builds every distribution (Claude Code, Cursor, Copilot, Codex, and the Cursor/Copilot standalones) from a single instruction source tree. Rewritten in TypeScript on a modular pipeline architecture, replacing the old single-file Python monolith, with a full reverse-engineered requirements spec and byte-for-byte parity against the previous output. Eight critical issues were fixed along the way. (Igor Solomatov)
- **Why it helps.** Edit the instructions once and every plugin regenerates identically, so IDE variants can't drift apart. The modular architecture makes adding a new plugin practical, which was effectively impossible with the old monolith. No Python toolchain to install. The spec makes the build auditable.

#### MCP server: hang fix and observability

- **Change.** `[Server]` Fixed the intermittent freeze where the hosted server stopped replying and the gateway 502'd after tens of minutes. Root cause: synchronous, no-timeout RAGFlow calls ran directly on the async event loop, so one half-open socket froze the entire single worker, with nothing logged. The fix moves blocking work (RAGFlow, Redis, OAuth) off the loop with finite, tunable timeouts, and adds full request/response/SSE logging, an in-flight watchdog, clearer exception surfacing, an unauthenticated `/healthz` probe, and a Docker healthcheck. (Igor Solomatov)
- **Why it helps.** The server no longer silently locks up under a slow dependency. Every request now shows up in the logs (arrived, replied, or stalled), so operators can see and recover from problems instead of guessing. Timeouts are configurable via environment variables.

#### Requirements and code-analysis flows

- **Change.** `[R2 + R3]` The code-analysis flow can now extract requirements from an existing codebase, spawning one narrowly-scoped subagent per module, screen, or endpoint. Requirement identifiers now live in code comments only, never user-facing. Requirements authoring hands off directly to the coding flow, the review skills were merged into one, and type validation was fixed. (Igor Solomatov)
- **Why it helps.** Turn legacy code into a real spec without hallucination (narrow scope per agent). Generated artifacts read cleanly for non-technical stakeholders. One straight path from requirements to code, with less duplicated skill logic.

#### Rosettify: fewer calls

- **Change.** `[Tooling]` `create-with-template` and `upsert-with-template` accept phase-steps as an argument, building an entire plan in one call instead of one call per step. (Igor Solomatov)
- **Why it helps.** Roughly 50% fewer MCP calls. Faster plan setup, fewer round-trips, lower token cost.

#### Documentation and website

- **Change.** `[Docs]` Plugins, MCPs, and Quickstart docs rewritten for engineers: concrete install and verify steps, collapsible agent sections, Next Steps and Links blocks. Website home page, index, and collapsible sections fixed. Added a "Useful MCPs and CLIs" reference, an rtk CLI client-IP warning, and an MCP client-confirmation note. (Igor Solomatov, ymakaruk-pixel on #102)
- **Why it helps.** Faster first-run success and fewer support questions. The two warnings surface real security and privacy footguns before users hit them.

#### Repo triage

- **Change.** `[CI]` Fixed GitHub AI workflow handling for fork PRs and taught repo-triage to handle instructions. (Igor Solomatov)
- **Why it helps.** Automated triage now works on external contributors' pull requests.

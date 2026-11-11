# Overview & Security Posture (Plugin Mode)

## WHAT ROSETTA IS

Rosetta is Grid Dynamics' open-source meta-prompting and instructions-management library for AI coding agents (Claude Code, Cursor, GitHub Copilot in VS Code / JetBrains, and others). It is **not** a coding agent itself and it does not run code. It ships as an installable plugin (non-executable) of md files, that adds rules, workflows, sub-agents definitions, and coding conventions to whichever AI agent a developer already uses in their IDE. Every task is guided through **Prepare → Research → Plan → Act → Validate**, with explicit human approval gates at those points.

Instructions live in three layers that merge locally at runtime: core (universal best practices shipped with Rosetta), organization (GD or client-specific conventions), and project (local constraints). All layers are markdown files, version-controlled, and reviewed like code.

## USE CASE: FEATURE DELIVERY

Rosetta ships dedicated requirements, coding, and AQA workflows — the user selects per request, from the same pool migration draws from. On everyday feature/bugfix/refactor work it addresses the failure mode of an agent jumping straight to code on an underspecified ask and never circling back to catch its own blind spots:

- **Requirements captured independently, before coding begins.** `requirements-authoring-flow` turns raw asks into atomic, traceable requirement units with its own approval gate.
- **Deep project context before a line is touched.** The agent reads `ARCHITECTURE.md` and existing conventions first, so "add rate limiting to the checkout API" reuses the shared rate-limiter and Redis layer instead of duplicating it from a guess.
- **Coding flow: plan → implement → review → validate, not "generate and hope."** Design before code, with alternatives (architect subagent proposes multiple candidate solutions with pros/cons; specs/plan split and reviewed before implementation starts); reviewer ≠ implementer (code review runs in a separate subagent with a fresh context window); validation runs it, not just reads it (a separate validator subagent executes the change against specs — passing review alone isn't accepted as done).
- **Quality and security are designed in up front, then enforced — not left to whoever remembers to ask for them.** Before code is written, the architect applies relevant best practices across ten dimensions: security, performance, reliability, maintainability, scalability, testability, observability, compliance, backward compatibility, and TCO. Security-critical features — auth, payments, PII, FedRAMP scope — additionally carry a threat model, attack vectors and mitigations, compliance requirements (GDPR, SOC2), and security testing requirements inside the spec itself, not as a review-time afterthought. At implementation the bar is zero-tolerance: no warnings, no errors, all tests passing, nothing waved off as "pre-existing" unless it was documented before the task started; tests hold a minimum 80% coverage bar with a per-test 1-second timeout that surfaces accidental calls to real external systems; and no fix is accepted without a confirmed root cause backed by evidence, so symptoms don't get patched over.
- **Infrastructure changes get heavier treatment automatically.** Touching infrastructure-as-code pulls in a stricter procedure without anyone requesting it: at least two independent security scanners, a secrets scan, a cost estimate, and backward compatibility verified against the actual source — and any deletion of resources, in any environment, is a hard stop for explicit human approval.
- **Test coverage flows alongside.** `testgen-flow`, `api-aqa-flow`, `ui-aqa-flow` build test cases and API/UI automation from the same specs, not bolted on after.
- **Approval gates at every real decision point.** Design, plan, implementation, and final delivery each require an explicit approval sentence, same discipline as migration.
- **Resumable state.** Plan, specs, and phase progress persist to disk per feature, surviving session crashes and hand-offs.
- **Self-learning carries forward.** Root causes and lessons from past mistakes are recorded in `agents/MEMORY.md` and consulted during planning, so the same error isn't repeated on the next feature.

## USE CASE: LEGACY CODE MIGRATION

Rosetta ships a dedicated modernization, coding, and AQA workflows — of 17 workflows the user selects per request. On brownfield migration it directly addresses the "confidently wrong" failure mode where AI agents read a few lines of code and guess the rest:

- **Reverse-engineering pass.** At repo initialization the agent extracts architecture, tech stack, business rules, coding patterns, and dependencies into structured workspace files. Every subsequent task reads these instead of rediscovering the codebase on every prompt.
- **Progressive context loading.** Only the guardrails, skills, and workflow the current migration task needs are loaded — keeping the agent's context lean and reasoning sharp on large legacy monoliths.
- **Provide E2E coverage.** Several AQA flows help to build API, UI, and overall test coverage before migration to ensure reliable migration.
- **Coding flows.** Tuned to perform a gradual upgrade of similar technology in a highly automated manner.
- **Approval gates and separate-context review.** Specs before plans; plans before code; review performed by a separate sub-agent with a fresh context window before validation. Fits how a Strangler-Fig or phased migration is actually run.
- **Resumable state.** Plans, specs, and phase progress are written to disk, so multi-week migrations survive session crashes and hand-offs.

## USE CASE: SECURITY REVIEW

Rosetta ships a dedicated `security-flow` — separate from `coding-flow`, one of the workflow types the user selects per request. On security review it addresses the failure mode where an agent ingests secrets, tests without authorization, or reports coverage it didn't actually perform:

- **Secrets never reach the AI.** Files are checked for secrets by name before anything is read; if that check can't run, the review stops rather than proceeding on a guess.
- **You approve the scope, every time — including what's off-limits.** Production is off-limits by default; what's allowed, excluded, and forbidden is agreed before testing starts, and if scope needs to change mid-review, it's re-approved, not assumed.
- **Cheap, fast checks run first and catch the easy, known issues.** The expensive, deep AI analysis only begins once those come back clean — so expensive model time is never spent hunting for subtle problems while an obvious, cheaply-detectable one is still sitting there unfixed.
- **Sees the whole picture — across repos and across tools, not one at a time.** Every tool's findings are combined into a single view, and issues spanning multiple repositories are covered together, catching things a single scan or a single tool would miss on its own.
- **Every finding traces to the real evidence behind it, so engineers don't have to re-verify a claim before acting on it.** Anything unconfirmed is labeled unconfirmed, never upgraded into a certain finding just because the model is confident.
- **A second, independent reviewer checks every finding before it's reported** — catching false positives and missed coverage the first pass can't see in itself. If something's still wrong after correction, it escalates to a person instead of looping forever.
- **Findings are grouped by root cause — the same bug fixed once across every occurrence, not patched instance by instance — and pre-planned into ready-to-run specifications.** Engineers decide what to run and when; because the fix is already scoped, `coding-flow` can pick it up and execute it almost autonomously.

## SECURITY IMPLICATIONS AND SAFEGUARDS (PLUGIN / STANDALONE MODE)

**Design intent:** Rosetta is a design-time prompt library, not an execution engine. In plugin (or standalone) mode Rosetta is delivered as static markdown skills, rules, and workflow files installed into the developer's IDE environment. The AI coding agent — running locally in the IDE — is what reads code and runs commands. Every local command executed against the codebase is initiated by that agent and explicitly approved by the operator at the IDE level, exactly as it would be without Rosetta. Rosetta only supplies the instructions the agent follows; it does not touch, execute, or persist any source code. Rosetta makes AI to seek human approval and follow best practices, including in security.

### Architectural controls

- **No server involved at runtime.** All users run Rosetta as a plugin. Once installed, there are no network calls to any Rosetta component during a coding session — no MCP server, no remote instruction fetch, no telemetry.
- **Data boundary.** Source code and project files remain entirely within the IDE and the local agent runtime. Rosetta files are read locally by the agent.
- **Static, inspectable content.** Rules, skills, workflows, and sub-agent definitions are plain markdown/JSON files on disk. Security review before rollout is straightforward and repeatable — review the release once, pin it, done.
- **Air-gap capable.** For sensitive environments the standalone release zip can be reviewed offline, mirrored into an internal repository, and extracted directly into the target project. No public-internet dependency at install or runtime.
- **Instruction integrity.** The entire project is Apache-2.0 open source, published via versioned GitHub releases, and undergo formal governance, peer review, and mandatory change-review gates before publication.

### Built-in agent guardrails

- Dangerous Actions Detection and Handling, Sensitive Data Handling, Shared infrastructure handling, Deviation, Human-in-the-Loop, Risk Assessment, Self-Learning and Organization (memory in the repository). Security is a first-priority concern in coding and AQA workflows.
- Structured Prepare→Research→Plan→Act→Validate flow cannot be turned off; automated risk assessment and approval gates before destructive or irreversible actions; instructions require the agent to mask sensitive data and never log credentials.

### Install-time trust boundary

- The only network touch is at install time — identical trust profile to any other developer dependency (npm package, VS Code extension). Recommended controls: pin to a specific release tag; review the release contents and diff between versions; distribute via an internal mirror if required.

### Residual risks — organizational responsibility

- AI-generated code must still be reviewed as an untrusted third-party contribution — Rosetta explicitly frames this as a shared responsibility model.
- The underlying LLM provider (Anthropic, OpenAI, GitHub Copilot, etc.) remains a separate trust decision, governed by whatever policy already applies to that agent in the IDE. Rosetta does not change the LLM's data-handling posture in either direction.
- Rosetta is provided AS IS under Apache-2.0; SECURITY.md guidance is best-effort, not a guarantee.

## BOTTOM LINE

**Engineering:** Rosetta materially reduces the "confidently wrong" failure mode on legacy migration by forcing the agent through reverse-engineering, planning, approval gates, and separate-context review — without locking GD or clients into any specific coding-agent vendor.

**Security:** In plugin/standalone mode Rosetta introduces no runtime network attack surface and no data-in-transit exposure. It is static, versioned, inspectable markdown installed alongside the IDE, air-gap capable, and pin-able to a specific release. The residual risks (AI code review discipline and LLM-provider posture) are the standard ones for AI-assisted coding and apply with or without Rosetta.

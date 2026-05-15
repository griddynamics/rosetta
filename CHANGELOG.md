# Changelog

## R2

### Overview

Rosetta is a meta-prompting, context engineering, and centralized knowledge management for AI coding agents. R2 is the production release that moves teams from individual developer prompting to governed, organization wide AI assisted development.

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

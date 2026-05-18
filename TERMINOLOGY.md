# Terminology

**Who is this for?** Anyone reading or contributing to Rosetta docs who needs the definition of a Rosetta-specific term.
**When should I read this?** As a lookup — these terms appear throughout the rest of the docs.

| Term               | Definition                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bootstrap**      | Critical universal policies (core, execution, hitl, guardrails) loaded at agent startup.                                                    |
| **Classification** | Auto-detection of request type (coding, testing, research, init, etc.) that routes to a specific workflow.                                  |
| **Workflow**       | Multi-phase pipeline coordinating subagents for a specific request type. Defines phases, steps, and approval gates. Alias **Command**       |
| **Skill**          | Reusable unit of work loaded into agents on demand. Skills define *how* to accomplish a specific task.                                      |
| **Rule**           | Persistent constraint applied globally or by path pattern. Defines best practices, guardrails, guidelines.                                  |
| **Subagent**       | Delegated specialist with fresh context and its own system prompt. Alias: **Agent**. Examples: planner, executor, and others. |
| **Template**       | Parameterized prompt with variables and validated placeholders.                                                                             |
| **Release**        | Versioned instruction set (r1, r2, r3). Enables safe evolution, rollback, and A/B testing.                                                  |
| **Guardrails**     | Safety measures: scope limits, data protection, transparency rules, approval gates, risk assessment.                                        |
| **Hook**           | Agent-side automation triggered by specific events (file modification, tool calls, dangerous actions). Enforces guardrails or injects context. Configured in the IDE (e.g. Claude Code `settings.json`). |
| **HITL**           | Human-in-the-loop. Approval gates at critical decision points (specs, plans, risky actions).                                                |
| **Meta-prompting** | Rosetta MCP consults the AI agent on what should be done and how using meta-prompts.                                                        |
| **Rosetta**        | MCP and CLI of Instruction and Knowledge Management System.                                                                                 |
| **Prompt**         | Skill, Rule, Workflow, Command, Subagent, Agent, Template, or any generic prompt. **Rosetta prompt** prompt for Rosetta.                    |
| **Shells**         | Small prompt proxies with proper fronmatters created during onboarding so that coding agents are aware of skill, agents, commands.          |

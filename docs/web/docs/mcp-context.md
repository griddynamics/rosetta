---
layout: docs
title: MCP Context
permalink: /docs/mcp-context/
---

# MCP Context

**Who is this for?** Stakeholders deciding whether to self-host Rosetta MCP — the business case, data-handling responsibilities, and opt-in features that come with it.

**When should I read this?** After [Context](/rosetta/docs/context/), only if you're evaluating the self-hosted MCP path. Most teams don't need this — plugins are primary and cover the default case.

**What this document is.** Business context, data-handling responsibilities, and opt-in capabilities specific to self-hosted Rosetta MCP deployments. No technical implementation details — see [MCP Architecture](/rosetta/docs/mcp-architecture/) for internals, [Deployment](/rosetta/docs/deployment/) for setup.

**What this document is not.** Not the general business case for Rosetta (see [Context](/rosetta/docs/context/)), not architecture, not a deployment guide.

---

## When You Need This

Self-hosted MCP is optional. Most organizations run Rosetta entirely through plugins and never need this. Consider self-hosting Rosetta MCP only if you specifically need:

- Centrally-managed, always-fresh instructions with nothing copied into any repository
- Cross-project intelligence — agents that see patterns across your whole portfolio, not just one repo
- Organization-wide adoption tracking and usage analytics
- An IDE with no Rosetta plugin (Windsurf, Junie, Antigravity, OpenCode, or another MCP-compatible agent)

If none of these apply, use [Plugins](/rosetta/docs/plugins/) instead.

## Opt-In Features and Data Responsibility

Rosetta itself does not store any project data — that principle doesn't change with MCP. A self-hosted MCP deployment can additionally opt into extra features; once enabled, your infrastructure stores the resulting data and you are responsible for it:

- **Project datasets** — per-repository collections in RAGFlow, enabling cross-project intelligence.
- **`execution_controller`** (large tasks only) — receives execution plans created by AI, which may contain project-specific information.
- **Usage analytics (PostHog)** — collects basic operational metadata (IP address, user email, coding agent with version, tool called, tool parameters) when you deploy and configure a PostHog instance on your infrastructure.

None of these are enabled by default, and none exist in plugin mode — there is no infrastructure to store data in, so there's nothing to review.

## Value Delivery Specific to Self-Hosted MCP

The adoption tracking, per-feature usage visibility, and transparent usage metrics mentioned in [Context — Value Delivery](/rosetta/docs/context/#value-delivery) for Directors and VPs come from this opt-in analytics stack. Plugin-only deployments don't have them, and don't need any data-residency review to avoid them.

## Related Docs

- [Context](/rosetta/docs/context/) — general business context, target state
- [MCP Architecture](/rosetta/docs/mcp-architecture/) — technical internals
- [Deployment](/rosetta/docs/deployment/) — self-hosting setup
- [MCPs Installation](/rosetta/docs/mcps/) — install and verify Rosetta MCP

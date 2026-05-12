---
layout: docs
title: Customize
permalink: /docs/customize/
---

# Customize Rosetta for your project

Rosetta works out of the box. These three things make it work *better* — adapted to how your team actually writes code.

All three are optional. They stack in impact: invest in #1 first, add #2 and #3 only when you hit the specific need.

---

## 1. Improve your context files

**The single highest-leverage customization.** Every Rosetta workflow reads `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` before doing anything. The more these files cover, the fewer questions Rosetta asks and the better the output.

### What they are

These files are created automatically when you run "Initialize this repository using Rosetta". After init, you edit them by hand to fill the gaps.

| File                  | What goes in it                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `docs/CONTEXT.md`     | **The why.** Business purpose, user types, key workflows, domain constraints, what success looks like.           |
| `docs/ARCHITECTURE.md`| **The how.** System components, data flow, deployment topology, integration points, key design decisions.        |
| `docs/TECHSTACK.md`   | **The what.** Languages, frameworks, libraries, tools, plus *why* each was chosen (helps Rosetta avoid wrong replacements). |

### When to do it

- Rosetta keeps asking the same questions across different tasks
- Output keeps missing a convention your team takes for granted
- A new engineer joins and you wish they could read one file to understand the project — that file should be CONTEXT.md
- You're about to start a non-trivial feature and want to front-load the context

### Example: thin vs fleshed-out CONTEXT.md

**Thin (what init often produces if your repo lacks signals):**

```markdown
# Context

This project is a REST API for managing customer orders.
Built with Node.js and PostgreSQL.
```

→ Rosetta will ask about auth, payment integration, multi-tenancy, error format,
idempotency, and 5 other things before it can plan any feature.

**Fleshed out:**

```markdown
# Context

## Purpose
B2B order management API used by 40 enterprise customers. Handles
order intake, fulfillment routing, and invoice generation. Replaces
a legacy SAP module.

## Key constraints
- Multi-tenant: every table has `tenant_id`, every query MUST filter on it
- Idempotency required on all POSTs — clients retry aggressively
- Invoices are immutable once issued (audit requirement)
- All money is stored as integer cents, never floats

## Integration points
- Auth: Okta SSO + service-to-service JWT (see ARCHITECTURE.md)
- Payments: Stripe Connect (we never touch card data)
- Fulfillment: outbound webhooks to 3 warehouse partners

## What "done" looks like
- Endpoint has OpenAPI spec, 80%+ test coverage, idempotency key support,
  tenant filter, structured error response `{ error: { code, message } }`
```

→ Rosetta now plans a feature with idempotency, tenant filtering, and the
correct error shape on the first pass. No follow-up questions.

### Tip: spot when yours needs work

After a few Rosetta sessions, look at the questions Rosetta asked. Every
recurring question is a CONTEXT.md or ARCHITECTURE.md gap.

---

## 2. Add project-specific rules

**For hard rules you want enforced every time.** Drop a markdown file alongside Rosetta — no Rosetta files modified. Rosetta loads your project rules on top of its own.

### When to do it

- "Always use pnpm, never npm/yarn"
- "All new endpoints must use the standard error middleware"
- "No `console.log` — use the structured logger from `lib/log.ts`"
- "Tests must use Vitest, not Jest"
- "All React components must be functional with hooks; no class components"

If you find yourself correcting Rosetta the same way twice, that's a rule.

### Where to put rules

| IDE                              | Path (any `.md` file works)    |
| -------------------------------- | ------------------------------ |
| Cursor                           | `.cursor/rules/*.mdc`          |
| Claude Code                      | `.claude/rules/*.md`           |
| Windsurf                         | `.windsurf/rules/*.md`         |
| JetBrains (Junie + AI Assistant) | `.aiassistant/rules/agents.md` |
| Antigravity                      | `.agent/rules/*.md`            |
| OpenCode                         | `.opencode/agent/*.md`         |
| VS Code / GitHub Copilot         | `.github/copilot-instructions.md` |

### Example: an API conventions rule

Save as `.claude/rules/api-conventions.md` (or the equivalent path for your IDE):

```markdown
# API conventions

Apply when adding, modifying, or reviewing any HTTP endpoint.

## Required for every endpoint

1. **Tenant filter.** Every query MUST include `WHERE tenant_id = $1`.
   Reject if missing — no exceptions.
2. **Idempotency.** POSTs must accept `Idempotency-Key` header and dedupe
   via the `idempotency_keys` table.
3. **Error shape.** Errors return `{ error: { code: string, message: string } }`.
   Codes from `lib/errors/codes.ts`. Never leak raw DB or stack messages.
4. **Validation.** Use Zod schemas in `schemas/`. No inline validation.
5. **Tests.** At least one happy path + one tenant-isolation test
   (verify cross-tenant request returns 404, not 403).

## Forbidden

- `console.log` — use `logger` from `lib/log.ts`
- Raw SQL string concatenation — use parameterized queries or the query builder
- Returning DB rows directly — always map through a DTO in `dto/`
```

→ Rosetta now applies all of this automatically. You stop catching the same
mistakes in review.

### Tips

- **One file per topic.** `api-conventions.md`, `testing.md`, `logging.md` — easier to skim than one mega-file.
- **State the trigger.** Start with "Apply when…" so Rosetta knows when the rule activates.
- **Show, don't tell.** Bad/good code snippets beat prose explanations.

---

## 3. Add helper MCPs

**To give Rosetta capabilities beyond your codebase.** MCPs are tools your AI agent can call — Rosetta is one of them, but you can add more.

### When to do it

- Rosetta hallucinates library APIs → add a docs MCP (Context7)
- You need the agent to test a web page → add a browser MCP (Playwright / Chrome DevTools)
- Agent needs to read your DB schema or run queries → add a database MCP
- You want it to look up Jira tickets or Figma designs → add the matching MCP

### The top 3

Add these to the same IDE config file where you added Rosetta.

**Context7** — up-to-date library/framework docs. Best ROI of any MCP.

```json
{
  "mcpServers": {
    "Rosetta": { "url": "https://mcp.rosetta.griddynamics.net/mcp" },
    "Context7": { "url": "https://mcp.context7.com/mcp" }
  }
}
```

**Playwright MCP** — drive a real browser, fill forms, click elements, scrape pages.

```json
{ "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] } }
```

**Chrome DevTools MCP** — full Chrome control: console, network tab, snapshots.

```json
{ "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp"] } }
```

Full list with use cases: [Usage Guide → Recommended MCP Servers](/rosetta/docs/usage-guide/#recommended-mcp-servers).

---

## How they stack

| Layer            | Effort        | Impact   | Best for                                      |
| ---------------- | ------------- | -------- | --------------------------------------------- |
| Context files    | 30–60 min     | Huge     | Every project. Do this first.                 |
| Project rules    | 5–10 min each | High     | Recurring corrections, team conventions.      |
| Helper MCPs      | 1 min each    | Variable | Specific capabilities Rosetta is missing.     |

Start with #1. Add a rule the first time you correct Rosetta twice. Add an MCP the first time Rosetta says "I'd need to check the docs for that."

---

## Going deeper

- [Quick Start](/rosetta/docs/quickstart/) — installation and basics
- [Usage Guide](/rosetta/docs/usage-guide/) — every workflow, skill, and agent
- [Architecture](/rosetta/docs/architecture/) — how Rosetta loads and applies these layers under the hood

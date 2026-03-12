# Phase 2: Depth (After Foundation)

These documents have clear jobs but depend on Phase 1 being in place first. They fill gaps that active contributors will hit once the foundation docs exist.

---

## `QUICKSTART.md` — Shortest happy path

**Source material:** `refsrc/setup/QUICKSTART.md`, `docs/web/index.md` (Get Started section)
**Audience:** New users going from zero to working setup
**Job:** Pure task flow, no theory

Recommended sections:
1. Prerequisites
2. Install
3. Configure MCP / integration
4. Initialize a repository
5. Verify it works
6. Next steps
7. Common first-time failures (very short)

**Note:** The website landing page already covers install steps with IDE tabs. Decide whether this duplicates `docs/web/` or whether `QUICKSTART.md` serves the GitHub-only audience. If the website is the canonical install path, this may be unnecessary — a short section in README linking to the site could suffice.

---

## `OVERVIEW.md` — Product/system mental model

**Source material:** `refsrc/setup/OVERVIEW.md`, current `docs/OVERVIEW.md` placeholder
**Audience:** New technical readers who want the conceptual picture
**Job:** What Rosetta manages, what it doesn't, core terminology

Recommended sections:
1. Problem Rosetta solves
2. Core mental model
3. Main concepts and terminology
4. How Rosetta fits into SDLC / AI workflow
5. High-level lifecycle
6. Limits / non-goals
7. Links to deeper docs

**Rules:**
- Define core terms once here; reuse everywhere else
- Conceptual, not implementation-heavy
- Distinct from README (README = "what and why"; OVERVIEW = "how to think about it")

---

## `docs/CONTEXT.md` — Context model reference

**Source material:** `refsrc/architecture/CONTEXT.md`, `refsrc/bootstrap/bootstrap-rosetta-files.md`
**Audience:** Contributors touching prompts, rules, context logic
**Job:** Canonical reference for how context works in Rosetta

Recommended sections:
1. What "context" means in Rosetta
2. Context sources
3. Context structure / schema
4. Resolution / merge behavior
5. Precedence rules
6. Validation and constraints
7. Examples
8. Common mistakes

**Why Phase 2:** Critical for a system where context behavior is the core product, but contributors need ARCHITECTURE.md in place first to understand where context fits.

---

## `TROUBLESHOOTING.md` — Quick diagnosis

**Source material:** `refsrc/tools/TROUBLESHOOTING.md`
**Audience:** Anyone blocked during setup or usage
**Job:** Symptom-first fixes

Recommended sections:
1. Quick diagnostics
2. Install problems
3. MCP / IDE integration issues
4. Auth / configuration issues
5. Retrieval / indexing / context issues
6. Performance issues
7. Debug logging
8. When to open an issue

**Note:** Partially overlaps with website FAQ potential. Keep this as the canonical troubleshooting source; website can link here.

---

## `USAGE_GUIDE.md` — How to use Rosetta

**Source material:** `refsrc/architecture/DEVELOPER_GUIDE.md` (request types, usage patterns), `refsrc/components/workflows.md`, `refsrc/components/skills.md`, `refsrc/bootstrap/bootstrap.md` (command aliases), `refsrc/business/oss-vs-enterprise.md`
**Audience:** All Rosetta users (engineers, leads, architects)
**Job:** What Rosetta provides, how to use each flow, what to expect

Recommended sections:
1. How Rosetta works (request in, instructions out, no special syntax)
2. Request types (coding, testing, research, modernization, init, adhoc)
3. Session lifecycle (bootstrap, classification, instruction delivery, approval gates)
4. Common workflows
   - Feature development flow
   - Test automation flow
   - Project initialization flow
   - Code analysis / research flow
5. Command aliases and power-user shortcuts
6. Approval gates and human-in-the-loop checkpoints
7. OSS vs Enterprise capabilities
8. Related docs

**Rules:**
- Target 300-400 lines
- Task-oriented, not architecture-oriented
- Show what users do, not how the system works internally
- Include realistic request examples for each flow
- Distinct from OVERVIEW (OVERVIEW = mental model; USAGE_GUIDE = what you actually do)
- Distinct from QUICKSTART (QUICKSTART = first setup; USAGE_GUIDE = ongoing use)

---

## `DEPLOYMENT_GUIDE.md` — Deploying Rosetta for your org

**Source material:** `refsrc/setup/MCP-V2.md` (MCP transport, OAuth, STDIO), `refsrc/architecture/CONTEXT.md` (RAGFlow, Helm, env config), `refsrc/tools/REVIEW.md` (production considerations), `refsrc/presentations/slides-1.md` (Kubernetes architecture), `refsrc/setup/INSTALLATION.md` (deployment modes)
**Audience:** Engineers deploying Rosetta to their organizations
**Job:** How to deploy RAGFlow, MCP server, configure Helm, manage secrets

Recommended sections:
1. Deployment modes overview (hosted MCP, local MCP, air-gapped)
2. RAGFlow (Rosetta Server) deployment
   - Docker Compose setup
   - Kubernetes / Helm chart setup
   - Dataset and collection configuration
3. Rosetta MCP deployment
   - HTTP transport with OAuth (production)
   - STDIO transport (air-gapped)
   - Environment variables reference
4. Helm chart configuration
   - Values reference
   - Known issues (REDIS_URL substitution, Fernet key)
5. Security configuration
   - OAuth / Keycloak integration
   - Fernet encryption for token storage
   - ROSETTA_MODE (SOFT vs HARD)
6. Environment management (local, dev, production)
7. Verification and health checks
8. Related docs

**Rules:**
- Target 200-300 lines
- Operator-focused, not contributor-focused
- Reference tables for env vars and Helm values
- Distinct from QUICKSTART (QUICKSTART = single user; this = org infra)
- Distinct from INSTALLATION (INSTALLATION = client/IDE edge cases; this = server-side)

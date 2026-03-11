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

## `docs/TOOLS.md` — Supported tools and integrations

**Source material:** `refsrc/tools/TOOLS.md`, `refsrc/tools/PLUGINS.md`
**Audience:** Contributors working on integrations or tooling
**Job:** What tools exist, how they're configured, known limitations

Recommended sections:
1. Supported tools overview
2. IDE integrations
3. Agent / model expectations
4. External dependencies
5. Tool-specific configuration
6. Known limitations
7. Compatibility notes

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

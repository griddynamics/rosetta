# Phase 1: Foundation (Act Now)

These documents have clear jobs, clear audiences, and source material already exists in `refsrc/`. They unblock contributors and users immediately.

---

## `README.md` — Project orientation

**Source material:** `refsrc/setup/OVERVIEW.md`, `refsrc/business/benefits.md`, `docs/web/index.md`
**Audience:** Anyone landing on the repo
**Job:** What is this, why should I care, where do I go next

Recommended sections:
1. What Rosetta is
2. Why use it
3. Quick example
4. Installation / first run
5. Supported IDEs / agents
6. Docs map (routing table)
7. Contributing (link)
8. Community

**Rules:**
- Marketing + orientation only, no contributor policy
- 1-2 realistic examples max
- End with explicit doc routing ("Where next?")

---

## `CONTRIBUTING.md` — Contribution workflow

**Source material:** `docs/web/contribute.md`, `refsrc/bootstrap/bootstrap-hitl-questioning.md`, `refsrc/bootstrap/bootstrap-guardrails.md`
**Audience:** First-time and returning contributors
**Job:** Fastest correct path to a merged PR

Recommended sections:
1. Before you start (link to README, setup, developer guide)
2. What kinds of contributions are welcome
3. Fast path to your first PR
4. Development workflow (branch, commit, validate, PR)
5. AI-assisted contribution rules
6. Pull request checklist
7. Where to find deeper docs (short routing list)
8. Code of conduct / community (link only)

**Rules:**
- Target 100-180 lines
- No deep architecture
- No duplicate setup
- Hard PR checklist
- Explicitly address AI-assisted contributions

**AI-assisted contribution norms (include directly):**
- AI help is welcome; author is responsible for the result
- Do not submit large unexplained generated diffs
- Prefer small, reviewable PRs
- Prompt/context/rule changes require examples or before/after behavior
- Generated content must not introduce secrets, fabricated docs, fake benchmarks, or unverifiable claims

---

## `DEVELOPER_GUIDE.md` — Contributor navigation hub

**Source material:** `refsrc/architecture/DEVELOPER_GUIDE.md`, `refsrc/architecture/folder-structure.md`
**Audience:** Active contributors and maintainers
**Job:** How the repo is organized, where to change what, how to validate

Recommended sections:
1. Who this guide is for
2. Repository layout
3. Development environment setup
4. Build / test / lint commands
5. Local workflows
6. How documentation is organized
7. Where to change what (routing by change type)
8. How to validate changes
9. Review and merge flow
10. Release / compatibility notes

**Rules:**
- Canonical developer doc index
- Links to deep docs, doesn't restate them
- Acts as traffic controller between all other docs

---

## `docs/ARCHITECTURE.md` — System understanding

**Source material:** `refsrc/architecture/ARCHITECTURE.md`, `refsrc/architecture/CONTEXT.md`, `refsrc/architecture/folder-structure.md`
**Audience:** Contributors needing to understand how Rosetta works before changing it
**Job:** System structure, component relationships, data flow

Recommended sections:
1. Architecture goals
2. System boundaries
3. Main components
4. Data / context flow
5. Integration points (MCP, RAGFlow, IDEs)
6. Runtime responsibilities
7. Extension points
8. Failure modes / tradeoffs

**Rules:**
- Diagrams strongly recommended
- Stable component boundaries, not contributor process
- This is where the system explanation lives (not in CONTRIBUTING.md)

---

## `REVIEW.md` — Review standards

**Source material:** `refsrc/tools/REVIEW.md`, `refsrc/bootstrap/bootstrap-guardrails.md`
**Audience:** Reviewers and PR authors
**Job:** What reviewers verify, what authors must provide

Recommended sections:
1. What reviewers look for
2. Scope and change size expectations
3. Correctness checks
4. AI-assisted change review rules
5. Docs/config/schema review rules
6. Security/privacy checks
7. Approval / follow-up expectations

**AI-assisted review norms (include directly):**
- Reviewers should test claims, not trust generated text/code
- Check for hidden scope creep
- Verify examples actually run
- Inspect prompt/rule changes for overreach and brittle assumptions

**Why Phase 1:** Extremely valuable for an AI-tooling repo. Sets the bar for what gets merged. Low effort, high impact.

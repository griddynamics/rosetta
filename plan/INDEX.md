# Documentation Restructuring Plan

## Current State

Rich reference content exists in `refsrc/` (30+ docs across setup, architecture, bootstrap, patterns, components, tools, business). A Jekyll website exists in `docs/web/` with landing, overview, usage, contribute, and roadmap pages. `docs/OVERVIEW.md` is a placeholder.

The content is **not structured for its target audiences**: new users, first-time contributors, daily contributors, reviewers, maintainers. This plan restructures it.

License: Apache-2.0

## Writing

Voice, tone, writing constraints, banned phrases, and review tests live in the `documentation` skill (`.cursor/skills/documentation/SKILL.md`). Use that skill when writing any doc.

### Line targets per document

| Document | Max lines | Why |
|---|---|---|
| README | 80-120 | Orientation only |
| CONTRIBUTING | 100-180 | Workflow + checklist |
| DEVELOPER_GUIDE | 150-250 | Navigation hub, not encyclopedia |
| ARCHITECTURE | 200-350 | Complex system, but diagrams replace prose |
| REVIEW | 80-150 | Checklists, not essays |
| QUICKSTART | 60-100 | Pure steps |
| OVERVIEW | 100-180 | Concepts, not implementation |
| CONTEXT | 150-250 | Business requirements, reference, needs examples |
| TOOLS | 100-200 | Reference tables |
| TROUBLESHOOTING | 100-200 | Symptom-fix pairs |
| USAGE_GUIDE | 300-400 | What each flow provides how to use what |

## Core Design: Two-Speed Documentation

**Fast path** — contributor ships a small change quickly (readable in minutes).
**Deep path** — contributor needs architecture, context, tooling, or review details (linked, not repeated).

---

## Phase Map

| Phase | Goal | Documents | Details |
|---|---|---|---|
| **1 — Foundation** | Unblock all audiences | README, CONTRIBUTING, DEVELOPER_GUIDE, ARCHITECTURE, REVIEW | [phase-1-foundation.md](phase-1-foundation.md) |
| **2 — Depth** | Fill gaps active contributors hit | QUICKSTART, OVERVIEW, CONTEXT, TOOLS, TROUBLESHOOTING | [phase-2-depth.md](phase-2-depth.md) |
| **3 — Specialist** | Create on demand | INSTALLATION, DEVELOPERS-QUICKSTART, PLUGINS, PERFORMANCE, RAGFLOW, IMS-MCP, r1-mapping, baseline, core | [phase-3-specialist.md](phase-3-specialist.md) |

## Document Index

| Document | Phase | Location | Audience | Job |
|---|---|---|---|---|
| `README.md` | 1 | repo root | Anyone landing on repo | What is this, why care, where next |
| `CONTRIBUTING.md` | 1 | repo root | First-time + returning contributors | Fastest path to merged PR |
| `DEVELOPER_GUIDE.md` | 1 | repo root | Active contributors + maintainers | Repo navigation, where to change what |
| `docs/ARCHITECTURE.md` | 1 | docs/ | Contributors changing system behavior | System structure, components, data flow |
| `docs/REVIEW.md` | 1 | docs/ | Reviewers + PR authors | What reviewers verify, what authors provide |
| `QUICKSTART.md` | 2 | repo root | New users | Zero to working setup |
| `OVERVIEW.md` | 2 | repo root | New technical readers | Mental model, terminology, non-goals |
| `docs/CONTEXT.md` | 2 | docs/ | Contributors touching prompts/rules/context | How context works in Rosetta |
| `docs/TOOLS.md` | 2 | docs/ | Contributors on integrations/tooling | Tools, config, limitations |
| `TROUBLESHOOTING.md` | 2 | repo root | Anyone blocked | Symptom-first diagnosis |
| `INSTALLATION.md` | 3 | repo root | Users with complex setups | Full setup reference |
| `docs/DEVELOPERS-QUICKSTART.md` | 3 | docs/ | Contributor dev setup | Hacking on Rosetta itself |
| `PLUGINS.md` | 3 | repo root | Plugin authors | Extension surface, lifecycle |
| `docs/PERFORMANCE.md` | 3 | docs/ | Performance contributors | Benchmarks, profiling |
| `docs/RAGFLOW.md` | 3 | docs/ | RAG contributors | Retrieval/indexing internals |
| `docs/INFRASTRUCTURE.md` | 3 | docs/ | Infrastructure operators | Infrastructure reference |
| `docs/baseline.md` | 3 | docs/ | Testing contributors | Baseline behavior reference |
| `docs/core.md` | 3 | docs/ | Core module contributors | Core internals |


---

## Document Routing (include in DEVELOPER_GUIDE.md)

### New user
1. `README.md`
2. `QUICKSTART.md` or website Get Started
3. `TROUBLESHOOTING.md` if blocked
4. `USAGE_GUIDE.md`

### First-time contributor
1. `CONTRIBUTING.md`
2. `DEVELOPER_GUIDE.md`
3. `docs/REVIEW.md`
4. Relevant deep docs as needed

### Contributor changing context / prompts / rules
1. `CONTRIBUTING.md`
2. `docs/CONTEXT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/REVIEW.md`

### Contributor changing integrations / tooling
1. `CONTRIBUTING.md`
2. `docs/TOOLS.md`
3. `docs/ARCHITECTURE.md`

### Reviewer / maintainer
1. `DEVELOPER_GUIDE.md`
2. `docs/REVIEW.md`
3. `docs/ARCHITECTURE.md`
4. Subsystem-specific docs

---

## Cross-Linking Rules

- Every major doc starts with **Who is this for?** and **When should I read this?**
- Every major doc ends with **Related docs**
- `CONTRIBUTING.md` never explains complex internals
- `ARCHITECTURE.md` never explains PR mechanics
- `DEVELOPER_GUIDE.md` acts as the traffic controller
- Avoid repeating installation commands in more than two places
- Define core terms once in `OVERVIEW.md`; reference elsewhere

---

## Duplication Risks

| Pair | Risk | Mitigation |
|---|---|---|
| `README.md` vs `OVERVIEW.md` | README drifts into system explanation | README = "what and why"; OVERVIEW = "how to think about it" |
| `QUICKSTART.md` vs website Get Started | Same install steps in two places | Pick one canonical source; other links to it |
| `DEVELOPER_GUIDE.md` vs `CONTRIBUTING.md` | Workflow details leak into both | CONTRIBUTING = policy + fast path; DEVELOPER_GUIDE = navigation + setup |
| `docs/TOOLS.md` vs website install tabs | IDE config repeated | Website = user install; TOOLS.md = contributor/integration reference |

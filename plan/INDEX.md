# Documentation Restructuring Plan

## Current State

Rich reference content exists in `refsrc/` (30+ docs across setup, architecture, bootstrap, patterns, components, tools, business). A Jekyll website exists in `docs/web/` with landing, overview, usage, contribute, and roadmap pages. `docs/OVERVIEW.md` is a placeholder.

The content is **not structured for its target audiences**: new users, first-time contributors, daily contributors, reviewers, maintainers. This plan restructures it.

License: Apache-2.0

## Writing

Voice, tone, writing constraints, banned phrases, and review tests live in the `documentation` skill (`.cursor/skills/documentation/SKILL.md`). Use that skill when writing any doc.

### Line targets per document


| Document         | Max lines | Why                                                      |
| ---------------- | --------- | -------------------------------------------------------- |
| README           | 80-120    | Orientation only                                         |
| CONTRIBUTING     | 100-180   | Workflow + checklist                                     |
| DEVELOPER_GUIDE  | 150-250   | Navigation hub, not encyclopedia                         |
| ARCHITECTURE     | 200-350   | Complex system, but diagrams replace prose               |
| REVIEW           | 80-150    | Checklists, not essays                                   |
| QUICKSTART       | 60-100    | Pure steps                                               |
| OVERVIEW         | 100-180   | Concepts, not implementation                             |
| CONTEXT          | 150-250   | Business requirements, references, decisions, philosophy |
| TROUBLESHOOTING  | 100-200   | Symptom-fix pairs                                        |
| USAGE_GUIDE      | 300-400   | What each flow provides how to use what                  |
| DEPLOYMENT_GUIDE | 200-300   | RAGFlow, MCP, Helm Charts, Helm Values                   |


## Core Design: Two-Speed Documentation

**Fast path** — contributor ships a small change quickly (readable in minutes).
**Deep path** — contributor needs architecture, context, tooling, or review details (linked, not repeated).

---

## Phase Map


| Phase              | Goal                              | Documents                                                                     | Details                                        |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| **1 — Foundation** | Unblock all audiences             | README, CONTRIBUTING, DEVELOPER_GUIDE, ARCHITECTURE, REVIEW                   | [phase-1-foundation.md](phase-1-foundation.md) |
| **2 — Depth**      | Fill gaps active contributors hit | QUICKSTART, OVERVIEW, CONTEXT, TROUBLESHOOTING, USAGE_GUIDE, DEPLOYMENT_GUIDE | [phase-2-depth.md](phase-2-depth.md)           |
| **3 — Specialist** | Create on demand                  | INSTALLATION                                                                  | [phase-3-specialist.md](phase-3-specialist.md) |


## Document Index


| Document               | Phase | Status | Location  | Audience                                  | Job                                                      |
| ---------------------- | ----- | ------ | --------- | ----------------------------------------- | -------------------------------------------------------- |
| `README.md`            | 1     | done   | repo root | Anyone landing on repo                    | What is this, why care, where next                       |
| `CONTRIBUTING.md`      | 1     | done   | repo root | First-time + returning contributors       | Fastest path to merged PR                                |
| `DEVELOPER_GUIDE.md`   | 1     | done   | repo root | Active contributors + maintainers         | Repo navigation, where to change what                    |
| `docs/ARCHITECTURE.md` | 1     | done   | docs/     | Contributors changing system behavior     | System structure, components, data flow                  |
| `REVIEW.md`            | 1     | done   | repo root | Reviewers + PR authors                    | What reviewers verify, what authors provide              |
| `QUICKSTART.md`        | 2     | done   | repo root | New users                                 | Zero to working setup                                    |
| `OVERVIEW.md`          | 2     | done   | repo root | New technical readers                     | Mental model, terminology, non-goals                     |
| `docs/CONTEXT.md`      | 2     | done   | docs/     | Contributors                              | Business requirements, references, decisions, philosophy |
| `TROUBLESHOOTING.md`   | 2     | done   | repo root | Anyone blocked                            | Symptom-first diagnosis                                  |
| `USAGE_GUIDE.md`       | 2     | done   | repo root | All users of Rosetta (engineers/leads)    | How to use Rosetta, flows, and expected user actions     |
| `DEPLOYMENT_GUIDE.md`  | 2     | done   | repo root | Engineers deploying rosetta to their orgs | How to deploy RAGFlow, MCP, Helm Charts, Helm Values     |
| `INSTALLATION.md`      | 3     | done   | repo root | Users with complex setups                 | Full setup reference                                     |


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
3. `REVIEW.md`
4. Relevant deep docs as needed

### Contributor changing context / prompts / rules

1. `CONTRIBUTING.md`
2. `docs/CONTEXT.md`
3. `docs/ARCHITECTURE.md`
4. `REVIEW.md`

### Contributor changing integrations / tooling

1. `CONTRIBUTING.md`
2. `docs/ARCHITECTURE.md`

### Reviewer / maintainer

1. `DEVELOPER_GUIDE.md`
2. `REVIEW.md`
3. `docs/ARCHITECTURE.md`

### User deploying Rosetta

1. `QUICKSTART.md`
2. `DEPLOYMENT_GUIDE.md`
3. `TROUBLESHOOTING.md`

### User learning Rosetta

1. `OVERVIEW.md`
2. `USAGE_GUIDE.md`
3. `TROUBLESHOOTING.md`

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


| Pair                                       | Risk                                  | Mitigation                                                              |
| ------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------- |
| `README.md` vs `OVERVIEW.md`               | README drifts into system explanation | README = "what and why"; OVERVIEW = "how to think about it"             |
| `QUICKSTART.md` vs website Get Started     | Same install steps in two places      | Pick one canonical source; other links to it                            |
| `DEVELOPER_GUIDE.md` vs `CONTRIBUTING.md`  | Workflow details leak into both       | CONTRIBUTING = policy + fast path; DEVELOPER_GUIDE = navigation + setup |
| `QUICKSTART.md` vs `DEPLOYMENT_GUIDE.md`   | Install steps overlap                 | QUICKSTART = single user setup; DEPLOYMENT_GUIDE = org-wide infra       |
| `USAGE_GUIDE.md` vs `OVERVIEW.md`          | Concepts overlap with usage           | OVERVIEW = mental model; USAGE_GUIDE = what you actually do             |
| `DEPLOYMENT_GUIDE.md` vs `INSTALLATION.md` | Setup scope overlap                   | DEPLOYMENT_GUIDE = server/infra; INSTALLATION = client/IDE edge cases   |



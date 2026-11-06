# CODEMAP (registry)

- Purpose: registry of workspace layout and sub-repo entry points.
- Content: sub-repo table and root non-repo items; links to each repo's `docs/CODEMAP.md`.
- Style: terse, current-state only; no per-file detail (lives in sub-repo files).

Index of workspace layout. Per-repo detail lives in each repo's `docs/CODEMAP.md`. Not a copy of it.

## Sub-repos

| Path | Role | Version | Remote @ HEAD | Headline stack | Docs |
|---|---|---|---|---|---|
| `saleor/` | Headless commerce backend: Django GraphQL API | 3.23.41 (`pyproject.toml`) | `https://github.com/saleor/saleor.git` @ `67a9f9c` | Python 3.12, Django 5.2, Graphene 2.x, Celery 5.5, PostgreSQL 15 | [CODEMAP](../saleor/docs/CODEMAP.md) |
| `saleor-dashboard/` | Admin SPA for managing Saleor store data | 3.23.39 (`package.json`) | `https://github.com/saleor/saleor-dashboard.git` @ `ec4dae1` | TypeScript 5.8, React 18.3, Apollo Client 3.4, Vite 7 | [CODEMAP](../saleor-dashboard/docs/CODEMAP.md) |
| `react-storefront/` | Next.js customer storefront on Saleor API | 0.1.0 (`package.json`, placeholder) | `https://github.com/saleor/react-storefront.git` @ `ca9de3f` | TypeScript 5.3, Next.js 16, React 19, urql 4, Tailwind 3.4 | [CODEMAP](../react-storefront/docs/CODEMAP.md) |

## Root non-repo items

| Path | Description |
|---|---|
| `envs/` | Agent environment state for Rosetta skills (not read) |
| `logs/` | Dashboard and storefront dev-server logs with PID files |
| `seed.dump` | PostgreSQL custom-format seed database dump, about 792 KB (not read) |
| `gain.json` | Workspace config: service descriptions, SDLC links, versions |
| `agents/` | Workspace agent state: IMPLEMENTATION.md, MEMORY.md, init-workflow state file (TEMP is git-ignored scratch) |

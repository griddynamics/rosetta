# DEPENDENCIES (registry)

- Purpose: registry of sub-repo dependency manifests.
- Content: one row per sub-repo; links to each repo's `docs/DEPENDENCIES.md`.
- Style: terse, current-state only; details live in sub-repo files.

Index of sub-repo dependency manifests. Per-package lists live in each repo's `docs/DEPENDENCIES.md`. Not a copy of them.

| Path | Role | Version | Remote @ HEAD | Headline stack | Docs |
|---|---|---|---|---|---|
| `saleor/` | Headless commerce backend: Django GraphQL API | 3.23.41 (`pyproject.toml`); locks in `uv.lock` | `https://github.com/saleor/saleor.git` @ `67a9f9c` | Python 3.12, Django 5.2, Graphene 2.x, Celery 5.5, PostgreSQL 15 | [DEPENDENCIES](../saleor/docs/DEPENDENCIES.md) |
| `saleor-dashboard/` | Admin SPA for managing Saleor store data | 3.23.39 (`package.json`); locks in `pnpm-lock.yaml` | `https://github.com/saleor/saleor-dashboard.git` @ `ec4dae1` | TypeScript 5.8, React 18.3, Apollo Client 3.4, Vite 7 | [DEPENDENCIES](../saleor-dashboard/docs/DEPENDENCIES.md) |
| `react-storefront/` | Next.js customer storefront on Saleor API | 0.1.0 (`package.json`, placeholder); locks in `pnpm-lock.yaml` | `https://github.com/saleor/react-storefront.git` @ `ca9de3f` | TypeScript 5.3, Next.js 16, React 19, urql 4, Tailwind 3.4 | [DEPENDENCIES](../react-storefront/docs/DEPENDENCIES.md) |

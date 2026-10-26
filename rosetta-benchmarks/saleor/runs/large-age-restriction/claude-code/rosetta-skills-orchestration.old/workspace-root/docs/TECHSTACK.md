# TECHSTACK (registry)

- Purpose: registry of sub-repo tech stacks.
- Content: one row per sub-repo; links to each repo's `docs/TECHSTACK.md`.
- Style: terse, current-state only; details live in sub-repo files.

Index of sub-repo tech stacks. Source of each headline: that repo's `docs/TECHSTACK.md`. Snapshot of current state.

| Path | Role | Version | Remote @ HEAD | Headline stack | Docs |
|---|---|---|---|---|---|
| `saleor/` | Headless commerce backend: Django GraphQL API | 3.23.41 (`pyproject.toml`) | `https://github.com/saleor/saleor.git` @ `67a9f9c` | Python 3.12, Django 5.2, Graphene 2.x, Celery 5.5, PostgreSQL 15, Redis/Valkey | [TECHSTACK](../saleor/docs/TECHSTACK.md) |
| `saleor-dashboard/` | Admin SPA for managing Saleor store data | 3.23.39 (`package.json`) | `https://github.com/saleor/saleor-dashboard.git` @ `ec4dae1` | TypeScript 5.8, React 18.3, Apollo Client 3.4, Vite 7, Material-UI v4, pnpm 11 | [TECHSTACK](../saleor-dashboard/docs/TECHSTACK.md) |
| `react-storefront/` | Next.js customer storefront on Saleor API | 0.1.0 (`package.json`, placeholder) | `https://github.com/saleor/react-storefront.git` @ `ca9de3f` | TypeScript 5.3, Next.js 16, React 19, urql 4, Tailwind 3.4, pnpm 10 | [TECHSTACK](../react-storefront/docs/TECHSTACK.md) |

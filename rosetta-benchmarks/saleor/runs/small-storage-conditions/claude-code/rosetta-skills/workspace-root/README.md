# Saleor workspace

Local Saleor e-commerce workspace: core GraphQL API, admin dashboard and Next.js storefront side by side. The root is not a git repo; each sub-repo is.

## Repos
| Path | What | Start here |
|---|---|---|
| `saleor/` | Core commerce API (Python/Django GraphQL) | [saleor/docs/CONTEXT.md](saleor/docs/CONTEXT.md), [saleor/CLAUDE.md](saleor/CLAUDE.md) |
| `saleor-dashboard/` | Staff admin SPA (React/TypeScript) | [saleor-dashboard/docs/CONTEXT.md](saleor-dashboard/docs/CONTEXT.md), [saleor-dashboard/CLAUDE.md](saleor-dashboard/CLAUDE.md) |
| `react-storefront/` | Shopper storefront "Paper" (Next.js) | [react-storefront/docs/CONTEXT.md](react-storefront/docs/CONTEXT.md), [react-storefront/CLAUDE.md](react-storefront/CLAUDE.md) |

## Workspace docs
- [docs/CONTEXT.md](docs/CONTEXT.md): what the system is for, how the services relate.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how dashboard and storefront talk to the API; local runtime.
- [docs/CODEMAP.md](docs/CODEMAP.md), [docs/TECHSTACK.md](docs/TECHSTACK.md), [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md): registries of the per-repo docs.
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md), [docs/TODO.md](docs/TODO.md): cross-repo unknowns and work.
- [agents/IMPLEMENTATION.md](agents/IMPLEMENTATION.md), [agents/MEMORY.md](agents/MEMORY.md): agent change log and lessons.
- `gain.json`: workspace config (service descriptions, SDLC, versions).

## Navigating
- Cross-service question: start in `docs/`. Work inside one repo: read that repo's `CLAUDE.md` and `docs/` first; its rules apply there.
- Local stack: API :8000, dashboard :9000, storefront :3000 (details and caveats in `docs/ARCHITECTURE.md` `## Local runtime`).
- Do not read or commit secrets: `.env*`, `saleor/.devcontainer/*.env`, `*.pem`. `seed.dump` (sample data, reference only), `envs/` and `logs/` are runtime artifacts, not source.

# Age Restrictions — Implementation Plan

## Read first

- `AGE-RESTRICTIONS-SPECS.md`
- `../../saleor/docs/CONTEXT.md`, `../../saleor/docs/ARCHITECTURE.md`
- `../../saleor-dashboard/docs/CONTEXT.md`, `../../saleor-dashboard/docs/ARCHITECTURE.md`
- `../../react-storefront/docs/CONTEXT.md`, `../../react-storefront/docs/ARCHITECTURE.md`

## Governing rules

- Approved requirements and contracts: `AGE-RESTRICTIONS-SPECS.md`.
- Core API is the enforcement authority: `../../docs/ARCHITECTURE.md`.
- Birthday is personal data: `AGE-RESTRICTIONS-SPECS.md` section 8.
- Core schema changes precede client generation: `../../docs/ARCHITECTURE.md`.

## Records

- Implementation state: each repository's `agents/IMPLEMENTATION.md`.
- Cross-repository state: `../../agents/IMPLEMENTATION.md`.
- Reusable lessons: the applicable `agents/MEMORY.md`.
- Session evidence and blockers: `HANDOFF.md` and numbered handoffs.

## File ownership

| Session | Owned paths |
| --- | --- |
| 01 | `saleor/**` |
| 02 | `saleor-dashboard/**` |
| 03 | `react-storefront/**` |
| 04 | Root `docs/**`, root `agents/**`, and cross-repository validation records |

| # | Session | Depends on | Parallel with |
| --- | --- | --- |
| 1 | `01-plan-core-age-policy.md` | - | - |
| 2 | `02-plan-dashboard-age-controls.md` | 01 | 03 |
| 3 | `03-plan-storefront-age-flow.md` | 01 | 02 |
| 4 | `04-plan-integration-validation.md` | 02, 03 | - |
| 5 | `05-plan-storefront-age-labels.md` | 03 | - |

Unlisted pairs are sequential. Sessions 02 and 03 may run in parallel only because they own separate client repositories. Session 04 runs alone.

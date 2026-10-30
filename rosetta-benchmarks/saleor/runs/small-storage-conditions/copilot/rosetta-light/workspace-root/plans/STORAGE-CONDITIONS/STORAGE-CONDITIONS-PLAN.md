# Storage Conditions — Execution Plan

Read first: `STORAGE-CONDITIONS-SPECS.md`; workspace `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`; each target repository's local rules.

## Do

1. Implement FR-SC-001 and FR-SC-002 in `saleor`.
2. Regenerate the core GraphQL schema and implement focused core tests.
3. Implement Dashboard base and translation editing for FR-SC-001 and FR-SC-002.
4. Refresh the release-compatible Dashboard schema, generate types, and test form/mutation behavior.
5. Implement Storefront PDP resolution and display for FR-SC-003 through FR-SC-005.
6. Generate Storefront types and test mapping/rendering behavior.
7. Validate the cross-repository contract against the specification.

## File ownership

| Owner | Exclusive area |
|---|---|
| Core engineer | `saleor/**` |
| Dashboard engineer | `saleor-dashboard/**` |
| Storefront engineer | `react-storefront/**` |
| Validator | read-only cross-repository verification |

Core is sequentially first. Dashboard starts after the generated core schema exposes the approved contract. Storefront code generation and type checks start only after the migration is applied and a compatible core API is running. No unlisted work is parallel.

## Done when

- FR-SC-001 through FR-SC-005 have evidence in the focused tests named by the specification.
- Core, Dashboard, and Storefront generated contracts are current and compatible.
- Required repository checks complete without failures.
- No extra surfaces or permissions are changed.

## Checklist

- [ ] Base and translation persistence have the approved normalization and 250-character rule.
- [ ] Both mutation paths expose and accept the nullable field.
- [ ] Dashboard base and translation surfaces use the existing product-edit conventions.
- [ ] PDP prefers a non-empty translation, then base, then hides the block.
- [ ] PDP placement is after Description; no cart, checkout, order, or email scope expands.
- [ ] Core targeted tests and schema generation pass.
- [ ] Dashboard generation, focused tests, and type checks pass.
- [ ] Storefront generation, focused tests, and verification pass.
- [ ] Cross-repository reviewer confirms specification coverage.

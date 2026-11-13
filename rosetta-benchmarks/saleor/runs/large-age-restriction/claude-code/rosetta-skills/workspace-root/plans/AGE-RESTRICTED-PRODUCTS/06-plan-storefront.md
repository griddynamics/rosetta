# 06 — Storefront
Depends on: 04. Parallel with 05. SPECS §3.6, §7.4. Owns `react-storefront/**`.
## Do
1. Point codegen at the isolated core (env var in shell only, never committed); fragments/queries per SPECS §3.6 incl. `ShopAgePolicy`.
2. Shared `AgeBadge` "{minimumAge}+" on every product surface (cards in lists/search/collections/sale listings, PDP, cart, product heroes); no hiding/filtering.
3. Error surfacing: `addVariantToCart`, lines update, `checkoutComplete` payment-step defect fix; sign-in / account-settings links; 8 locales.
4. `BirthdayForm` + `updateBirthday`; `CurrentUserProfile.birthday` (session mode).
5. `formatVariablesForLog` redaction; `data:lock`, `core:lock` + `paper-version.json` override; contract tests.
## Subagents
- engineer (long); reviewer (short, independent).
## Rules
- Inventory every product-rendering surface by code search, list it in handoff; hero/banner = label only if it renders a product.
- Birthday never cached, logged, or put in shared fragments (`UserDetails`).
- Generated `src/gql` is git-ignored: do not commit.
## Done when
- `pnpm verify` green against the isolated core; label visible on each listed surface (verified in handoff).
## Checklist
- [ ] Implemented  - [ ] Unit tests  - [ ] Surface inventory complete  - [ ] Locale parity  - [ ] Locks regenerated  - [ ] Security (no PII logs/cache)  - [ ] Reviewed by non-author  - [ ] Handoff written

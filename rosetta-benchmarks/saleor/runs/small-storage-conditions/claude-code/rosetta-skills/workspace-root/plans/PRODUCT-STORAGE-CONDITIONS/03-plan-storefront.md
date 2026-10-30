# 03 — Storefront (react-storefront)
Depends on: 01.
## Do
1. Query + `generate:all` against running API; contract + mapper; new PDP component under description on product page only; label in all supported locales (find i18n catalog).
2. Tests per specs §8 (storefront list).
## Subagents
- engineer (short-term).
## Notes
- Not on cart/checkout/emails. No `dangerouslySetInnerHTML`. Respect data-layer locks (`data:lock`, `core:lock`).
## Done when
- Vitest for touched areas + lint + typecheck pass.
## Checklist
[ ] Implemented [ ] Unit tests [ ] Fallback translation→base [ ] Hidden when empty [ ] Locks green [ ] Lint/typecheck

# 02 — Dashboard Age Controls

Depends on: 01

## Do

1. Refresh the generated schema from core.
2. Add product age-restriction editing for `MANAGE_PRODUCTS`.
3. Add Shop minimum-age and IANA-zone settings for `MANAGE_SETTINGS`.
4. Add the permitted age-eligibility indicator to customer detail only.
5. Add localized messages and focused dashboard tests.

## Rules

- Do not query, render, or edit birthday.
- Do not add eligibility to customer lists, exports, or unrelated views.

## Done when

- Product and Shop controls persist through the updated API.
- Customer detail shows only the permitted nullable eligibility state.
- Generation, tests, typecheck, lint, formatting, and message extraction pass.

## Checklist

- [ ] Generated GraphQL refreshed
- [ ] DRAFT-AGE-01 UI complete
- [ ] DRAFT-AGE-02 UI complete
- [ ] DRAFT-AGE-06 UI complete
- [ ] Localized messages generated
- [ ] Focused tests passed
- [ ] Quality gates passed


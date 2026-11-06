# 03 — Storefront Age Flow

Depends on: 01

## Do

1. Regenerate storefront GraphQL types from the updated core schema.
2. Add authorized birthday editing in account settings.
3. Add PDP guest sign-in routing for restricted products.
4. Map authoritative checkout age errors to guest, profile, and ineligible messages.
5. Add focused unit and end-to-end coverage.

## Rules

- Never render, log, or cache birthday outside the owner account flow.
- Keep core checkout errors authoritative over client routing.

## Done when

- Guests cannot add a restricted product and are directed to sign in.
- An authenticated customer can update or clear only their own birthday.
- Eligible and ineligible checkout behavior matches the core API.

## Checklist

- [ ] Generated GraphQL refreshed
- [ ] DRAFT-AGE-03 owner UI complete
- [ ] DRAFT-AGE-04 guest flow complete
- [ ] Checkout error mapping complete
- [ ] Unit tests passed
- [ ] E2E tests passed
- [ ] Quality gates passed


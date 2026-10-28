# Research: Age-Restricted Products

## Decisions

### Persist restrictions and settings in existing Saleor models

**Decision**: Add an `is_age_restricted` Product flag, a store-wide `minimum_age` defaulting to
18, and an IANA shop time-zone setting defaulting to UTC through the existing Product and
SiteSettings models and their GraphQL mutations.

**Rationale**: Product mutation input already drives create and update. Site settings already
validates persistent store policy through `ShopSettingsUpdate` guarded by `MANAGE_SETTINGS`.
This makes all future checks observe the current policy.

**Alternatives considered**: Per-Product ages were rejected because the specification requires
one store-wide age. Metadata was rejected because settings and validation require typed,
validated values.

### Keep Birthday private and derive eligibility server-side

**Decision**: Store Birthday as a nullable User date. Restrict its resolver and mutation
authorization to the owner or `is_superuser`; compute the yes/no eligibility status from
Birthday, current Minimum age, and the shop-local date. Only the owner and `MANAGE_USERS` staff
receive that status.

**Rationale**: A typed User field supports validation and query-level access controls. Computing
eligibility prevents the dashboard from receiving the date or an age.

**Alternatives considered**: Public or private metadata was rejected because existing webhook
payloads can include metadata and applications must never receive Birthday. Returning age or
Birthday to `MANAGE_USERS` staff was rejected by the privacy requirement.

### Centralize eligibility validation and run it twice

**Decision**: Build one reusable checkout eligibility validator. Call it from checkout line
add/update mutations and from `validate_checkout`/checkout completion; the latter is
authoritative.

**Rationale**: The existing checkout cleaner is the completion defense point. A shared validator
prevents drift while line-time validation gives immediate feedback.

**Alternatives considered**: Validating only during line changes was rejected because Product
flags, Minimum age, or Birthday can change before completion. Validating only at completion was
rejected because it gives poor cart feedback.

### Use calendar-date eligibility rules

**Decision**: Convert the current instant to the configured shop time zone, compare dates only,
and calculate eligibility by calendar anniversary. Treat 29 February birthdays as reaching the
age on 1 March in non-leap years.

**Rationale**: This exactly matches the specified “today” semantics and avoids time-of-day or
elapsed-day inconsistencies.

**Alternatives considered**: UTC-only and elapsed-day arithmetic were rejected because neither
honors the configurable shop time zone and leap-day rule.

### Use existing CustomerEvent auditing with new sensitive event types

**Decision**: Create dedicated CustomerEvent types for Birthday changes and staff reads of
Birthday or eligibility. Persist only actor, time, and action; restrict event visibility to
super-admins.

**Rationale**: CustomerEvent is the existing Customer audit mechanism. Dedicated event types
permit review without storing a Birthday in event parameters.

**Alternatives considered**: General application logs were rejected because they do not provide
the required Customer audit visibility and privacy control.

### Map typed eligibility errors to storefront recovery paths

**Decision**: Return distinct checkout errors for guest, missing Birthday, and underage cases.
Classify them in existing storefront checkout-action result utilities and display accessible,
non-raw alerts with sign-in, profile, or non-retryable guidance.

**Rationale**: Existing cart line actions discard errors while checkout actions retain structured
errors. Extending that shared error shape supports consistent product, cart, and checkout UI.

**Alternatives considered**: Relying on generic GraphQL text was rejected because it cannot
reliably choose the correct user action or meet accessible UX expectations.

## Existing Patterns Confirmed

- Product create/update uses `ProductInput` and `MANAGE_PRODUCTS` in
  `saleor/graphql/product/mutations/product/`.
- `ShopSettingsUpdate` in `saleor/graphql/shop/mutations/shop_settings_update.py` validates
  SiteSettings values and is guarded by `MANAGE_SETTINGS`.
- Checkout line mutations and `saleor/checkout/checkout_cleaner.py` provide the required
  immediate and authoritative validation locations.
- `CustomerEvent` in `saleor/account/` is the established Customer audit model.
- Dashboard shared Product, Shop, and Customer fragments flow through existing typed mutations.
- Storefront checkout actions already normalize structured errors in
  `src/checkout/lib/server/mutation-result.ts`.

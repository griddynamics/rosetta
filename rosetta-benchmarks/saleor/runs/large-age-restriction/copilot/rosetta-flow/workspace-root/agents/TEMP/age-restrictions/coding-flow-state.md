# Age Restrictions Coding Flow State

## Status

- Classification: LARGE; backend, dashboard, storefront, GraphQL schema, data migration, and test suites are affected.
- Current phase: Blocked during backend implementation.
- Risk assessment: LOW during read-only planning. Reassess before any local service or database write.

## Confirmed Decisions

- A Product Boolean flag marks a product as age-restricted.
- Shop settings contain a database-backed minimum age (default 18) and validated IANA time zone (default UTC).
- Current shop-local date is authoritative; compare date values, including 29 February eligibility on 1 March in non-leap years.
- Restricted products remain visible. Guests cannot add or increase them and must sign in.
- Backend checks checkout line add/update and checkout completion. Completion is authoritative.
- Customers and superusers only can set or change customer birthdays. Birthdays must be real dates not later than the shop-local current date.
- Draft orders enforce eligibility when linked to a customer; drafts without a customer may complete. `orderBulkCreate` is exempt.
- Existing carts and orders are unchanged; later protected operations use current configuration and may identify the restricted product in the failure.

## Design Proposal

- Recommended architecture: Saleor owns a shared eligibility policy and explicit adapters for each protected checkout and order-creation operation.
- Dashboard and Paper consume the API contract for settings, flags, notices, profile editing, and error recovery; neither owns eligibility.
- Draft architecture: `plans/age-restrictions/architecture-notes.md`.

## Backend Source Discovery

- Product model: `saleor/product/models.py`; input mutations: `saleor/graphql/product/mutations/product/product_create.py` and `product_update.py`.
- Shop settings model/mutation: `saleor/site/models.py`, `saleor/graphql/shop/mutations/shop_settings_update.py`.
- Customer model and APIs: `saleor/account/models.py`, `saleor/graphql/account/types.py`, `saleor/graphql/account/mutations/account/account_update.py`, and `staff/customer_update.py`.
- Protected checkout/order seams: `saleor/graphql/checkout/mutations/{checkout_lines_add,checkout_lines_update,checkout_complete,order_create_from_checkout}.py` and `saleor/graphql/order/mutations/draft_order_complete.py`.

## Open Items

- Complete GraphQL contracts, authorization, shared eligibility enforcement, client integration, and tests.
- Validate the three new migrations and working-tree changes before further implementation.

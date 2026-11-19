# Data Model: Age-Restricted Products

## Product

| Field | Type | Rules |
|---|---|---|
| Age-restricted flag | Boolean | Defaults to empty/false. A false value means the Product is unrestricted. Editable by existing product-management staff. |

## Site Settings

| Field | Type | Rules |
|---|---|---|
| Minimum age | Non-negative whole number | Persistent, store-wide, defaults to 18. Changed only through the dashboard by staff with the existing site-settings permission. Takes effect for all later checks. |
| Shop time zone | IANA time-zone identifier | Persistent and defaults to UTC. Its current local calendar date defines “today.” |

## Customer

| Field | Type | Rules |
|---|---|---|
| Birthday | Nullable calendar date | Must be valid and not after today in the shop time zone. Visible or mutable only by the owning Customer or a super-admin. Never copied to public, unauthenticated, app, webhook, or export data. |
| Age eligibility | Computed nullable boolean | For the owning Customer and `MANAGE_USERS` staff: true if the Customer meets Minimum age today, false otherwise. Null for every other viewer. Never reveals a date or age. |

## Customer Audit Event

| Field | Type | Rules |
|---|---|---|
| Action | Enumerated action | One of Birthday change, staff Birthday read, or staff eligibility read. |
| Actor | User reference | The person performing the action. |
| Time | Timestamp | The time of the action. |
| Parameters | Non-sensitive context | Must never include Birthday, age, or derived age value. Visible only to super-admins. |

## Checkout Eligibility

Checkout eligibility is a derived state, not persisted:

1. If no checkout line has an Age-restricted Product, the checkout is unrestricted.
2. If any line is Age-restricted, a guest is ineligible.
3. A signed-in Customer without a Birthday is ineligible.
4. Otherwise, compare Birthday and Minimum age using the shop-local current date. Reaching the
   required anniversary today is eligible; for 29 February, the anniversary is 1 March in a
   non-leap year.

The state is evaluated on line add/update and recalculated at checkout completion. Completion
uses the then-current Product flags, Minimum age, time zone, and Birthday.

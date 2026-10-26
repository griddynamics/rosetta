# Data Model: Product Minimum Age Restriction

## Product (existing)
| Field | Type | Rules |
|-------|------|-------|
| minimum_age | integer, nullable | null = unrestricted; otherwise ≥ 1 |

## User / customer (existing)
| Field | Type | Rules |
|-------|------|-------|
| birthday | date, nullable | Not in the future; null = unknown |

## Derived: customer age
`age = completed years between birthday and today` (see research §5). Not stored.

## Eligibility rule
A checkout line is eligible when `product.minimum_age is None` or (`user` has birthday and `age >= product.minimum_age`).

## Migrations
- `product`: add nullable `minimum_age` (positive small integer).
- `account`: add nullable `birthday`.
Both are additive; existing rows stay valid.

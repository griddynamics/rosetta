# GraphQL Contract Changes

All changes are additive.

## Types
- `Product.minimumAge: Int` — nullable.
- `User.birthday: Date` — nullable; visible to the owner and staff with manage-users permission.

## Inputs
- `ProductInput.minimumAge: Int` (create/update; `null` clears). Must be ≥ 1, else `ProductError { field: "minimumAge", code: INVALID }`.
- `CustomerInput.birthday: Date` (`customerCreate`, `customerUpdate`) and `AccountInput.birthday: Date` (`accountUpdate`); `null` clears. Future dates → `AccountError { field: "birthday", code: INVALID }`.

## Checkout errors (new `CheckoutErrorCode` values, mirrored in the order-from-checkout/complete error enums)
- `PRODUCT_AGE_RESTRICTED` — customer is younger than a line's product minimum age.
- `BIRTHDAY_REQUIRED` — a restricted line exists and the checkout user is a guest or has no birthday.

Both are returned with `field: "lines"` and `variants: [ID]` listing affected variants, from `checkoutCreate`, `checkoutLinesAdd`, `checkoutComplete` and `orderCreateFromCheckout`.

# Research: Product Minimum Age Restriction

## 1. Where to store the minimum age
- **Decision**: Nullable positive integer `minimum_age` on `Product`; null means unrestricted.
- **Rationale**: Spec says the restriction applies to the whole product (all variants). Matches existing flat product fields; no migration of data needed.
- **Alternatives**: Product-type level (too coarse; spec says per product); variant level (spec assumption rejects); attribute/metadata (not validated, not queryable for enforcement).

## 2. Where to store the birthday
- **Decision**: Nullable `DateField` `birthday` on `User`.
- **Rationale**: Date only (no time zone issues); existing user fields live on `User`. Nullable keeps existing users valid.
- **Alternatives**: Metadata (unvalidated, weak typing); separate profile table (unneeded complexity).

## 3. Where to enforce
- **Decision**: A single helper in `checkout/checkout_cleaner.py` that, given the checkout user and lines, raises `ValidationError` for ineligible lines. Called from `checkoutCreate` and `checkoutLinesAdd` (when adding) and from completion paths (`checkoutComplete`, `orderCreateFromCheckout`) so changes in birthday, product age or customer attachment are re-checked.
- **Rationale**: Existing pattern: cleaners validate checkout state in one place, mutations call them. Completion check is the authoritative gate (FR-010).
- **Alternatives**: Only at add-to-cart (bypassable via attaching a different user or editing product age); inside `check_lines_quantity` (it has no user and is stock-focused).

## 4. Error codes
- **Decision**: Add `PRODUCT_AGE_RESTRICTED` and `BIRTHDAY_REQUIRED` to `CheckoutErrorCode` and the matching `OrderCreateFromCheckoutErrorCode`/complete error enums; field `lines` with params listing affected variant IDs (same style as `UNAVAILABLE_VARIANT_IN_CHANNEL`). Invalid minimum age/birthday inputs use the existing `INVALID` code on `ProductErrorCode`/`AccountErrorCode`.
- **Rationale**: Lets frontends distinguish "too young" from "add birthday" and list items. Additive enum values are non-breaking for the schema.

## 5. Age computation
- **Decision**: Completed years by calendar comparison (`today.year - b.year - ((today.month, today.day) < (b.month, b.day))`), using the server date in UTC; 29 Feb counts as 1 Mar in non-leap years (falls out of the tuple comparison).
- **Rationale**: Simple, no dependency, matches spec FR-008 and edge cases.

## 6. Guests
- **Decision**: Checkout with no user is treated as having no birthday (BIRTHDAY_REQUIRED).

## 7. Frontends
- **Decision**: Dashboard: number field on the product page and date field on the customer create/details pages, via existing forms and fragment/input updates; types regenerated with the repo's codegen from the updated schema. Storefront: birthday field in the profile, and checkout/add-to-cart error messages for the new codes; regenerate gql types with the repo's codegen.
- **Rationale**: Existing patterns; no new libraries.

## 8. Permissions / privacy
- **Decision**: `User.birthday` is resolved under the same rules as other personal fields on `User` (owner or staff with manage-users); product `minimumAge` is public like other product fields.

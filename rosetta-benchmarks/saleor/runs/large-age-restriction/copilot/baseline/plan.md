# Age-restricted product sales

## Problem and approach

Add a nullable minimum-age requirement to products and a nullable birthday to customer
profiles. Expose both through Saleor's GraphQL API, allow staff to configure the
product requirement in the dashboard, and allow customers to maintain their birthday
in the storefront account settings.

The backend is the source of truth: every checkout API path that can add, update, or
complete a restricted checkout will validate the authenticated checkout customer
against the most restrictive line. This prevents a client-side bypass. The storefront
will provide an actionable sign-in prompt when an unauthenticated shopper is blocked.

## Confirmed behavior

- `Product.minimumAge` is optional; an unset value means unrestricted. Set values must
  be positive whole years.
- Restricted products remain browsable to all visitors.
- A checkout containing a restricted product requires an authenticated customer with a
  birthday that meets the highest line requirement. Guest checkout is rejected; no
  staff, app, or other privileged caller can bypass this.
- A customer qualifies on their birthday, using the shop's current local date, rather
  than a time of day. A February 29 birthday qualifies on March 1 in non-leap years.
- A birthday may be changed by the account owner through `accountUpdate`, or by a
  superuser through customer management. Staff with ordinary `MANAGE_USERS` permission,
  apps, and other customers must be rejected.

## Todos

1. **Extending Saleor data models and GraphQL contract**
   - Add nullable `minimum_age` to `product.Product` with positive-value validation,
     nullable `birthday` to `account.User`, and generated Django migrations.
   - Add the fields to `Product`, `ProductInput`, `User`, `AccountInput`, and
     `CustomerInput` using the existing date/positive-integer GraphQL scalars and
     descriptions.
   - Preserve field-level authorization: account owners may submit birthday through
     `accountUpdate`; `customerUpdate` accepts it only for a superuser. Explicitly
     reject attempts by apps and ordinary staff before persistence, while leaving
     unrelated customer updates unchanged.
   - Add account/product mutation and schema tests for null, valid, invalid, owner,
     superuser, staff, and app cases; ensure mutation events and changed-field tracking
     include permitted birthday updates.

2. **Enforcing age eligibility across checkout APIs**
   - Add a small, well-tested checkout-domain eligibility helper that derives the
     strictest product minimum from checkout lines, uses the configured local shop date,
     implements the February 29/March 1 rule, and reports whether a guest, missing
     birthday, or underage customer is ineligible.
   - Introduce a dedicated `CheckoutErrorCode` and field error payload for ineligible
     age-restricted lines without exposing a customer's birthday. Include affected
     variant IDs where existing checkout error conventions support them.
   - Invoke the validator before line creation or positive-quantity additions/updates
     and again immediately before order creation in the shared checkout completion
     path. Cover `checkoutCreate`, `checkoutLinesAdd`, `checkoutLinesUpdate`,
     `checkoutComplete`, and any order-from-checkout route that reaches the shared
     service so changing a cart, attaching a customer, or calling through an app cannot
     circumvent validation.
   - Add focused GraphQL and domain tests for unrestricted carts, qualifying customers,
     guests, missing birthdays, underage customers, multiple products with different
     limits, birthday-day qualification, February 29 handling, line removal/zero
     quantity, direct completion of an existing cart, and staff/app callers.

3. **Adding dashboard product management**
   - Extend the dashboard product fragment, generated GraphQL types, form state, save
     payload composition, and product create/update mutations to carry `minimumAge`.
   - Add an optional whole-number “Minimum age” input to the existing product general
     information card, including a clear unrestricted state, non-negative/positive
     validation, API error display, localization, and create/edit data hydration.
   - Update unit tests for initial form values and submitted product payloads, plus the
     field component test coverage; regenerate dashboard GraphQL artifacts.

4. **Adding storefront birthday management and age-blocked checkout UX**
   - Request `birthday` in the current-user/account fragments and add a date form to
     account settings that calls `accountUpdate`, validates a real non-future calendar
     date, presents localized errors/success, and refreshes the account cache.
   - Regenerate storefront GraphQL documents/types after the backend schema changes.
   - Carry the new checkout error code through server action/transport result handling.
     In cart/checkout flows, show a localized restricted-product message; for a guest,
     render a sign-in call to action that preserves the current locale/channel and
     return destination. For a signed-in shopper with missing/insufficient birthday,
     link to account settings instead of silently failing.
   - Add storefront action/component/checkout error-formatting tests for birthday
     updates and both guest and signed-in remediation paths.

5. **Regenerating contracts and validating**
   - Generate Saleor GraphQL schema artifacts plus dashboard and storefront codegen
     outputs after schema/query updates; inspect generated diffs only for the new
     contract.
   - Run the affected backend account/product/checkout test modules and migration
     checks, dashboard product-form tests with typecheck/lint, and storefront account
     and checkout tests with typecheck/lint. Run each repository’s smallest existing
     commands that cover the changed files, escalating only if a targeted check exposes
     a related issue.

## Considerations

- The existing `Shop` GraphQL model has no per-shop timezone field. The initial
  implementation will treat Django's active/project timezone (`timezone.localdate()`)
  as the shop timezone; if a per-shop timezone is introduced later, the helper remains
  the single point to change.
- Birthday is sensitive profile data. It will not be added to public catalog or
  arbitrary customer-list fragments; only the relevant owner/staff API and account
  profile queries will request it.
- The error code, not client-only product data, drives storefront remediation so older
  cached carts and non-storefront API clients remain protected.

## Progress

- Implemented the product/customer fields, Django migrations, GraphQL schema and
  mutation authorization. The running API confirms `Product.minimumAge`,
  `User.birthday`, `AccountInput.birthday`, and `CheckoutErrorCode.AGE_RESTRICTION`.
- Implemented date-based age eligibility, including February 29 handling, on checkout
  creation, line changes, final checkout completion, and app-driven
  order-from-checkout.
- Implemented dashboard product minimum-age editing and regenerated dashboard GraphQL
  artifacts after updating its checked-in schema snapshot.
- Implemented storefront birthday editing, regenerated storefront GraphQL artifacts,
  and added age-restriction completion messaging with a focused unit test.
- Frontend typechecks and the focused checkout error test pass. Backend tests and
  migration checks remain blocked because the repository has no usable Python
  environment (`python3 manage.py` cannot import Django).
- Added the visible-but-purchase-restricted catalog treatment: `minimumAge` is fetched
  for shared product cards and product details, rendered as a localized `18+`-style
  badge on listings/search/featured sections and the PDP buy box, and does not change
  catalog visibility, discounts, or banners.
- Restricted birthday reads to the authenticated account owner or a superuser in the
  `User.birthday` resolver; app/webhook callers, ordinary staff, unauthenticated
  callers, and other customers are denied. Added `BirthdayAuditLog` for every
  superuser read and every persisted birthday write, and rejected ordinary-staff and
  bulk birthday updates. Birthday remains absent from dashboard UI, export code, and
  raw webhook payload serializers.
- Fixed the storefront birthday-save failure: `AccountUpdate.clean_input` used
  `get_app_promise` without importing it, causing every birthday update to fail before
  persistence. A live authenticated mutation now saves and reads the date correctly,
  and focused owner-update plus app-access tests pass.
- Fixed dashboard product pages: the newly added form field dereferenced
  `product.minimumAge` while the product query was still loading. The initializer now
  follows the existing null-safe pattern, with a loading-state regression assertion.
  The focused form suite, dashboard typecheck, and a real authenticated browser visit
  to a product page pass.
- Fixed dashboard minimum-age saving: the field was omitted from the product details
  save-composition list, leaving Save disabled. It now participates in dirty tracking
  and is serialized as a positive integer (or `null` to clear). Focused save-state and
  mutation-payload tests, dashboard typecheck, and an authenticated browser check that
  Save enables after entering `18` pass.
- Fixed underage checkout enforcement: the eligibility helper compared today with the
  birthday in the birth year rather than the date the customer reaches the required
  age. It now compares against `birthday + minimumAge`, preserving the February 29 →
  March 1 rule. Boundary tests and an authenticated checkout-create regression pass;
  the live API returns `AGE_RESTRICTION` for the reported 17-year-old customer and an
  18+ product.
- Added PDP add-to-bag feedback for age restrictions. The cart mutation now returns
  the GraphQL error code instead of silently logging it, and the client shows a sign-in
  prompt for guests, an account-settings link for customers without birthdays, or an
  underage explanation for authenticated ineligible customers. Classifier tests,
  checkout-error tests, and storefront typecheck pass.
- Fixed eligible customers reusing anonymous carts: line-add and completion age checks
  now prefer the authenticated request customer when present, falling back to the
  checkout customer for guest/app flows. This lets a customer who turns 18 today buy
  an 18+ product even when their cart was created before sign-in. The anonymous-cart
  authenticated-customer regression and date-boundary tests pass.

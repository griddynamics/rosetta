# GraphQL and UI Contract: Age-Restricted Products

## Catalog and Store Settings

- Product create and update inputs expose the Age-restricted flag to existing
  product-management staff.
- Product queries used for catalog browsing expose whether a Product is Age-restricted so
  storefront UI can anticipate restriction behavior; this is not sensitive data.
- Shop settings queries and updates expose Minimum age and shop time zone through the existing
  site-settings permission boundary. Updates reject callers without that permission and invalid
  values.

## Customer Privacy

- Account-profile queries and updates expose Birthday only for the authenticated owner.
- Staff Customer reads and updates expose Birthday only when the caller is a super-admin.
- `MANAGE_USERS` grants the age-eligibility status, not Birthday access.
- The eligibility field returns `true` or `false` to permitted viewers and `null` to all others.
- Birthday must not be added to public Customer/profile queries, unauthenticated queries,
  app-facing schema or payloads, webhooks, exports, or plugin/application context.
- Birthday and eligibility-read audit events are visible only to super-admins and contain no
  Birthday or age value.

## Checkout Errors

Checkout line add/update and completion return a structured checkout error for each condition:

| Condition | Consumer behavior |
|---|---|
| Guest with an Age-restricted Product | Reject the action; storefront shows a sign-in call to action. |
| Signed-in Customer without Birthday | Reject the action; storefront directs the Customer to their profile. |
| Customer below Minimum age | Reject the action; storefront shows a non-retryable age-requirement message. |

The completion mutation repeats validation and reports the same category. Storefront code maps
the structured category rather than displaying raw backend error text.

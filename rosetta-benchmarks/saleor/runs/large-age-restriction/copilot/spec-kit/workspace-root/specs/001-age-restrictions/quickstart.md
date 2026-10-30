# Quickstart: Age-Restricted Products Validation

## Prerequisites

- Run the existing Saleor services, dashboard, and storefront using each repository's documented
  local-development commands.
- Use a staff account with product-management, site-settings, `MANAGE_USERS`, and super-admin
  roles as needed.
- Prepare Customer accounts with no Birthday, an eligible Birthday, an underage Birthday, and a
  29 February Birthday.

## Focused Validation

1. In the dashboard, set the shop time zone and Minimum age. Confirm unauthorized staff cannot
   change the Minimum age.
2. Mark a Product as Age-restricted, then confirm a Product with its flag empty remains
   unrestricted.
3. As a guest, browse the Age-restricted Product and attempt to add it to checkout. Confirm the
   storefront asks for sign-in and the backend rejects the action.
4. As a signed-in Customer with no Birthday, attempt the same action. Confirm profile guidance
   and rejection.
5. Add a valid Birthday to the Customer profile. Confirm an eligible Customer can add and
   complete checkout, while an underage Customer cannot.
6. Verify date boundaries: a Customer reaching Minimum age today is eligible, and a 29 February
   Customer becomes eligible on 1 March during a non-leap year.
7. Change the Product flag, Minimum age, or Birthday after adding an eligible line. Confirm
   checkout completion reevaluates and blocks an ineligible checkout.
8. Verify Birthday visibility: owner and super-admin can read/change it; `MANAGE_USERS` staff
   see only true/false eligibility; others receive null or no Birthday field. Verify no Birthday
   appears in public responses, unauthenticated responses, webhooks, exports, or application
   payloads.
9. Verify Birthday changes and staff reads of Birthday/eligibility create redacted audit events
   visible only to super-admins.

## Targeted Automated Checks

- In `saleor`, run focused Product, shop settings, account privacy/audit, checkout mutation, and
  checkout-cleaner tests that cover the scenarios above.
- In `saleor-dashboard`, regenerate GraphQL types and run focused Product update/create, site
  settings, and Customer details tests.
- In `react-storefront`, run the eligibility-error classifier unit tests and the account, cart,
  and checkout Playwright scenarios.

See [data-model.md](data-model.md) for rule definitions and
[contracts/graphql.md](contracts/graphql.md) for interface boundaries.

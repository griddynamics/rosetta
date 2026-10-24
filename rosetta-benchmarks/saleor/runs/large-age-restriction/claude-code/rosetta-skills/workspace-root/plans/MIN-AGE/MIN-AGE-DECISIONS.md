# MIN-AGE decisions (user-stated, 2026-10-22). Status: input to specs; specs Draft until approved.

Request: age-restricted products; customer birthday; too-young customers cannot buy. DoD: end-to-end, tests, all passing locally. Repos: saleor (core), saleor-dashboard, react-storefront.

## D1 Age model (user, explicit; overrides "mark product with a minimum age" wording of original brief)
- Product: boolean flag `age restricted`, default false. Existing products unrestricted.
- Store-wide minimum age: ONE integer in Site settings, default 18, in DB. No regions/markets. Editable in dashboard by staff with MANAGE_SETTINGS. Change applies to all later checks.

## D2 Buyers
- Guest checkout with restricted product: blocked by backend; storefront asks to sign in. Guests can browse/see restricted products.
- Logged-in customer without birthday: blocked for restricted products until birthday set; storefront says so. Other products unaffected.
- Age compare: date-based, "today" = current date in the shop's time zone.

## D3 Birthday
- Customer sets/changes own birthday any time, via own account. No identity verification.
- Super-admin (`is_superuser`) can also set/change. No other staff can.
- Visibility: only the customer (own account) and `is_superuser` can read the date. NOT in any public API, public profile, unauthenticated endpoint, webhook payload, or export.
- Other staff: only yes/no `age eligible` = customer meets store-wide min age today. No age/date revealed. Visible to the owner and staff with the customer-management permission; null for everyone else.
- Audit log: every birthday change; every staff read of a birthday; every read of the eligible flag (one event per customer per request, only when field is actually resolved).

## D4 Enforcement (core)
- On checkout line add/update (and create): check. At checkout completion: check; completion is the authority.
- Staff draft orders: checked the same way, no exemption.
  - Draft with restricted product and NO linked customer: allowed, can be completed.
  - Draft with linked customer without birthday or too young: not eligible; cannot complete until birthday set (by customer/superuser) or customer link removed.

## D5 Round-2 answers (user, 2026-10-22)
- Eligible flag permission = MANAGE_USERS (plus owner); null for everyone else.
- "Today" = current date in a NEW shop time zone setting in Site settings (default UTC; dashboard-editable with MANAGE_SETTINGS). Compare dates, not times. Turning N today = eligible today. 29 Feb birthday: eligible 1 Mar in non-leap years.
- Drafts: only an explicit Customer (user) link counts. No email-match to an account. No link => allowed, completable. (Overrides architect proposal Q5.)
- orderBulkCreate: NOT checked (historical orders).
- Architect-proposed, not yet answered by user (specs mark as proposals): User.canManageBirthday field; separate mutation customerBirthdayUpdate for superuser; own birthday reads not logged; superuser may set staff birthdays; no birthday at sign-up; gift-reward lines follow-up; commit fetched schema to dashboard.

## D6 Spec approval (user, 2026-10-22): "Yes, I approve with those corrections, and PR-1..7 as proposed."
- PR-1..7 approved as proposed (canManageBirthday; customerBirthdayUpdate; no own-read audit; superuser sets staff birthdays; no sign-up birthday; gift-reward follow-up; commit schema to dashboard). Email-link draft hole accepted as-is.
- C1 Visibility: restricted products stay visible everywhere (all channels, lists, search, PDP) with an age label, e.g. "18+". Restriction is on buying only. Label uses store-wide minimum age.
- C2 Completion: a cart holding a restricted product fails at checkout completion with an error that NAMES the product (product name in message/field). Orders already placed stay unchanged (no retroactive action, no migration of orders).
- C3 Audit retention: birthday audit events are kept even after customer deletion. Needs migration to stop the cascade for these event types (event must survive user delete). Bigger migration accepted.

## D7 Audit retention (user, 2026-10-22)
- Age/birthday audit events kept 1 year, kept after customer deletion until then. NO deletion job in this task; retention documented in saleor/docs/TODO.md only.

## D8 Label coverage (user, 2026-10-22)
- Policy restated: restricted products visible EVERYWHERE with age label; only buying restricted.
- Core: no change (no visibility filter exists; verified by discovery). checkoutCreateFromOrder keeps: drop restricted lines for ineligible buyer + report AGE_RESTRICTED with names (as specs).
- Implement: storefront order detail/history label; dashboard collection+category product lists, product pickers (AssignProduct), order+draft-order lines; PLUS extras: dashboard discount pickers+summaries, dashboard global search, storefront structured data (JSON-LD).

Judge the diffs of the large task on Copilot. FOLLOW /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/SCORE-DIFFS.md EXACTLY (read it first, completely).

Inputs (all paths absolute):
- Judge prompt: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/SCORE-DIFFS.md
- Runs: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/ (7 method folders: baseline, grill-with-docs, superpowers, spec-kit, rosetta-flow, rosetta-light, rosetta-skills; in each, the diffs saleor.diff, saleor-dashboard.diff and react-storefront.diff). The `baseline` run is the DELTA reference.
- Base repos (before the change, at baseline-v1): /Users/olepoletaiev/saleor-judge/saleor, /Users/olepoletaiev/saleor-judge/saleor-dashboard, /Users/olepoletaiev/saleor-judge/react-storefront
- Task prompt, "Done when", hidden questions with answers, extra answers: /Users/olepoletaiev/saleor-judge/task-large-copilot.md. Each run was given only the extra-answer rows named in the "Rows given to each run" section of that file.
- Write the JSON to: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/saleor/judge/judge-large-age-restriction-copilot-v2.json
- Totals script: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/saleor/scripts/score-diffs.py

Per run: what was already checked (do not re-check) and what the agent was directed with.

## baseline

Already checked (do not re-check):
- At its first "done" the agent reported: storefront checkout error test, storefront and dashboard TypeScript checks and diff whitespace checks passed. Backend tests and migration checks were not run by the agent at that point ("no usable Python/Django environment is installed").
- The agent ran backend pytest in the Docker container for the first time during a later fix; no linter run was found.
- showmigrations was run after the agent ran migrate for account and product: 0106, 0107 and 0211 applied; API, storefront and dashboard health OK; a product query returns minimumAge. Before that the local API failed with "column product_product.minimum_age does not exist".
- Backend pytest on the changed modules was run on the final code: 527 passed, plus the new saleor/checkout/tests/test_age_restrictions.py: 4 passed
- Dashboard jest on 3 suites was run on the final code: 48 passed; tsc: no errors
- Storefront vitest on 2 files was run on the final code: 6 passed; tsc: no errors
- Full backend, dashboard and storefront suites and linters were not run
- API checkout checks were run (2026-10-30): underage customer blocked with AGE_RESTRICTION on checkoutCreate, no order; customer with no birthday blocked; guest blocked; customer who turns 18 today got order #26; adult got order #27; unrestricted product (Monospace Tee) for a guest and an underage customer got orders #28 and #29
- Birthday access via API was run (no token, support staff with MANAGE_USERS, superuser, owner, customers list as support staff): no token and support staff got PermissionDenied; superuser and owner got the date. BirthdayAuditLog had 7 rows (6 changed, 1 read), no birthday value stored.
- Dashboard minimum age was checked in the UI: entering 18 enables Save and it persists after reload. Storefront was checked in the UI: 18+ label on the category list and the product page; guest, no-birthday and underage customers each get an explanatory message (sign-in link, account-settings link, minimum-age message).
- The storefront payment step fails for every storefront payment with "App with provided identifier not found." (environment: the database has no payment app)
- Scan of added lines in the 3 diffs for print, console.log, debugger, breakpoint, pdb, TODO/FIXME/XXX and commented-out code was run: no hits; untracked files are only the feature's own

Agent was directed with:
1. Require a signed-in account. A guest can browse and see restricted products but can't buy them: guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in.
2. Customer may edit the birthday anytime, through their account, with no identity verification. Only the customer (own account) and a super-admin (Saleor's is_superuser) can set or change a birthday. No other staff can.
3. Eligible on the calendar day they reach the required age. Compare dates, not times; "today" is the current date in the shop's time zone. Someone born on 29 February becomes eligible on 1 March in non-leap years.
4. Enforce for every checkout, including staff and apps: no staff user or app can bypass the age validation on the checkout APIs.
5. Restricted products should stay visible everywhere (lists, search, discounts, banners), but they need an age label, for example "18+". Visibility is not restricted, only buying is.
6. Check whether Saleor core sends any marketing emails and tell me what you found. Any email that recommends products must not include restricted products for customers who aren't eligible.
7. The birthday is personal data. Only the customer (own account) and a super-admin can see it. It must not be in any public API, public profile, unauthenticated endpoint, webhook payload or export. Support and sales staff can't see it; at most they see a yes/no "age eligible" flag. Every change and every staff read of a birthday must be audit-logged.
8. The local app is broken: the API fails with "column product_product.minimum_age does not exist". The migrations were not applied to the local database. Fix it so the feature works on the local stack.
9. Saving the birthday doesn't work: in the storefront account settings I pick a date and click save, but the date is not kept and the page says the birthday is not set.
10. In the dashboard I can't open any product: every product page shows "We've encountered an unexpected error".
11. The product page opens now, but when I enter a minimum age the save button doesn't become active, so I can't save it.
12. A customer who is too young can still buy a restricted product. Logged in as a customer born on 30 October 2008 (17 today), I added a product with minimum age 18 to the cart, went through checkout to payment without any age message, and through the API the same customer completed the order.
13. In the storefront, when a customer can't buy an 18+ product, nothing explains why: as a customer who is too young, as a customer with no birthday, and as a guest who is not signed in, "add to bag" just doesn't work and no message is shown.
14. A customer who turns 18 today can't buy an 18+ product: logged in as a customer born on 30 October 2008, "add to bag" doesn't work in the storefront. A customer who turns the required age today should be able to buy it.

## grill-with-docs

Already checked (do not re-check):
- At its first "done" the agent reported: 89 backend, 70 dashboard and 9 storefront tests passed, TypeScript checks and a migration drift check passed. Later it reported red-then-green regression tests for each follow-up; dashboard and storefront tsc --noEmit pass; storefront pnpm run typecheck was blocked by a missing env variable.
- Backend pytest on the 4 changed test files (API container) was run after all follow-ups: 133 passed
- Dashboard jest on 8 changed files was run after all follow-ups: 8 suites, 94 tests passed
- Storefront vitest run on 3 files was run after all follow-ups (Node 24): 3 files, 9 tests passed
- Full suites and linters were not run
- Migrations were not applied to the running dev database at the first "done": every product query failed. The agent ran manage.py migrate after a later follow-up (account 0106–0108, product 0211, site 0053).
- API purchase checks with dummy payment were run: underage customer got AGE_RESTRICTED_PRODUCT_UNDERAGE naming Carrot Juice; customer with no birthday got AGE_RESTRICTED_PRODUCT_MISSING_DATE_OF_BIRTH; guest got AGE_RESTRICTED_PRODUCT_GUEST; customer who is 18 today got an order; adults born 1990-05-01 and 1990-12-15 got orders (the 1990-12-15 customer was blocked earlier by a bug, fixed after a later follow-up); unrestricted Apple Juice worked for a guest and an underage customer
- Birthday access via API (no token, superuser, owner, resolver code) was run: no token got PermissionDenied; superuser and owner get the date; other staff get null for the date (code); the age-eligible flag is null without MANAGE_USERS
- Dashboard UI was checked: Age-restricted product ticked, saved and kept after reload; Site Settings minimum purchase age 18 (range 1–130); customer page shows and edits the date of birth. Storefront UI was checked: 18+ on the card and the product page, sign-in message for a guest.
- Scan of added lines for console.log, debugger, print(, TODO/FIXME, .only(, skip/xfail, eslint-disable and @ts-ignore was run: 0 hits

Agent was directed with:
1. A flag on Product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database. No regions or markets.
2. The rule is enforced both when a line is added or updated in the checkout and when the checkout is completed. The check at completion is the authority.
3. Staff draft orders are checked the same way. A draft with an age-restricted product and no linked Customer is allowed and can be completed. A draft with a linked Customer who has no birthday is not eligible until the birthday is set or the link is removed.
4. The customer can set and change their own birthday at any time, through their account, with no identity verification. Clearing it is allowed. Only the customer and a super-admin (is_superuser) can set or change it; no other staff can.
5. Existing customers with no birthday can't buy restricted products until they add a birthday. Guests can browse but can't buy restricted products. Existing products are unrestricted; no data migration.
6. A customer who turns the required age today is eligible today. Compare dates, not times; "today" is the current date in the shop's time zone. 29 February becomes eligible on 1 March in non-leap years.
7. Only the customer and a super-admin can see the birthday. Other staff see only a yes/no "age eligible" flag: only the owner and staff with the customer-management permission, null for everyone else. Reading the flag is audit-logged like reading the date.
8. Audit: only the actor, the time and the action (read or change), no birthday values. Reuse the existing CustomerEvent. Two event kinds, read and change. The customer's own changes, staff changes and every staff read are logged. Only super-admins see the birthday events; they are still written. Events are kept when the customer is deleted, with actor, time and action. No audit of the minimum-age threshold.
9. Restricted products stay visible everywhere with an age label, also on the cart and checkout lines. Visibility is not restricted; buying is.
10. A birthday must be a real date, not in the future, with no profile limits. When several products are ineligible, name every ineligible product, each once. Valid minimum age: 1–130.
11. The product-management permission edits the product flag; the site-settings permission edits the minimum age.
12. Carts that hold a product that became restricted fail at checkout completion with an error that names the product. Orders already placed stay unchanged.
13. The storefront home page shows "Something went wrong loading this page", and the API returns "column site_sitesettings.minimum_purchase_age does not exist".
14. In the dashboard product page, after I tick Age-restricted product, the Save button stays disabled, so the flag can't be saved.
15. An adult customer born on 1990-12-15 (35 years old) cannot buy an age-restricted product: checkout completion fails with AGE_RESTRICTED_PRODUCT_UNDERAGE.
16. In the dashboard, the customer page (as superuser admin) shows no date of birth, so staff can't see or correct it there.
17. The storefront home page shows an error: "SaleorDataError: To access this path, you need one of the following permissions: MANAGE_SETTINGS" from getMinimumPurchaseAge.

## superpowers

Already checked (do not re-check):
- The agent reported at its first "done" (not re-verified): Saleor 511 passed plus Ruff; Dashboard TypeScript plus 39 passed; storefront TypeScript plus 800 passed.
- Backend pytest on 12 changed/new test files was run: 531 passed
- Dashboard jest on 8 changed test files was run: 86 passed (8 suites)
- Storefront vitest on 8 changed/new test files was run: 16 passed
- Full suites and linters were not re-run
- Migrations were not applied to the local dev database at the first "done" (API failed with "column site_sitesettings.minimum_age does not exist"; the agent's tests ran on a test database). The agent applied its 4 migrations after a request: all applied cleanly, API 200, dashboard 200, storefront 308.
- Dashboard draft-order checks were run (Finalize): linked underage customer rejected with "Customer does not meet the age restriction."; linked customer with no birthday rejected; customer who is 18 today got an order; adult got an order; unrestricted product with a customer with no birthday got an order
- Storefront guest checkout was run to the payment step: payment initialization failed with "App with provided identifier not found." before checkoutComplete (the database has no payment app), so the guest rejection and sign-in redirect could not be reached through the storefront UI
- Storefront age label was checked: "18+" above the product title in the list and on the product page
- Dashboard UI was checked: Site settings shows Minimum age 18; the Age-restricted checkbox can be ticked but Save does not become active when only it changes; the customer birthday input does not activate Save when only it changes
- Birthday access via API was run (no token, ordinary staff user.manager@example.com with MANAGE_USERS): no token rejected; staff got birthday null and canManageBirthday false

Agent was directed with:
1. Require an authenticated customer with a stored birthday. A guest can browse and see restricted products but can't buy them: guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in.
2. Customers may set or change their own birthday, but staff in general may not: only the customer (own account) and a super-admin (is_superuser) can set or change a birthday. The customer can do it at any time through their account, with no identity verification.
3. Not customer checkout only: staff draft orders are checked the same way, with no exemption. A draft with an age-restricted product and no linked Customer is allowed and can be completed. A draft with a linked Customer who has no birthday is not eligible until the birthday is set or the link is removed. orderBulkCreate (staff data imports) is not checked, because bulk import creates historical orders already sold.
4. Yes, eligible on their birthday: a customer who turns the required age today is eligible today. Compare dates, not times; "today" is the current date in the shop's time zone. 29 February becomes eligible on 1 March in non-leap years.
5. Typed product and customer fields with shared core enforcement. A flag on Product marks it age-restricted instead of a per-product minimumAge. The minimum age is one setting per store, 18, stored in the database, with no regions or markets: a field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks.
6. Restricted products stay visible everywhere, with an age label (for example "18+"). Visibility is not restricted; buying is.
7. The birthday is personal data. Only the customer (own account) and a super-admin can see it. It is not in any public API, public profile, unauthenticated endpoint, webhook payload or export. Support and sales staff can't see it (at most a yes/no "age eligible" flag). Every change and every staff read of a birthday is audit-logged.
8. Subagent-driven execution.
9. No, work in place.
10. Check whether Saleor core sends any marketing or product-recommendation emails, and tell me what you found. If it sends none, say so clearly. If any email does recommend products, it must not include age-restricted products for customers who aren't eligible, so make that change and add a test for it.
11. Tell me whether the terms and privacy policy need to change because of this feature. Say clearly what needs a legal review (age restriction, collecting and using customers' birthdays, and who can see them and how that is logged). This is not a code change: don't edit any code, and don't write the policy text yourself.
12. The local API fails on every request: column site_sitesettings.minimum_age does not exist. The migrations for this feature have not been applied to the local dev database. Apply the migrations to the local dev database only, and restart the local API. Don't change any code and don't commit. Tell me whether the migrations applied cleanly, and whether the API, dashboard and storefront respond.

## spec-kit

Already checked (do not re-check):
- At its first "done" the agent reported: backend focused coverage 310 tests plus webhook privacy passed; storefront/profile/dashboard focused coverage, TypeScript, formatting and dashboard staging code generation passed. Not run by the agent: storefront GraphQL generation and lint (needs NEXT_PUBLIC_SALEOR_API_URL), Playwright, manual E2E; 5 of 45 tasks (T040, T041, T044, T045, T049) were left open.
- Backend pytest on 3 age-restriction test files was run: 13 passed
- Dashboard jest on 6 suites was run: 56 passed
- Storefront vitest on src/checkout/lib and src/app was run: 188 passed (26 files)
- Full suites, Playwright E2E and linters were not run
- The agent's earlier checks (as it reported): Ruff, compile, T050 account tests 4 passed.
- Migrations were not applied to the dev database after the first "done": the dashboard kept loading and the API returned 500 ("column site_sitesettings.minimum_age does not exist"). The migrations (account 0106, 0107, product 0211, site 0053) were applied and the API container restarted by the operator's side, not by the agent.
- API checks were run: underage customer got AGE_RESTRICTED_UNDERAGE on checkoutLinesAdd; customer with no birthday got AGE_RESTRICTED_MISSING_BIRTHDAY; guest got AGE_RESTRICTED_GUEST; customer who is 18 today and an adult got the line added; unrestricted product for an underage customer worked. checkoutCreate with lines accepted a guest's and a no-birthday customer's restricted line with no error; checkoutComplete was not tested.
- Birthday access via API was run: no token got PermissionDenied; a staff user in a group with only MANAGE_ORDERS got birthday null and ageEligibility null
- UI was checked: storefront account settings has a Birthday field (future date 2030-01-01 rejected); dashboard Age-restricted box persists after reload, Site settings shows Minimum age 18 and Shop time zone UTC; storefront age label shown and a signed-out buyer is asked to sign in
- Scan of the diffs for console.log, debugger, breakpoint() and print( was run: no matches
- Dashboard check-types (tsc --noEmit, tsc-strict, e2e, e2e-legacy, scripts) was run on a clean copy of baseline-v1 with the saved diff: passes

Agent was directed with:
1. Minimum age: a flag on the product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database, in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks. Existing products are unrestricted: minimum age is empty by default, and empty means no restriction. Replace the per-product minimum age in FR-001, FR-002 and assumption 1 with this.
2. Guests: a guest can browse and see restricted products but can't buy them. The backend blocks guest checkout with a restricted product, and the storefront asks the user to sign in. Replace the assumption that anonymous purchasing is outside scope.
3. Enforcement: the age check runs when a line is added or updated in the checkout and again when the checkout is completed. Completion is the authority.
4. Dates: "today" is the current date in the shop's time zone, a new site setting that defaults to UTC. Compare dates, not times. A customer who turns the required age today is eligible today. Someone born on 29 February becomes eligible on 1 March in non-leap years.
5. Birthday privacy: only the customer (own account) and a super-admin (is_superuser) can see or change a birthday. It is not in any public API, public profile, unauthenticated endpoint, webhook payload or export, and apps have no access to it at all, even with MANAGE_USERS. Other staff see only a yes/no "age eligible" flag, null for everyone else; it is shown to the owner and to staff with MANAGE_USERS, is true when the customer meets the store minimum age today, and reveals no age and no date. Every change to a birthday and every staff read of a birthday or of the flag is audit-logged, with the actor, the time and the action only, never the birthday value. Birthday audit events are visible only to super-admins.
6. Use the names Customer, Birthday, Minimum age and Age-restricted product.
7. In FR-011, name the customer-management permission as MANAGE_USERS, the permission that lets staff see the age-eligibility status.
8. Use the existing stack and patterns of the three repositories: saleor (Python, Django, GraphQL), saleor-dashboard (React, TypeScript), react-storefront (Next.js, TypeScript). No new dependencies.
9. T027: add the Age-restricted checkbox only to the Product update page. The create dialog only collects name and type and then opens the update page, so the checkbox does not belong there.
10. Restricted products must stay visible everywhere, with an age label, for example "18+". Visibility is not restricted; buying is. Add the age label wherever restricted products are listed: lists, search, discounts and banners.
11. Saleor core sends no marketing emails. Check this and say so. Any email that recommends products must not include restricted products for customers who aren't eligible.
12. This is not a code change, but flag that the terms and the privacy policy need a legal review for age restriction and birthday collection.

## rosetta-flow

Already checked (do not re-check):
- At its first "done" the agent reported: Saleor 239 tests passed; Ruff and migration checks passed; storefront TypeScript, focused Vitest (5 passed), Prettier and diff checks passed. Later it reported dashboard 44 Jest tests passing, and several times that storefront full ESLint, codegen and typecheck were blocked by a missing NEXT_PUBLIC_SALEOR_API_URL.
- Backend pytest on the 7 changed test files (account update, me, checkout lines add/delete/update, draft order complete, shop settings update) was run: 272 passed, 0 failed
- Dashboard and storefront tests were not re-run
- The agent added no new backend test file (only changes to existing ones)
- Migrations were not applied to the dev database at the first "done" (API error "column site_sitesettings.minimum_age does not exist"). The agent applied account 0106, product 0211 and site 0053 after a request and a confirmation form; API healthy afterwards.
- API checks were run : underage, no-birthday and guest buyers blocked; customer who is 18 today and adult allowed; unrestricted product works. Birthday read via API: no token got PermissionDenied; support staff got birthday null; superuser got the date.
- After the follow-ups the operator rechecked: search card shows the 18+ badge on Bean Juice; a guest clicking "Add to bag" sees "Sign in to verify your age…" with a link; an underage customer is told she does not meet the age requirement; a customer with no birthday is sent to add a date of birth in Account settings; the dashboard Bean Juice page opens and the age-restriction setting can be changed and saved.
- Scan of added lines in the 3 diffs for console.log, print(, debugger, breakpoint(, TODO, FIXME and XXX was run: none found

Agent was directed with:
1. A flag on Product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database; no regions or markets. A field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks.
2. Guests cannot buy restricted products, and no date of birth is collected at checkout: a guest can browse and see restricted products but can't buy them. Guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in.
3. Enforcement is both when a line is added or updated in the checkout and when the checkout is completed. The check at completion is the authority.
4. Customers may set or change their own birthday at any time through their account, with no identity verification. Only the customer (own account) and a super-admin (is_superuser) can set or change a birthday. No other staff can.
5. Profile birthday editor and the restricted-product age notice, but no date-of-birth capture at checkout. Scope is all three repos: backend, dashboard and storefront, with tests in each.
6. "Today" is the current date in the shop's time zone. A customer who turns the required age today is eligible today. Compare dates, not times. 29 February becomes eligible on 1 March in non-leap years.
7. Shop time zone: a validated IANA zone selector, default UTC: a new timeZone field in shopSettingsUpdate (an IANA name such as Europe/Bucharest), plus a field on the dashboard's site settings page. The storefront does not need it.
8. A birthday must be a real calendar date, not later than the current date in the shop's time zone. No maximum-age limit.
9. Existing guest cart: retain the existing restricted lines, block quantity changes and completion, allow removal, and prompt sign-in.
10. Staff draft orders are checked the same way, with no exemption. A draft with an age-restricted product and no linked Customer is allowed and can be completed. A draft with a linked Customer who has no birthday is not eligible until the birthday is set or the link is removed. orderBulkCreate is not checked.
11. A change to the store-wide minimum age applies to later checks. Existing carts and orders are not altered. Carts that hold a product that became restricted fail at checkout completion with an error that names the product. Orders already placed stay unchanged.
12. A signed-in customer who is not eligible and already has a restricted product in the cart: allow decreases and removal, but block adds, increases and completion.
13. Replace the stalled backend engineer with a fresh one. Then: read-only discovery first, then exact backend implementation. Then: the orchestrator implements directly.
14. Approved, continue. No HITL.
15. Approved, continue. Finish all remaining.
16. Existing customers with no birthday can't buy age-restricted products until they add a birthday in their account; the storefront tells them so. Everything else works as before.
17. Please check the storefront and make it follow this.
18. Restricted products stay visible everywhere, with an age label (for example "18+"). Visibility is not restricted; buying is. Please check lists, search, discounts and banners, and make them follow this.
19. Saleor core sends no marketing emails. Please check this and tell me. Any email that recommends products must not include restricted products for customers who aren't eligible.
20. The birthday is personal data. Only the customer (own account) and a super-admin can see it. It is not in any public API, public profile, unauthenticated endpoint, webhook payload or export. Support and sales staff can't see it (at most a yes/no "age eligible" flag). Every change and every staff read of a birthday is audit-logged.
21. The feature doesn't work in the running app: the local API at localhost:8000 fails with "column site_sitesettings.minimum_age does not exist". Please apply your migrations to the local dev database so I can check the feature.
22. In the dashboard, every product page shows "We've encountered an unexpected error. Try to refresh the page or go navigate to a different page and back." (Bean Juice and Banana Juice), so I can't mark a product as age-restricted there.
23. In the storefront search results for "juice", Bean Juice is age-restricted, but its card shows no "18+" label (the product page does show it).
24. I reloaded the search page for "juice" and Bean Juice still has no "18+" label on its card.
25. In the storefront, when I'm not signed in and click "Add to bag" on Bean Juice, I only see "Age requirements are not met for: Bean Juice." Nothing asks me to sign in.
26. In the storefront, signed in as crystal.miller, whose date of birth (2008-11-09) is already saved in Account settings, "Add to bag" on Bean Juice says "Add your date of birth in Account settings before purchasing this product." She already has a date of birth; she is not old enough.

## rosetta-light

Already checked (do not re-check):
- At its first "done" the agent reported: 202 core, 45 Dashboard and 794 Storefront tests passed; live schema/API contracts, migrations, generated artifacts, locks, privacy boundaries and enforcement paths verified; no live order/payment submission and no staging server with the new schema.
- Backend pytest on 18 changed test files was run: 748 passed, 0 failed
- Dashboard jest on 6 changed files was run: 48 passed (6 suites)
- Storefront vitest on 5 changed files was run: 10 passed
- Full suites were not run
- Migrations: the agent applied the three approved migrations to the dev database before its first "done"; API, storefront and dashboard health OK at the operator's check.
- API checkoutCreate with the restricted variant was run for an underage customer, a customer with no birthday, a guest and adults: it succeeded for all (no error); checkoutComplete then returned only SHIPPING_METHOD_NOT_SET or EMAIL_NOT_SET, before any age check, so the API block at completion was not decided by this check
- Storefront checkout to the payment step was run: underage customer, customer with no birthday and a guest who ticked "create an account" each got "Payment failed. Some items can't be purchased by this account."; no order was created. For an unrestricted product the payment step fails too with "Payment failed. App with provided identifier not found."
- Dashboard draft orders (Finalize) were run: underage customer got the age error and the draft stayed a draft; customer with no birthday got "some items cannot be purchased…"; customer who is 18 today got an order; adult got an order; unrestricted product for the no-birthday customer got an order
- Birthday access via API was run: no token and another customer got PermissionDenied; owner reads their own birthday; support staff get birthday null with a permission error
- UI was checked: the dashboard product page crashed on every product at first and opens after a later follow-up; the age flag was set and saved on Apple Juice; storefront shows "18+" everywhere, with the raw key ageRestriction.label on the checkout line until a later follow-up, then fixed
- Scan of added lines and untracked files for debug prints, console.log, debugger, TODO and FIXME was run: none found

Agent was directed with:
1. A customer who turns the required age today is eligible today. Compare dates, not times; "today" is the current date in the shop's time zone. 29 February becomes eligible on 1 March in non-leap years.
2. Account birthday required; guests cannot buy restricted products. A customer with no birthday can't buy age-restricted products until they add a birthday in their account; the storefront tells them so. A guest can browse and see restricted products but can't buy them: guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in.
3. All order-creation paths, not customer checkout only: no staff user or app can bypass the age validation on the checkout APIs. Staff draft orders are checked the same way. A draft with no linked Customer is allowed and can be completed. A draft with a linked Customer who has no birthday is not eligible until the birthday is set or the link is removed. orderBulkCreate is not checked.
4. Customers may set or change their own birthday at any time through their account, with no identity verification. Only the customer (own account) and a super-admin (is_superuser) can set or change a birthday.
5. Only the customer (own account) and a super-admin can see the birthday. It is not in any public API, public profile, unauthenticated endpoint, webhook payload or export. Support and sales staff can't see it (at most a yes/no "age eligible" flag). Every change and every staff read is audit-logged. Private owner/super-admin GraphQL access only, not a schema-wide ban.
6. A flag on Product marks it age-restricted (not per channel or per variant). The minimum age is one setting per store, 18, stored in the database, in the site settings, editable by staff with the site-settings permission. No regions or markets. A change applies to all later checks.
7. Add a shop time zone setting in the site settings, default UTC, used for "today".
8. Show the age label on product cards, cart and checkout too: restricted products stay visible everywhere, with an age label (for example "18+"). Public display-only minimum-age label, e.g. "18+". Visibility is not restricted; buying is.
9. A birthday date may not be in the future. The age failure message is a generic eligibility message. Private API only for super-admin birthday access; no new Dashboard screen.
10. Birthday clearing: an explicit clear operation or flag; omission means no change.
11. Recovery after the migrations: diagnose, then restart the verified local API only if needed. Run a full harness post-mortem: yes. Use the documented Saleor local Compose configuration.
12. Dashboard fixture data is synthetic and may be used for local tests and type-checking.
13. Format the files and regenerate paper-core.lock.json. Do not prepare a sanitized Rosetta issue draft.
14. Continue. The single file-based read-only schema check was approved in my last reply. Please run it.
15. Saleor core sends no marketing emails. The agent should check this and say so. Any email that recommends products must not include restricted products for customers who aren't eligible.
16. In the running dashboard I can't open any product. When I go to Catalog and then Products and open a product (for example Apple Juice), the page shows "We've encountered an unexpected error. Try to refresh the page or go navigate to a different page and back." Refreshing gives the same error, and every other product does the same.
17. I can't provide a console capture. All I can see is the error page I described on every product page. Please find the cause yourself and fix it.
18. Age restriction label shows up as text: ageRestriction.label in checkout lines, and in other places it shows up as "18+" label.

## rosetta-skills

Already checked (do not re-check):
- The run stopped at the Copilot AI credit limit after the first user follow-up; no later check was run by the agent. The post-implementation prompt was not sent; there is no agent report.
- At its first "done" the agent reported: core validation on a disposable test database (migrations, generated schema consistency, static checks, 182 focused tests passed); storefront 819 tests passed; dashboard full Jest passes with npx jest --maxWorkers=4 (931 suites, 6,146 tests), but the default npx jest fails one varying unrelated test. After that follow-up it reported: storefront typecheck, lint, lock/docs checks and 825 Vitest tests passed.
- The agent never applied its 4 migrations to the dev database (it validated on a disposable test database); the dev API failed with "column site_sitesettings.minimum_age does not exist". The Done-when checks were run on a clean stack from the saved diffs.
- API checks were run: underage customer and customer with no birthday blocked with AGE_RESTRICTION on checkoutCreate and checkoutLinesAdd; guest blocked; customer who is 18 today and adult got a checkout; unrestricted product OK for all five users
- Birthday access via API was run: me without a token null; no token on user(email) got a permission error; support staff got birthday null (isAgeEligible readable); owner and superuser read the date
- Backend pytest on the 9 changed test files was run: 193 passed
- Dashboard jest on the 5 changed test files was run: 5 suites, 42 passed; pnpm run check-types: all files passed
- Storefront vitest on the 7 changed test files was run: 6 files, 38 passed (vitest picked up 6 of 7); tsc --noEmit clean
- UI was checked: the dashboard Age-restricted checkbox alone does not enable Save (saved only when another field also changes); Site settings minimum age and time zone save; storefront age label in the list and on the product page; guest, underage and adult flows work
- Storefront lock/docs checks and full suites were not re-run

Agent was directed with:
1. No. A guest can browse and see restricted products but can't buy them: guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in.
2. Profile editing only: the customer can set and change their own birthday at any time, through their account. Not at registration (don't accept a birthday at accountRegister), not during guest checkout. No identity verification.
3. Self-declared birthday, no identity verification. Yes, accept the limitation of self-declared, editable birthdays.
4. A flag on Product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database, no regions or markets: a field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks.
5. The store's current calendar date: "today" is the current date in the shop's time zone. Compare dates, not times. A customer who turns the required age today is eligible today. 29 February becomes eligible on 1 March in non-leap years. Add a shop time zone setting in the site settings, default UTC.
6. Ineligible purchases fail in the backend, both when a line is added or updated in the checkout and when the checkout is completed. The check at completion is the authority.
7. Only the customer (own account) and a super-admin (is_superuser) can see the birthday, and only they can set or change it; not staff with MANAGE_USERS, no separate permission. The birthday is personal data and is not in any public API, public profile, unauthenticated endpoint, webhook payload or export. Support and sales staff can't see it; other staff see only a yes/no "age eligible" flag. Every change and every staff read is audit-logged.
8. All checkout paths and staff-created draft orders, including staff and apps: no staff user or app can bypass the age validation. Drafts are checked the same way; a draft with no linked Customer is allowed and can be completed; a draft with a linked Customer who has no birthday is not eligible until the birthday is set or the link is removed. orderBulkCreate (staff data imports) is not checked.
9. When adding to cart: the storefront asks a guest to sign in when they try to add a restricted product, before checkout.
10. The eligibility flag is shown on the customer detail page only, for permitted viewers; not in lists, exports, webhooks or the public API. It is a yes/no: whether the customer meets the store-wide minimum age today; no age and no date. Only the owner and staff with MANAGE_USERS see it; null for everyone else. Reading it is audit-logged, one read event per customer per request, only when the field is actually resolved.
11. Audit events are kept for 1 year, metadata only (actor, time, action; no birthday values); after that they may be deleted by a retention job, but none is built now (retention is only documented in TODO). They are kept when the customer is deleted, even if it needs a bigger migration.
12. Shop time zone: a validated IANA zone selector, default UTC: a new timeZone field in shopSettingsUpdate plus a field on the dashboard's site settings page. The storefront does not need it.
13. Retain an immutable internal customer identifier on each audit event so it can still be linked to the customer after deletion; store no birthday value, email or name. Reuse the existing CustomerEvent.
14. Valid Shop minimum age: an integer 1 through 120. A birthday may not be in the future.
15. Only super-admins can see the birthday audit events. The birthday event types (changed, read) are hidden from the customer events for everyone else; they are still written.
16. Allow authorized clearing of an existing birthday.
17. Recovery after the core engineer used shared local Postgres and shell-script edits: inspect the core diff read-only, then reimplement or validate only with safe no-database methods.
18. Retain the generator output; do not treat the expected trailing spaces in the generated schema as a defect. Allow the recovery agent's built-in editor for repository edits only.
19. Authorize controlled disposable test-database validation only, with no dev-data access, then continue all clients.
20. Keep the dashboard schema regenerated from local core, not the baselines; local core is the source of truth in this fork; dashboard codegen and tests pass locally; this diverges from the 3.23 release pin. Add an owner-only boolean birthdayPresent, with no date exposure outside account settings. Require a clean full Jest run before acceptance.
21. Restricted products must stay visible everywhere, with an age label (for example "18+"): in product lists, search, discounts and banners. Visibility is not restricted; buying is.
22. Render the Shop's dynamic minimum age as N+ for every restricted product, for example 18+. Put the label on every product card: featured collections, discounted products, search results and product cards used in banners. Text-only banners without a product need no label.

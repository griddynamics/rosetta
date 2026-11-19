# AGE-RESTRICTIONS — Architecture notes (DRAFT, coding-flow phase 1 steps 1–3)

Status: rev 5 — review findings resolved; D1c/INV-1 applied; OQ-1 resolved; G1 approved; D6c birthday-clearing contract applied 2026-11-05. Not implemented. Specs: `AGE-RESTRICTIONS-SPECS.md`. Plan: `AGE-RESTRICTIONS-PLAN.md`.
Labels: **[D#]** = user-approved decision (mandatory, see SPECS §1.2) · **[R#]** = architect recommendation (approved at G1 2026-11-05; R4 revised by OQ-1) · **[E]** = existing-code fact with citation.
Paths: `saleor/…` = backend repo, `dash/…` = `saleor-dashboard/src/…`, `sf/…` = `react-storefront/src/…`.

## TOC
1. Step 1 — Discovery (existing code facts)
2. Step 2 — Three solution options
3. Step 3 — Chosen solution
4. Discovery anomalies

## 1. Step 1 — Discovery [E]
Backend
- `SiteSettings` = shop singleton, flat columns; precedent for zero-downtime bool `allow_storefront_traffic = BooleanField(default=True, db_default=True)` — `saleor/saleor/site/models.py:38-170`, `:77`. Latest site migration `0052_sitesettings_allow_storefront_traffic.py`.
- Shop settings API: `ShopSettingsInput` `saleor/saleor/graphql/shop/mutations/shop_settings_update.py:27`; `ShopSettingsUpdate(BaseMutation)` `:166`, `permissions=(SitePermissions.MANAGE_SETTINGS,)` `:177`, `clean_input` `:210` (precedent validation for `limit_quantity_per_checkout` `:230-242`). Read side: `Shop.limit_quantity_per_checkout = PermissionsField(..., permissions=[MANAGE_SETTINGS])` `saleor/saleor/graphql/shop/types.py:365-371`.
- `User` has no birthday; fields `saleor/saleor/account/models.py:169-200`; `is_superuser` from `PermissionsMixin` `saleor/saleor/permission/models.py:93`.
- `User` GraphQL type `saleor/saleor/graphql/account/types.py:449`; staff-only fields use `PermissionsField` (`note` `:507-511`, `events` `:553-557`, MANAGE_USERS|MANAGE_STAFF).
- `AccountUpdate` `saleor/saleor/graphql/account/mutations/account/account_update.py:47`: permissions `AUTHENTICATED_USER` **or** `AUTHENTICATED_APP` (`:74-77`); apps with `IMPERSONATE_USER` act on any `customerId` via `AppImpersonateMixin.get_user_instance` `saleor/saleor/graphql/account/mixins.py:28-56` → app write path exists (must be blocked for birthday, D6). Tracked fields `ACCOUNT_UPDATE_FIELDS` `saleor/saleor/graphql/account/mutations/account/utils.py:19-24`.
- Staff customer writes: `CustomerUpdate` (MANAGE_USERS) `saleor/saleor/graphql/account/mutations/staff/customer_update.py:31,48`; `CustomerInput(UserInput, UserAddressInput)` `saleor/saleor/graphql/account/mutations/base.py:216`, reused by `UserCreateInput` `:247` → adding birthday there leaks into create/bulk paths.
- Audit store: `CustomerEvent(type, parameters JSON, user FK, app FK, order FK)` `saleor/saleor/account/models.py:392-411`; types `CustomerEvents` `saleor/saleor/account/__init__.py:1-45`; staff-action events store **actor** in `user` and subject in `parameters.account_id` (`saleor/saleor/account/events.py:11-30`); enum auto-exported `CustomerEventsEnum = to_enum(CustomerEvents)` `saleor/saleor/graphql/account/enums.py:17` → new types change schema.
- Webhook customer payload uses explicit field list `generate_customer_payload` `saleor/saleor/webhook/payloads.py:602-618` (birthday excluded unless added). CSV export is product-only: `saleor/saleor/csv/utils/{export,product_headers,products_data}.py`.
- `Product` model `saleor/saleor/product/models.py:179-215`; `ProductInput` `saleor/saleor/graphql/product/mutations/product/product_create.py:31`, `ProductCreateInput(ProductInput)` `:114`, `ProductBulkCreateInput(ProductCreateInput)` `saleor/saleor/graphql/product/bulk_mutations/product_bulk_create.py:117` (inherits new input fields). GraphQL `Product` `saleor/saleor/graphql/product/types/products.py:941`.
- Order paths: `create_order_from_checkout` `saleor/saleor/checkout/complete_checkout.py:1579` (param `user` = requestor, `:1582`); `complete_checkout` `:1717` → `_prepare_checkout` `:918`, `_prepare_checkout_with_transactions` `:953`, `_prepare_checkout_with_payment` `:1002`, `complete_checkout_pre_payment_part` `:1102`. Other `complete_checkout` callers: `automatic_checkout_completion_task` `saleor/saleor/checkout/tasks.py:213,287`; Stripe legacy webhook `saleor/saleor/payment/gateways/stripe/webhooks.py:211`. Buyer = `CheckoutInfo.user` `saleor/saleor/checkout/fetch.py:119`; line product `CheckoutLineInfo.product` `:54-57`.
- Draft: `validate_draft_order` `saleor/saleor/graphql/order/utils.py:365`, called by `DraftOrderComplete` `saleor/saleor/graphql/order/mutations/draft_order_complete.py:168`. Other line writers: `order_lines_create.py` (same dir). Import exception: `OrderBulkCreate` `saleor/saleor/graphql/order/bulk_mutations/order_bulk_create.py:653`.
- Payment initiation (pre-charge), re-verified 2026-11-05 by `ls`: `saleor/saleor/graphql/payment/mutations/transaction/transaction_initialize.py`, `saleor/saleor/graphql/payment/mutations/transaction/payment_gateway_initialize.py`, `saleor/saleor/graphql/payment/mutations/payment/checkout_payment_create.py`.
- Error enums: `CheckoutErrorCode` `saleor/saleor/checkout/error_codes.py:4`, `OrderErrorCode` `saleor/saleor/order/error_codes.py:4`, `AccountErrorCode` `saleor/saleor/account/error_codes.py:4`, `ShopErrorCode` `saleor/saleor/core/error_codes.py:4`.
- Rules: model→migration, API→`uv run poe build-schema`; writer guard raises in tests; query-count benchmarks diffed in CI — `saleor/docs/ARCHITECTURE.md:25-34,46-53,61-70`.

Dashboard
- Product create flow = `dash/products/components/CreateProductDialog/CreateProductDialog.tsx` (name + product type only, `:25-26`, submit `:171-172`), opened from `dash/products/views/ProductList/ProductList.tsx`. A `dash/products/components/ProductCreatePage/` directory exists but no view renders it (only type use in `dash/products/utils/validation.ts`) → not a target. Flag editing target = `ProductUpdatePage`, rendered by `dash/products/views/ProductUpdate/ProductUpdate.tsx:50,432`; sibling cards `dash/products/components/{ProductOrganization,ProductDetailsForm}`. No initial-create control planned.
- Fragments `dash/fragments/products.ts`; site settings `dash/siteSettings/components/{SiteSettingsPage,SitePasswordLoginCard}`, `dash/siteSettings/mutations.ts:3-5` (`shopSettingsUpdate`), fixture `dash/siteSettings/fixtures.ts:48`.
- Committed schema + codegen; `fetch-local-schema` overwrites stable pin `schema-main.graphql` — `docs/ARCHITECTURE.md:44-53`; change checklist `saleor-dashboard/docs/ARCHITECTURE.md:138-146`. No birthday UI exists or is planned (D8).

Storefront
- `sf/graphql/CurrentUserProfile.graphql` (`me{...UserDetails …}`), `sf/graphql/AccountUpdate.graphql` (`accountUpdate(input: AccountInput!)`); registry `sf/lib/saleor/operations.ts:48,60`; account actions `sf/app/(storefront)/[locale]/[channel]/(main)/account/{actions.ts,get-current-user.ts}`.
- `ProductView` contract `sf/lib/storefront/contract/product.ts:34-57`; `STOREFRONT_CONTRACT_VERSION = 2` `sf/lib/storefront/contract/version.ts:8`; rule "Adding an optional field is not a bump" `:4-5` → optional `ageRestricted` needs no bump.
- Checkout error mapping `sf/checkout/lib/payment/format-checkout-complete-error.ts:7`; checkout docs `sf/checkout/graphql/*.graphql`.
- Locks `data:lock`, `core:lock` (`react-storefront/package.json:31,33`); codegen needs live API — `docs/ARCHITECTURE.md:44-52`.

## 2. Step 2 — Options
| | A. Core domain policy + funnel guards (chosen) | B. Guard at cart edit (`checkoutLinesAdd`/draft line add) only | C. External app / sync webhook validator |
|---|---|---|---|
| Idea | One pure policy module in core; called at every order-creation funnel + pre-charge points | Reject adding restricted items for ineligible buyer | App subscribes to checkout/order events and vetoes |
| + | Single source of truth; covers apps, tasks, Stripe webhook, drafts; no client trust | Early UX feedback | No core change |
| − | Must touch several funnels; query-count care | Misses birthday/settings/flag changes after add, customer attach/detach, drafts, apps → violates D3/D5 | Apps not in workspace; bypassable; no veto hook on all paths; violates "core decides" (`docs/CONTEXT.md:13-15`) |
Birthday storage: column on `User` (chosen) vs `private_metadata` (readable by MANAGE_USERS staff/apps → violates D6, rejected).
Settings: `SiteSettings` columns (D2) vs env setting (not Dashboard-editable, rejected by D2).

## 3. Step 3 — Chosen solution (A)
- Data: `Product.age_restricted`, `SiteSettings.minimum_age`/`time_zone`, `User.birthday` (nullable date). [D1,D2,D6]
- **INV-1 visibility invariant [D1c, user-approved 2026-11-05]:** the flag affects purchase eligibility only. Restricted products remain visible in every catalogue surface (product cards, PDP, cart, checkout) with an age label; no query, filter, visibility, availability, listing provider, or client UI may hide them based on the flag. Enforcement lives only in the purchase funnels below. Label text (OQ-1 resolved by user): `"{minimumAge}+"` (e.g. `18+`) from `Shop.minimumAge`, which is publicly readable as a display-only value; it exposes no birthday, eligibility, or customer data and must not be used by clients for authorization. `Shop.timeZone` stays MANAGE_SETTINGS-only (R4 revised).
- Policy: pure functions `shop_today(tz)`, `age_on(birthday, today)`, `ensure_buyer_eligible(buyer, products, settings)`; tuple date comparison gives the 29 Feb → 1 Mar rule. [D3] Module location [R1].
- Enforcement: completion funnels (`complete_checkout`, `create_order_from_checkout`, draft complete) [D5] + pre-charge initiation points [R6] + `orderLinesCreate` on non-draft orders [R7]; `orderBulkCreate` untouched [D5].
- Privacy: custom `User.birthday` resolver (owner | active superuser, never app); owner write via `AccountInput.birthday` / `clearBirthday` (user requestor only); superuser write via dedicated `customerBirthdayUpdate` [R2]; clearing contract [D6c, user-approved 2026-11-05]: omission = no change, clear only via explicit `clearBirthday: true`, ambiguous inputs (explicit `null`, date + clear, null flag) rejected with no write/audit (SPECS §4 write matrix); audit `CustomerEvent` without value [D7,R9]; superuser rows are on the actor's event history (target id in value-free parameters), not promised on the customer's timeline.
- Clients: Dashboard flag on `ProductUpdatePage` + site settings card [D8]; Storefront labels, birthday form (owner read via `CurrentUserProfile`), generic error with session-based CTA, checkout never reads birthday [D4,D9,R10].
- Error contract: one code `AGE_RESTRICTED` per error enum, generic message [D9,R3].
## 4. Discovery anomalies
- Orchestrator-cited backend/dashboard/storefront discovery summaries were **not present** in this conversation; all facts above were re-verified directly in source (read-only grep/sed).
- Planning skill expects per-session `NN-plan-*.md` files; scope allows only the 5 listed artifacts → sessions are inlined in `AGE-RESTRICTIONS-PLAN.md`.

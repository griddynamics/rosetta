# BRIEF — age-restricted products (Status: Approved by user)

Size: LARGE (3 repos, PII, authz, audit). Repos: saleor (core), saleor-dashboard, react-storefront.

## Decisions (user-provided, HITL round 1-2)
- D1 Product gets boolean flag `isAgeRestricted` (NOT per-product min age; user overrode original wording).
- D2 One store-wide `minimumAge` in SiteSettings, default 18, editable in dashboard by site-settings permission. Applies to later checks. No regions.
- D3 Enforce at checkout line add/update AND at checkout complete; completion = authority.
- D4 Guest (no user) + restricted product → backend blocks; storefront asks to sign in. Guests can browse.
- D5 Customer.birthday (date, nullable). Customer sets own any time, no ID verification. Only owner + `is_superuser` can set/change/see it. Other staff and apps: no read/write, even MANAGE_USERS. Apps incl. impersonation: none.
- D6 Birthday never in public API, webhook payload, export, search. Every change and every staff read audit-logged.
- D7 Others: yes/no `isAgeEligible` (meets minimumAge today; no age/date leaked). Visible to owner + MANAGE_USERS; null for others. Reads audit-logged, 1 event per customer per request, only if field resolved.
- D8 Draft orders: same check, no exemption. Draft w/o linked customer = allowed + completable. Draft w/ customer lacking birthday/too young = cannot complete until fixed or customer unlinked.
- D9 "Today" = current date in shop time zone. Compare dates. Eligible on the birthday-anniversary day. Feb 29 → Mar 1 in non-leap years.
- D10 New SiteSettings time-zone setting, default UTC.

## Assumptions (AI-inferred, confirm)
- A1 Missing birthday on logged-in customer = not eligible.
- A2 Birthday validation: not future, not before 1900-01-01.
- A3 Audit = new CustomerEvent types (birthday_changed, birthday_viewed, age_eligibility_viewed); actor in `parameters`. Owner reading own data not logged.
- A4 Customer-facing: `accountRegister`/`accountUpdate` take birthday; `customerCreate/Update` accept it only from superuser (else PERMISSION_DENIED).
- A5 Time zone = IANA name string, validated, `shopSettingsUpdate`.
- A6 Dashboard: product flag, shop minimumAge+time zone, birthday on customer page for superuser only, eligibility chip. Storefront: sign-in prompt, birthday in account, error mapping.
- A7 Min-age lowering/raising applies on next check (no backfill, no migration of carts).

## Accepted risks
- Self-declared birthday is bypassable (D5). Draft without customer bypasses age check (D8).

## Out of scope
ID verification, regional ages, per-product ages, age-bracket reports.

## Decisions round 3 (user-provided, after discovery)
- D11 `User.isSuperuser` new owner-only field (viewer's own account) → dashboard shows/hides birthday.
- D12 Dashboard schema: regenerate `schema-main.graphql` from local core (deviates from 3.23 release pin; fork).
- D13 Product flag editable on dashboard product UPDATE page only (create dialog unchanged).
- D14 Completion age check uses ONLY authenticated `checkout.user`; guest w/ email matching an account stays a guest → blocked.
- D15 Draft complete: only explicitly linked Customer (order.user before email auto-link) is checked; email-only draft = no customer = allowed.
- D16 Birthday audit events (changed, read) still written, but hidden from `User.events` for everyone except `is_superuser`. Reuse CustomerEvent. Store actor+time+action only, no values. Log: customer's own changes, staff changes, every staff read.
## Discovery corrections
- Input type is `ProductInput` (create+update); no product bulk update, no checkout bulk mutations.
- Extra line-adding path: `checkoutCreateFromOrder`. Draft: completion-only check (line add/update unchecked).
- Event type enum change needs `AlterField` migration.
## Corrections at spec approval (user)
- C1 Drafts checked at line add/update AND completion (completion = authority); email match is not a link.
- C2 Restricted products stay visible everywhere with age label ("18+") in lists, search, discounts, banners, PDP, cart. Visibility not restricted; buying is.
- Specs approved by user ("Yes, I approve the specs").
## G1 decisions (user)
- G1 approved ("Yes, I approve the core").
- D15 reaffirmed, option A REJECTED: a customer set on a draft only because `userEmail` matches an account is NOT a link → draft treated as no linked customer (allowed, completable). Only an explicit Customer link is age-checked. Explicit link w/o birthday/underage ⇒ cannot complete until birthday set or link removed.
- Impl (agent-chosen, user-approved intent): internal bool `Order.user_linked_by_email` (default False, db_default, not in GraphQL); set True when draftOrderCreate/Update derive `user` from `userEmail`; False when staff sets explicit `user` (or clears). E3 checks (line add/create/complete) use `order.user` only when flag is False.

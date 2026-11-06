# 22 — Independent review: dashboard + storefront (static, read-only)

Reviewer: independent static review (did not implement). Date: 2026-10-23.
Scope: `saleor-dashboard` and `react-storefront` working trees (`git status`/`git diff` only; no edits, no test runs, no commits).
Authority: `AGE-RESTRICTION-SPECS.md` (approved) · `AGE-RESTRICTION-PLAN.md` §4 (SC-1..SC-5) and §6 (ownership) · `HANDOFF.md` (accepted deviations and known limitations X-9, X-11, X-13, X-14, X-15, S11-O1 not re-reported).
Method: read the spec and plan sections for dashboard and storefront, handoffs 12–20, both diffs, and the new files. Reproduced the returnTo validator in Node using a copy of the function (not an import of the module).

## 1. Pass / fail per checklist bullet

Dashboard (Do 2)
| Check | Result | Note |
|---|---|---|
| Birthday visible/editable only to superuser (`me.isSuperuser === true`) | PASS | `CustomerDetailsPage.tsx` `canEditBirthday`; `CustomerAgeCard.tsx` date input only when `canEditBirthday` |
| Eligibility flag shown when non-null (MANAGE_USERS), hidden when null | PASS | `CustomerAgeCard.tsx` `hasEligibility`; card hidden when neither is visible (test covers it) |
| `birthday` sent only when a superuser changed it | PASS | `saveComposition.ts` `buildCustomerBirthdayChange`; spread at `views/CustomerDetails.tsx:181`; cleared → `null` |
| Not in list queries / URLs | PASS | `customerDetailsFragment` spread only by detail query and `updateCustomer`; no `birthday` in urls/query params |
| Not in logs / error tracking | PASS (scoped) | No console/track/Sentry sink in added lines. Global Apollo error-link logging not inspected |
| Date kept as string, no TZ shift | PASS | No `new Date(birthday)`; `new Date()` only for the local `max` hint |
| `isMainSchema` / `@lockSchema` (SC-2) | PASS | 6 selections locked; `isMainSchema()` guards on product flag, shop section, customer card; `me.isSuperuser` gated |
| Error mapping | PASS | `CustomerAgeCard` maps birthday INVALID; `order.ts` `AGE_RESTRICTION_NOT_ELIGIBLE` (S14-D1 accepted) |
| Tests quality | PASS with gaps | Role matrix, payload rules, staging guard, order code covered. No test that birthday never reaches logs |
| Changeset patch (SC-1) | PASS | `.changeset/age-restriction-dashboard.md` is `patch` |
| `locale/defaultMessages.json` additive | PASS | 0 removed lines |
| Schema diff additive (S§6) | PASS | `schema-main.graphql`: 109 added lines, 0 removed; all S§6 declarations |
| Generated files only from codegen | PASS (spot check) | Not verified line by line |
| Shop `timeZone` permission (MANAGE_SETTINGS) | PASS | Only `siteSettings` query/mutation spread `ShopFragment`; route gated at `src/index.tsx:304-309` |

Storefront (Do 3)
| Check | Result | Note |
|---|---|---|
| REQ-VIS: restricted products never hidden; label only | PASS | No new filter; badge on `product-card-base`, grid, search, featured, PDP |
| Sign-in / birthday / underage prompts | PARTIAL | PDP PASS (`add-to-cart.tsx`, `getPdpAgeRestrictionCta`). Checkout BR has no set-birthday link (M2) |
| `{N}` from shop setting | PASS | `shop-age-restriction.ts` cached loader, profile `shopAgeRestriction` (see m1 on partial-data caching) |
| Extension points / lock consistency (SC-3) | PASS | Extension files + `mapProductExtensions`; `coreOverrides` for `to-card.ts`, `listing.ts`, `templates.ts` recorded with reasons (ack pending, see m5) |
| Error codes surfaced: addVariantToCart, checkout complete, transactions | PASS | `AddToCartResult`; `formatCheckoutFailure` in `runCheckoutComplete`, `initializeCheckoutTransaction`, `processCheckoutTransaction`. Non-age text not localized (m3) |
| returnTo open-redirect safety | FAIL | Bypass confirmed (B1) |
| Birthday never logged / echoed / stored in caches | FAIL (logs) | Route, action and forms do not echo or log. The shared Saleor client logs the birthday on the `updateBirthday` path (M1). `me` is session-only, not cached |
| Cache-friendliness of listing / PDP | PASS | Listings read only the cached shop config. PDP session read only for restricted products, in the dynamic island (`variant-section-dynamic.tsx`). Cached shell untouched |
| Hash-lock / coreOverrides legitimacy | PASS with note | Reasons recorded; S18-D1/S18-D4 ack still pending; generator dropped 2 stale AGENTS.md lock entries (m5) |
| Copy keys exist in `messages/en.json` | PASS | All 23 keys checked (`pdp.ageRestriction.*`, `checkout.gateways.*`, `account.signup.*`, `account.errors.*`, `account.settings.birthday.*`) |
| Tests Vitest-node compatible (SC-4) | PASS | All new storefront tests are `.test.ts`; `renderToStaticMarkup` pattern |
| Tests assert behaviour | PASS with gaps | Gaps: returnTo dot-segment case; shared-client logging path (mocked away) |

Contract (Do 4)
| Check | Result | Note |
|---|---|---|
| Client fields/enums exist in core `schema.graphql` under same names | PASS | `isAgeRestricted`, `ageRestrictionMinimumAge`, `timeZone`, `birthday`, `isAgeEligible`, `isSuperuser`, `AccountInput.birthday`, all four `AGE_RESTRICTION_*` codes |
| Storefront generated types carry the new fields | PASS | `src/gql/graphql.ts` contains `ageRestrictionMinimumAge` and `isAgeEligible` |

SC outcomes (Do 2–4): SC-1 PASS (patch). SC-2 PASS (6 selections, staging guards). SC-3 PASS with ack pending. SC-4 PASS (node-only `.test.ts`).

## 2. Findings (ranked)

### BLOCKER

**B1. returnTo open redirect: `/..//host` bypasses the same-origin check**
- File: `react-storefront/src/lib/auth/safe-return-path.ts:13` (raw `startsWith("//")` check) and `:28` (returns normalised `url.pathname`).
- Consumer: `react-storefront/src/ui/components/auth/login-mode.tsx:70-72` → `src/lib/auth/sync-auth-surfaces-after-sign-in.ts:38-41` → `window.location.assign(options.redirectTo)`. No second validation at the sink.
- Evidence (Node reproduction of the validator logic): `"/..//evil.example"` → `"//evil.example"`; `"/.//evil.example"` → `"//evil.example"`; `"/products/../..//evil.example"` → `"//evil.example"`. The WHATWG URL parser collapses the `..` and leaves `//host`, which the browser treats as protocol-relative. The check only tests the raw input, not the normalised output.
- Attack: `https://<storefront>/en/<ch>/login?returnTo=%2F..%2F%2Fevil.example`. After sign-in, the shopper is sent to `evil.example`.
- Spec: S§12 (login honours returnTo as a same-origin path); brief item "returnTo open-redirect safety". HANDOFF X-10 claims "no absolute URLs ever forwarded" — this claim is false for this input.
- Test gap: `src/lib/auth/safe-return-path.test.ts:30-33` has no dot-segment case; its test name claims "stays on the same origin" and passes only because the bypass is untested.
- Suggested fix: after computing the path, reject when it starts with `//` (or `\`, after normalisation). Example:
  `const path = \`${url.pathname}${url.search}${url.hash}\`; return path.startsWith("//") ? null : path;`
  Add table cases: `/..//evil.example`, `/.//evil.example`, `/products/../..//evil.example`, `/%2F%2Fevil.example` (expect accepted but same-origin path — confirm), and re-run the Vitest file.
- Owner: session 17 (X-10 grant, owner of `safe-return-path.ts`). Reopen per remediation loop.

### MAJOR

**M1. Birthday value written to server logs via the shared Saleor client (`updateBirthday` path)**
- Path: `updateBirthday` (`react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/account/actions.ts:50-59`) calls `mutate(AccountUpdateDocument, { variables: { input: { birthday } } })`. `mutate` → `executeGraphQL` (`src/lib/saleor/access.ts:154-168`, `src/lib/saleor/client.ts:397`).
- Sink: `formatVariablesForLog` (`src/lib/saleor/client.ts:193-202`) JSON-stringifies object values and truncates at 30 characters, so the line reads `input={"birthday":"1990-05-12"}`. It is logged on: HTTP 429/5xx retry (`client.ts:303-307`), network/timeout retry (`client.ts:317-321`), partial-data warning (`client.ts:466-469`).
- Spec: S§2 NFR-7 and S§11 I-4 ("birthday never in logs"); plan STD-D/E ("no birthday in logs"); HANDOFF 19/20 claim "no logging in new paths" — true for the new code, but the path reaches the shared logger.
- Test gap: `account/actions.test.ts` mocks `@/lib/saleor` (lines 8-11), so the logger is never exercised. The no-console assertions therefore do not cover this path.
- Suggested fix (either):
  (a) redact PII keys in `formatVariablesForLog` (at least `birthday`, `password`, `email`, and any object-valued variable), or
  (b) log only the operation name for mutations whose input carries personal data.
  Then add a test at the fetch boundary: mock `fetch` to return 503 once and assert the console output does not contain the date.
- Owner: session 19 (`account/actions.ts`) plus a cross-scope change to `src/lib/saleor/client.ts`, which no §6 row owns. Needs an orchestrator grant.
- Related pre-existing observation (not age-specific): the same formatter logs the first 30 characters of any object variable (addresses, emails). Recorded as a note only.

**M2. Checkout copy has no action for birthday-required; sign-in action only via a rarely-shown notice**
- Spec: S§12 "Checkout: `format-checkout-complete-error.ts` + `gateway-messages.ts` map LR → sign-in (`sign-in-form.tsx`), BR → set-birthday link, UA → underage copy."
- Evidence: `react-storefront/src/checkout/lib/payment/format-checkout-complete-error.ts:46-58` (`formatCheckoutFailure`) returns plain strings for LR/BR/UA. A grep of `src/checkout` and `src/app/(checkout)` finds no link to `/account/settings` and no sign-in action on the payment-step error surface. The LR sign-in path exists only through `information-step.tsx` (`notice` prop, around line 526), which the handoffs record as rarely showing (X-11, accepted).
- Not in the HANDOFF deviation table. X-11 covers the LR notice timing only. BR's missing link is not covered.
- Suggested fix: extend `formatCheckoutFailure` to return `{ message, action? }` with `action: { href, label }` for BR (`/account/settings`) and LR (`/login?returnTo=<checkout or PDP path>`). Render the action in the checkout error surface. This needs a grant for the payment-step component (the same grant X-11 declined).
- Owner: session 17 (mapping) plus a cross-scope grant for the payment-step renderer. Orchestrator decision: accept BR as copy-only and record it as a limitation, or grant the change.

### MINOR

**m1. Shop age cache stores `null` for 1h after a transient failure.** `react-storefront/src/lib/custom/shop-age-restriction.ts:19-26` uses `allowPartialData: true` inside `"use cache"`, so a failed read is cached and the neutral label shows until revalidate (1h). Accepted as S18-D3. Revisit: do not cache `null`, or use a shorter TTL for the null branch. Owner: 18.

**m2. Label staleness after a minimum-age change.** No webhook fires for shop settings, so storefront "{N}+" labels can lag enforcement by up to 1h (revalidate) and 1d (expire). Enforcement itself reads settings fresh (SC-5). The staleness is documented in `16-handoff.md` and `20-handoff.md` but not in the HANDOFF known-limitations list. Fix: add to HANDOFF limitations and CHANGELOG/CONTEXT. Owner: 18/20 (docs), orchestrator.

**m3. Non-age server messages shown in English.** `react-storefront/src/ui/components/pdp/add-to-cart.tsx:206` shows `result.message` (Saleor text) before the localized fallback. `src/app/(checkout)/actions.ts:597` builds `fieldErrors[].message` from the raw server message. Fix: prefer localized fallback for all non-age codes, or map known codes. Owner: 17.

**m4. Quick-add age CTA has no caller.** `ProductCardWithQuickAdd` (`src/ui/components/plp/product-card-with-quick-add.tsx`) is rendered by no route. The restricted-card CTA path is dead code until X-9 is decided. Accepted (X-9). Owner: 18 when the decision lands.

**m5. Deviation acknowledgements still pending, and an unlisted lock side effect.** S18-D1 and S18-D4 are marked "orchestrator ack pending" in HANDOFF. `paper-core.lock.json` also drops two AGENTS.md entries (`src/lib/saleor/AGENTS.md`, `src/lib/storefront/AGENTS.md`) as a generator side effect, which is not in the deviation table. Fix: orchestrator ack; record the generator side effect in S18-D1. Owner: orchestrator.

### NIT

**n1.** `react-storefront/src/app/api/auth/register/route.ts` returns English "Invalid birthday." for core INVALID. The sign-up form maps `field: birthday` to a localized key, so the shopper does not see it. Known (20-handoff). No action unless the API response is used elsewhere.

**n2.** `react-storefront/src/ui/components/account/edit-birthday-form.tsx` and `sign-up-form.tsx` duplicate the local-today logic already in `src/lib/birthday/birthday-date.ts` (`formatIsoDateLocal`). Harmless; consolidate on next touch.

**n3.** Dashboard `ProductOrganization.tsx` (age toggle block) uses inline `intl.formatMessage({ id, defaultMessage, description })` rather than a `messages` object. formatjs ID check passes; style only. Owner: 13.

**n4.** Dashboard `SiteSettingsPage` always sends `ageRestrictionMinimumAge` and `timeZone` on every save, not only when changed. Spec does not require change-only for shop settings. Accept or note.

## 3. Items checked and passing (for the record)
- Dashboard birthday gating, change-only payload, no list-query selection, no URL or log sink, date as string, `@lockSchema` placement, changeset patch, additive locale and schema diffs.
- Storefront REQ-VIS: no restriction filter added; label on every listing surface and on the PDP.
- Storefront PDP session read limited to restricted products and kept in the dynamic island; listings and cached shell unchanged.
- Storefront add-to-cart: age codes map to CTAs; server codes logged by code only (`src/app/actions.ts:146-149`).
- Storefront birthday write paths: `register/route.ts` and `updateBirthday` format-check, map errors to fixed keys, never echo the value. `sign-up-form` and `edit-birthday-form` keep state in React only.
- Session read: `get-session-age-state.ts` returns presence and eligibility, never the birthday value. `CurrentUserProfile` is a session operation (`src/lib/saleor/operations.ts:48`).
- Contract names consistent across core schema, dashboard schema snapshot, and storefront generated types.

## 4. Not verified (static review limits)
- No test or lint run (read-only brief). Test counts are taken from handoffs.
- No browser walk-through; no live API calls.
- Dashboard global Apollo error logging and Sentry configuration not inspected.
- Generated-file contents not diffed line by line beyond the schema snapshot.
- Storefront `StickyBar` error prop and `sign-in-form` styling taken from diffs, not rendered.

## 5. Owner routing summary
| ID | Sev | Owner | Action |
|---|---|---|---|
| B1 | Blocker | 17 (reopen) | Reject `//` after normalisation; add table cases |
| M1 | Major | 19 + orchestrator grant for `src/lib/saleor/client.ts` | Redact PII in variable log or skip logging for `AccountUpdate` |
| M2 | Major | 17 + grant for payment step | Add BR set-birthday link and LR sign-in action, or accept as limitation |
| m1 | Minor | 18 | Do not cache null on partial failure, or shorter TTL |
| m2 | Minor | 18/20, orchestrator | Document label staleness in HANDOFF limitations |
| m3 | Minor | 17 | Localize non-age server messages |
| m4 | Minor | 18 (X-9) | Decision pending |
| m5 | Minor | orchestrator | Ack S18-D1/S18-D4; record lock side effect |
| n1–n4 | Nit | 13, 14, 19, 20 | Optional cleanup |

Counts: Blocker 1 · Major 2 · Minor 5 · Nit 4.

# 17 — Storefront cart/checkout/PDP add flows · handoff (2026-10-23, rev 3)

**Status: done.** Repo `react-storefront` (HEAD `3d3c3f5`), working tree only, nothing committed, `messages/en.json` untouched (session 20 landed the keys). Rev 3 = review 22 remediation (B1, M1, M2).

**Done (rev 1)**
- `addVariantToCart` returns `AddToCartResult` (`{ok:true}` | `{ok:false, code, message}`), logs the code only.
- PDP: `AddToCartForm` (client, `useActionState`) shows the failure text or the age CTA by code. Session read only for restricted products, in the dynamic island (`getSessionAgeState`); cached PDP shell untouched (A15).
- Checkout: `formatCheckoutFailure` maps LR/BR/UA to copy in `runCheckoutComplete`, `initializeCheckoutTransaction`, `processCheckoutTransaction`; other codes keep the server message.
- Quick-add overlay: optional `ageCta`/`links` (no caller yet; X-9, session 18).

**Done (rev 2, grants X-10, X-11, X-12)**
- X-10 login honours `returnTo` via `src/lib/auth/safe-return-path.ts`.
- X-11 contact step `notice` via `pickAgeSignInNotice` (read-only peek at the stashed error). Limitation: the payment step consumes the stash on mount, so the notice rarely shows.
- X-12 session read calls `sessionQuery(CurrentUserProfileDocument)` directly; lock regenerated (68 calls, one new row).
- Checkout wiring tests (`src/app/(checkout)/actions.test.ts`), external boundary mocked only.

**Done (rev 3, review 22 remediation)**
- **B1 (blocker, fixed):** `getSafeReturnPath` now checks the normalised path. `/..//host`, `/.//host`, `/products/../..//host`, `/%2e%2e//host` return null. Encoded slashes (`/%2F%2Fhost`) stay a same-origin path. Test table in `safe-return-path.test.ts` (22 cases, reproduced with the WHATWG parser).
- **M1 (major, fixed):** `src/lib/saleor/client.ts` `formatVariablesForLog` replaces birthday, password variants, email, token, refreshToken and secret values with `[redacted]` at any depth before logging. Boundary test (`src/lib/saleor/__contracts__/log-redaction.contract.test.ts`) drives a 503 retry and a partial-data response through `executeGraphQL` and asserts the date never appears. Kernel change: `paper-version.json` coreOverrides entry and `paper-core.lock.json` regenerated (only that hash changed). Recorded as S17-D2.
- **M2 (major, fixed):** the payment-step error now carries a follow-up link. BR → "Set your birthday" (`/{browse-locale}/{channel}/account/settings`). LR → "Sign in to buy" (checkout contact step, which has the sign-in button for guests). UA stays copy-only. `PaymentError` takes an optional `action`. The action is chosen by exact copy match (`getAgeRestrictionPaymentAction`), so it depends on the copy staying the same string.

**Behaviour table** (restricted product; "server" = the add or checkout result code)

| Shopper | PDP | Quick-add (when caller passes `ageCta`) | Checkout complete / transaction |
|---|---|---|---|
| Guest | "Sign in to buy" link to `/login?returnTo=<PDP>`; after sign-in the shopper returns to the PDP. Server LR shows the same. | Sign-in button | "Sign in to buy age-restricted products." (LR) + "Sign in to buy" link to the contact step |
| Signed in, no birthday | "Set your birthday" link to `/account/settings`. Server BR shows the same. | Birthday button | "Set your birthday to buy age-restricted products." (BR) + "Set your birthday" link to account settings |
| Signed in, minor | Underage notice, disabled add button. Server UA shows the same. | Disabled underage label | "You do not meet the minimum age for these products." (UA), copy only |
| Signed in, adult | Add button; server accepts | Quick-add | Completes |
| Session unavailable | Add button; server result decides | Quick-add | Server result decides |
| Unrestricted product, any shopper | Add button; no session read | Quick-add | Unchanged |

**Evidence (final, after rev 3)**
- `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/ pnpm run verify`: exit 0. Inside: docs, design tokens, graphql variants, data:lock:check, core:lock:check, typecheck (codegen as the script defines), lint (0 errors, 19 warnings: the baseline count), vitest 149 files / 969 tests pass.
- `pnpm exec vitest run` alone: 149 files / 969 tests. New in rev 3: `safe-return-path.test.ts` (dot-segment bypasses), `log-redaction.contract.test.ts` (2), `payment-error.test.ts` (3), BR/LR action cases in the formatter test.
- `pnpm exec tsc --noEmit`: exit 0 (session 20 landed the keys).
- `data:lock:check` ✓ (68 calls), `core:lock:check` ✓ (after the M1 regeneration), `docs:check` ✓.
- ESLint on touched files: 0 errors. One pre-existing warning in `information-step.tsx` (`useCallback` deps in code I did not touch). Prettier clean on touched files.
- Coverage not measured (no coverage provider installed).

**Decisions**
- Checkout mapping is done by code in the owned server actions; `finalize-checkout-order.ts` and `complete-order.ts` are unchanged.
- `returnTo` is a whitelist of same-origin paths, checked after normalisation.
- The M2 action is matched by copy text. A future copy edit needs the matcher updated with it (same module).
- Kernel change for M1 is limited to log formatting; no request behaviour changed.

**Review findings not changed here (see HANDOFF review table)**
- m1 (shop-age null caching, session 18), m3 (English server-message fallback: spec §12 requires it), m4 and X-9 (quick-add caller), m5 (lock side effect, ack pending).
- Nits n1, n2 (storefront, optional, session 19 files). n3, n4 are dashboard-only and listed for the orchestrator.

**Known limitations (accepted)**
- X-13: `updateCartLineQuantity` (`src/app/actions.ts`, returns void) swallows Saleor age errors. A quantity increase on a restricted line is rejected with no message in the cart drawer. Out of scope per orchestrator.
- X-11 stash timing: the contact-step sign-in notice rarely appears (see rev 2).
- Not component-tested: `information-step.tsx` `readAgeSignInNotice`, `login-mode.tsx` handler, `payment-step.tsx` action wiring (the logic they call is tested).
- Other object-valued Saleor variables still log their first 30 characters (pre-existing, not age-specific).

**New files (session 17 directories, accepted as S17-D1)**: `src/lib/account/age-restriction-cta.ts` (+ test), `src/lib/account/get-session-age-state.ts` (+ test), `src/lib/auth/safe-return-path.ts` (+ test), `src/lib/saleor/__contracts__/log-redaction.contract.test.ts`, `src/app/actions.test.ts`, `src/app/(checkout)/actions.test.ts`, `src/ui/components/pdp/add-to-cart.test.ts`, `src/ui/components/plp/quick-add-overlay.test.ts`, `src/checkout/components/contact/sign-in-form.test.ts`, `src/checkout/components/payment/payment-error.test.ts`.

**Cross-scope:** X-9 (session 18), X-13 (known limitation). Review 22: B1, M1, M2 fixed here; rest listed.

**Blockers:** none.
**Next:** session 18 decides X-9. Orchestrator: ack S17-D2 and S18-D1 (m5), decide m3 override if wanted.

# 17 — Storefront: add-to-cart result, PDP sign-in CTA, checkout error mapping (Phase E)
Depends on: 16. Parallel with 18, 19, 13, 14. Spec: `S§12` Storefront (actions, PDP, Checkout bullets), `S§10` copy table, `S§13` Storefront Vitest list, `S§16` A9/A15; PLAN SC-4.

## Do
1. `src/app/actions.ts:101` `addVariantToCart(input): Promise<AddToCartResult>` with `type AddToCartResult = { ok: true } | { ok: false; code: string; message: string }`; returns the core error code (LR/BR/UA and others), still logs (code only, no PII). Same treatment for line-update path if present in `src/app/(checkout)/actions.ts`.
2. PDP `src/ui/components/pdp/variant-section-dynamic.tsx:118` action returns the result; `add-to-cart.tsx` and `sticky-bar.tsx` render it (`useActionState` or the repo's existing pattern). Restricted product + no session ⇒ "Sign in to buy" CTA (login with return URL) instead of add (D3); signed in + `me.birthday == null` ⇒ "Set your birthday" link to account settings; UA ⇒ underage copy. A15: decide CTA from session state if available without making product data per-user, else from the `LR` result.
3. Quick-add on restricted cards follows the same rules through `plp/quick-add-overlay.tsx` (behaviour only).
4. Checkout: `src/checkout/lib/payment/format-checkout-complete-error.ts:7` + `gateway-messages.ts` map LR → sign-in (`src/checkout/components/contact/sign-in-form.tsx`), BR → set-birthday link, UA → underage copy; unknown codes fall back to `message`.
5. Vitest `.test.ts` (SC-4): `addVariantToCart` returns `{ok:false, code}` for each age code; `formatCheckoutCompleteError` maps the 3 codes; CTA decision as a pure function; any markup via `renderToStaticMarkup`.
6. Register message keys + English text in HANDOFF (keys under existing `cart`/`pdp`/`checkout` namespaces); do not edit `messages/en.json`.

## Subagents
- `rosetta-light:engineer` — implement + tests; long-running.

## Notes
- Do not edit S18-owned files (`plp/product-card-*`, `search-results.tsx`, badge) or any `.graphql`; log Cross-scope requests.
- PDP product data is cached/PPR: signed-in state must not make cached product data per-user (A15); the restricted flag comes from the extension data of 16.
- Server actions in this repo are the only Saleor callers (kernel `mutate`); never expose tokens to client components; never log message text containing user data.
- Return-URL for login must pass `src/lib/auth/validate-redirect-url.ts`.
- `data-layer.lock.md` lists every kernel call by file+function: if a call site moves/renames, re-run `pnpm run data:lock` is S16/S20's job — report the drift instead.
- Use `pnpm exec tsc --noEmit` (not `pnpm run typecheck`, which re-runs codegen).

## Done when
- Changed-file `tsc`, ESLint, Prettier clean; new Vitest files green; a written behaviour table (guest / no-birthday / minor / adult × PDP, quick-add, checkout) in `17-handoff.md`.

## Checklist
- [ ] STD-ALL  [ ] STD-E
- [ ] Add-to-cart is no longer silent on failure; codes surface for all 3 age cases
- [ ] 3 checkout codes mapped; fallback to server message
- [ ] Unit coverage of new logic > 85 %
- [ ] Message keys registered
- [ ] Security: no tokens/PII in logs; redirect allowlist respected

# 06 handoff — storefront (DONE, reviewed)
- AgeBadge "{minimumAge}+" on: product cards (lists/category/collection/search/featured/sale), PDP, cart drawer+page, checkout order summary, EditorialHero/ImageWithText when image is a product. Not labelled (by decision): order history/confirmation lines, CMS-only banners. No product hidden/disabled anywhere.
- Errors: add-to-cart, line update, checkoutComplete, orphaned-checkout recovery map the 3 codes to localized text + links (sign-in / account settings); no raw backend text; 8 locales; payment-step array-defect fixed; notice tied to its message (no stale key).
- Birthday: BirthdayForm + updateBirthday (strict calendar check), CurrentUserProfile session-mode only; `formatVariablesForLog` redacts birthday at any depth; 5 paper-version coreOverrides, data/core locks regenerated.
- Resilience: layout/checkout loader use `getShopMinimumAgeOrNull` (outage => no label, not cached).
- Evidence: `NEXT_PUBLIC_SALEOR_API_URL=http://127.0.0.1:8001/graphql/ pnpm verify` exit 0, 995 tests (baseline 787), 0 lint errors/19 warnings (same as baseline). Curl smoke: guest line add -> AGE_RESTRICTION_LOGIN_REQUIRED.
- ACCEPTED RISK: label can lag minimumAge changes up to 1 day (reuses `channels` cache profile; enforcement stays authoritative).

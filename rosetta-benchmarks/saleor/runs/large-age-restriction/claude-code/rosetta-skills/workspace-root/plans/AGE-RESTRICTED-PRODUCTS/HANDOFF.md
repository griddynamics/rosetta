# HANDOFF (index)
Status: 00-06 done (G1, G2 approved); 07 validation + docs done, gates green, cleanup done; awaiting G-final.
## Sessions
| # | Status | Handoff |
|---|---|---|
| 00 | done | `00-handoff.md` |
| 01 | done | `01-handoff.md` |
| 02 | done | `02-handoff.md` |
| 03 | done | `03-handoff.md` |
| 04 | done | `04-handoff.md` |
| 03b | done | `03b-handoff.md` (D15 correction) |
| 05 | done | `05-handoff.md` |
| 06 | done | `06-handoff.md` |
| 07 | done, awaiting G-final | `07-handoff.md` |
## Blockers / deferred
- G-final pending. D15 resolved per user (03b). Accepted risks: see 02/03/06 handoffs.
## Common issues
- (empty)
## Traceability (decision -> tests/evidence)
Core tests (saleor/saleor/...): A=account/tests/test_age.py, AA=account/tests/test_age_audit.py, CK=checkout/tests/{test_age_restriction,test_complete_checkout_age_restriction}.py, OK=order/tests/test_age_restriction.py, GA=graphql/account/tests/{mutations/account/test_account_birthday,mutations/staff/test_customer_birthday,queries/test_user_age_fields,test_birthday_privacy}.py, GC=graphql/checkout/tests/mutations/test_checkout_age_restriction.py, GO=graphql/order/tests/mutations/test_draft_order_age_restriction.py, GP=graphql/product/tests/mutations/test_product_age_restricted.py, GS=graphql/shop/tests/mutations/test_shop_age_settings.py, ST=payment/gateways/stripe/tests/test_webhooks_age_restriction.py. V=`07-validation-report.md`.
| Decision | Tests / evidence |
|---|---|
| D1 product flag | GP, dashboard ProductDetailsForm tests, V |
| D2 store-wide minimumAge 18, MANAGE_SETTINGS | GS, dashboard AgeRestrictionFields tests, V |
| D3 check at line add/update + completion | GC, CK, ST, V |
| D4 guest blocked, storefront sign-in prompt | GC, CK, storefront age-restriction-error tests, V |
| D5 birthday nullable date, owner+superuser only, no apps | GA, A, V |
| D6 never in public API/webhooks/exports/logs; audited | GA (test_birthday_privacy), AA, storefront client.ts redaction tests, V |
| D7 isAgeEligible owner + MANAGE_USERS | GA (test_user_age_fields), dashboard CustomerInfo tests, V |
| D9/D10 shop timezone, Feb 29 -> Mar 1 | A, OK, CK, V |
| D11 User.isSuperuser owner-only | GA, V |
| D12 schema-main regenerated | schema diff gate, dashboard check-types |
| D13 flag on update page only | dashboard product tests |
| D14 completion checks only checkout.user | CK, V |
| D15 only explicit Customer link on drafts | GO, OK, V |
| D16 audit events hidden except superuser, no values | AA, GA, V |
| C1 drafts checked same, no exemption | GO, OK, V |
| C2 label everywhere, visibility unchanged | storefront AgeBadge tests, `pnpm verify` |

# 10 — Core security, leak and visibility tests · handoff (2026-10-23)

**Done:** 9 new test files, no source edits (§6 row 10):
- `saleor/graphql/account/tests/queries/test_birthday_privacy{,_routes,_audit,_schema}.py`
- `saleor/graphql/account/tests/mutations/test_birthday_write_permissions.py`
- `saleor/graphql/webhook/tests/test_birthday_privacy_subscriptions.py`
- `saleor/webhook/tests/test_birthday_privacy_payloads.py`
- `saleor/graphql/product/tests/queries/test_product_visibility_restricted.py`
- `saleor/csv/tests/test_birthday_privacy_export.py`

**Evidence:** `-n0` 114 passed (exit 0); `-n 3` 114 passed (exit 0), DB `saleor_s10`, self-dropped (no `test_saleor_s10*` left). ruff check and format clean on the 9 files. Spec ids: TC-SEC-01..08, 10, 11; TC-V-01, 02; A12.

**Routes covered (leak matrix, anon / all-perms staff / all-perms app / superuser control):** `Query.user`, `customers`, `staffUsers`, `Order.user`, `Checkout.user`, `CustomerEvent.user`, `GiftCard.createdBy`, `ExportFile.user`, `Group.users`, `_entities` (federation User). Plus `me`/owner, `accountRegister` (anon payload), subscription payloads (CustomerCreated/Updated, StaffUpdated, OrderCreated.order.user), legacy `generate_customer_payload`, CSV exports (products, gift card codes, voucher codes). Introspection guard: every one of the 71 `User`-returning fields is either in the matrix or listed with its covering module.

**Failing-if-regressed (in-memory mutation plugin in scratchpad, source untouched):**
- Read gate weakened to MANAGE_USERS: 13 failed (all 10 routes, TC-SEC-01..04) → I-1, E-1 covered.
- Write gate accepts every requestor incl. apps: 8 failed (TC-SEC-05, TC-SEC-06 impersonation) → T-1, S-3 covered.
- First read-mutation attempt patched the class attribute and went undetected (graphene binds resolvers at schema build); re-applied on the built schema field, then caught. Lesson for future mutation checks.

**Decisions:**
- Non-superuser requestors hold every relevant permission plus channel access, so the null is the gate and not a denied route; staff/app reachability is asserted.
- Apps are denied MANAGE_STAFF-gated fields by design (`permission/utils.py` `permission_required`), so `ExportFile.user` is reachable for staff only.
- Log scan is INFO+; Django SQL DEBUG is excluded (carries query params by design, not an app log). Canary test proves the matcher catches a leak.
- No customer export exists in this version; "exports" = products, giftCards codes, voucherCodes.

**Blockers / cross-scope:** one pre-existing defect logged in HANDOFF (CustomerEvent.user for apps → AttributeError, not birthday-related, no value leaked).
**Next:** 11 (closeout) after 07, 08, 09 are done; 10 owns no further files.

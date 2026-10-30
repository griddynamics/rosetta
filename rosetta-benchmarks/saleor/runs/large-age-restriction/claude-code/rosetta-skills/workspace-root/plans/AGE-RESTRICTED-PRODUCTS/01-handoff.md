# 01 handoff — core data + domain (DONE, reviewed)
- Fields/migrations: product 0211, site 0053, account 0106 (birthday) + 0107 (event choices). Error codes in Checkout/Order enums + AccountErrorCode.PERMISSION_DENIED.
- Modules: `account/age.py`, `account/age_audit.py` (log_birthday_changed(actor_type opt), log_birthday_read), `checkout/age_restriction.py`, `order/age_restriction.py` (both accept `today=` kwarg).
- Independent review: no blockers; 4 SHOULD-FIX applied (exact-birthday test, tz test, injected `today`, select_related doc).
- Unknown tz raises ZoneInfoNotFoundError in `today_in_shop_tz` → API validates tz before save.

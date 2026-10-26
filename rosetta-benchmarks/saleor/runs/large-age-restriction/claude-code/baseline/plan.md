# Age-restricted products

## Context
Some products (alcohol, tobacco) may only be sold to customers above a minimum age. Staff must be able to set a minimum age on a product, customers need a `birthday` on their profile, and underage (or unverifiable) customers must be blocked from buying such products. Saleor root: `/Users/njakovljevic/saleor-benchmark/saleor` (package `saleor/`); paths below are relative to the package.

## Decisions (defaults, flag if you disagree)
- `Product.minimum_age`: `PositiveSmallIntegerField(null=True, blank=True)`; null = unrestricted.
- `User.birthday`: `DateField(null=True, blank=True)`; must not be in the future.
- Customers with no birthday, and anonymous/guest checkouts, are **blocked** from restricted products (age can't be verified).
- Age is computed from the birthday against today's date (exact, leap-year safe).
- Enforcement: checkout create, lines add/update, checkout complete, order-create-from-checkout. Staff draft-order paths are out of scope.

## Changes
1. **Models/migrations**
   - `product/models.py:179` add `minimum_age`; migration `product/migrations/0211_product_minimum_age.py`.
   - `account/models.py:169` add `birthday`; migration `account/migrations/0106_user_birthday.py`.
2. **Age helper** (new, e.g. `core/utils/age.py` or `account/utils.py`): `calculate_age(birthday, today)` and `is_old_enough(birthday, minimum_age)`.
3. **Error codes**: add `AGE_RESTRICTED` (customer too young / no birthday) to `CheckoutErrorCode` (`checkout/error_codes.py`) and `OrderCreateFromCheckoutErrorCode`. Add `INVALID` birthday uses existing `AccountErrorCode.INVALID`.
4. **GraphQL – product**: add `minimum_age: Int` to `ProductInput` (`graphql/product/mutations/product/product_create.py:31`; reused by update), validate `>= 0` in `product_cleaner.py`; add `minimumAge` field to the `Product` type (`graphql/product/types/products.py:941`).
5. **GraphQL – customer**: add `birthday: Date` to `AccountBaseInput` (`graphql/account/mutations/account/base.py:7`, covers update + register), `UserInput`/`CustomerInput` (`graphql/account/mutations/base.py:177/216`, covers staff create/update); add `birthday` to `ACCOUNT_UPDATE_FIELDS` (`graphql/account/mutations/account/utils.py:19`); validate not in the future (in the shared clean step); expose `birthday` on the `User` type (`graphql/account/types.py:449`, protected like other personal fields). Also add `birthday` to `generate_customer_payload` fields (`webhook/payloads.py:602`) and update affected payload tests.
6. **Checkout enforcement**
   - New `validate_variants_age_restriction(variant_ids, user)` in `graphql/checkout/mutations/utils.py` (next to `validate_variants_are_published`, line 216): query variants whose product has `minimum_age` set, raise `ValidationError({"lines": ...}, code=AGE_RESTRICTED, params={"variants": ...})`.
   - Call it in `checkout_lines_add.py` (`clean_input`, ~line 186), `checkout_lines_update.py`, `checkout_create.py` (~line 278), using the checkout's user (`checkout.user`, else `info.context.user`).
   - Re-check at completion in `checkout/complete_checkout.py::_prepare_checkout` (line 918, shared by transaction and payment flows) and `checkout/checkout_cleaner.py::validate_checkout` (line 150, used by order-create-from-checkout), since the birthday or product age may change after lines are added.
7. **Schema/docs**: regenerate `graphql/schema.graphql` (`poe build-schema`); add entries under `### GraphQL API` in `CHANGELOG.md`. Optionally add `random_data.py` populate support (skip unless trivial).

## Tests (alongside existing ones)
- `product/tests` / `graphql/product/tests/mutations/test_product_create.py`, `test_product_update.py`: set minimum age, negative rejected, query returns it.
- `graphql/account/tests/mutations/...`: `test_account_update.py`, `test_account_register.py`, `test_customer_create.py`, `test_customer_update.py`: birthday saved, future date rejected; user query returns birthday.
- Unit tests for the age helper (exact birthday day, day before, leap day, boundary).
- `graphql/checkout/tests/mutations/`: lines add/update/create and complete (+ order-create-from-checkout): adult allowed, minor blocked, no birthday blocked, anonymous blocked, unrestricted product unaffected, product made restricted after adding to checkout is blocked at completion.
- Update webhook payload tests for the new customer field.

## Verification
Tests need Postgres, so run in the existing container (verify workdir first):
- `docker exec saleor-benchmark-saleor-1 python manage.py makemigrations --check --dry-run`
- `docker exec saleor-benchmark-saleor-1 pytest <touched test files> --reuse-db`, then the broader `graphql/product`, `graphql/account`, `graphql/checkout`, `checkout`, `webhook` suites.
- `poe build-schema` and confirm the schema diff only contains the new fields/enum value; `ruff check` and `ruff format`.
- No commits (per `CLAUDE.md`).

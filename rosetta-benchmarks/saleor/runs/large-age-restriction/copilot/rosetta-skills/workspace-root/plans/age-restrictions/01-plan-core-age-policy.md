# 01 — Core Age Policy

## Do

1. Implement DRAFT-AGE-01 through DRAFT-AGE-07 in `saleor`.
2. Add model migrations, private birthday access, Shop policy, product flag, and audit records.
3. Implement centralized date-only eligibility and enforce it in approved checkout and draft-order paths.
4. Preserve the `orderBulkCreate` exemption.
5. Regenerate the GraphQL schema and add focused backend coverage.

## Rules

- Do not expose birthday through general customer APIs, apps, webhooks, exports, or logs.
- Keep audit values metadata-only and preserve their subject UUID after customer deletion.
- Keep `CustomerEvent` birthday types superuser-visible only.

## Done when

- Core schema exposes the approved contracts.
- All listed backend enforcement paths reject invalid purchases before completion.
- Core migrations and focused tests pass.

## Checklist

- [ ] DRAFT-AGE-01 implemented
- [ ] DRAFT-AGE-02 implemented
- [ ] DRAFT-AGE-03 implemented
- [ ] DRAFT-AGE-04 implemented
- [ ] DRAFT-AGE-05 implemented
- [ ] DRAFT-AGE-06 implemented
- [ ] DRAFT-AGE-07 implemented
- [ ] Migration and schema generated
- [ ] Privacy checks passed
- [ ] Focused tests passed


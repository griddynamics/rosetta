# Storage Conditions Export and Webhook — Execution Plan

Read first: `STORAGE-CONDITIONS-EXPORT-WEBHOOK-SPECS.md`; `saleor/CLAUDE.md`; `saleor/docs/ARCHITECTURE.md`.

## Do

1. Add the base storage-conditions column to the existing product CSV field enum and header mapping.
2. Add the base storage-conditions field to the shared legacy product webhook serializer selection.
3. Extend existing CSV, legacy payload, and subscription delivery tests.
4. Verify no filter, search, index, import, event-type, or stored subscription-query behavior changes.

## File ownership

| Owner | Exclusive area |
|---|---|
| Core engineer | `saleor/**` |
| Validator | read-only core review and focused checks |

## Done when

- Selected product CSV exports contain the `storage conditions` base column and value.
- Fixed legacy product payloads contain the base field.
- Subscription webhook tests select and receive `product.storageConditions`.
- Focused CSV/webhook tests and schema checks pass.

## Checklist

- [ ] CSV row shape is unchanged except for the selected optional base column.
- [ ] Product translations are not exported, including when a translation differs from the base value.
- [ ] Legacy serializers include the field for applicable product events.
- [ ] Subscription payloads remain query-defined when the field is selected or omitted.
- [ ] No filters, search, indexing, import, or new webhook events are added.
- [ ] Focused tests pass without persistent migration or external environment changes.

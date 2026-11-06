# Product Storage Conditions GraphQL Contract

## Public product reads

The existing public `Product` type gains:

```graphql
type Product {
  storageConditions: String
}
```

For a request that selects a language, `storageConditions` resolves to the non-empty translation for that language; otherwise it resolves to the base product value. It is `null` when neither value is present.

## Staff product writes

The existing product create/update input gains:

```graphql
input ProductInput {
  storageConditions: String
}
```

The shared translation input gains:

```graphql
input TranslationInput {
  storageConditions: String
}
```

Both fields are optional. A submitted value is normalized to plain single-line text and must be at most 250 characters after normalization. An empty value clears the corresponding base or translated value. The existing product mutation error format reports invalid input. Product writes retain the existing `MANAGE_PRODUCTS` authorization requirement.

`productTranslate` keeps its existing signature and uses the extended shared input. It accepts and persists `storageConditions` for a product translation only when the caller has `MANAGE_PRODUCTS`, matching the base product field. Any non-product translation mutation using `TranslationInput` must reject a supplied `storageConditions` with `TranslationErrorCode.INVALID` at the `storageConditions` path and must not persist it.

## Surface contract

| Consumer | Required behavior |
|---|---|
| Dashboard product details | Read and save the base value with a 250-character input limit. |
| Dashboard product translations | Read and save the translated value with the same limit. |
| Storefront PDP | Request the field with the current language and render a labeled block after the description only when the resolved value is non-empty. |
| Product webhooks | Include the base `storage_conditions` value in product payloads. |
| Product CSV export | Include the base value in the selectable product export column. |
| Cart, checkout, and order email | Do not request or render the field. |

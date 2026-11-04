# Storage Conditions Coding Flow State

## Request

Add a translatable, optional plain-text Product storage-conditions field. It has a
maximum length of 250 characters. Staff edit it in the dashboard. The storefront
shows the translation in a labeled block immediately after the Product description
on the Product detail page only, and hides the block when empty.

## Decisions

- Translation follows the Product name and description behavior.
- Do not show the field in cart, checkout, or order emails.
- Use optional plain text with a maximum length of 250 characters.
- Show a labeled block immediately after the Product description on the Product
  detail page, and hide it when the value is empty.
- Target the dashboard main schema, refreshed from the local API.
- Extend the shared TranslationInput. Category and Collection translation
  mutations reject storage conditions with an INVALID error.
- Invalidate storefront PDP content on translation-only saves when catalog
  update notifications are connected.
- The backend Unicode character limit is authoritative; the dashboard enforces
  the practical equivalent.
- Exclude the field from catalog search and filters; include it in Product
  webhook payloads and Product CSV exports.
- Expand the PDP block by default.
- Count the field in translation progress when its source value exists.

## Progress

- Context loading: complete.
- Intent confirmation: complete.
- Discovery: complete.
- Design: approved by user on 2026-11-03.
- Technical specification and plan: complete.
- Independent plan review: complete; required corrections applied and verified.
- Plan approval: approved by user on 2026-11-03.
- Implementation: in progress; backend contract phase started.
- Review, tests, and validation: pending.

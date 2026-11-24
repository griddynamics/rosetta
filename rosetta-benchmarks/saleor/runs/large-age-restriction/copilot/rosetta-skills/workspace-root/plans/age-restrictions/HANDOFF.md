# Age Restrictions — Handoff

## Status

- Specification: approved 2026-11-04.
- Plan: draft; implementation authorization pending.

## Decisions

- Global Shop age `1..120`, default `18`; IANA Shop time zone, default `UTC`.
- Product-level restriction flag; no regional, channel, or variant policy.
- Birthday is self-declared, owner-editable, and private to owner/superuser.
- Checkout and draft-order enforcement has no app or staff bypass; `orderBulkCreate` is exempt.
- Audit stores only action, actor, time, and immutable customer UUID for one year.

## Next session

- Obtain explicit plan and implementation authorization, then execute session 01.

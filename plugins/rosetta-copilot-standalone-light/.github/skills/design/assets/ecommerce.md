# Ecommerce design reference (asset of the `design` skill)

Applies to storefronts, carts, checkout, catalog, inventory, orders — commerce flows end to end. Money movement itself is the payments dimension.

## Aspects to weigh

- Order placement idempotent by construction: client-generated order key, retries yield one order; the order lifecycle an explicit state machine, never boolean flags
- Inventory is a race by default: check-then-act oversells under load — reservation with TTL at checkout entry, and the oversell policy (block, backorder, oversell-and-apologize) is a business decision to surface, not a default to assume
- Price, discount, and tax computed and validated server-side; anything from the client is display state, including the total it shows the user
- Promotion stacking and eligibility as explicit rules with precedence — the interaction of two promos is where money leaks
- The checkout critical path tolerates degradation: recommendations, reviews, analytics, loyalty shed first, in a decided order; no third-party synchronous call sits between the buyer and the order
- Conversion latency as a first-class attribute: search, product page, checkout p95 — the domain where milliseconds are revenue
- Peak is the design point, not the exception: stateless scale-out, order downstream (email, WMS, ERP) behind queues, flash-sale shape known from history or assumed explicitly
- Cache aggressively (catalog, search, availability) with invalidation tied to price and stock changes; per-user state never in shared caches
- Cart semantics decided: anonymous-to-authenticated merge, multi-device, expiry, price change while in cart
- Returns, cancellations, partial shipments as first-class flows with their own states — not bolted on after launch
- Multi-market: currency, tax regimes, address formats, delegated tax calculation; single-market assumptions calcify in the schema
- Search and catalog: relevance measured, facets from real query patterns, zero-result rate watched
- Customer PII inherits the regulated-data dimension; the payment step inherits payments

## Default priorities

Order correctness before feature breadth · checkout latency before backend elegance · peak capacity before average efficiency · explicit oversell policy before inventory cleverness.

## Standards worth naming

PCI DSS at the payment boundary · GDPR/CCPA for customer data · consumer-protection and distance-selling rules (withdrawal windows, pricing display) · WCAG accessibility · structured data for search (schema.org).

## Easy to miss

The double order from a retried checkout call · oversell during the sale that marketing announced and engineering never heard about · a promo combination selling below cost · price trusted from the client on one legacy endpoint · third-party tag blocking checkout render · cart lost on login-merge · tax computed at display but not recomputed at capture · the search index lagging stock so the buyer lands on sold-out.

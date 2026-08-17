# Mobile design reference (asset of the `design` skill)

Applies to installed clients that cannot be force-upgraded: mobile apps, desktop, devices in the field.

## Aspects to weigh

- There is no instant rollback: store review takes days and users update over months — every risky path behind a remote kill switch, staged rollout gated on crash rate, and a forced-upgrade mechanism designed before it is needed
- The installed version spread is a fact to establish, not assume: which app versions still call which endpoints gates every contract change
- Server APIs evolve additively while old clients live; removal happens after deprecation plus telemetry proving the old traffic is gone — years, not sprints
- Offline as a stance, decided per feature: local store as source of truth where UX demands it, sync with a per-entity conflict policy — last-write-wins vs merge is chosen, not defaulted
- The binary is public: no secrets in the app, short-lived tokens, certificate pinning only with a rotation story that does not brick shipped clients
- Battery and network are budgets: batched background work within OS execution limits, payload discipline, tolerance for flaky links — not just the airplane-mode case
- Push: token refresh lifecycle, delivery is best-effort, notification as trigger not transport
- Deep links and routing versioned — old links in the wild keep resolving
- State survives what the OS does: kill, background eviction, upgrade mid-flow
- Platform divergence explicit: what is shared, what is per-platform, and who owns parity
- Store policy as a constraint on architecture: payment rules, data disclosure labels, review-rejection risk of dynamic behavior

## Default priorities

Backward compatibility before cleanliness · kill switch before confidence · crash-free rate before feature velocity · additive contracts before elegant ones.

## Standards worth naming

App Store / Play policies incl. payment and disclosure rules · ATT and consent flows · OS background-execution limits · platform accessibility (VoiceOver, TalkBack) · semantic API versioning against client spread.

## Easy to miss

A server change breaking a two-year-old client nobody tested · sync silently losing writes where no conflict policy exists · the feature that cannot be turned off because no flag wraps it · pinned certificate expiring with no rotation path · third-party SDK dominating startup time · migration of local storage failing on upgrade for a version skipped in testing.

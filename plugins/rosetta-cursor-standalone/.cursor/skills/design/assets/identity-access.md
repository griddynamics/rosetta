# Identity and access design reference (asset of the `design` skill)

Applies to authentication, authorization, sessions, service identity, and the access decisions around them.

## Aspects to weigh

- Which actors exist: end users, service accounts, machines, third-party apps acting on a user's behalf, internal support staff. Each with its own lifetime, credential type and revocation story
- Authentication source: own store or external IdP (OIDC, SAML), enterprise SSO expectations, more than one IdP per tenant, just-in-time provisioning, and step-up for sensitive operations
- Session and token model: lifetime, refresh, audience, where tokens live on the client. Self-contained tokens cannot be revoked instantly — that is a design tradeoff, not an implementation detail
- Revocation latency as a stated requirement: what happens on password change, role change, offboarding, or breach, and what keeps working with a stale token until it expires
- Authorization model: roles, attributes, or relationships. Whether the real requirement is "who may do X" or "who may do X to *this* object" — the second is where role checks quietly fail
- Where the decision is made: gateway, service, or data layer. One authoritative point, or several that drift apart
- How permission data reaches the decision point: staleness, caching, and the blast radius of a cache that outlives a revocation
- Delegation and impersonation: support acting as a user, third-party apps with scopes and consent, expiry, and audit of both
- Service-to-service identity: workload identity or shared secrets, mTLS, whether the user's context propagates or each hop re-authorizes, and what the network is trusted for
- Key and secret lifecycle: storage, rotation without downtime, signing-key rollover, and the compromise response
- Privileged and administrative paths: separation of duties, approval, break-glass access, least privilege on the operational surface — usually the weakest part
- Audit: which access events are recorded, whether the record is immutable, retention, and whether it can answer "who saw this record" after the fact
- Organization membership: one user across several tenants, invitations, external collaborators, role scoping per organization
- Account lifecycle: registration, verification, recovery, deletion, dormancy — recovery being the most attacked path in the system
- Identity data is personal data: profiles, audit trails and access logs inherit the regulated-data dimension

## Default priorities

Enforcement at one authoritative point · revocation latency treated as a requirement with a number · least privilege on the privileged surface first · audit sufficient to answer access questions after the fact.

## Standards worth naming

OAuth 2.1 and OIDC flows, and which fits a public versus confidential client · SAML for enterprise SSO · SCIM for provisioning and deprovisioning · JWT validation rules: audience, issuer, expiry, signing-key rotation · RBAC, ABAC, ReBAC · mTLS and SPIFFE-style workload identity · token exchange for delegation · OWASP ASVS as an access-control checklist.

## Easy to miss

Route-level checks passing while object-level ownership is never verified · refresh tokens outliving offboarding · role changes taking effect only at next login · a permission cache making revocation eventual · recovery flow weaker than the login it protects · internal calls trusted because they are internal · support impersonation unaudited · tokens validated without audience, so a token from another service is accepted · a second IdP breaking assumptions baked in around the first.

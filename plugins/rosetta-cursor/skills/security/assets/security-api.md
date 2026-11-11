<security_api>

<apply_when>
REST, GraphQL, gRPC, event, webhook, or other service interfaces exist.
</apply_when>

<inspect>
- Authentication, object/function authorization, and tenancy.
- Schema validation, mass assignment, injection, and parsing.
- Rate/resource limits, pagination, replay, and idempotency.
- Sensitive response fields, errors, caching, and observability.
- Versioning, deprecation, webhooks, and downstream trust.
</inspect>

<tools>
Prefer specs, tests, and local static analysis. Candidate active tools include Schemathesis, Dredd, ZAP, Burp, and grpcurl. Active calls require approved pre-production endpoints, identities, rates, data, and stop conditions.
</tools>

<evidence>
Retain operation/schema reference, identity/role, sanitized request shape, response class, and bounded reproduction reference.
</evidence>

</security_api>

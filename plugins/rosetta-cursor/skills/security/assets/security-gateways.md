<security_gateways>

<apply_when>
API gateways, reverse proxies, service meshes, WAFs, ingress controllers, or traffic brokers exist.
</apply_when>

<inspect>
- Route and policy precedence, bypasses, and default backends.
- Authentication propagation, header trust, and identity confusion.
- TLS termination, re-encryption, certificate, and protocol downgrade.
- Rate limits, body limits, normalization, and request smuggling.
- Logging/redaction, administrative interfaces, and fail-open behavior.
</inspect>

<tools>
Prefer configuration and policy inspection. Proxy-through scanning changes traffic flow and requires separate approval, pre-production scope, and bounded data handling.
</tools>

<evidence>
Retain route/policy identity, effective order, sanitized traffic shape, and bypass/control evidence.
</evidence>

</security_gateways>

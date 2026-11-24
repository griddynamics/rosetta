<security_web_dast>

<apply_when>
A deployable web application has an explicitly approved pre-production target.
</apply_when>

<inspect>
- Session, authentication, authorization, and CSRF behavior.
- Injection, browser isolation, headers, cookies, and caching.
- Upload/download, redirects, traversal, and SSRF paths.
- Rate/resource limits and business-logic abuse.
</inspect>

<tools>
Candidate tools include OWASP ZAP, Burp Suite, Nuclei, and browser automation. Verify license, templates, network behavior, credentials, and target controls before use.
</tools>

<safety>
Never run active DAST against production. Bound identities, routes, methods, rates, payloads, duration, and stop conditions. Prohibit destructive and persistent actions. Remove every artifact the test creates — uploaded files, stored payloads, test accounts — and retain cleanup proof.
</safety>

<evidence>
Retain target/route identity, request/response class, payload class, control outcome, cleanup proof, and a bounded secret-free reproduction reference.
</evidence>

</security_web_dast>

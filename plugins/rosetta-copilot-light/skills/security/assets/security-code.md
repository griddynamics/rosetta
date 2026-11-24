<security_code>

<apply_when>
Application, service, library, script, or generated-code security is in scope.
</apply_when>

<inspect>
- Injection, unsafe parsing, deserialization, and command execution.
- Authentication, authorization, tenancy, and object access.
- Cryptography, randomness, validation, and error handling.
- Data exposure, logging, concurrency, and resource exhaustion.
- Framework-specific insecure defaults and bypasses.
</inspect>

<tools>
Use applicable installed SAST/query/linters first. Candidate examples include Semgrep, CodeQL, Bandit, SpotBugs, Brakeman, gosec, and native analyzers. Verify operational contracts at runtime; missing/unverified tools are recommendation-only.
</tools>

<evidence>
Retain rule, source location, path to reachability, relevant control, and sanitized reproduction reference.
</evidence>

</security_code>

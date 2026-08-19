<security_packages>

<apply_when>
Package manifests, lockfiles, vendored code, build plugins, or dependency updates exist.
</apply_when>

<inspect>
- Direct and transitive known vulnerabilities.
- Reachability, exploitability, and deployed-version evidence.
- Typosquatting, dependency confusion, abandoned packages.
- Integrity pins, lockfiles, provenance, and update policy.
- Build-time plugins and install scripts.
</inspect>

<tools>
Prefer installed ecosystem-native audit tools and approved SCA/SBOM tools. Candidate examples include osv-scanner, Trivy, Grype, Syft, npm audit, pip-audit, Maven/Gradle scanners, NuGet audit, and govulncheck. Verify database/network/data flow before use.
</tools>

<evidence>
Preserve advisory ID, package, resolved version, dependency path, reachable use, fix availability, and source-tool record.
</evidence>

</security_packages>

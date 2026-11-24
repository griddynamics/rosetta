<security_architecture>

<apply_when>
Broad/full review, trust-boundary changes, new integrations, privilege changes, or material data-flow changes.
</apply_when>

<inspect>
- Assets, actors, entry points, trust boundaries.
- Authentication, authorization, tenancy, and privilege.
- Data classification, storage, transit, and retention.
- Failure modes, abuse paths, and compensating controls.
- External dependencies and administrative planes.
</inspect>

<evidence>
Produce the threat-model contract. Tie each abuse case to applicable areas, evidence, exclusions, and residual risk.
</evidence>

<tools>
Prefer repository diagrams, IaC, API specs, and runtime configuration. Verify any architecture-analysis tool contract before use.
</tools>

</security_architecture>

<security_iac>

<apply_when>
Terraform, CloudFormation, ARM/Bicep, Helm, Pulumi, or infrastructure configuration exists.
</apply_when>

<inspect>
- Public exposure, trust policies, and excessive privilege.
- Encryption, logging, backup, retention, and deletion controls.
- Network boundaries, secrets references, and insecure defaults.
- State protection, drift-sensitive assumptions, and policy bypass.
- Cross-stack and cross-account dependencies.
</inspect>

<tools>
Prefer installed IaC linters/policy scanners. Candidate examples include Checkov, tfsec, Terrascan, Trivy config, KICS, cfn-lint, and Conftest. Verify supported targets and execution/data flow.
</tools>

<evidence>
Retain resource address, rule, effective configuration, environment, and material dependency path.
</evidence>

</security_iac>

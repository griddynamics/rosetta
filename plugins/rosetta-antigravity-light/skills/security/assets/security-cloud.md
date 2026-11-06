<security_cloud>

<apply_when>
AWS, Azure, GCP, or other cloud resources/configuration are in approved scope.
</apply_when>

<inspect>
- Identity graph, federation, privilege, and escalation paths.
- Public exposure, network segmentation, and private endpoints.
- Encryption, key custody, logging, monitoring, and retention.
- Cross-account/project/subscription trust and service controls.
- Backup, recovery, regional, and administrative-plane risk.
</inspect>

<tools>
Prefer local IaC/config evidence. Candidate posture tools include Prowler, ScoutSuite, Steampipe, CloudSploit, and provider-native policy tools. Live cloud access requires separate credentials/data-flow approval and risk assessment.
</tools>

<evidence>
Retain provider resource ID, account/project/subscription, region, policy path, and effective-control evidence without credentials.
</evidence>

</security_cloud>

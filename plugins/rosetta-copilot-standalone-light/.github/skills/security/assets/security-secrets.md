<security_secrets>

<secret_families>

The filename-only fallback scanner MUST cover this floor:

- Private-key containers and PEM private-key headers.
- AWS access-key identifier families.
- GitHub and GitLab personal/application tokens.
- Slack token families.
- Stripe and similar payment API keys.
- SendGrid, Mailgun, and package-registry tokens.
- Google API keys, OAuth tokens, and service-account JSON fields.
- OpenAI, Anthropic, Hugging Face, Vault, Terraform Cloud, and DigitalOcean tokens.
- JWTs and Authorization header credentials.
- Generic key/secret/password/token assignments.
- Credential-bearing database, cache, broker, and service URIs.
- Azure storage/service-bus connection keys.
- Docker/Kubernetes auth blobs.
- Credential filenames: environment, netrc, registry, cloud, kubeconfig, keystore, certificate, and SSH-key files.

</secret_families>

<handling>
1. Run the scanner before agent/model source ingestion.
2. Emit filenames only.
3. Never emit matches, lines, fragments, values, or file content.
4. No hits: continue.
5. DEV/QA-envs hits: recommend exclusions; require approval.
6. Above-QA or ambiguous hits: stop, non-overridable.
7. When adding a family here, update and test the fallback scanner in the same change.
</handling>

<tools>
Prefer an approved local scanner configured for redaction-safe filename-only output. Otherwise APPLY SKILL FILE `assets/security-secret-scan.sh` against the approved roots. Exit 0: use the returned filename list. Exit 2: scanner unusable — stop; do not ingest source.
</tools>

<evidence>
Return the scanner used, its exit status, the outcome, and the candidate filename list. Never return matches or content.
</evidence>

</security_secrets>

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
- Run before agent/model source ingestion.
- Emit filenames only.
- Never emit matches, lines, fragments, values, or file content.
- No hits: continue.
- DEV/QA hits: recommend exclusions; require approval.
- Above-QA or ambiguous hits: stop, non-overridable.
- When adding a family here, update and test the fallback scanner in the same change.
</handling>

<tools>
Prefer an approved local scanner configured for redaction-safe filename-only output. Otherwise READ SKILL FILE `assets/security-secret-scan.sh`.
</tools>

</security_secrets>

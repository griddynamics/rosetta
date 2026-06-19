# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Rosetta, **please report it privately**. Do not open a public GitHub issue.

**Email:** [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)  
**Subject line:** `[SECURITY] <brief description>`

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof of concept
- Affected component(s) (e.g., `ims-mcp-server`, `rosetta-cli`, `rosetta-mcp-server`, instructions, RAGFlow deployment)
- Your suggested severity (Critical / High / Medium / Low)

### Response Commitment

| Milestone | Target |
|---|---|
| Acknowledgment of report | 3 business days |
| Initial triage and severity assessment | 7 business days |
| Patch or mitigation available | Best effort, dependent on severity |
| Public disclosure (coordinated) | After fix is released, or 90 days from report — whichever comes first |

We follow coordinated disclosure. We ask reporters to give us reasonable time to investigate and remediate before any public disclosure. We will credit reporters in the advisory unless they prefer to remain anonymous.

### Safe Harbor

We consider security research conducted in good faith to be authorized and will not pursue legal action against researchers who comply with this policy.

---

## Supported Versions

Security fixes are applied to the **current release and one prior release (N-1)** of each published package. Older releases do not receive backports.

| Component | Package | Supported |
|---|---|---|
| Rosetta MCP Server | [`ims-mcp`](https://pypi.org/project/ims-mcp/) | Current and N-1 |
| Rosetta MCP Server | [`rosetta-mcp`](https://pypi.org/project/rosetta-mcp/) | Current and N-1 |
| Rosetta CLI | [`rosetta-cli`](https://pypi.org/project/rosetta-cli/) | Current and N-1 |
| Instructions | Published via GitHub Releases | Current and N-1 |

---

## Security Architecture

### Design Principles

Rosetta is designed around a strict separation: it only serves instructions and knowledge to AI coding agents and **never receives, processes, or stores the source code or project data**. The Rosetta MCP serves the context (rules, workflows, conventions) on demand.

### Data Boundary

- Client source code and project files remain entirely within the IDE and the local agent runtime.
- The Rosetta MCP server transmits only curated instructions, scenario metadata, and workflow definitions.
- Write operations are not exposed by default and must be explicitly enabled on the infrastructure level.
- Inputs to the MCP server are structurally constrained to prevent unintended data propagation.

---

## Security considerations

This section outlines the security architecture of Rosetta and the protocols designed to protect proprietary data and system integrity.

### Proprietary Data Protection

Rosetta is engineered to prevent the unintentional transmission of sensitive data through the following architectural controls:
- **Deterministic Instruction Serving**: Instructions are delivered as MCP resources in a strictly deterministic manner. By eliminating the need for semantic search, coding agents are never required to transmit source code or sensitive context to Rosetta to retrieve instructions.
- **Read-Only Default State**: "Write" mode is disabled and hidden by default. Enabling write capabilities requires an explicit, intentional configuration at deployment, ensuring that data persistence remains entirely outside of the end-user's control.
- **Schema-Strict Input Validation**: All MCP tool inputs undergo rigorous validation against predefined schemas. This ensures the system rejects any unexpected payloads or "over-sharing" of data that does not match the required parameters.

### Instruction Integrity

Grid Dynamics ensures the integrity of Rosetta instructions through the following architectural and procedural controls:
- **Rigorous Governance**: All Rosetta instructions undergo formal governance, peer review, and comprehensive testing prior to publication.
- **Versioned Lifecycle**: Instructions follow a structured, version-controlled release lifecycle that includes mandatory change-review gates.
- **Pipeline Isolation**: The instruction delivery pipeline is restricted to authenticated sources and does not accept dynamic or user-supplied inputs at runtime.

For custom implementations, we recommend the following best practices:
- **Standardized Review**: Subject all custom instructions or extensions to the same rigorous review and approval protocols applied to core Rosetta instructions.
- **Source Verification**: Prohibit the introduction of unverified or dynamically generated instruction sources into the production pipeline to mitigate injection risks.
- **Version Pinning**: Explicitly pin instruction versions in production environments to ensure execution consistency and prevent "silent" updates from introducing vulnerabilities.

### MCP Transport Security

To mitigate Man-in-the-Middle (MITM) attacks—including interception or unauthorized tampering of messages between the MCP client (IDE) and the Rosetta server—deployments must adhere to the following standards:
- **Encrypted Communication**: All MCP connections utilize TLS-encrypted HTTP (HTTPS) for both streamable-HTTP and Server-Sent Events (SSE) transports, ensuring data-in-transit confidentiality.
- **Robust Authentication**: Access is governed by OAuth 2.0 (where supported), providing a standardized framework for secure authentication and authorization.
- **Network Isolation**: For high-security or air-gapped environments, STDIO transport is available. This enables fully local process communication, effectively eliminating the network attack surface
- **Credential Hygiene**: Rotate OAuth tokens and API keys on a predefined regular cadence to minimize the impact of potential credential compromise.
- **Secret Management**: Strictly avoid embedding API keys or OAuth secrets in version-controlled configuration files; instead, use secure environment variables or a dedicated secret management vault.
- **Rate limiting**: Implement rate limiting:
  - `/register` — 1 requests per IP per minute.
  - `/token` — 20 requests per IP per minute.
  - `/authorize` — 20 requests per IP per minute.
  - `/revoke` — 20 requests per IP per minute.
- **HSTS**: Enforce HSTS headers with ingress controller or services terminating HTTPS. `Strict-Transport-Security`: `max-age=31536000; includeSubDomains`

### Data leakage through observability

To prevent sensitive data leakage through metrics, analytics, and logging pipelines, Rosetta employs a strict "Zero-Telemetry by Default" policy alongside robust data sanitization:
- **Opt-In Analytics**: Usage telemetry is completely disabled out-of-the-box. No data is collected or transmitted unless a PostHog instance is explicitly configured via the POSTHOG_API_KEY environment variable.
- **Strict Data Minimization**: When analytics are actively enabled, Rosetta captures only essential operational metadata (IP address, user email, coding agent name and version, and MCP tool invocations). This exactly mirrors the data already traversing the MCP server, ensuring no new data exposure surfaces are introduced.
- **Automated Payload Sanitization**: A dedicated before_send hook intercepts outbound events and strips unnecessary technical parameters (such as pagination details and model settings) before they ever leave the server.

If you are extending Rosetta's observability features or enabling telemetry in a custom environment, you must actively manage your data privacy posture:
- **Policy Alignment**: Review the baseline operational metadata collected by Rosetta to ensure strict compliance with your organization's internal data handling and privacy policies.
- **Custom Logging Guardrails**: If you introduce custom logging pipelines, implement strict filters to ensure regulated or sensitive data (such as proprietary source code or system prompts) is never captured without explicit, secure authorization.

### Authentication, Authorization and Access Control
Rosetta employs a "Secure by Default" posture to prevent unauthorized access to MCP services, RAGFlow, or administrative control planes:
- **Mandatory Authentication**: Rosetta and RAGFlow require authenticated access for all operations; anonymous or unverified requests are rejected by default.
- **Controlled Network Exposure**: All internal services, including RAGFlow, are architected for deployment within private network boundaries and are not publicly addressable.
- **Perimeter Security**: Deploy all components within a secure VPC or private subnets. Ensure that RAGFlow, internal APIs, and administrative endpoints are never exposed to the public internet.
- **Least-Privilege Access**: Enforce granular access controls (RBAC) to ensure users and services possess only the minimum permissions required for their roles.
- **Network-Level Segmentation**: Utilize firewalls and security groups to strictly whitelist traffic, restricting access to authorized clients and known internal CIDR blocks.

### MCP Gateway, LLM Gateway and Model Security (a side note)

Use of an LLM gateway is strongly recommended  in sensitive environments to centralize control, apply input/output filtering, and enforce security policies to prevent prompt injection, data leakage, or adversarial exploitation of the underlying LLM.

**Deployer Responsibility:**
- Configure an MCP gateway, LLM gateway, or proxy layer where possible to monitor and filter model and MCP interactions.
- Apply safeguards against prompt injection, jailbreaking, and data exfiltration at the gateway level.
- Monitor model inputs and outputs for anomalous patterns.

### Supply Chain Security

**Risk:** Compromise of published packages (`ims-mcp`, `rosetta-mcp`, `rosetta-cli`) or their dependencies.

**Mitigations:**
- Packages are published to PyPI via automated CI/CD pipelines with controlled access.
- The repository uses GitHub Actions with defined workflows for builds and releases.

**Deployer Responsibility:**
- Pin dependency versions in production deployments.
- Verify package integrity using checksums or signatures when available.
- Monitor dependencies for known vulnerabilities using tools such as `pip-audit`, Dependabot, or equivalent.
- Review the project's `requirements.txt` and transitive dependencies before deploying in sensitive environments.

---

## AI-Generated Output and Coding Agents

While agentic coding accelerates development, it introduces the inherent risk of AI agents producing unsafe, vulnerable, or logically incorrect code. Rosetta addresses this through a combination of structural safeguards and required human-in-the-loop validation.

### Rosetta's Built-In Guardrails
Rosetta is designed to constrain erratic agent behavior and enforce safe execution paths:
- **Structured Workflows**: Agents are guided through a strict, deterministic execution model (Prepare → Research → Plan → Act → Validate) to enforce logical consistency and prevent unprompted actions.
- **Approval Gates & Risk Assessment**: Critical actions trigger automated risk assessment prompts and require explicit approval gates, significantly reducing the likelihood of unsafe autonomous operations.
- **Contextual Limitations**: While Rosetta provides robust guardrails and rich context, it is a guidance engine, not a deterministic compiler. AI-generated outputs can still contain security vulnerabilities or logical flaws regardless of the instructions provided.

### Shared Responsibility: Human-in-the-Loop Controls
To maintain a secure software supply chain, custom deployments and end-users must implement the following operational controls:
- **Mandatory Code Review**: Treat all AI-generated output as an untrusted third-party contribution. Thoroughly review, test, and validate all generated code before execution, commit, or deployment.
- **Audit High-Risk Operations**: Continuously audit the tool calls executed by coding agents. Apply maximum scrutiny to operations that write data, modify state, or interact with external integrations.
- **Zero-Trust Assumption**: Never assume the inherent safety, correctness, or security of AI-generated output.

---

## General Security Recommendations

- Follow defense-in-depth principles: do not rely on a single layer of protection.
- Apply least-privilege access controls across all components and integrations.
- Regularly audit configurations, access policies, and network exposure.
- Keep all dependencies, base images, and infrastructure components up to date.
- Perform a security review before any production deployment.
- Use separate environments (development, staging, production) with appropriate access controls for each.

---

## Scope and Limitations

This policy covers the Rosetta open-source project as published at [github.com/griddynamics/rosetta](https://github.com/griddynamics/rosetta), including the `ims-mcp`, `rosetta-mcp`, and `rosetta-cli` PyPI packages and the published instruction sets.

This policy does **not** cover:
- Hosted or managed Rosetta deployments operated by Grid Dynamics or third parties (these may have their own security policies).
- Third-party integrations, LLM providers, or IDE platforms used alongside Rosetta.
- The RAGFlow upstream project ([github.com/infiniflow/ragflow](https://github.com/infiniflow/ragflow)), which has its own security practices.

---

## Disclaimer

Rosetta is provided under the [Apache License 2.0](LICENSE) on an "AS IS" basis, without warranties or conditions of any kind. The threat model and mitigations described in this document represent best-effort guidance. Deployers are responsible for conducting their own security assessments appropriate to their environment, compliance requirements, and risk tolerance. Nothing in this document constitutes legal advice or a guarantee of security.

<security_kubernetes>

<apply_when>
Kubernetes manifests, Helm charts, operators, admission policies, or cluster configuration exist.
</apply_when>

<inspect>
- RBAC, service accounts, impersonation, and privilege escalation.
- Pod security, host access, capabilities, and isolation.
- NetworkPolicy, ingress, egress, and namespace boundaries.
- Secret references, etcd assumptions, and projected credentials.
- Admission, supply chain, audit, and multi-tenant controls.
</inspect>

<tools>
Prefer local manifest/policy analysis. Candidate examples include Kubescape, kube-bench, kube-linter, Polaris, Trivy config, and Conftest. Cluster access requires explicit environment approval and least privilege.
</tools>

<evidence>
Retain object identity, namespace, effective policy path, environment, and sanitized cluster/config reference.
</evidence>

</security_kubernetes>

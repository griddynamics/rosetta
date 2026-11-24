# IaC design reference (asset of the `design` skill)

Applies to cloud infrastructure, IaC, Kubernetes, delivery pipelines — where the change target is infrastructure itself.

## Aspects to weigh

- Blast radius is set by state layout: state split per environment and domain; a single state file is a single failure domain for everything in it
- Shared modules versioned and pinned; a floating reference is a change to production waiting on someone else's merge
- Plan before apply, with a human gate on production; CI applies, laptops do not — the plan output is the review artifact
- Least privilege per pipeline: scoped roles, no wildcard actions or resources in new work; break-glass separate and audited
- Secrets live in a manager and are referenced, not embedded — and state still captures resolved values: state encrypted, access restricted, treated as sensitive
- Stateful resources are different: deletion protection, tested backup and restore, replace-over-mutate reserved for the stateless
- Drift is scheduled work: detected, then imported or reverted — never ignored; a console change that stays is a second source of truth
- Policy as code in the gate: encryption, tagging, regions, cost rules enforced before apply, not audited after
- Environment parity as a property; snowflakes named and justified, not discovered
- Disaster recovery includes the tooling itself: state backup, re-bootstrap path documented and rehearsed — infrastructure that can only be rebuilt by the person who left
- Cost visible per change: the plan that doubles spend should look expensive before it applies
- Residency and region constraints inherited from the data the infrastructure will carry

## Default priorities

Containment before convenience · reproducibility before speed · production gate before velocity · protection of stateful before elegance of stateless.

## Standards worth naming

CIS benchmarks · cloud Well-Architected frameworks · SOC 2 / ISO 27001 change management · policy-as-code (OPA, Sentinel, checkov) · org tagging and cost-allocation policy.

## Easy to miss

An unpinned module updating production from an unrelated merge · concurrent applies corrupting unlocked state · the protected database one lifecycle flag away from deletion · plaintext secrets readable in state by anyone with read access · drift so old the plan is meaningless · the DR runbook that has never been executed · IAM roles accreting permissions nobody revokes.

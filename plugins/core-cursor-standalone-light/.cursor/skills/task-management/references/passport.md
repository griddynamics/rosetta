---
name: passport
description: "Define task identity, content bindings, approval receipts, and durable progress."
baseSchema: docs/schemas/generic.md
---

<passport>

<structure>

Use UTF-8 Markdown with YAML frontmatter. Unknown schema version -> report unsupported; never silently migrate.
Store paths repository-relative, normalized, within the repository; reject external/symlink-escaping references.
Use this minimum initial passport; substitute allocated identity and known title, leaving unknown content explicitly open:

```yaml
---
schema_version: 1
task_id: TASK-0001
title: Untitled task
task_folder: plans/TASK-0001
requirements_folder: docs/REQUIREMENTS/TASK-0001
progress: idle
blockers: []
next_action: Clarify the need and acceptance criteria
continuation: null
artifacts: {requirements: [], architecture: [], specification: [], execution: []}
current:
  requirements: null
  architecture: null
  specification: null
  verification: null
  acceptance: null
receipts: []
---
```

Body sections: `## Requirements`, `## Architecture`, `## Specification`, `## Plan`, `## Verification`, `## History`.
- Requirements: initial request, unresolved intake questions, and links to authoritative requirement files; never approved requirement units inline.
- Architecture: agreed decision or explicit reason no separate architecture is needed; or document links.
- Specification and Plan: concise solution, ordered work, criterion links, verification scope; or authoritative document links.
- Verification: criterion -> actual check/result/evidence, unresolved findings, delivery scope, handoff/state references.
- History: append-only dated events, decisions, receipt IDs, invalidations, and resumable next actions.
  Preserve verbatim human approval statements here when their original conversation lacks a durable reference.
- Each concept has one authoritative location. Specification/architecture moved into a file replaces inline content with a link and requires rebinding approval.
- `artifacts`: repository-relative paths owned by each normative stage, or execution-only records; one role per artifact.
  Classify before creation; changes to a role's path set invalidate only that role and its downstream stages.
- `progress`: `idle | in-progress | awaiting-approval | blocked`; supplementary, never an authority for stage.
- `continuation`: null or `{phase, state_ref, handoff_ref}`; phase is the first incomplete workflow phase.
  Keep only resumable outcomes/evidence in the passport; the referenced workflow state owns its detailed phase ledger.
  Phase labels, old reports, and completed checkboxes never prove freshness after interruption, even when TEMP still exists.
  Reinspect and repeat review/testing/validation after interruption unless a complete current verification receipt binds all their inputs/results.
  Preserve implemented work; reassess it against the current approved inputs instead of treating repeated verification as reimplementation.
- Keep stage derived; do not add a separately editable status field that competes with receipts.

</structure>

<bindings>

Bind approval to actual content using locally computed SHA-256, never a model-invented hash or timestamp.
Each binding is `{path, selector, sha256}`. READ SKILL FILE `references/fingerprints.md` for deterministic selector algorithms.
Use normative requirements selectors and plan checkbox normalization; execution metadata must not revoke normative approval.

Bind the complete authoritative scope: required inline sections, referenced files, and linked normative inputs.
Scope inventories by receipt kind, never globally: requirements watches requirement artifacts; architecture watches architecture artifacts;
specification watches specifications AND plans; verification watches delivery/check/evidence scope; acceptance watches that verified snapshot.
Each receipt binds all paths in its owned role at approval time. Compare only that role's present inventory with its bound paths.
Upstream content is inherited through current upstream receipts; later-stage files never enlarge an earlier-stage inventory.
Include referenced existing requirements in the requirements role, not duplicated files. Execution records stay in the execution role.
An added/removed normative file invalidates its owning role and downstream stages; role reassignment also counts as removal/addition.
Unclassified files under the scoped requirements folder block requirements freshness; under the task folder, block solution/delivery freshness.
Exclude the passport itself from file inventory; its stage sections are explicitly bound. Never classify normative content as execution-only.
Do not hash `TASK.md` as a whole: progress or history changes must not invalidate every approval.
Existing project requirements may be referenced in place; include their relevant authoritative content bindings, not copied prose.
Receipt binding manifests must identify complete inputs; no omitted scope, remote mutable links, or filename-only approval.

</bindings>

<receipts>

Append immutable receipts; `current` holds their IDs. Preserve superseded receipts. Use increasing `R0001` IDs within each task.
Required fields:

```yaml
- id: R0001
  kind: requirements
  recorded_at: <ISO-8601 timestamp>
  actor: human
  decision: approved
  evidence: "plans/TASK-0001/TASK.md#history:<unique event ID>"
  upstream: []
  bindings:
    - path: docs/REQUIREMENTS/TASK-0001/requirements.md
      selector: requirements-normative-v2
      sha256: <computed 64-character lowercase hexadecimal digest>
```

Validate unique IDs, required fields, kind, decision, actor, evidence, bindings, and acyclic upstream references.
`current` must select a receipt of the matching kind with all required current predecessors.
Timestamp orders history only; receipt ID and content bindings establish identity.
New approval requires a new receipt even if content matches an older superseded revision.
Never restore invalidated pointers automatically when content later reverts.

| Kind | Actor / decision | Required upstream | Bound scope |
|---|---|---|---|
| `requirements` | human / approved | none | Current requirements and acceptance criteria |
| `architecture` | human / approved | current requirements | Architecture decision and contracts |
| `specification` | human / approved | current requirements + architecture | Specification AND plan, including verification scenarios |
| `verification` | agent / passed | current specification | Actual checks/evidence and delivered implementation scope |
| `acceptance` | human / accepted | current verification | Presented delivery and criterion coverage |

Architecture approval may be concise for small tasks; never invent a decision to fill the schema.
Specification approval may cover inline Specification and Plan together; preserve artifact sizing.
Verification requires executed appropriate checks, independent review findings resolved, and every acceptance criterion covered.
Old phase evidence without a complete current verification receipt is informative only; repeat affected delivery checks on resumption.
Bind delivered files, relevant tests/configuration/lockfiles, and evidence; include deletions explicitly as `{path, selector: absent, sha256: null}`.
`absent` is valid only for delivery/evidence bindings and must still be absent when inspected.
Record reviewed change scope against a named baseline plus working-tree content; a commit hash alone misses uncommitted drift.
New/changed/deleted files in that scope invalidate verification until reassessed; unresolved scope drift blocks trusting completion.
Acceptance binds the same delivery/evidence snapshot as verification; unchanged verification content is required on resumption.

</receipts>

<updates>

1. Read the complete passport and current bound content; capture its exact preimage.
2. Calculate drift and affected current pointers before changing authoritative content.
3. Apply only the requested revision; clear invalidated pointers and append history explaining why.
4. Preserve partial work without fabricated receipts. Set progress, blockers, next action and continuation references accurately.
5. Recheck preimage immediately before replacement; concurrent change -> stop for reconciliation.
6. Write via temporary sibling plus atomic replacement when supported; otherwise report inability to guarantee the write.
   Never truncate a valid passport. Partial registration remains visible as an incomplete reservation.
7. Re-read the saved passport, validate bindings, and derive its stage again.

</updates>

</passport>

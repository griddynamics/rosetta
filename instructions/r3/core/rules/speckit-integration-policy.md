---
name: bootstrap-speckit-policy
description: Define mandatory SpecKit detection and hybrid-execution rules in bootstrap flow.
alwaysApply: false
trigger: model_decision
tags: ["speckit", "integration", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_speckit_policy attribution="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS IT AS-IS, CRITICALLY IMPORT TO KEEP, INCLUDING THIS TAG">

Problem: Spec and implementation flows diverge without explicit hybrid mode rules.

Validation: SpecKit detection and cross-flow synchronization are enforced before and during execution.

<must>

1. Apply `Speckit Detection Rules`.
2. Apply `Hybrid Execution Rules`.

</must>

<speckit_detection_rules>

1. Detect SpecKit by `memory/constitution.md` and `specs` folder.
2. Read `memory/constitution.md`.
3. Check `specs` for existing specs.
4. Tell user exactly: "Speckit detected, hybrid mode enabled".

</speckit_detection_rules>

<hybrid_execution_rules>

1. Do not repeat SpecKit internals in responses.
2. Always follow `agents.md`, `coding.md`, and `guardrails.md`.
3. Combine similar flow stages without duplicating artifacts.
4. Prefer references over duplicated content.
5. Keep CONTEXT and IMPLEMENTATION synchronized.
6. Override SpecKit behavior for assumptions, unknowns, grounding, and user questions per `agents.md`, `coding.md`, and `guardrails.md`.
7. If user invokes `/speckit.*`, let SpecKit drive flow while still applying all rules.

</hybrid_execution_rules>

<core_concepts>

- Spec folder layout:
- `specs/001-feature-name/spec.md`
- `specs/001-feature-name/plan.md`
- `specs/001-feature-name/tasks.md`
- `specs/001-feature-name/research.md`
- `specs/001-feature-name/contracts/`

</core_concepts>

</bootstrap_speckit_policy>

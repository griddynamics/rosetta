# Review Standards

**Who is this for?** Reviewers and PR authors.
**When should I read this?** Before reviewing or submitting a PR.

---

## General Review Criteria

Every PR, regardless of type:

- **Scope is narrow.** One concern per PR. If the diff touches unrelated areas, split it.
- **No scope creep.** Changes match the stated intent. Nothing extra.
- **Tests and validation pass.** Author ran relevant checks locally before requesting review.
- **PR description explains why.** Not just what changed. Rationale and expected impact.
- **No secrets or credentials.** No PII, API keys, passwords, tokens in code or config.
- **Dangerous actions assessed.** Irreversible, destructive, or high-blast-radius changes require explicit justification.

For the full author checklist, see [CONTRIBUTING.md — Pull Request Checklist](CONTRIBUTING.md#pull-request-checklist).

---

## Core Principles

Apply to all changes: code, instructions, config, docs. Reject if violated.

| Principle | What to check |
|---|---|
| **SRP** | One responsibility per file, module, or component. If it does two jobs, split it. |
| **DRY** | No repeated logic or content. One canonical source, reference it elsewhere. |
| **KISS** | Simplest solution that meets the intent. No over-engineering. |
| **YAGNI** | No speculative features or hypothetical handling. Solve the current problem. |
| **MECE** | Coverage is complete without overlap. No gaps, no redundancy. |

---

## Code Review Criteria

For MCP server, CLI, tooling, and infrastructure changes.

- **Backward compatibility.** Do not break existing MCP clients, CLI workflows, or published instruction contracts. If a breaking change is unavoidable, document it in the PR and provide a migration path.
- **No hardcoded paths or env vars in application code.** Configuration belongs in environment, config files, or CLI arguments.
- **Self-documenting outputs.** MCP responses and CLI output must be understandable without external explanation.
- **Explicit contracts.** Tool inputs, outputs, and error cases are defined and tested. No silent failures.
- **Type safety.** `validate-types.sh` must pass. New code includes type annotations.
- **Test coverage.** New behavior has tests. Changed behavior updates existing tests. Both unit and integration (`verify_mcp.py`) where applicable.

---

## Instruction Review Criteria

Instructions (skills, agents, workflows, rules, templates) define how AI agents behave. Poor instruction quality has outsized downstream impact.

### Boundaries and Separation

- **Each file has one job.** A skill is not a workflow. A rule is not an agent. If boundaries blur, request a split.
- **No cross-cutting logic embedded.** HITL rules live only in `bootstrap-hitl-questioning.md`. Guardrails live only in `bootstrap-guardrails.md`. Individual instructions must not duplicate or reimplement these. This separation enables fully autonomous execution modes.
- **Respect instruction hierarchy.** Bootstrap rules, workflows, skills, and rules form a layered system. Each layer has defined authority. Do not bypass or redefine upstream constraints in downstream files.
- **Define roles and contracts.** Each instruction must define who acts, what inputs are expected, and what outputs are produced. No implicit handoffs.
- **No logical conflicts.** Instructions must not contradict each other. If a new instruction overlaps with an existing one, reconcile or merge.

### Agent and Tool Agnosticism

- **No hardcoded tool names.** Instructions must not reference specific MCPs and tools, unless those are commonly available. Additionally, use [command aliases](docs/ARCHITECTURE.md#command-aliases) (`ACQUIRE FROM KB`, `SEARCH IN KB`) or describe the action generically.
- **No IDE-specific logic.** Instructions work across Cursor, Claude Code, VS Code, JetBrains, Codex, and any MCP-compatible agent. If a PR introduces IDE-specific behavior, it must be justified and isolated. Target models: Sonnet, Opus, GPT-5.3-codex, GPT-5.4, Gemini-3.1-Pro.
- **No hardcoded paths or env vars.** Unless the instruction explicitly manages configuration, paths and environment details belong in setup docs or deployment config.
- **Flexible over rigid.** Prefer solutions that adapt to task complexity. Avoid brittle assumptions about project structure, language, or toolchain.

### Quality and Form

- **Size.** Under 300 words is ideal. 300-500 is acceptable. Over 500 must split using progressive disclosure (layers or phases).
- **Precise wording.** No vague qualifiers ("approximately", "generally", "might"). Measurable and specific.
- **Explicit over implicit.** State requirements directly. Do not assume the agent will infer intent.
- **Imperative form.** "Do X", not "You should consider doing X". Target each rule line below 8 words.
- **Use common and domain terms.** Avoid jargon unless defined in [OVERVIEW.md — Key Concepts](OVERVIEW.md#key-concepts). Consistent terminology across all instructions.
- **No AI slop.** No filler, no em-dashes, no marketing language. If it sounds like a LinkedIn post, rewrite.
- **No non-operational content.** Remove history, rationale annotations, origin labels, change notes. Instructions describe current state.
- **Structured over prose.** Prefer lists, tables, and short sections over paragraphs.
- **Grep-friendly headers.** Topical, concise. Content must be discoverable via `grep ^#`.
- **No mental overload.** Progressive disclosure: high-level first, details on demand. Classification and planning before execution. In general, avoid IF-THEN-ELSE: do not tell AI how to think instead give it information to think about to make right decision.

### Duplication Check

Duplication in instructions is a maintenance and correctness hazard.

- **Search for existing coverage.** Before approving a new instruction, verify no other file already covers the same topic.
- **One canonical source.** If content exists in two places, pick one home and make the other a reference.
- **Bundler-aware.** Core and org files at the same VFS resource path get [bundled](docs/ARCHITECTURE.md#bundler). Verify that overlapping paths complement, not contradict.

### CI Pipeline Checks

Two automated pipelines run on instruction PRs. Both must pass before merge.

- **Static AI review.** Validates prompt changes for structure, quality, correctness, and governance. Check the pipeline comments on your PR for flagged issues.
- **Scenario comparison.** Runs scenarios with old and new prompts, then compares behavioral output. Check the comparison results for regressions or unintended changes.

Reviewers: read the pipeline output. Do not approve if either pipeline flags issues, even if the diff looks clean.

---

## AI-Assisted Change Review

When a PR is generated or co-authored by AI:

- **Author owns every line.** Regardless of how it was produced.
- **No unexplained bulk diffs.** Large generated changes without rationale get sent back.
- **Verify claims.** Test that examples run. Check that referenced files exist. Do not trust generated text at face value.
- **Check for hidden scope creep.** AI tends to "improve" adjacent code. Verify the diff matches stated intent.
- **Prompt changes require evidence.** Before/after behavior examples and validation results, attached to the PR.

---

## Security and Privacy

- **No sensitive data.** PII, PCI, secrets, credentials must not appear in instructions, config, or test fixtures.
- **Blast radius assessment.** Changes touching auth, encryption, deployment config, or data handling require explicit risk evaluation in the PR description.
- **Production impact.** If a change affects agent behavior in production (mode settings, guardrail strength, consent flows), flag it for maintainer review.

---

## Approval and Follow-Up

- **Approve** when all criteria above are met and the change improves the project.
- **Request changes** with specific, actionable feedback. Point to the violated criterion.
- **Escalate** to maintainers when: security implications are unclear, architectural boundaries shift, or the change affects bootstrap policy.
- **Follow-up items** go in a GitHub issue, not in PR comments that get lost after merge.

---

## Related Docs

- [Contributing](CONTRIBUTING.md) — PR workflow, author checklist
- [Developer Guide](DEVELOPER_GUIDE.md) — repo navigation, where to change what
- [Architecture](docs/ARCHITECTURE.md) — system structure, components, data flow
- [Overview](OVERVIEW.md) — terminology, key concepts
- [Context](docs/CONTEXT.md) — business requirements, decisions
- [Usage Guide](USAGE_GUIDE.md) — how to use Rosetta flows

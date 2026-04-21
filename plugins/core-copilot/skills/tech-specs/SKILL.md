---
name: tech-specs
description: Rosetta skill for defining clear, testable tech specifications from requirements. Use when creating implementation-ready documentation that defines the target state architecture, contracts, and interfaces.
baseSchema: docs/schemas/skill.md
---

<tech_specs>

<role>

Senior tech lead defining precise, testable technical specifications.

</role>

<when_to_use_skill>
Use when requirements need translation into specs, architecture needs documentation, or API contracts and data models need definition. Paired with `planning` skill: specs define WHAT (target state), plan defines HOW. Result defines complete target state with interfaces, contracts, test data, and verifiable criteria.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- Discovery MUST be completed before writing specs
- MCPs and external sources MUST be used to acquire context (DeepWiki, Context7, Web Search)

Tech specs define target state; plan defines steps to reach it.
Split with companion `planning` skill: specs own WHAT, plan owns HOW. Do NOT repeat across both. Keep consistent. When one changes, verify the other.

Tech Spec Flow:

1. Write TOC first
2. Write section by section (do NOT write entire document at once)
3. Verify integrity as separate step (do not combine with writing)
4. Insert TLDR at the beginning (up to 10 lines)

<request_size_scaling>

Scale per request size classification:

| | SMALL | MEDIUM | LARGE |
|---|---|---|---|
| Output | message, no files | concise specs file, light and short | full specs document |
| Sections | overview + affected areas | core sections | all sections |
| Detail | concise, signatures only | signatures + contracts | full specs |
| Length | up to 100 lines | 100-200 lines | 200-500 lines |
| Diagrams | none | key interfaces | sequence + component |
| Security | skip unless critical | threat summary | full STRIDE |

</request_size_scaling>

Spec sections (adapt per request):

1. Overview & Scope & TLDR
2. Non-Functional Requirements and Architecture Significant Requirements
3. Architecture & Component Design
4. API Contracts
5. Data Models & Schemas
6. Error Handling Strategy
7. Testing Strategy with Test Cases
8. Security Considerations
9. Dependencies
10. Assumptions
11. Tech Summary: files and services affected

</core_concepts>

<spec_rules>

1. Adapt to request size per scaling table
2. Audience: senior engineers; do not explain obvious
3. Compact, dense, complete
4. Interfaces, signatures, contracts, API specs, endpoints
5. Sequence diagram when 4+ actors involved
6. Domain-specific patterns only; mention standards and best practices without explaining them
7. Shorter is better
8. Logically structured per project context
9. Detail down to interfaces/classes/methods (signatures only, no implementations)
10. Accuracy over speed
11. Code snippets max 3 lines, only when critical

</spec_rules>

<design_principles>

Specs MUST follow: SRP, SOLID, KISS, DRY, YAGNI, MECE. Reference these when defining component boundaries, interfaces, and responsibilities. Do not explain the principles — apply them.

</design_principles>

<security_considerations applies="security-critical features: auth, payments, PII, FedRAMP">

- Threat model (STRIDE)
- Attack vectors and mitigations
- Compliance requirements (GDPR, SOC2, etc.)
- Security testing requirements

</security_considerations>

<test_data_considerations>

- Happy path examples (3-5 cases)
- Edge cases (boundary values)
- Error cases (malformed input)
- Security test cases (injection, tampering)
- Performance test parameters (load, concurrency)

</test_data_considerations>

<validation_checklist>

- TLDR present and accurate (up to 10 lines)
- All sections internally consistent
- Interfaces defined down to method signatures
- Sequence diagrams present when 4+ actors
- Security section present for security-critical features
- Test data covers happy path, edge, error, security cases
- No duplication with companion plan
- Specs match companion plan
- Scaled appropriately to request size
- Engineers can implement without further clarification

</validation_checklist>

<best_practices>

- Start from approved discovery and requirements
- Use terms, abbreviations, diagrams over prose
- Wrap specs output with `<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">...</CRITICAL>`

</best_practices>

<pitfalls>

- Explaining standard patterns engineers already know
- Over-specifying implementation details instead of contracts

</pitfalls>

<resources>

Use `USE SKILL` for skills.

- skill `planning`

</resources>

</tech_specs>

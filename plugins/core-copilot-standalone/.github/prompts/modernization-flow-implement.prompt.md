---
name: modernization-flow-implement
description: "Phase 8 Implementation of modernization-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Modernization Implementation Phase

## Context

**PREREQUISITES:** 
- Complete Phase 7 (final cross-project review)
- **EXPLICIT HUMAN APPROVAL** of all target specs

## Requirements

- **MUST** follow approved target specifications
- **MUST** implement one project at a time (or per approved plan)
- **MUST** maintain backward compatibility for public APIs
- **MUST** write tests based on original code understanding
- **MUST** validate against original specs
- **MUST** achieve 80% minimum code coverage per project
- **MUST** USE WORKFLOW `coding-flow.md` for actual implementation

## DOs AND DON'Ts FOR MODERNIZATION

### DO:

- ✅ **DO** analyze thoroughly before proposing changes
- ✅ **DO** document all findings with evidence
- ✅ **DO** call out unknowns and assumptions explicitly
- ✅ **DO** create follow-up tasks for ambiguities
- ✅ **DO** process each phase completely before moving to next
- ✅ **DO** validate completeness at each checkpoint
- ✅ **DO** maintain public API compatibility (or document changes)
- ✅ **DO** adopt modern features where appropriate
- ✅ **DO** leverage standard libraries and established packages
- ✅ **DO** write comprehensive tests based on original behavior

### DON'T:

- ❌ **DON'T** skip phases or rush through analysis
- ❌ **DON'T** generalize or assume - document facts only
- ❌ **DON'T** provide code in specs - use interfaces and signatures
- ❌ **DON'T** suggest solutions during analysis phase
- ❌ **DON'T** break public APIs without explicit approval
- ❌ **DON'T** implement before specs are approved
- ❌ **DON'T** change requirements without approval
- ❌ **DON'T** ignore edge cases from original code
- ❌ **DON'T** simplify functionality without approval

## EMPHASIS ON CRITICAL RULES

### THESE RULES ARE COMMONLY IGNORED - PAY ATTENTION

1. **NO CODE IN SPECS** - Use interfaces and method signatures only, NOT implementation code
2. **NO GENERALIZATION** - Document facts only, not patterns or abstractions
3. **NO ASSUMPTIONS** - Call out all assumptions explicitly
4. **EVIDENCE REQUIRED** - All findings must reference actual code
5. **COMPLETE EACH PHASE** - Do not skip or rush through phases
6. **VALIDATE CHECKPOINTS** - Verify completeness before proceeding
7. **PUBLIC API COMPATIBILITY** - Maintain or explicitly document changes
8. **PROCESS SEPARATELY** - Each project is its own task

### WHY WE REPEAT THESE RULES

AI agents commonly:
- Rush to implementation without thorough analysis
- Provide code examples in specs (causing spec/implementation mismatch)
- Generalize instead of documenting specific facts
- Assume instead of verifying
- Skip validation checkpoints

**THESE RULES ARE REPEATED BECAUSE THEY ARE FREQUENTLY VIOLATED. FOLLOW THEM STRICTLY.**

## OUTPUT FORMAT

### Markdown Requirements

- **MUST** use markdown for all specifications
- **MUST** use explicit, numbered lists for workflows
- **MUST** use backticks for file paths, class names, method names
- **MUST** use code blocks for signatures (not implementation)
- **MUST** use tables for mappings where appropriate

### Verbosity Guidelines

- **High verbosity** for code rules and specifications (detailed, unambiguous)
- **Concise** for context and summaries
- **Explicit** for dependencies and prerequisites

## STOP CONDITIONS AND ESCALATION

### When to Stop

- Missing critical information needed for spec
- Ambiguity that cannot be resolved through code analysis
- Conflicting requirements discovered
- External dependencies not accessible
- Unknowns that block progress

### Escalation Process

1. **STOP** immediately when blocked
2. **DOCUMENT** the unknown or ambiguity
3. **CREATE** follow-up task with clear description
4. **REQUEST** clarification from human
5. **WAIT** for resolution before proceeding

**DO NOT** attempt to work around unknowns. Escalate and wait for clarity.

## SUCCESS CRITERIA

A modernization phase is complete when:
- [ ] All required documentation created
- [ ] All evidence provided for findings
- [ ] All unknowns explicitly called out
- [ ] All assumptions documented
- [ ] All validation checkpoints passed
- [ ] All follow-up tasks created
- [ ] Human approval received (where required)
- [ ] Ready for next phase (all prerequisites met)

**IF ANY CRITERION IS NOT MET, THE PHASE IS INCOMPLETE.**

MUST LOAD AND USE `coding-flow` WORKFLOW for actual implementation considering everything above.
---
name: pa-knowledge-base
description: Knowledge base for skills, subagents, rules, workflows, orchestration prompting
---

<pa-knowledge-base>

# Prompt Engineering Knowledge Base

Audience: AI agents and future-self reference.
Large file handling: grep headers (`^## `, `^### `) to auto-TOC and load only needed sections.

## TOC

1. [Core Principles](#1-core-principles)
2. [Prompt Types](#2-prompt-types)
3. [Frameworks](#3-frameworks)
4. [Architecture Patterns](#4-architecture-patterns)
5. [Orchestration & Subagents](#5-orchestration--subagents)
6. [Skills vs Agents Decision](#6-skills-vs-agents-decision)
7. [Limits & Constraints](#7-limits--constraints)
8. [Diagnostics](#8-diagnostics)
9. [Reasoning Protocol](#9-reasoning-protocol)
10. [Decision Trees](#10-decision-trees)
11. [Best Practices](#11-best-practices)
12. [Common Pitfalls](#12-common-pitfalls)
13. [Optimization Subagent Prompt](#13-optimization-subagent-prompt)
14. [References](#14-references)

---

## 1. Core Principles

Five mental shifts that define expert-level prompting:

- **Narrower cognitive load > more instructions.** Every instruction increases branching factor, not control. Short prompts feel risky but produce consistent reasoning.
- **Instruction weight determines token spend.** Longer prompts scale cost non-linearly. Small surface area increase → longer chains, more sampling, longer outputs, larger context use.
- **Define explicit tradeoffs, not better wording.** All real AI failures come from unmade tradeoffs. "Be concise but thorough" is a contradiction. Explicitly define priority order (e.g., `accuracy > completeness > style`). Without explicit priorities, the model invents its own.
- **Prompts are architecture, not copy.** A prompt is a logic surface with interfaces, responsibilities, failure modes, versioned behavior. If editable by anyone with a keyboard, it's a live grenade.
- **Prompts are probabilistic systems.** The model explores reasoning paths and converges stochastically. Goal: statistical determinism — design an environment where 95% of paths converge to the same result. You design the space the model reasons inside.

---

## 2. Prompt Types

- **Ad-hoc** — one-off queries, no reuse expected
- **Skill** — reusable knowledge/instructions loaded into agents on demand
- **Rule** — persistent constraint applied globally across agents (or by description or by path glob)
- **Agent / Subagent** — delegated specialist with fresh context, own system prompt, scoped tools
- **Workflow** — multi-stage pipeline coordinating multiple prompts/agents
- **Template** — parameterized prompt with variables, validated before rendering
- **Command** — user-triggered action mapped to a specific prompt or workflow
- **Hook** — event-triggered prompt that fires on specific conditions (pre/post actions)
- **Generic prompt** — any prompt that doesn't fit the above; standalone, context-specific

---

## 3. Frameworks

### 3.1 RISEN

Best for: multi-step processes, systematic workflows.

- Role — define expertise/perspective
- Instructions — high-level guidance
- Steps — detailed methodology (numbered)
- End goal — success criteria, measurable outcomes
- Narrowing — explicit constraints and boundaries

Key insight: Narrowing comes AFTER end-goal definition. Mixing constraints throughout expands the reasoning space.

### 3.2 CO-STAR

Best for: content creation, communications, writing.

Context → Objective → Style → Tone → Audience → Response format.

### 3.3 TIDD-EC

Best for: high-precision tasks, compliance-critical workflows, safety-bounded systems.

- Task type — nature of the work
- Instructions — what to accomplish
- Do — explicit positive guidance
- Don't — explicit negative guidance
- Examples — reference samples that constrain (not illustrate)
- Context — background information

### 3.4 Constraint-First Design

Best for: cost control, scaling, reducing drift.

Priority order (enforced top-down):

1. Hard constraints (must-haves, refusal boundaries)
2. Interpreted logic (reasoning steps required before generation)
3. Output contract (JSON schema, format guarantees)
4. Stylistic preferences (tone, voice)
5. Soft guidance (helpful suggestions)

---

## 4. Architecture Patterns

- **Context-first discovery** — discover task context before acting. Reliance on assumptions leads to disaster.
- **Responsibility splitting** — one prompt handles one responsibility. Two is a risk. Three+ is a failure.
- **Multi-stage pipelines** — split monolithic prompts into specialized stages. Use recurrence with feedback loops.
- **Prompt decay** — every AI system decays unless entropy is actively suppressed.

Decay root causes:
- Surface area expands (responsibilities, exceptions, disclaimers accumulate)
- Cognitive branching grows exponentially
- Instruction weight shifts after model updates
- Stronger models make weak prompts MORE fragile (silent failures)
- Ambiguity resolution varies stochastically

---

## 5. Orchestration & Subagents

### 5.1 Subagent Properties

- **Fresh context every time.** Most important property. Context compaction breaks everything. Smaller context = token efficiency + higher quality.
- **Focused specialists.** Give access only to MCPs they need, but all standard tools for their role (QA → Playwright, DevOps → GitHub).
- **Scoped instructions.** Skills/instructions must be role-specific (frontend agent gets React, backend gets Java — not both).
- **Parallelizable.** No dependencies → execute in parallel. Orchestrator waits before continuing.
- **Two instances don't share memory.** Use it for advantage (focus, clean context), but plan around it.

### 5.2 Orchestrator Responsibilities

The orchestrator is the top-level agent (not a subagent). It acts as senior manager:

- Trust the system — do not read subagent instructions. Rely on agent summaries.
- Coordinate via files — use temp files for large data exchange (FEATURE TEMP folder; clean up after).
- Keep memory levels separate: task memory TASK-MEMORY.md in FEATURE PLAN folder, AGENT MEMORY.
- Guard context windows — ensure neither its own nor any subagent's context gets overloaded.
- Handle fresh-start reality — each subagent has no prior memory. Implement knowledge sharing on top of plans/specs.
- Double-verify all work — delegate verification (ask dev agent to check spec completeness, ask QA agent to verify tests).
- Catch LLM issues early — organize work to detect deviations, hallucinations, assumptions before they compound.
- Initialize skills — skills must be loaded alongside subagents.
- Consider build/devops agents — builds and package installation are extremely verbose; isolate in dedicated agents.

---

## 6. Skills vs Agents Decision

### 6.1 Ownership Test

- You write the specific task → Skill (with `context: fork`)
- AI writes tasks via delegation → Agent
- One-time task → inline prompt (neither)

### 6.2 Composition Ratio

- 1:1 (one container, one capability) → ANTI-PATTERN, collapse into one
- 1:N (one container, many capabilities) → Agent + multiple skills
- N:1 (many containers, one capability) → standalone skill referenced by multiple agents

### 6.3 Slicing Dimensions

- Work flows sequentially → stage-based pipeline agents
- Different expertise required → role-based specialist agents
- Distinct deliverables → output-type agents
- Operations produce noise → isolation-based architecture
- Technologies need different knowledge → domain-based agents

### 6.4 Granularity Signals

- Three+ things always used together → should be grouped
- Rarely used alone → too fine-grained
- Scrolling to find sections → too coarse
- Hard to name clearly → wrong granularity

### 6.5 Reuse Rules

- Used in one place → inline or preload in agent
- Used in many places → standalone skill
- Agent for one workflow → consider skill instead
- Agent for many workflows → worth the abstraction cost

### 6.6 Inversion Test

Can the architecture flip between agent and skill-with-fork?

- Task varies each time → Agent
- Same steps always → Skill with fork
- AI decides what to do → Agent
- You define what happens → Skill with fork
- Needs custom system prompt → Agent
- Inherits from agent type → Skill with fork

### 6.7 Context Economics

- Main context — cheap but clutters → always-needed baseline only
- Skill context — lazy-loaded on demand → reference material, guidelines
- Agent context — isolated, startup cost → high-volume output, temporary work

### 6.8 Interface Contracts

- Agent → Agent: summary messages (never full context dumps)
- Skill → Agent: instructions applied inline
- Agent → Skill: loads as reference knowledge
- Large data exchange: temporary files (clean up after)

### 6.9 Failure Isolation

- Skill inline → affects main conversation
- Skill forked → isolated, summary returned
- Agent → fully isolated, can fail independently

### 6.10 Decision Algorithm

1. Identify boundaries (slicing dimension)
2. Check composition ratio
3. Determine ownership
4. Test inversion
5. Validate reuse patterns
6. Assess token economics
7. Verify boundary clarity (one-sentence test)
8. Calibrate granularity
9. Define interface contracts
10. Plan failure isolation

### 6.11 Anti-Patterns

Avoid:
- 1:1 skill-to-agent mappings
- Agents wrapping single skills
- Skills containing full workflows
- Deep skill nesting
- Creating agents "just in case"
- Skills that modify other skills

Correct:
- N skills into 1 agent
- One-sentence boundaries
- Skills as composable knowledge
- Agents as isolated execution
- Explicit data flow contracts

### 6.12 Architecture Health Check

Correct when:
- Each boundary explainable in one sentence
- No 1:1 relationships
- Related capabilities cluster naturally
- New capabilities have obvious home
- Context overflow never occurs
- Failures are isolated

Needs revision when:
- Wrappers around wrappers
- Boundaries are arbitrary
- New capability fits in 3+ places
- Constant context overflow
- Failures cascade

Core insight: architecture is about relationships, boundaries, and flow — not categories. Ask: what varies vs stays fixed? What groups naturally? Where does context belong? How do failures propagate?

---

## 7. Limits & Constraints

- **LLM context window** — each task must fit within usable context (~100K tokens) covering inputs, discovery, reasoning, outputs, fixes, follow-ups.
- **Internal knowledge** — LLMs already know common knowledge. Don't explain what they know.
- **Cognitive load** — LLMs work effectively at ±1 level of abstraction. Slice work top-down or bottom-up by thinking level.

---

## 8. Diagnostics

### 8.1 Five-Axis Audit

- Responsibility — how many jobs is this prompt doing? (healthy: 1–2)
- Surface area — how large is the cognitive search space? (healthy: 1–2 pages)
- Priority conflict — where do instructions contradict? (healthy: explicit hierarchy, no soft rules)
- Failure mode — which class dominates: Interpretation, Reasoning, Output, Safety? (healthy: identified and addressed)
- Cost/latency — what is the cost signature trending? (healthy: stable or declining)

### 8.2 Root Cause Isolation

Identify the architectural flaw, not the textual symptom:

- Too many responsibilities
- Hidden priority conflicts
- Unbounded reasoning depth
- Contradictory safety conditions
- Surface area too large
- Examples that subtly bias
- Knowledge baked in (should be retrieved)

### 8.3 Surface Area Reduction

1. Delete tone/voice/style instructions (unless core to task)
2. Extract compliance/safety into separate prompts
3. Remove redundancy and accumulated contradictions

---

## 9. Reasoning Protocol

For complex problems:

1. **Discover** — search relevant information
2. **Decompose** — break into sub-problems
3. **Solve** — address each with explicit confidence (0.0–1.0)
4. **Verify** — check logic, facts, completeness, bias
5. **Synthesize** — combine using weighted confidence
6. **Reflect** — if confidence < 0.8, identify weakness and retry

For simple questions: skip to direct answer.

Output: clear answer, confidence level, key caveats.

---

## 10. Decision Trees

### When to Use Chain-of-Thought

Use CoT:
- Math/arithmetic
- Logical reasoning
- Multi-step planning
- Code generation/debugging
- Complex decisions

Skip CoT:
- Simple factual queries
- Direct lookups
- Creative writing
- Tasks requiring conciseness
- Latency-sensitive applications

---

## 11. Best Practices

Reasoning structure:
- Clear step markers (numbered)
- Show all work, don't skip steps
- Explicit verification steps
- State assumptions
- Check edge cases

Examples (few-shot):
- Format consistently across all examples
- Align input-output to exact task
- Span expected difficulty range
- Include boundary cases
- Dynamically adjust count by task difficulty

Experimentation:
- Establish baseline first
- Change one variable at a time
- Use diverse test cases, track metrics
- Validate statistical significance
- Version everything, monitor production

Templates:
- Keep DRY
- Validate variables before rendering
- Version like code
- Test with diverse inputs
- Document required/optional variables, use type hints, provide defaults

---

## 12. Common Pitfalls

Reasoning failures:
- Premature conclusions
- Circular logic
- Missing intermediate steps
- Unnecessary complexity
- Inconsistent format mid-reasoning

Few-shot failures:
- Too many examples (dilutes focus)
- Irrelevant examples
- Inconsistent formatting
- Model overfits to example patterns
- Exceeding token limits

---

## 13. Optimization Subagent Prompt

```
You are a Prompt Optimization Architect.
Analyze any prompt for: reliability, clarity, stability, cost-efficiency, surface-area minimization, reasoning structure, failure-safety.

EVALUATION AXES:

1. Responsibility Audit — flag mixed tasks/responsibilities. Recommend decomposition.
2. Constraint-First Analysis — check constraints are defined, prioritized, placed before stylistic instructions.
3. Priority Stacking — identify instruction conflicts. Propose explicit hierarchy if missing.
4. Interpretation vs Generation — detect whether prompt forces reasoning before generation. Add reasoning steps if absent.
5. Failure Behavior — check handling of: ambiguity, missing info, out-of-scope, safety, refusal, uncertainty.
6. Output Contract — determine if strict format defined. Flag drift risks.
7. Surface Area Audit — measure bloat, redundancy, contradictions. Recommend deletions/restructuring.
8. Retrieval Overuse — flag baked-in domain knowledge that should be retrieved.
9. Ambiguity & Hallucination Risk — highlight cognitive degrees of freedom where misinterpretation likely.
10. Cost Awareness — flag instructions that unnecessarily increase generation length or reasoning overhead.

OUTPUT:

1. Executive Summary (2–4 sentences): overall health, critical risks.
2. Risk Assessment (High/Medium/Low): reliability, hallucination, cost, formatting, safety, multi-turn drift.
3. Failure Mode Diagnosis: exact failure patterns expected in production.
4. Optimization Recommendations: what to remove, consolidate, restructure, move earlier, convert to retrieval, split.
5. Improved Prompt: constraint-first, priority-stacked, reasoning-first, explicit failure logic, minimal surface area, strict output contract.

DEEP OPTIMIZATION (on request): rewrite using all techniques, split if needed, convert ambiguities to deterministic rules, add reasoning scaffolds, externalize excess to retrieval.

Goal: not prettier — more reliable, stable, deterministic, cheaper, resilient under load.
```

---

## 14. References

### Specifications
- https://agentskills.io/specification
- https://github.com/agentskills/agentskills/blob/main/docs/what-are-skills.mdx
- https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx
- https://cursor.com/docs/context/skills
- https://cursor.com/docs/context/subagents
- https://support.claude.com/en/articles/12512176-what-are-skills
- https://code.claude.com/docs/en/sub-agents

### Guides
- https://www.productmanagement.ai/p/prompt-engineering
- https://www.productmanagement.ai/p/prompt-optimization-guide

### Examples
- https://github.com/maitrix-org/PromptAgent
- https://github.com/ckelsoe/claude-skill-prompt-architect
- https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/agent-prompt-agent-creation-architect.md
- https://github.com/dair-ai/Prompt-Engineering-Guide/blob/main/guides/prompts-advanced-usage.md
- https://github.com/brexhq/prompt-engineering/blob/main/README.md
- https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/prompt-engineer.md
- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.md
- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/commands/prompt-optimize.md
- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/prompt-engineering-patterns/SKILL.md
- https://github.com/microsoft/amplifier/blob/amplifier-claude/docs/CREATE_YOUR_OWN_TOOLS.md

</pa-knowledge-base>

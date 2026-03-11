---
name: knowledge
description: Extract, search, and retrieve knowledge from Rosetta reference documentation. Use when the user asks for Rosetta system knowledge, wants to understand specific components (agents, skills, rules, workflows, templates), needs setup/installation help, or requires guidance on bootstrap policies, architecture, patterns, or operations. Handles topic searches, document navigation, and contextual knowledge retrieval.
---

# Rosetta Knowledge Extraction

- Read entire `refsrc/INDEX.md`
- Do not read referenced files
- Spawn parallel `discoverer` subagents with fast/haiku/flash/mini model to perform an action on relevant files
- Synthesize answer based on subagent responses
- You are orchestrator and manager, you should clearly state the task, inputs, scope, and outputs, you must follow delegation best practices
- You should ask slightly more from each subagent vs what you have been requested
- INDEX.md contains 2-3 sentences with summarized content of each file
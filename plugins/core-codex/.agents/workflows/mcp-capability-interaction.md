---
name: mcp-capability-interaction
description: Routes MCP vs questionnaire; ACQUIRE with workflows that call external MCPs.
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# MCP capability interaction (shared)

Use when a workflow **may** call MCP (Jira, Confluence, TestRail, Atlassian). **AQA** integrated Path A and **TestGen** Phases 1 and 6 load this fragment.

## B — `agents/mcp-capability.yaml` (workspace root)

Read before the first MCP call. Keys optional; unknown keys ignored.

```yaml
mcp:
  mode: capable  # required if file exists: capable | absent
  jira: true
  confluence: true
  testrail: true
  atlassian_confluence: true
```

- **`confluence` vs `atlassian_confluence`:** **Not aliases** — both refer to **Confluence** MCP on/off for **guided vs questionnaire**, but **different workflows read different keys** (TestGen uses `confluence`; AQA data collection uses `atlassian_confluence`). If you use **both** families, set **both** to the same boolean. If you use **one** family, you may omit the key the other workflow reads. Template: `instructions/r2/core/templates/mcp-capability.example.yaml`.

- **`mode: capable`** — MCP allowed. Per integration: **`true`** or key omitted → **guided**. **`false`** → **questionnaire** (no MCP; user text). Read **`agents/user-instructions/mcp-guidance.md`** first when it exists. Do not re-ask values already in that file unless missing.
- **`mode: absent`** — Do not invoke MCP. Parent workflow runs questionnaire (**STOP**, **WAIT**), merges into plan / `raw-data.md` / agreed artifact. Never fabricate MCP output.
- **File missing** — Apply **A** if the user message overrides; else **one** question whose **scope** (which integrations) is defined by the **parent workflow**, not this fragment. **Example — TestGen Phase 1:** when `agents/mcp-capability.yaml` is absent, **Step 2b** asks once for **Jira and Confluence together** (`testgen-flow-data-collection.md`); **TestRail** is resolved again in **TestGen Phase 6**. **No** → questionnaire for the integrations that question covers. **Yes** → capable for that run; recommend adding YAML.

## A — user message (wins over file)

Record in state/plan. **Absent:** `MCP absent`, `no MCP`, `without MCP`, `questionnaire only`, `paste-only`. **Capable:** `MCP capable`, `use MCP`, `MCP enabled`, `pull from Jira` when clearly a live pull. User wins on conflict.

## Capable mode without guidance

Use task text and YAML only; questionnaire **only** for missing fields. Do not invent secrets.

## Questionnaire (`absent` or integration `false`)

Parent supplies **numbered** questions for fields MCP would return. **STOP**; **WAIT**. Merge into the same artifacts as the MCP path. Label **user-provided (no MCP)**.

## Recording

When routing is resolved, write into the phase plan or state file: either **one** line `MCP interaction: guided | questionnaire (source: agents/mcp-capability.yaml | user override | default question)` when a single scope applies, or **one line per integration** (or per parent-defined field such as TestGen `Jira source` / `Confluence source` / Phase 6 TestRail export), each with the same `(source: ...)` options.

## Tool names

Concrete MCP tool ids stay in phase files. This fragment only picks **MCP vs questionnaire**.

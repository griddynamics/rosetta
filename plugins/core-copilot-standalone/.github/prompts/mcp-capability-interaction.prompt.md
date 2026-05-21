---
name: mcp-capability-interaction
description: Routes guided vs questionnaire MCP usage from workspace YAML and user text, records interaction source, and defines where capability files live. Placeholder binding uses sibling workflows.
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# MCP capability interaction (shared)

Use when a workflow **may** call **remote MCPs** (Jira, Confluence, TestRail, Atlassian). It does **not** bind **`{integration-action:…}`** (see **`mcp-tool-resolution.md`**) or **`{agent-action:…}`** (see **`agent-action-resolution.md`**). **AQA** Path A and **TestGen** Phases 1 and 6 load this for **routing** (guided vs questionnaire) only.

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
- **File missing** — Apply **A** if the user message overrides; else **one** question whose **scope** (which integrations) is defined by the **parent workflow**, not this fragment. **Example — TestGen Phase 1:** when `agents/mcp-capability.yaml` is absent, **Step 2b** in `testgen-flow-data-collection.md` asks once for **Jira and Confluence together**; **TestRail** is resolved again in **TestGen Phase 6**. **No** → questionnaire for the integrations that question covers. **Yes** → capable for that run; recommend adding YAML.

## A — user message (wins over file)

Record in state/plan. **Absent:** `MCP absent`, `no MCP`, `without MCP`, `questionnaire only`, `paste-only`. **Capable:** `MCP capable`, `use MCP`, `MCP enabled`, `pull from Jira` when clearly a live pull. User wins on conflict.

## Capable mode without guidance

Use task text and YAML only; questionnaire **only** for missing fields. Do not invent secrets.

## Questionnaire (`absent` or integration `false`)

Parent supplies **numbered** questions for fields MCP would return. **STOP**; **WAIT**. Merge into the same artifacts as the MCP path. Label **user-provided (no MCP)**.

## Recording

When routing is resolved, write into the phase plan or state file: either **one** line `MCP interaction: guided | questionnaire (source: agents/mcp-capability.yaml | user override | default question)` when a single scope applies, or **one line per integration** (or per parent-defined field such as TestGen `Jira source` / `Confluence source` / Phase 6 TestRail export), each with the same `(source: ...)` options.

**Before leaving this fragment:** Re-read the plan or state lines you wrote for MCP routing and confirm: **(a)** each line lists exactly one source among `agents/mcp-capability.yaml`, `user override`, and `default question`; **(b)** using one aggregate line vs one line per integration (or per parent-defined field such as TestGen `Jira source` / `Confluence source`) matches what the **parent workflow** requires. Correct the artifact if a check fails.

## Path conventions (Rosetta vs target workspace)

Use whenever a workflow mentions both Rosetta artifacts and workspace files.

| Location | Path | Notes |
|----------|------|--------|
| **Rosetta repo / distribution only** | `instructions/r2/core/templates/mcp-capability.example.yaml` | Template for **authoring** `mcp-capability.yaml`. Not expected inside an arbitrary customer application checkout unless copied from Rosetta. |
| **Target workspace** | `agents/mcp-capability.yaml` | Optional capability file; **expected at workspace root** only. |
| **Target workspace** | `agents/user-instructions/mcp-guidance.md` | Optional per-workspace MCP hints. |

If **`agents/mcp-capability.yaml`** is missing at workspace root, treat capability config as **missing** for routing: follow the parent workflow’s questionnaire / default-question path and record **MCP interaction source** accordingly (do not search the customer repo for Rosetta template paths).

## Related workflows (placeholder binding)

- **`mcp-tool-resolution.md`** — Map **`{integration-action:…}`** to MCP tool ids when **guided**.
- **`agent-action-resolution.md`** — Map **`{agent-action:…}`** to host read / write / patch tools.

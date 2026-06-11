---
name: init-workspace-context
description: "Rosetta skill to classify workspace initialization mode, build existing file inventory, and generate gain.json"
license: Apache-2.0
model: Claude Haiku 4.5
tags: ["init", "workspace", "context", "detection"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_context>

<role>
Workspace initialization classifier — fast, precise, zero-waste.
</role>

<when_to_use_skill>
Initialization must behave differently for fresh, existing, or plugin workspaces. Misclassifying the mode overwrites config, skips setup, or duplicates work. First skill in the init flow — runs before all others. Also generates or updates `gain.json` with SDLC tooling configuration collected from the user.
</when_to_use_skill>

<core_concepts>
- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Three modes: install (no files per `bootstrap_rosetta_files`), upgrade (some files per `bootstrap_rosetta_files` exist), plugin (LLM context already contains "RUNNING AS A PLUGIN")
- `gain.json` is the single source of truth for SDLC tooling; it wins in conflicts with other files
</core_concepts>

<process>
1. Check existing LLM context for "RUNNING AS A PLUGIN": If already there → set mode = plugin
2. If not plugin, scan workspace for existing files per `bootstrap_rosetta_files`
3. Any found → mode = upgrade; none → mode = install
4. Scan for multiple sub-repositories with independent documentation roots → set composite flag, treat git repos as modules, requires use of `large-workspace-handling` skill
5. Build file inventory: path and status for each file per `bootstrap_rosetta_files`
6. Generate or update repository root `gain.json` — follow the `gain_json_generation` section below
7. Return: mode (install|upgrade|plugin), plugin_active, composite, existing_files list, gain_json_status (created|updated|skipped|pending_user_input)
</process>

<gain_json_generation>

1. Auto-detect fields from workspace. Non-obvious: `versions.rosetta` — read from Rosetta plugin path in current LLM context, e.g. "2.0.43"; `versions` is for GAIN suite tools only (rosetta, specflow, etc.), not the project
2. Ask user for anything unresolved in a single batch. All fields optional. Prioritize critical fields first. Leave placeholders for skipped fields
3. If `gain.json` already exists: read it, ask only about gaps and placeholders; never overwrite confirmed values
4. If running as subagent: output `gain_json_draft` (template with auto-detected values filled in, all other fields left as template placeholders) to orchestrator; instruct orchestrator to ask user to fill in each placeholder field, and leave any unanswered fields exactly as the placeholder in the template

</gain_json_generation>

<templates>

### gain.json

```json
{
  "description": "[PROJECT_DESCRIPTION - one sentence: what this project/product is and does]",
  "servicesDescription": {
    "[SERVICE_NAME]": "[SERVICE_DESCRIPTION - what this service does]"
  },
  "codingAgents": [
    "[CODING_AGENTS - e.g. cursor, claude-code, codex, copilot]"
  ],
  "sdlc": {
    "issue_tracker": "[ISSUE_TRACKER - e.g. Jira, GitHub Issues, Linear]",
    "issue_tracker_project": "[ISSUE_TRACKER_URL - e.g. https://myorg.atlassian.net/jira/...]",
    "wiki": "[WIKI - e.g. Confluence, Notion, GitHub Wiki]",
    "wiki_project": "[WIKI_URL - e.g. https://myorg.atlassian.net/wiki/...]",
    "test_management": "[TEST_MANAGEMENT - e.g. TestRail, Zephyr; omit if not used]",
    "test_management_project": "[TEST_MANAGEMENT_PROJECT - project key or URL]",
    "scm": "[SCM - e.g. GitHub, GitLab, Bitbucket]",
    "scm_project": "[SCM_URL - e.g. https://github.com/org/repo]",
    "build_management": "[BUILD_MANAGEMENT - e.g. GitHub Actions, Jenkins, CircleCI]",
    "build_management_project": "[BUILD_MANAGEMENT_URL - e.g. https://github.com/org/repo/actions]",
    "ux": "[UX_TOOL - e.g. Figma, Sketch; omit if not applicable]",
    "ux_project": "[UX_PROJECT - project name or URL]",
    "infrastructure": "[INFRASTRUCTURE - e.g. Kubernetes, ECS, serverless]",
    "infrastructure_project": "[INFRASTRUCTURE_PROJECT - project name or cluster name]",
    "iac": "[IAC_TOOL - e.g. Terraform, Pulumi, CDK; omit if not applicable]",
    "iac_project": "[IAC_PROJECT - project or workspace name]",
    "hosting": "[HOSTING - e.g. AWS, GCP, Azure, on-prem]",
    "hosting_project": "[HOSTING_PROJECT - project or account name]",
    "monitoring": "[MONITORING - e.g. Prometheus, Datadog, New Relic]",
    "monitoring_project": "[MONITORING_PROJECT - dashboard URL or project name]",
    "logging": "[LOGGING - e.g. Grafana, Splunk, ELK]",
    "logging_project": "[LOGGING_PROJECT - dashboard URL or project name]",
    "security": "[SECURITY_TOOL - e.g. Vault, AWS Secrets Manager; omit if not applicable]",
    "security_project": "[SECURITY_PROJECT - project or namespace]",
    "collaboration_project": "[COLLABORATION_PROJECT - team or community name]",
    "unit_tests": "[UNIT_TESTS_LOCATION - e.g. in-repository, separate repo]",
    "integration_tests": "[INTEGRATION_TESTS_LOCATION - e.g. in-repository]",
    "e2e_tests": "[E2E_TESTS_LOCATION - e.g. in-repository, separate repo]",
    "performance_tests": "[PERFORMANCE_TESTS_LOCATION - omit if none]",
    "testing_harness": "[TESTING_HARNESS - main test entry point or script name; omit if standard]",
    "code_graph": "[CODE_GRAPH_TOOL - e.g. GitNexus, CodeScene; omit if not used]"
  },
  "vocabulary": {
    "[TERM]": "[DEFINITION - domain-specific term AI should know; add more entries as needed]"
  },
  "versions": {
    "rosetta": "[ROSETTA_VERSION]"
  }
}
```

</templates>

</init_workspace_context>

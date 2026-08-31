# Discovery — decouple triage-flow from live Jira connectivity

## Current branch state (`feat/triage-flow-source`, 3 commits, 13 files)
- `.mcp.json` → remote Atlassian MCP (`jira-service-account`, `https://mcp.atlassian.com/v1/mcp`), Bearer token via `agents/jira-mcp-auth-header.sh` (`JIRA_API_TOKEN` env or gitignored local `agents/jira-triage.secrets.json`, absent locally).
- `jira-write` skill: performs live writes (comment/transition/reassign/create/link) via "the configured Issue Tracker integration" — i.e. whatever MCP tools are live in-session. Has its own content-level `dangerous-actions` gate, `POC-SCOPE-OVERRIDE` skipping human confirmation.
- `data-collection` skill (existing, shared) + `references/issue-vendor-binding.md`: same live-integration resolution for reads.
- `triage-flow.md` + 6 phase files: 6-phase stateful cycle (intake → elicitation → completion_check → publish_questions → assess → create_tool_issue), state persisted to `<artifacts_dir>/<TICKET-KEY>/*`. Phase 1 does a **live JQL search + fetch**. Phases 4/5/6 do **live writes**, capturing IDs/keys synchronously into flow-state.
- `agents/jira-triage.config.json`: `jql`, `artifacts_dir` (caller-controlled, already anticipates being pointed at a checked-out dir like `knowledge` — triage-flow.md:23), `orchestrator_model_policy` (`required_tier: opus, enforce: true`), `tool_issue_target`.

## Real production caller — `tools-harness-intake/.github/workflows/triage.yml` (separate repo, already deployed)
- Triggers: `repository_dispatch` (`jira-tools-integration-review`, fired by a Jira Automation webhook — **eligibility is already enforced upstream, at the Jira automation-rule level**, before this repo is even invoked) or manual `workflow_dispatch` with `issue_key` (required) + `tool`/`summary`/`description`/`url` (optional, flat strings — **no comments, no full custom fields, no assignee**).
- `triage` job: deterministic routing via a knowledge-base script (`triage_resolve.py`, unrelated to Jira) + creates a GitHub Projects v2 board card. No Jira reads.
- `requirements-triage` job: runs `anthropics/claude-code-action@v1` with the Rosetta plugin, **`--allowedTools "Read,Glob,Grep,Edit,Write,Agent,Skill"` — no Bash, no MCP** — fully autonomous, `--model sonnet --effort high`. Prompt is **ad hoc inline text**, NOT `/triage-flow`, NOT `jira-write`, NOT `data-collection` — it tells Claude to read `story.md` (pre-written by a bash step from the dispatch payload) and write `requirements.md`/`questions.md` locally. **None of this branch's new content is wired into production today.**
- Deterministic bash+curl+jq step posts the open-questions comment to Jira using `JIRA_BASE_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN` (Basic Auth secrets) — this is the existing, working precedent for "Jira connectivity lives in a GH Action step," already proven in this exact pipeline.
- PR to the knowledge-base repo is opened by a separate deterministic git/PR step — "the agent only writes files; branching & PR are here so they are auditable and the agent never holds push credentials directly." Same principle this plan applies to Jira.
- Board card status updated via `gh project` (deterministic).

## Confirmed decisions (user, this session)
1. Full Jira connectivity (read + write) moves out of the agent entirely — no MCP, no in-session Bash/curl. Matches triage.yml's existing `allowedTools` restriction.
2. Data handoff = files, same shape as triage.yml's existing `story.md` in / `requirements.md`+`questions.md` out pattern.
3. Trigger stays exactly as triage.yml already defines — not redesigned here.
4. Scope: **rosetta repo only**. This plan defines the contract; wiring `triage.yml` to actually call `/triage-flow` and execute the resulting artifacts is separate, cross-repo follow-up work, done later against this contract.

## Repo-history precedent (this repo's own automation)
`CHANGELOG.md:300-303` — this repo's own `repo-analysis`/`repo-plan`/`repo-implement`/`repo-triage` pipelines dropped Atlassian entirely for GitHub Projects v2, explicitly to avoid holding Atlassian credentials in CI. Not directly applicable here (triage-flow targets an external project's real Jira, GitHub Projects can't substitute), but confirms the org's general posture: keep credentialed external-system calls out of the LLM's own tool surface, in deterministic script steps instead. This plan applies that same posture to Jira specifically (jira-write's write ops), not to route away from Jira.

## Consequential design decisions this plan makes (see SPECS for detail)
- **Input file contract**: triage-flow's rewritten intake needs comments + custom fields + assignee — richer than what triage.yml supplies *today*. This is a documented gap for the future Action-side follow-up, not something this plan can close (out of scope). Rosetta-side code fails closed on missing required fields rather than degrading silently.
- **No idempotency redesign needed**: solved for free by the input-file contract (full comment list supplied fresh each invocation) — no need for an author-identity marker scheme.
- **Field/link-type validation regression**: `jira-write` currently pre-validates create/link payloads live (`read create field options`, `read available link types`) before writing. It can no longer do this without a live connection — that validation responsibility moves to the (out-of-scope, future) Action-side execution step. Flagged as residual risk, not solved here.
- **`orchestrator_model_policy.required_tier: opus, enforce: true` contradicts production's actual `--model sonnet`**, and `DEMAND USER SWITCH MODEL` has no human to act on it in unattended CI. Needs a fix regardless of this plan's other scope, since it would hard-block every real invocation today.

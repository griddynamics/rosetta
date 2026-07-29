# Security Skill

Reusable security-review method for coding agents. The skill supplies safety gates, evidence contracts, security-area guidance, and remediation-task templates. `security-flow` supplies ordered orchestration and mandatory canonical subagent assignments.

## Runtime model

- The executing coding agent orchestrates approvals and phases.
- Canonical subagents perform phase work directly.
- `executor` handles bounded mechanical/noisy work.
- Full agents handle reasoning and their own tools.
- The capability prepares coding-flow inputs; it does not remediate.

## Structure

- `SKILL.md` — common method and routing.
- `assets/security-*.md` — progressively loaded area guidance.
- `assets/security-secret-scan.sh` — filename-only fallback scanner.
- `templates/security-*.md|json` — output contracts.
- `../../prompts/security-flow*.md` — entry flow and phases.

## Extension

Keep common rules in `SKILL.md`. Add area-specific inspection, evidence, and safety guidance only to the matching asset. New tool facts must be operational, verified, and dated at runtime.

Do not add security-specific agents. Reuse canonical agents by cognitive fit.

## Validation

- Validate Rosetta frontmatter and references.
- Run shell syntax and fixture tests for the fallback scanner.
- Simulate every safety branch in the Blueprint.
- Trace proposal items SP-01 through SP-26.
- Keep this README at or below 80 lines.

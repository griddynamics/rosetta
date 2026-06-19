---
name: dangerous-actions
description: "Rosetta CRITICAL MUST skill. MUST activate when action or its consequence is potentially dangerous, potentially irreversible, potentially destructive, or HIGH RISK. MUST activate when consequence MAYBE dangerous even if action itself seems safe. This is enterprise environment — the cost of dangerous activities is EXTREMELY HIGH, recovery may be impossible, and blast radius may affect production, shared environments, or other teams. If there is even a remote chance - load the skill."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<dangerous_actions>

<process>

1. Assess BLAST RADIUS before execution.
2. "THINK THE OPPOSITE" — what if this goes wrong?
3. Consider safer alternatives.
4. MUST REQUIRE EXPLICIT user approval for hard-deny tier (see below).

Examples (not limited):

- Deleting data from actual servers
- Using actual servers in unit testing
- git reset, deleting branches, force-push
- Generating destructive scripts or commands
- Modifying shared infrastructure, CI/CD, permissions
- Dropping or truncating database tables

Exceptions (only after blast radius):

5. Application code itself.
6. Just-created data you CAN fully recover.
7. Temporary data without side-effects.

</process>

<pitfalls>

- Assuming local action has no remote consequence.
- Generating destructive commands in scripts without flagging.

</pitfalls>

<hook>

Active in Claude Code, Cursor, Copilot, and Codex. Windsurf: adapter ships but no plugin yet.

An automated PreToolUse hook backs this skill for the highest-blast-radius patterns (Bash destructive commands, file writes to secret paths, DDL payloads in content). The hook is a deterministic tripwire — it does not replace this skill's reasoning process. Use this skill to reason about danger; the hook enforces a last-resort gate if that reasoning is skipped.

## Two-tier policy

All patterns are classified as either **reconsider** (dangerous but recoverable) or **hard-deny** (catastrophic, no bypass exists):

| Tier | Examples | AI behaviour on deny |
|------|---------|----------------------|
| `reconsider` | `rm -rf ./cache`, `git reset --hard`, `git branch -D`, `aws s3 rm --recursive`, DDL in content | Deny with retry instruction; AI may add `Rosetta-AI-reviewed` comment after reconsidering blast radius |
| `hard-deny` | `rm -rf /`, `rm -rf $HOME`, `mkfs`, `dd of=/dev/`, `curl \| sh`, writes to `.env` / SSH keys / AWS credentials / kubeconfig | Permanent block; human review required |

## Threat model

This hook is a **deterministic safety net against accidental destructive intent** — not a security boundary against a determined adversary.

| Protects against | Does not protect against |
|-----------------|--------------------------|
| Accidental `rm -rf /` by AI on the way to its real task | A determined AI with explicit instructions to bypass |
| Human typos in command strings | Prompt injection targeting the override token |
| Unintentional secret file writes | Novel MCP tools with non-standard field names |
| AI self-approving supply-chain attacks (`curl \| sh` is hard-deny) | Agents with OS-level shell access granted by the user |

## Override mechanism — reconsider tier

When the hook denies a `reconsider`-tier pattern:

1. Read the deny message: it explains the pattern, blast radius reason, and retry instructions.
2. Reconsider the blast radius: is the target actually safe? Is there a safer alternative?
3. If the action is genuinely necessary, append `Rosetta-AI-reviewed` as a comment to a **user-visible payload field** and retry:
   - `Bash`: in the `command` field (append as a bash comment)
   - `Write`: in the `content` field (append as an appropriate comment)
   - `Edit`: in the `new_string` field (append as an appropriate comment)
   - `MultiEdit`: in the `new_string` of the relevant `edits[]` entry
   - `MCP`: in `command`, `sql`, `query`, `new_string`, or `content`
4. If unsure about blast radius, stop and ask the user before proceeding.

**Not accepted**: `description`, `comment`, `metadata`, or any field not rendered in the IDE UI. This prevents silent self-assertion via hidden fields.

**Detection**: any occurrence of `Rosetta-AI-reviewed` with word boundaries in a whitelisted field is accepted. Exact case required. Rejected: `Rosetta-reviewed` (old token), `rosetta-ai-reviewed` (lowercase), `Rosetta-AI-reviewedX` (suffix word char).

## Hard-deny tier

`hard-deny` patterns **cannot be bypassed by the `Rosetta-AI-reviewed` marker**. When the hook returns `HARD-DENY`:

1. Stop immediately — do not retry with the marker.
2. Explain the block and blast radius to the user.
3. Propose a safer alternative if one exists.
4. Wait for the human to explicitly confirm before taking any equivalent action.

</hook>

</dangerous_actions>

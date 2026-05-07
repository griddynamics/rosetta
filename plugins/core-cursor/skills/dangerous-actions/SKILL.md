---
name: dangerous-actions
description: "Rosetta CRITICAL MUST skill. MUST activate when action or its consequence is potentially dangerous, potentially irreversible, potentially destructive, or HIGH RISK. MUST activate when consequence MAYBE dangerous even if action itself seems safe. This is enterprise environment — the cost of dangerous activities is EXTREMELY HIGH, recovery may be impossible, and blast radius may affect production, shared environments, or other teams. If there is even a remote chance - load the skill."
tags: []
baseSchema: docs/schemas/skill.md
---

<dangerous_actions>

<process>

1. Assess BLAST RADIUS before execution.
2. "THINK THE OPPOSITE" — what if this goes wrong?
3. Consider safer alternatives.
4. MUST REQUIRE EXPLICIT user approval.

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

Currently active in Claude Code only; rollout to other IDEs is a follow-up.

An automated PreToolUse hook backs this skill for the highest-blast-radius patterns (Bash destructive commands, file writes to secret paths, DDL payloads in content). The hook is a deterministic tripwire — it does not replace this skill's reasoning process. Use this skill to reason about danger; the hook enforces a last-resort gate if that reasoning is skipped.

## Threat model

This hook is a **deterministic safety net against typos and accidental destructive intent** — not a security boundary against the agent itself.

| Protects against | Does not protect against |
|-----------------|--------------------------|
| Accidental `rm -rf /` by AI on the way to its real task | A determined AI with explicit instructions to bypass |
| Human typos in command strings | Prompt injection targeting the override word |
| Unintentional secret file writes | Agents with OS-level shell access granted by the user |

## Override mechanism

Include `reviewed` in a **user-visible field** of the tool call to bypass the block:
- `Bash`: in the `command` field — e.g. `rm -rf /tmp/test  # reviewed`
- `Write`/`Edit`: in `content`, `new_string`, or `file_path`
- `MCP`: in `command`, `sql`, `query`, `new_string`, or `content`

**Not accepted**: `description`, `comment`, `metadata`, or any other field not rendered in the IDE UI. This restriction prevents the agent from silently self-asserting the override via hidden fields.

A 5-second cooldown prevents immediate re-assertion of the override after a deny. Override events are logged to `.claude/audit/hook-overrides.jsonl` for post-hoc review.

</hook>

</dangerous_actions>

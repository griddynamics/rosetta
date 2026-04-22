---
layout: docs
title: Contributing
permalink: /docs/contributing/
---

# Contributing to Rosetta

**Who is this for?** First-time and returning contributors.

**When should I read this?** Before your first PR, and as a checklist for every PR after.

---

## Before You Start

- Read the [Overview](/rosetta/docs/overview/) to understand what Rosetta is
- Understand the [Architecture](/rosetta/docs/architecture/)
- Follow the [Developer Guide](/rosetta/docs/developer-guide/)

## What Contributions Are Welcome

- **Documentation** — fixes, clarifications, new guides
- **Prompt artifacts** — new or improved agents, skills, workflows, rules, templates
- **Tooling** — CLI improvements, MCP enhancements, publishing tools
- **Bug fixes** — in any component
- **Website** — content and layout updates in `docs/web/`
- **Feature requests** — open an issue describing the problem and your proposed solution
- **Feedback** — positive or negative, both matter. Tell us what works well, what frustrates you, what confuses you. File an issue or start a discussion.

Not sure where your idea fits? Open an issue first.

## Fast Path to Your First PR

1. Pick a small, scoped issue (or open one with your proposal)
2. Make focused edits. One concern per PR.
3. Validate locally (build, lint, type validation, verify MCP, checks relevant to your change)
4. Submit a PR with rationale and expected behavioral impact

That's it. Small PRs get reviewed faster and merged sooner.

## Contributing Workflow

```
fork/clone → branch → edit → validate → push → PR
```

- Branch from `main`. Use descriptive branch names.
- Commit messages: short summary line, body if needed. No special format enforced.
- Run local validation before pushing.
- Open a PR against `main`. Fill in the PR template.

See [Overall Development Flow](/rosetta/docs/developer-guide/#overall-development-flow) on how to run, test, build, review, and validate.

## Prompt Changes

Rosetta is a prompt engineering system. Prompt changes have outsized impact and need extra care.

**Use the prompting flow.** The [`coding-agents-prompting-flow`](/rosetta/docs/usage-guide/#workflows) with `coding-agents-prompt-authoring` skill helps you author, design, refactor, harden, and modernize prompt families (agents, skills, workflows, workflow phases, rules). It understands Rosetta internals. Use it with Opus 4.6 model.

> **Note:** The `grid` scope is an enterprise extension not included in this OSS repository. You can access it via Rosetta MCP or by downloading the enterprise instructions package (offline mode).

Examples:

1. Refactoring old rosetta prompt to new:
   ```
   MUST FULLY EXECUTE `instructions/r2/grid/workflows/coding-agents-prompting-flow.md` to refactor old Rosetta prompt `<prompt full path>` as R2 prompt family in `grid` scope.
   ```

2. Creating a new prompt:
   ```
   MUST FULLY EXECUTE `instructions/r2/grid/workflows/coding-agents-prompting-flow.md` to author a new R2 Rosetta <skill/agent/workflow/rule/prompt family> `<name>` in `grid` scope: <description of what it should be>
   ```

**What to include in the PR:**

1. A prompt brief: goal, non-goals, constraints
2. Before/after behavior examples
3. Validation evidence (attach to PR description)

**Automated review pipelines will run on your PR:**

- **Static AI review** validates prompt changes for structure, quality, correctness, and governance
- **Scenario comparison** runs scenarios with old and new prompts, then validates the behavioral difference

Both must pass before merge.

## AI-Assisted Contributions

AI help is welcome. These norms apply:

- **You own the result.** The author is responsible for every line, whether hand-written or generated.
- **No unexplained bulk diffs.** Large generated changes without clear rationale will be sent back.
- **Small PRs.** Prefer reviewable, focused changes over sweeping rewrites.
- **Show the difference.** Prompt, context, and rule changes require before/after behavior examples.
- **No fabrication.** Generated content must not introduce secrets, fake docs, fake benchmarks, or unverifiable claims.

## Pull Request Checklist

Before requesting review:

- [ ] Scope is narrow and explicit
- [ ] No duplicate rules or ambiguous wording introduced
- [ ] Safety, privacy, and approval checkpoints preserved
- [ ] Prompt changes include a brief, examples, and validation evidence
- [ ] Architecture changes update [`docs/ARCHITECTURE.md`](https://github.com/griddynamics/rosetta/blob/main/docs/ARCHITECTURE.md) in the same changeset
- [ ] Local validation passes (build, lint, relevant checks)
- [ ] PR description explains *why*, not just *what*

## Community

This project is licensed under [Apache-2.0](https://github.com/griddynamics/rosetta/blob/main/LICENSE).

Please treat every interaction with respect. No gatekeeping, no condescension.

## Legal

By contributing to this project, you agree to the [Developer Certificate of Origin (DCO) 1.1](https://developercertificate.org/), certifying that you have the right to submit your contribution under the project's license; confirm this by adding a `Signed-off-by` trailer to every commit (e.g., `git commit -s`).

---

## Related Docs

- [Introduction](/rosetta/docs/introduction/) — what Rosetta is, where to start
- [Developer Guide](/rosetta/docs/developer-guide/) — repo navigation, where to change what
- [Architecture](/rosetta/docs/architecture/) — system structure, components, data flow
- [Review Standards](/rosetta/docs/review/) — what reviewers verify, what authors provide
- [Context](/rosetta/docs/context/) — requirements and decisions
- [Usage Guide](/rosetta/docs/usage-guide/) — how to use Rosetta flows
- [Troubleshooting](/rosetta/docs/troubleshooting/) — symptom-first diagnosis

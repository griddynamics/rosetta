# Contributing to Rosetta

**Who is this for?** First-time and returning contributors.
**When should I read this?** Before your first PR, and as a checklist for every PR after.

---

## Before You Start

- Read the [README](README.md) to understand what Rosetta is
- Follow the [Quickstart](QUICKSTART.md) to get a working setup
- Skim the [Developer Guide](DEVELOPER_GUIDE.md) for repo layout and local workflows

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

## Development Workflow

```
fork/clone → branch → edit → validate → push → PR
```

- Branch from `main`. Use descriptive branch names.
- Commit messages: short summary line, body if needed. No special format enforced.
- Run local validation before pushing. The [Developer Guide](DEVELOPER_GUIDE.md) covers build and test commands.
- Open a PR against `main`. Fill in the PR template.

## Prompt Changes

Rosetta is a prompt engineering system. Prompt changes have outsized impact and need extra care.

**Use the prompting flow.** The `coding-agents-prompting-flow` with `coding-agents-prompt-authoring` skill helps you author, design, refactor, harden, and modernize prompt families (agents, skills, workflows, workflow phases, rules). It understands Rosetta internals. Use it with Opus 4.6 model.

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
- [ ] Architecture changes update `docs/ARCHITECTURE.md` in the same changeset
- [ ] Local validation passes (build, lint, relevant checks)
- [ ] PR description explains *why*, not just *what*

## Where to Find Deeper Docs

| Question | Go to |
|---|---|
| How is the repo organized? | [Developer Guide](DEVELOPER_GUIDE.md) |
| How does the system work? | [Architecture](docs/ARCHITECTURE.md) |
| What do reviewers check? | [Review Standards](docs/REVIEW.md) |
| How does context flow? | [Context](docs/CONTEXT.md) |
| Tooling and integrations? | [Tools](docs/TOOLS.md) |
| Something is broken? | [Troubleshooting](TROUBLESHOOTING.md) |

## Community

This project is licensed under [Apache-2.0](LICENSE).

Treat every interaction with respect. No gatekeeping, no condescension.

---

**Related docs:** 

- [README](README.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
- [Review Standards](docs/REVIEW.md)

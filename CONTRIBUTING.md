# Contributing to Rosetta

**Who is this for?** First-time and returning contributors.
**When should I read this?** Before your first PR, and as a checklist for every PR after.

---

## Before You Start

If you haven't already, read [OVERVIEW.md](OVERVIEW.md) to understand what Rosetta is. The [Architecture](docs/ARCHITECTURE.md) is useful background but not required for most contributions. For local dev setup and where things live in the repo, the [Developer Guide](DEVELOPER_GUIDE.md) is the next stop after you've read this file.

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

See [Overall Development Flow](DEVELOPER_GUIDE.md#overall-development-flow) on how to run, test, build, review, and validate.

## Prompt Change PRs

A prompt change changes how AI agents behave across every project that uses Rosetta. There's no compile error and no failing test if you break something — regressions are silent. That's why prompt PRs need evidence of behavior, not just a code-style review.

The PR must include:

1. **A prompt brief** — goal, non-goals, constraints.
2. **Before/after behavior examples** — a prompt run on the old version, the same prompt on the new version, both outputs in the PR.
3. **Validation evidence** — what you ran to confirm the new prompt doesn't regress what the old one did. Attach to the PR description.

Two automated gates run on prompt PRs. Both must pass before merge:

- **Static AI review** — checks the prompt file for structural problems (missing schema sections, broken frontmatter, missing required tags) before a human reviews it.
- **Scenario comparison** — runs the same scenarios against the old prompt and your new prompt, then shows the behavioral diff so the reviewer can see what actually changed.

For *how* to author the prompt change itself (which workflow to use, which model, concrete invocations), see [Developer Guide → step 2 of Overall Development Flow](DEVELOPER_GUIDE.md#overall-development-flow).

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
- [ ] Architecture changes update [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) in the same changeset
- [ ] Local validation passes (build, lint, relevant checks)
- [ ] PR description explains *why*, not just *what*

## Community

This project is licensed under [Apache-2.0](LICENSE).

Please treat every interaction with respect. No gatekeeping, no condescension.

## Legal

By contributing to this project, you agree to the [Developer Certificate of Origin (DCO) 1.1](https://developercertificate.org/), certifying that you have the right to submit your contribution under the project’s license; confirm this by adding a `Signed-off-by` trailer to every commit (e.g., `git commit -s`).

---

## Related Docs

- [README](README.md) — what Rosetta is, where to start
- [Developer Guide](DEVELOPER_GUIDE.md) — repo navigation, where to change what
- [Architecture](docs/ARCHITECTURE.md) — system structure, components, data flow
- [Review Standards](REVIEW.md) — what reviewers verify, what authors provide
- [Context](docs/CONTEXT.md) — requirements and decisions
- [Usage Guide](USAGE_GUIDE.md) — how to use Rosetta flows
- [Troubleshooting](TROUBLESHOOTING.md) — symptom-first diagnosis

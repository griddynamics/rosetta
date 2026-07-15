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
- **Feedback** — positive or negative, both matter. Tell us what works well, what frustrates you, what confuses you. File an issue or start a discussion. Whenever a run fails, frustrates you, or shows anything you'd like improved, the `post-mortem` skill can root-cause it and draft a sanitized issue for you — it submits only with your explicit approval.

Not sure where your idea fits? Open an issue first.

## How to Contribute

1. Pick a small, scoped issue (or open one with your proposal)
2. Make focused edits. One concern per PR.
3. Validate locally (build, lint, type validation, verify MCP, checks relevant to your change)
4. Submit a PR with rationale and expected behavioral impact

That's it. Small PRs get reviewed faster and merged sooner.

For the full sequence — setup, development, testing, validation, and PR submission — see [Overall Development Flow](/rosetta/docs/developer-guide/#overall-development-flow).

## Prompt Changes

Prompt changes have outsized impact and need extra care. A prompt change modifies how AI agents behave across every project that uses Rosetta.

For the full process — which workflow to run, which model to use, the concrete invocations, what to include in the PR, and the automated review pipelines — see [Developer Guide → Overall Development Flow (step 2)](/rosetta/docs/developer-guide/#overall-development-flow).

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

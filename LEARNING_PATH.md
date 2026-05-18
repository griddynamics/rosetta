# Learning Path

**Who is this for?** New contributors and evaluators coming up to speed on Rosetta.
**When should I read this?** Right after you've cloned the repo and want to know what to read in what order.

---

## 1. What Rosetta is — 10 minutes

Read [README.md](README.md). Covers what Rosetta is, who it's for, and how to install it.

## 2. Terminology — 5 minutes

Read [TERMINOLOGY.md](TERMINOLOGY.md). Locks in the difference between **skill**, **workflow**, **subagent**, **rule**, **bootstrap**, **hook**, and the rest. Confusing these is the most common newcomer mistake — don't skip it.

## 3. Mental model — 15 minutes

Read [OVERVIEW.md](OVERVIEW.md). Design principles, three-layer architecture, session lifecycle, and what Rosetta does *not* do.

## 4. Architecture — 30 minutes

Read [ARCHITECTURE.md](docs/ARCHITECTURE.md). System components, MCP server, Rosetta Server (RAGFlow), CLI, and how instructions flow from repo to IDE.

## 5. Try it — 15 minutes

Install Rosetta per [QUICKSTART.md](QUICKSTART.md). Run `Initialize this repository using Rosetta` on a small repo and watch the eight-phase init workflow.

## 6. Make your first change — 30 minutes

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md). Pick a small open issue or doc fix and submit a PR.

---

## Common confusions

- **Skill vs subagent** — A skill is a reusable unit of work loaded on demand; a subagent is a delegated specialist with its own fresh context. See [TERMINOLOGY.md](TERMINOLOGY.md).
- **Workflow vs command** — Same thing. Alias.
- **Agent vs subagent** — Same thing. Alias.
- **R2 vs R3** — R2 is the current stable release on `main`. R3 is in development on the `V3` branch. See [FAQ.md](FAQ.md).
- **MCP mode vs plugin mode** — Two delivery paths, same instruction content. Plugin is preferred (no network at request time); MCP is the fallback for IDEs without a plugin.

## Need help?

- [FAQ.md](FAQ.md) for common questions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) when something's not working
- [Discord](https://discord.gg/QzZ2cWg36g)

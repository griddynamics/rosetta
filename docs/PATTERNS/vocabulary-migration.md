# Vocabulary Migration

When the command vocabulary changes (aliases renamed, dropped, or added; files renamed), sync every documentation surface with one mechanical sweep instead of per-file judgment.

## When to Use

- An alias, skill, rule, or mode file is renamed or removed from the closed vocabulary contract.
- A release supersession makes docs reference the previous release's terms.

## The Three Rules

Classify every hit, then act:

1. **Teaching text → convert.** Text that tells a reader or agent what to type (install steps, download links, authoring one-liners, tool descriptions, FAQ examples) is rewritten to the current closed vocabulary.
2. **Mechanism text → keep.** Text that documents machinery whose content genuinely contains the old form (generated MCP shells use `ACQUIRE … FROM KB` verbatim; mode files bind aliases) stays — converting it would make the doc lie about what is on disk.
3. **Dated records → out of scope.** Reviews, change logs, and anything with a date in its header are records; never resync them.

## Sweep Mechanics

- Grep set (extend per change): `ACQUIRE|FROM KB|IN KB|bootstrap\.md|load-context|load-workflow|orchestrator-contract|operation-manager|todo-tasks-fallback|subagent-contract`
- Exclude build outputs (`docs/web/_site`, `docs/web/vendor`) — gitignored, regenerated.
- Surfaces are paired: `docs/*.md` is primary, `docs/web/docs/*.md` is the website — address both similarly. Exact mirrors (root `REVIEW.md` ↔ `docs/web/docs/review.md`) must not diverge.
- Result must be state-only: no "renamed from", "removed", or "was previously" annotations — removed means removed.
- Verify: re-run the grep set; remaining hits must all be rule-2 mechanism sites.

## Occurrences

- W4 alias sweep (~200 sites / 59 files) and the r3-publish batch (`on-v3-release`, PR #130) — both applied these rules.

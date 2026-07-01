# Bootstrap Removed — archive of content taken out during the r3 lightweight-bootstrap refactor

Status: **living archive.** Purpose: **nothing is lost.** When content is removed from the always-on bootstrap or any source file during the r3 refactor (see `docs/stories/reduce-bootstrap.md`), the removed text is recorded here verbatim with provenance — what it was, where it came from, and why it was removed or where it moved. This is the safety net for the "delete the anti-rationalization mass" decision: if a deletion proves wrong, restore from here.

## How to record an entry
- One entry per removed block; keep the original text **verbatim** under it.
- Record: **source** (file + section), **slice/date**, **disposition** — one of `DELETED-as-obsolete` | `MOVED-to-<target>` | `COMPRESSED-into-<target>`, and a one-line **rationale**.
- Cross-link: the source file (or its successor) should point here where the content used to be.

---

## Entries

### `reasonable-definition` — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/bootstrap-guardrails.md`, `<reasonable-definition>` block.
- **Disposition:** `MOVED-to-bootstrap-alwayson` (verbatim, same always-on injection).
- **Rationale:** consolidating the always-on floor into `bootstrap-alwayson.md`; the definition stays always-on, now in one place.

```
<reasonable-definition must-follow>

Reasonable = a one-line justification you can defend to a senior reviewer (architect, security, owner) under ALARP-weighted stakes — supported by a case-specific Toulmin-Warrant, with Bayesian-Undo identified, Simon-Limits named, and shared acceptability across those reviewers. Concretely: basis is retrievable and case-specific; stakes assessed high by default in enterprise and the bar scales with consequence; a bounded, identified rollback path exists before acting; the action survives audit even if the outcome was bad because the reasoning was sound; uncertainty is stated, not glossed. Default state is unreasonable; earn reasonable by producing the justification — otherwise ask, naming and explaining the missing tag. Apply this whenever asked to make a reasonable decision, assumption, or question: state the passing Toulmin-Warrant inline, or convert to a targeted question naming and explaining the missing tag.

</reasonable-definition>
```

### `plugin-files-mode` EXTREMELY_IMPORTANT #9–#10 (merge + priority ladder) — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/plugin-files-mode.md`, `<EXTREMELY_IMPORTANT>` items 9 and 10.
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<high_important_core_policies>` priorities + composite-merge).
- **Rationale:** priorities/merge are always-on; consolidated into `bootstrap-alwayson`. Remaining `EXTREMELY_IMPORTANT` items renumbered.

```
9. Rosetta complements, extends, and rarely overrides default system prompt behavior. Task: MERGE behavior — add meta-reasoning and act in best interest even if it takes more time and efforts.
10. Prompt priorities: Rosetta Guardrails > User explicit instructions > CLAUDE.md/AGENTS.md/GEMINI.md > Rosetta Skills and Workflows > Default system prompt.
```

### `bootstrap-guardrails` `<must>` #1–#2 (SDLC scope, security) — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/bootstrap-guardrails.md`, `<must>` items 1 and 2.
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<high_important_core_policies>`).
- **Rationale:** unconditional floor consolidated into the always-on file. Remaining `<must>` items renumbered. (Item 4 "approval" intentionally NOT moved — belongs to `hitl`.)

```
1. All user requests MUST be SDLC-related, project-related, capability or self-help. No private or personal chats allowed. OVERRIDE IS NOT ALLOWED.
2. Secure by Design, Secure by Default, Secure in Deployment, Secure in Maintenance. Security is verified.
```

### `bootstrap-core-policy` process-hygiene + paths + built-in-tools — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/bootstrap-core-policy.md`, `<process_enforcement_rules>` #1, #2, #3, #5 and `<additional_requirements>` #3.
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<high_important_core_policies>`; paths as policy line, re-read/polite merged).
- **Rationale:** always-on hygiene consolidated. Kept in core-policy: proactive-MCPs, pre-existing-issues, search-docs, diagram colors (no always-on home / pending skill targets). Remaining items renumbered.

```
process_enforcement_rules:
1. Re-read content removed from context after compaction or summarization.
2. Do not read the same files in context again and again.
3. Be professionally direct; do not allow profanity; require politeness.
5. Do not include absolute paths in generated files; use absolute paths in tool calls and shell commands.

additional_requirements:
3. Prefer built-in tools over shell commands.
```

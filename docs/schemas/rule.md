---
# Core Identity (Required) — keep these live, replace the <...> value
name: "<rule name; MUST match the file name without extension>"
description: "Rules for <what they govern + when they apply; dense keywords; MUST be < ~15 tokens>"
# alwaysApply — keep false; true injects this into EVERY context (bloat); set true ONLY with explicit user approval [boolean] [Cursor]
alwaysApply: false

# Activation (Optional — uncomment the field(s) for your target platform)
# globs — file patterns (glob) where the rule applies, comma-separated [string] [Cursor, Antigravity] [ex: "**/*.js, **/*.ts"]
# globs: "**/*.ts"
# paths — file patterns (glob) where the rule applies, comma-separated [string] [Claude Code, Windsurf] [ex: "**/*.js, **/*.ts"]
# paths: "**/*.ts"
# trigger — controls when the rule activates [string] [Antigravity] [ex: glob]
# trigger: "glob"

# Knowledge Base Tags — shared tag bundles related artifacts; publisher auto-adds parent-folder + file-name tags; remove if empty [array] [ex: ["tag-1", "tag-2"]]
tags: []

# do not remove baseSchema!
baseSchema: docs/schemas/rule.md
---

[ONLY FOR TEMPLATE EXECUTOR: imperative bullet points, shorter lines, distinguish references to repository files vs instructions; skill/subagent names will be in context already, so just reference it. the rest of instruction folder files: rules/templates/workflows/assets/subfolders of skill/etc must be ACQUIRE'd / SEARCH'd / LIST'd to be used]

<[the_rule_name]>

[The rules should be divided into following categories depending on their importance. Remember that the category impacts the probability that the rule will affect the result. Any of the categories can be left empty. Define a problem and retrospectively introspectively validation proof that this prompt actually solves the problem. Reference entire sections in must/should/could if present.]

<must>

[required]

1.
2.
...

</must>

<should>

[optional]

1. 
2.
...

</should>

<could>

[optional, likely is not even needed]

1.
2.
...

</could>

<core_concepts>

[Optional section, KEEP THIS VERY SHORT, describes the fundamental concepts, principles, definitions and explanations required for the rule]

</core_concepts>

<[additional_section]>

[Optional additional section]

</[additional_section]>

<best_practices>

[Optional section, list recommended practices, tips, and guidelines for effectively using this rule]

</best_practices>

<pitfalls>

[Optional section, KEEP THIS VERY SHORT, do NOT repeat, provide unexpected mistakes, edge cases, caveats, unusual behavior, errors, gotchas, traps, non-obvious patterns or issues to take into account or avoid]

</pitfalls>

<notes>

[Optional section, any additional information that needs to be added.]

</notes>

</[the_rule_name]>

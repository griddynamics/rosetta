---
name: "<template name; MUST match the file name without extension>"
description: "<what it is + what it produces; dense keywords; MUST be < ~15 tokens>"
# alwaysApply — keep false; true injects this into EVERY context (bloat); set true ONLY with explicit user approval [boolean] [Cursor]
alwaysApply: false

# Knowledge Base Tags — shared tag bundles related artifacts; publisher auto-adds parent-folder + file-name tags; remove if empty [array] [ex: ["tag-1", "tag-2"]]
tags: []

# do not remove baseSchema!
baseSchema: docs/schemas/template.md
---

[ONLY FOR TEMPLATE EXECUTOR: imperative bullet points, shorter lines, distinguish references to repository files vs instructions; skill/subagent names will be in context already, so just reference it. the rest of instruction folder files: rules/templates/workflows/assets/subfolders of skill/etc must be ACQUIRE'd / SEARCH'd / LIST'd to be used]

<[the_template_name]>

<description>

[KEEP THIS VERY SHORT. The purpose of the template, define a problem and retrospectively introspectively validation proof that this prompt actually solves the problem]

</description>

<guidelines>

[Optional, KEEP THIS VERY SHORT. Guidelines for proper template filling]

</guidelines>

<template>

[The template itself]

</template>

</[the_template_name]>

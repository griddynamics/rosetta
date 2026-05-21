---
name: [Workflow Name, must match file name without extension]
description: [Brief description of WHEN and HOW to use this workflow and WHAT it does]

# Knowledge Base Tags (use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!ß
baseSchema: docs/schemas/workflow.md
---

<[workflow_name]>

<description>
[Brief description of the workflow purpose]
</description>

<prerequisites>
- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
</prerequisites>

<instructions>
MUST ACQUIRE `commands/<workflow-name>.md` FROM KB and FULLY EXECUTE EXACTLY, ALL PHASES AND STEPS, USING SUBAGENTS AS DEFINED
</instructions>

</[workflow_name]>

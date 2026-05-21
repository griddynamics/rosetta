---
name: pa-change-log
description: Prompt authoring change log template in XML entry format
---

<pa-change-log>

<description>

Keeps change log of prompt authoring skill for clarity with user.

</description>

<guidelines>

Retrospectively fill in content by following instructions in square brackets.
Store only in one file change-log.md in FEATURE PLAN folder.
Do not spread change notes across other artifacts.
Also show concise summary to user.

</guidelines>

<template>

```xml
<kept>[what stayed identical]</kept>
<removed>[what was redundant or out-of-scope]</removed>
<added>[what was missing for correctness]</added>
<clarified>[ambiguities resolved]</clarified>
<assumptions>[explicit assumptions made]</assumptions>
<risks_hitl>[gates added or updated]</risks_hitl>
```

</template>

</pa-change-log>

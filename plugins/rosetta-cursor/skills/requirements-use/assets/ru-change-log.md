---
name: ru-change-log
description: Requirements-use change log template in XML tag format
---

<ru-change-log>

<description>

Keep change log of requirement-use interpretation and coverage decisions.

</description>

<guidelines>

Retrospectively fill in content by following instructions in square brackets.
Only show this to user, do not save in documents.

</guidelines>

<template>

```xml
<kept>[what requirement interpretation stayed identical]</kept>
<removed>[what scope or mapping was removed]</removed>
<added>[what missing mapping or evidence was added]</added>
<clarified>[ambiguities resolved in requirement use]</clarified>
<assumptions>[explicit assumptions approved by user]</assumptions>
<risks_hitl>[gates added or updated]</risks_hitl>
```

</template>

</ru-change-log>

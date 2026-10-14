---
name: ra-change-log
description: Requirements change log template in XML entry format
---

<ra-change-log>

<description>

Keep change log of requirements updates for clear user review.

</description>

<guidelines>

Retrospectively fill in content by following instructions in square brackets.
Only show this to user, do not save in documents.

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

</ra-change-log>

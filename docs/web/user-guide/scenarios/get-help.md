---
layout: user-guide
title: Get help
permalink: /user-guide/scenarios/get-help/
---

# Get help
**Command:** `/help-flow` · *[← All scenarios](/rosetta/user-guide/#scenarios-at-a-glance) · [User guide](/rosetta/user-guide/)*

> A conversational way to discover what Rosetta can do and pick the right workflow — and hand off straight into it when you're ready.

**Use this when** you're not sure what's available or which scenario fits: *"what can you do?"*, *"how do I run a security review?"*, *"what workflows are there for testing?"*

## Running it

```text
/help-flow What can you do?
/help-flow How do I run a security review with Rosetta?
/help-flow What workflows are available for testing?
```

## How it works

It's a conversation, not an implementation. It lists the available workflows, skills, and agents, matches them to what you're asking, explains how to use the best fit, and can switch directly into that workflow when you decide to act.

{% raw %}
```mermaid
flowchart TB
    Start(["/help-flow + your question"]) --> List["List capabilities"]
    List --> Match["Match to your request"]
    Match --> Guide["Explain how to use the best fit"]
    Guide --> Ready{"Ready to act?"}
    Ready -->|need more info| Match
    Ready -->|not yet| Done(["Guidance only"])
    Ready -->|yes| Handoff["Hand off into that workflow"]
    Handoff --> Done2(["Chosen workflow starts"])

    classDef step fill:#dae8ff,stroke:#3674b5,color:#102a43;
    classDef gate fill:#fff2cc,stroke:#b58b00,color:#493800;
    classDef done fill:#e5f7e8,stroke:#35834a,color:#153b20;
    class List,Match,Guide,Handoff step;
    class Ready gate;
    class Start,Done,Done2 done;
```
{% endraw %}

When a workflow and a skill overlap, it recommends the **workflow** — that's the intended entry point for real work.

## A note on the command

`/help-flow` is the current command. You may see `/self-help-flow` referenced in older material — it's the deprecated alias and still works, but prefer `/help-flow`.

There's also `/aqa-flow`, a small **router** for test automation: give it any testing request and it dispatches to [UI](/rosetta/user-guide/scenarios/automate-ui-tests/), [API](/rosetta/user-guide/scenarios/automate-api-tests/), or [test-case generation](/rosetta/user-guide/scenarios/generate-test-cases/) — handy when you're not sure which of the three you need.

## What it creates

Nothing — it's purely informational. The workflow it hands off to owns any files.

## Related

The full menu is the [Scenarios index](/rosetta/user-guide/#scenarios-at-a-glance) and the visual [workflow map](/rosetta/user-guide/workflow-map/).

## Sources

- Workflow: [`instructions/r3/core/workflows/help-flow.md`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/workflows/help-flow.md?plain=1)
- Router: [`aqa-flow.md`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/workflows/aqa-flow.md?plain=1)


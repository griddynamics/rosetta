---
layout: user-guide
title: Research a question
permalink: /user-guide/scenarios/research/
---

# Research a question
**Command:** `/research-flow` · *[← All scenarios](/rosetta/user-guide/#scenarios-at-a-glance) · [User guide](/rosetta/user-guide/)*

> Systematic, grounded investigation tied to your project — the agent first writes the research prompt (which you approve), then runs it and produces a documented answer.

**Use this when** you need deep investigation or a technology comparison before choosing an approach, grounded in your project's context.

**Not for:** simple lookups or single-source questions — just ask the agent directly.

## Running it

```text
/research-flow Compare event sourcing vs CRUD for our order service
/research-flow Investigate OAuth 2.0 implementation options for our stack
/research-flow Research vector database options for our RAG pipeline
```

## How it works

The twist is **meta-prompting**: the agent doesn't research off your one-line question. It crafts a focused research prompt, shows it to you (because that prompt controls what gets answered), and only then runs a dedicated research pass that weighs multiple options.

{% raw %}
```mermaid
flowchart TB
    Start(["/research-flow + question"]) --> Ctx["Load project context"]
    Ctx --> Craft["Craft a research prompt"]
    Craft --> G1{"You approve <br>the research prompt"}
    G1 -->|revise| Craft
    G1 -->|approve| Run["Run the research pass <br>(&ge;3 options, grounded)"]
    Run --> SV{"Self-validation: <br>gaps remaining?"}
    SV -->|yes| Run
    SV -->|no| Final["Finalize the write-up"]
    Final --> Done(["docs/&lt;feature&gt;-research.md"])

    classDef step fill:#dae8ff,stroke:#3674b5,color:#102a43;
    classDef gate fill:#fff2cc,stroke:#b58b00,color:#493800;
    classDef done fill:#e5f7e8,stroke:#35834a,color:#153b20;
    class Ctx,Craft,Run,Final step;
    class G1,SV gate;
    class Start,Done done;
```
{% endraw %}

It prioritizes accuracy over speed, compares at least three options, and ends with a self-validation pass. It won't touch your `CONTEXT.md` / `ARCHITECTURE.md` — it only produces the research document.

## What you'll be asked to do

Review and approve the **research prompt** before the research runs — this is your lever on what the investigation will and won't cover. Answer any questions it raises about assumptions.

## What it creates

`plans/<feature>/research-prompt.md` (the approved direction) and the final `docs/<feature>-research.md`, plus a state file.

## Related

[Analyze a codebase](/rosetta/user-guide/scenarios/analyze-a-codebase/) for internal investigation · [Write or change code](/rosetta/user-guide/scenarios/coding/) to act on the findings.

Prerequisites: documentation search tools (DeepWiki, Context7).

## Sources

- Workflow: [`instructions/r3/core/workflows/research-flow.md`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/workflows/research-flow.md?plain=1)
- Skills: [`research`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/research/SKILL.md?plain=1), [`reasoning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/reasoning/SKILL.md?plain=1)


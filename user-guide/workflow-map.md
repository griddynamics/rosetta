# Rosetta workflow map

[User guide](README.md) › Workflow map

Start from what you want to do, follow it to the right scenario, and see the shape every scenario shares. Boxes in **amber** are the moments a workflow stops and waits for your approval.

## 1. What do I want to do?

Find your task on the left, follow the arrows to a command. Open any command's scenario page from [Jump to a scenario](#3-jump-to-a-scenario) below.

```mermaid
flowchart TB
    Work(["New work<br/>or a question"]) --> Q{"What do I<br/>want to do?"}

    Q -->|"set up a repo for AI"| Init["Initialize workspace<br/>(ask in plain language)"]
    Q -->|"not sure"| Help["/help-flow"]

    Q ==>|"build or change something"| Build{{"Build / change"}}
    Build -->|"I know what to change"| Coding["/coding-flow"]
    Build -->|"pin down behavior first"| Reqs["/requirements-authoring-flow"]
    Build -->|"small or unusual chore"| Adhoc["/adhoc-flow"]

    Q ==>|"understand something"| Understand{{"Understand"}}
    Understand -->|"this codebase"| Analysis["/code-analysis-flow"]
    Understand -->|"options or technology"| Research["/research-flow"]

    Q ==>|"test something"| Test{{"Test / QA"}}
    Test -->|"design cases from a ticket"| TestGen["/testgen-flow"]
    Test -->|"automate a UI test"| UI["/ui-aqa-flow"]
    Test -->|"automate an API test"| API["/api-aqa-flow"]

    Q ==>|"transform or migrate"| Transform{{"Transform"}}
    Transform -->|"migrate or upgrade"| Modern["/modernization-flow"]
    Transform -->|"teach the agent a library"| ExtLib["/external-lib-flow"]

    Q ==>|"govern quality"| Govern{{"Govern"}}
    Govern -->|"security review"| Sec["/security-flow"]
    Govern -->|"author agent prompts"| Prompt["/coding-agents-prompting-flow"]

    classDef cmd fill:#dae8ff,stroke:#3674b5,color:#102a43,stroke-width:1.5px;
    classDef cat fill:#f4ddff,stroke:#884ea0,color:#351044,stroke-width:1.5px;
    classDef entry fill:#e5f7e8,stroke:#35834a,color:#153b20;
    classDef decide fill:#fff2cc,stroke:#b58b00,color:#493800,stroke-width:1.5px;
    class Init,Help,Coding,Reqs,Adhoc,Analysis,Research,TestGen,UI,API,Modern,ExtLib,Sec,Prompt cmd;
    class Build,Understand,Test,Transform,Govern cat;
    class Work entry;
    class Q decide;
```

**Legend:**

- 🟢 **Green** — where you start
- 🟡 **Amber** — a decision / your approval
- 🟣 **Purple** — category
- 🔵 **Blue** — a command

> **Tip:** if the diagram doesn't route you cleanly, just ask your agent `/help-flow What should I use to …` and it will point you to the right scenario.

## 2. How the process works

Whichever scenario you pick, the work follows the same five phases — **Prepare → Research → Plan → Act → Validate** — with approval gates where your judgment matters. *Prepare* happens once when you set up the repo; the rest repeats for every task.

```mermaid
flowchart LR
    Prep["Prepare<br/><small>once, at setup</small>"] --> Classify["Classify<br/>your request"]
    Classify --> Research["Research<br/>gather context"]
    Research --> Plan["Plan<br/>specs &amp; approach"]
    Plan --> G1{"You approve<br/>the plan"}
    G1 -->|approve| Act["Act<br/>implement"]
    Act --> Validate["Validate<br/>review &amp; actually run it"]
    Validate --> G2{"You approve<br/>the result"}
    G2 -->|approve| Done(["Shipped"])
    G2 -->|issues found| Research

    classDef step fill:#dae8ff,stroke:#3674b5,color:#102a43;
    classDef gate fill:#fff2cc,stroke:#b58b00,color:#493800;
    classDef done fill:#e5f7e8,stroke:#35834a,color:#153b20;
    class Prep,Classify,Research,Plan,Act,Validate step;
    class G1,G2 gate;
    class Done done;
```

> Bigger tasks add independent reviewer and validator subagents and more gates; small tasks collapse the gates and skip the heavy checks. The agent won't move past an amber gate without a clear go-ahead from you.

## 3. Jump to a scenario

### Build & change

| Scenario | Command |
| --- | --- |
| [Write or change code](scenarios/coding.md) | `/coding-flow` |
| [Author requirements](scenarios/requirements.md) | `/requirements-authoring-flow` |
| [Ad-hoc task](scenarios/adhoc-task.md) | `/adhoc-flow` |

### Test & QA

| Scenario | Command |
| --- | --- |
| [Generate test cases](scenarios/generate-test-cases.md) | `/testgen-flow` |
| [Automate UI tests](scenarios/automate-ui-tests.md) | `/ui-aqa-flow` |
| [Automate API tests](scenarios/automate-api-tests.md) | `/api-aqa-flow` |

### Understand

| Scenario | Command |
| --- | --- |
| [Analyze a codebase](scenarios/analyze-a-codebase.md) | `/code-analysis-flow` |
| [Research a question](scenarios/research.md) | `/research-flow` |

### Transform

| Scenario | Command |
| --- | --- |
| [Modernize / migrate](scenarios/modernize.md) | `/modernization-flow` |
| [Onboard a library](scenarios/onboard-a-library.md) | `/external-lib-flow` |

### Govern quality

| Scenario | Command |
| --- | --- |
| [Review security](scenarios/security-review.md) | `/security-flow` |
| [Author agent prompts](scenarios/author-agent-prompts.md) | `/coding-agents-prompting-flow` |

### Not sure?

| Scenario | Command |
| --- | --- |
| [Get help](scenarios/get-help.md) | `/help-flow` |

---

Part of the [Rosetta user guide](README.md). New here? Start with [What is Rosetta?](01-what-is-rosetta.md) · [Install](02-install.md) · [Set up your repo](03-initialize-your-repository.md).

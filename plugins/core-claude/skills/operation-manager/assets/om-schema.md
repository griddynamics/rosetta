# Plan JSON Schema Reference

## Data Structure

```
plan:
  name: str                    # required
  description: str             # default: ""
  status: StatusEnum           # derived bottom-up, never set directly
  created_at: ISO8601          # set on create
  updated_at: ISO8601          # updated on every write
  phases[]:
    id: str                    # required, unique across entire plan
    name: str                  # required
    description: str           # default: ""
    status: StatusEnum         # derived from steps
    depends_on: [phase-id]     # default: []
    subagent: str              # optional
    role: str                  # optional
    model: str                 # optional
    steps[]:
      id: str                  # required, unique across entire plan
      name: str                # required
      prompt: str              # required
      status: StatusEnum       # default: open
      depends_on: [step-id]    # default: [], cross-phase allowed
      subagent: str            # optional
      role: str                # optional
      model: str               # optional
```

## Status Enum

`open | in_progress | complete | blocked | failed`

## Status Propagation (Bottom-Up)

Steps → Phases → Plan root. Plan root status is always derived; never set directly.

| Children condition | Derived status |
|---|---|
| All `complete` | `complete` |
| Any `failed` | `failed` |
| Any `blocked` | `blocked` |
| Any `in_progress` or `complete` | `in_progress` |
| Otherwise | `open` |

## Dependency Rules

- `depends_on` at step level: list of step IDs (cross-phase allowed)
- `depends_on` at phase level: list of phase IDs
- A step/phase is eligible only when all `depends_on` IDs have `status: complete`
- IDs must be unique across the entire plan (phases and steps share a single namespace)

## Constants

| Constant | Limit |
|---|---|
| Max phases per plan | 100 |
| Max steps per phase | 100 |
| Max deps per item | 50 |
| Max string field length | 20000 chars |
| Max name field length | 256 chars |

## Minimal Plan Example

```json
{
  "name": "my-plan",
  "description": "Simple example",
  "status": "open",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "phases": []
}
```

## Full Plan Example

```json
{
  "name": "feature-x",
  "description": "Implement feature X end-to-end",
  "status": "in_progress",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-02T12:00:00.000Z",
  "phases": [
    {
      "id": "ph-1",
      "name": "Design",
      "description": "Create technical specs",
      "status": "complete",
      "depends_on": [],
      "steps": [
        {
          "id": "s-1",
          "name": "Write tech specs",
          "prompt": "Write technical specs for feature X covering API, data model, and edge cases.",
          "status": "complete",
          "depends_on": []
        }
      ]
    },
    {
      "id": "ph-2",
      "name": "Implementation",
      "description": "Code the feature",
      "status": "in_progress",
      "depends_on": ["ph-1"],
      "subagent": "engineer",
      "role": "Senior software engineer",
      "model": "claude-sonnet-4-6",
      "steps": [
        {
          "id": "s-2",
          "name": "Implement API endpoint",
          "prompt": "Implement the REST API endpoint for feature X per the tech specs in plans/feature-x/plan.json step s-1.",
          "status": "in_progress",
          "depends_on": ["s-1"]
        },
        {
          "id": "s-3",
          "name": "Implement data layer",
          "prompt": "Implement the data model and repository layer for feature X.",
          "status": "open",
          "depends_on": ["s-1"]
        }
      ]
    }
  ]
}
```

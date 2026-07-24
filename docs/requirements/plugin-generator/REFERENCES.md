# plugin-generator — References (Authoritative IDE Configuration Docs)

Any coding agent working on, or consuming, these requirements must treat the per-IDE guides under `instructions/r3/core/configure/` as the authoritative source for each supported IDE's plugin / subagent / skill / command / rule / hook structure, conventions, and external links. Per-target behavior in these requirements is grounded in those guides; when in doubt, the guide wins for that IDE's format.

## Supported IDEs and their guides

| IDE | Guide | Documents |
|---|---|---|
| Claude Code | `instructions/r3/core/configure/claude-code.md` | Commands, subagents, skills, plugins, rules, structure |
| Cursor | `instructions/r3/core/configure/cursor.md` | Rules, subagents, skills, commands, file structure |
| GitHub Copilot | `instructions/r3/core/configure/github-copilot.md` | Agents, skills, prompts, plugins, instructions |
| Codex | `instructions/r3/core/configure/codex.md` | Subagents, skills, rules, hooks, structure |
| Antigravity | `instructions/r3/core/configure/antigravity.md` | IDE configuration conventions |
| JetBrains Junie | `instructions/r3/core/configure/jetbrains-junie.md` | IDE configuration conventions |
| OpenCode | `instructions/r3/core/configure/opencode.md` | IDE configuration conventions |
| Windsurf | `instructions/r3/core/configure/windsurf.md` | IDE configuration conventions |

The generator produces targets for a subset (Claude, Cursor, Copilot, Codex + their standalones, and Antigravity); the guides cover the broader set of IDEs Rosetta intends to support.

## Requirements

<req id="INT-IDE-0001" type="INT" level="System" ticketId="" classification="technical">
  <title>Consult the authoritative IDE guide before encoding target behavior</title>
  <statement>When implementing, modifying, or consuming these requirements, the agent shall consult the corresponding `instructions/r3/core/configure/<ide>.md` guide before encoding or changing a target's plugin, subagent, skill, command, rule, or hook behavior.</statement>
  <rationale>IDE conventions change and are owned by those guides; deriving target behavior from them prevents drift and incorrect formats.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a change to a target's structure or hook behavior When: proposed Then: it is traceable to the corresponding IDE guide.</criteria>
    <criteria>Given: a target whose guide is absent When: implementation is attempted Then: the agent stops and raises the missing guide rather than guessing the IDE format.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="INT-IDE-0002" type="INT" level="System" ticketId="" classification="technical">
  <title>Guides are authoritative for layout, frontmatter, and bootstrap capability</title>
  <statement>For each supported IDE target, the agent shall treat its guide as the authoritative source for the IDE's required file layout, frontmatter fields, and bootstrap-delivery capability — including whether the IDE natively auto-loads rules or instructions versus requiring session-start hooks — and for relevant external links.</statement>
  <rationale>The bootstrap-delivery strategy and structural shape of each target derive directly from each IDE's documented capabilities.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a target's bootstrap-delivery strategy When: determined Then: it matches the capability documented in that IDE's guide.</criteria>
    <criteria>Given: a target's file layout or frontmatter When: produced Then: it conforms to that IDE's guide.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>INT-IDE-0001</depends>
</req>

<req id="INT-IDE-0003" type="INT" level="System" ticketId="" classification="technical">
  <title>New IDE support starts from its guide</title>
  <statement>When adding a new IDE target, the agent shall first obtain or author that IDE's guide under `instructions/r3/core/configure/` and derive the target's descriptor from it.</statement>
  <rationale>Keeps the configuration-driven design grounded: a target is defined by documented IDE conventions, not ad-hoc assumptions.</rationale>
  <source>User</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a request to add a new IDE target When: started Then: the IDE's guide exists and the descriptor traces to it.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>INT-IDE-0001</depends>
</req>

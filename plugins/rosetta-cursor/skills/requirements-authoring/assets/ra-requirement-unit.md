---
name: ra-requirement-unit
description: Canonical atomic requirement unit template
---

<ra-requirement-unit>

<description>

Atomic and independently testable requirement unit.

</description>

<guidelines>

Use one unit per need, keep implementation-free wording, and set `Approved` only after explicit user approval.
Every single-value field is an attribute; only prose and structured children are nodes.
Attributes are ordered by volatility — `status`, `approved_by`, `changed` always change together and share one line, so an approval is a one-line diff.
`evidence` is present only for reverse-engineered units; a unit with no evidence cannot leave `Draft`.

</guidelines>

<template>

```xml
<req id="FR-[AREA]-####" type="FR|NFR|INT|DATA" level="System|Subsystem|Component"
     subsystem="[name; required when level is Subsystem or Component; otherwise fill when known]"
     component="[name; required when level is Component; otherwise fill when known]"
     ticketId="[tracker key]" classification="business|technical"
     source="User|Inferred|Sources|Documentation"
     priority="Must|Should|Could|Wont" verification="Test|Analysis|Inspection|Demo"
     status="Draft|Approved|Deprecated|Removed" approved_by="[login or user name of the approver]" changed="[YYYY-MM-DD]"
     depends="[comma-separated IDs]"
     implementation="NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved">
  <title>[the single outcome this unit governs; noun phrase, unique within the area]</title>
  <statement>[the governing rule: what shall hold, over which cases, with its limits and explicit exclusions. NOT an EARS sentence, NOT a restatement of the criteria]</statement>
  <rationale>[why this shape and not another: basis for each threshold, actor and boundary; alternatives rejected and why rejected]</rationale>
  <evidence>[reverse-engineering only: source-code path + the named symbol + artifact at it (function, class, const, type) per location. Source code ONLY - never a plan, discovery, TEMP or other working artifact. Line ranges drift on every edit, names do not]</evidence>
  <acceptance>
    <criteria id="[req-id].AC1" ears="ubiquitous" system="[whatever responds: actor or specific system/subsystem/component/etc]" shall="[outcome]"/>
    <criteria id="[req-id].AC2" ears="event" when="[trigger]" system="[responder]" shall="[outcome]"/>
    <criteria id="[req-id].AC3" ears="state" while="[state]" system="[responder]" shall="[outcome]"/>
    <criteria id="[req-id].AC4" ears="optional" where="[feature is present]" system="[responder]" shall="[outcome]"/>
    <criteria id="[req-id].AC5" ears="unwanted" if="[fault]" system="[responder]" shall="[mitigation]"/>
  </acceptance>
  <implementationNotes>[CONCISE: Implemented: aggregated files affected, NotStarted/Planned/ToBeRemoved: nothing, ToBeModified: what was originally documented but now dropped]</implementationNotes>
  <notes>[anything else; the rejection reason when status is Removed]</notes>
</req>
```

</template>

<id_grammar>

- `FR-[AREA]-####` functional
- `NFR-[ISO]-####` non-functional, [ISO] in PERF SEC REL USE MAIN PORT COMP FUNC SAFE
- `INT-[AREA]-####` interfaces
- `DATA-[AREA]-####` data
- `<req-id>.AC#` acceptance criteria

Never reuse a retired ID. Never renumber an existing ID.

</id_grammar>

</ra-requirement-unit>

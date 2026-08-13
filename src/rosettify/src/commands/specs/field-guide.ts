// Implements FR-SPECS-0008 (per-field caller guidance). Data only — one entry per field of the
// spec unit and of the acceptance criterion, in schema order. Two surfaces read this array and
// neither restates it: schemas.ts fills each property description by lookup, and help-content.ts
// emits the array as its field_guide section, so the two cannot diverge.
//
// This module is a leaf: it imports the SpecFieldGuide type and nothing else. help-content.ts
// already imports schemas.ts, so guidance defined in either of those would close a module cycle.
//
// Every guidance line is directive instruction addressed to the caller, states what the value must
// contain rather than what the field is named, and names no notation, no format, no identifier of
// a requirement or a ticket, no internal location, and no design reasoning.
//
// Criterion entries are qualified with the path the caller addresses them by (`acceptance.<name>`)
// because a criterion's `id` would otherwise collide with the unit's `id` in a flat lookup.

import type { SpecFieldGuide } from "./output.js";

export const SPEC_FIELD_GUIDE: readonly SpecFieldGuide[] = [
  // --- spec unit -----------------------------------------------------------
  {
    field: "id",
    type: "string",
    required: true,
    default: "none",
    guidance:
      "Give the identifier you chose for this unit: its type prefix, the area mnemonic in capitals, and a four-digit number, joined by hyphens. Choose a number no other unit in that area already holds.",
  },
  {
    field: "type",
    type: "FR | NFR | INT | DATA",
    required: true,
    default: "none",
    guidance:
      "State the kind of requirement this is: functional, non-functional, interface, or data entity. It must agree with the prefix of the identifier you chose.",
  },
  {
    field: "level",
    type: "System | Subsystem | Component",
    required: false,
    default: "System",
    guidance: "State the depth at which the rule binds: the whole system, one subsystem, or one component.",
  },
  {
    field: "subsystem",
    type: "string",
    required: false,
    default: "empty string",
    guidance:
      "Name the subsystem the rule concerns. Fill it whenever you know it, not only when the level demands it, and leave it empty only to say you do not know it. A rule binding at subsystem or component depth needs it.",
  },
  {
    field: "component",
    type: "string",
    required: false,
    default: "empty string",
    guidance:
      "Name the component the rule concerns. Fill it whenever you know it, not only when the level demands it, and leave it empty only to say you do not know it. A rule binding at component depth needs it, and needs its subsystem named too.",
  },
  {
    field: "ticket_id",
    type: "string",
    required: false,
    default: "empty string",
    guidance: "Give the reference this unit carries in your issue tracker, when the work has one.",
  },
  {
    field: "classification",
    type: "string",
    required: false,
    default: "empty string",
    guidance: "State whether this unit expresses a business rule or a technical one.",
  },
  {
    field: "title",
    type: "string",
    required: true,
    default: "none",
    guidance:
      "Name the single outcome this unit governs, as a noun phrase, and make it unique within its area.",
  },
  {
    field: "statement",
    type: "string",
    required: true,
    default: "none",
    guidance:
      "Write the governing rule: what shall hold, which cases it reaches, and which cases it explicitly excludes. Say shall for mandatory, should for preferred, may for optional. Do not restate the criteria — they sample the rule, this states it. A non-functional unit must additionally carry a quantified metric, its threshold, and the condition it is measured under.",
  },
  {
    field: "rationale",
    type: "string",
    required: false,
    default: "empty string",
    guidance:
      "Explain why this shape and not another: the basis for each threshold, and the alternatives you considered and rejected.",
  },
  {
    field: "evidence",
    type: "string[]",
    required: false,
    default: "empty list",
    guidance:
      "Give one path and line range per source location backing a unit recovered from existing code. Leave it empty for a unit authored from intent.",
  },
  {
    field: "source",
    type: "User | Inferred | Sources | Documentation",
    required: true,
    default: "none",
    guidance:
      "State where this unit came from: a person stated it, you inferred it, you recovered it from existing sources, or you took it from documentation.",
  },
  {
    field: "priority",
    type: "Must | Should | Could | Wont",
    required: true,
    default: "none",
    guidance: "State how strongly this unit is committed to for the scope it belongs to.",
  },
  {
    field: "status",
    type: "Draft | Approved | Modified | Deprecated | Removed",
    required: false,
    default: "Draft",
    guidance:
      "Do not set this — only the lifecycle operations move it. A unit entering as a draft is expected to be complete and ready for review, not parked unfinished.",
  },
  {
    field: "approved_by",
    type: "string",
    required: false,
    default: "empty string",
    guidance: "Do not set this — it is filled with the resolved actor when the unit is approved.",
  },
  {
    field: "changed",
    type: "string",
    required: false,
    default: "set on every write",
    guidance: "Do not set this — it is stamped with the moment of every write that touches this unit.",
  },
  {
    field: "changed_by",
    type: "string",
    required: false,
    default: "empty string",
    guidance: "Do not set this — it is filled with the resolved actor of the last write.",
  },
  {
    field: "verification",
    type: "Test | Analysis | Inspection | Demo",
    required: true,
    default: "none",
    guidance:
      "State how this unit will be shown to hold: by running a test, by analysis, by inspecting the result, or by demonstrating it.",
  },
  {
    field: "acceptance",
    type: "AcceptanceCriterion[]",
    required: true,
    default: "none",
    guidance:
      "Give at least one criterion sampling the rule. Add one per case the rule must be checkable on, rather than one restating the whole rule.",
  },
  {
    field: "depends_on",
    type: "string[]",
    required: false,
    default: "empty list",
    guidance:
      "List the identifiers of the units this one cannot hold without. These are directional prerequisites and must never form a cycle.",
  },
  {
    field: "related",
    type: "string[]",
    required: false,
    default: "empty list",
    guidance:
      "List the identifiers of units worth reading alongside this one. These are associative and may point both ways.",
  },
  {
    field: "implementation",
    type: "NotStarted | Implemented | Planned | ToBeModified | ToBeRemoved",
    required: false,
    default: "NotStarted",
    guidance: "Do not set this — only the operation that records implementation state moves it.",
  },
  {
    field: "implementation_notes",
    type: "string",
    required: false,
    default: "empty string",
    guidance:
      "Once this unit is implemented, name the source locations that implement it. Leave it empty until then.",
  },
  {
    field: "notes",
    type: "string",
    required: false,
    default: "empty string",
    guidance: "Once this unit is withdrawn, record the reason it was rejected. Leave it empty otherwise.",
  },
  // --- acceptance criterion ------------------------------------------------
  {
    field: "acceptance.id",
    type: "string",
    required: true,
    default: "assigned when omitted",
    guidance:
      "Give this criterion its identifier: the unit's own identifier, a dot, then AC and its number within that unit. Omit it and one is assigned; supply it to keep the stable target a test or a traceability row can claim.",
  },
  {
    field: "acceptance.ears",
    type: "ubiquitous | event | state | optional | unwanted",
    required: true,
    default: "none",
    guidance:
      "Select the one pattern this criterion follows: it always holds, it fires on a trigger, it holds during a state, it applies where a feature is present, or it answers a fault. Your choice decides which condition word the criterion may carry.",
  },
  {
    field: "acceptance.when",
    type: "string",
    required: false,
    default: "omitted",
    guidance: "State the trigger the response follows. Carry this word only for the event pattern.",
  },
  {
    field: "acceptance.while",
    type: "string",
    required: false,
    default: "omitted",
    guidance: "State the state that must hold throughout. Carry this word only for the state pattern.",
  },
  {
    field: "acceptance.where",
    type: "string",
    required: false,
    default: "omitted",
    guidance: "State the feature whose presence the rule waits on. Carry this word only for the optional pattern.",
  },
  {
    field: "acceptance.if",
    type: "string",
    required: false,
    default: "omitted",
    guidance: "State the fault being answered. Carry this word only for the unwanted pattern.",
  },
  {
    field: "acceptance.system",
    type: "string",
    required: true,
    default: "none",
    guidance: "Name whatever responds: an actor, or a specific system, subsystem, or component.",
  },
  {
    field: "acceptance.shall",
    type: "string",
    required: true,
    default: "none",
    guidance: "State the outcome that follows, or the mitigation when the pattern answers a fault.",
  },
];

# Requirements Authoring -- general authoring catalogs

Loaded on demand by `requirements-authoring` SKILL.md when drafting and validating requirement units: unit shape, schema fields, ID conventions, language constructs, FR/EARS, NFR, acceptance, verification, and traceability catalogs. The orientation layer (role, concepts/principles, authoring flow, information architecture) stays inline in SKILL.md. Synthesis-mode output schemas live in [authoring-catalogs.md](authoring-catalogs.md); quality-principle rules (SRP/DRY/KISS/MECE) in [quality-principles.md](quality-principles.md).

## Unit of requirement

- Use `<req>` as unit
- One `<req>` per need
- One outcome per `<req>`
- Keep `<req>` atomic
- Keep `<req>` independently testable
- Keep `<req>` implementation free
- Check if grouping of multiple requirements is a requirement itself

## Requirement schema

- Require id, type, level
- Require title and statement
- Require rationale and source
- Require priority and status
- Require acceptance criteria
- Require verification method
- Optional dependencies and risks
- Optional notes and links

Full fill-in unit template: asset `requirements-authoring/assets/ra-requirement-unit.xml` (`ACQUIRE FROM KB`).

## ID rules

- Use stable unique IDs
- Use `FR-[AREA]-####` for FRs
- Use `NFR-####` for NFRs
- Use `INT-[AREA]-####` for interfaces
- Use `DATA-[AREA]-####` for data
- Never reuse retired IDs
- Never renumber existing IDs

## Language constructs

- Use shall for mandatory
- Use should for preferred
- Use may for optional
- Use shall not to forbid
- Avoid will statements
- Use active voice
- Use present tense
- Avoid vague adjectives
- Avoid and or constructs
- Avoid subjective qualifiers
- Avoid ambiguous time words
- Prefer measurable quantities
- Quantify every threshold
- Define terms in glossary
- Use consistent terminology
- Separate normative and informative
- Specify outcomes, not designs
- Avoid implementation details
- Avoid UI-only descriptions
- Avoid internal code names
- Use one meaning per term

## Functional requirements

- Use EARS patterns
- Pick one pattern
- Avoid multiple triggers
- Avoid multiple responses
- Split compound requirements
- Link FRs to scenarios
- Include error behaviors
- Switch both implementation status and req status

## EARS patterns

- `<ubiq><S> shall <R>.</ubiq>`
- `<event>When <T>, <S> shall <R>.</event>`
- `<state>While <X>, <S> shall <R>.</state>`
- `<optional>Where <O>, <S> shall <R>.</optional>`
- `<unwanted>If <F>, <S> shall <M>.</unwanted>`

## Non-functional requirements

- Use ISO 25010 buckets
- Include metric and threshold
- Include measurement conditions
- Include measurement method
- Prefer percentiles over averages
- State limits and constraints
- Tie NFRs to scenarios
- Avoid subjective quality words
- Update existing requirements with new schema

## Acceptance criteria

- Use Given/When/Then format
- Use `Given:<G> When:<W> Then:<T>.`
- Keep criteria independently testable
- Cover happy path
- Cover unhappy path
- Cover boundary conditions
- Cover error handling

## Verification methods

- Prefer Test where possible
- Use Analysis for proofs
- Use Inspection for artifacts
- Use Demo for behaviors

## Traceability rules

- Link each req to source
- Link each req to goal
- Link each req to tests
- Update traceability matrix
- Keep forward and backward links

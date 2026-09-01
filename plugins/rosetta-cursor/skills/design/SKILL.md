---
name: design
description: "To decide architecture — alternatives, tradeoffs, committed decision with rationale, boundaries, domain-specific concerns."
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<design>

<role>

Principal architect who commits to one design and can defend every rejection.

</role>

<when_to_use_skill>
An architecture or approach decision is in play: new system, a delta on something running, integration, re-architecture, technology or pattern choice.
Output: a decided architecture at decision granularity — what to build, why, what was rejected and why.
</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed
- Design decides WHAT TO BUILD. Not what exists, not the spec, not the breakdown, not the code
- Every premise is grounded: check the code, search, read docs, or ask — narrow, on demand, then continue. An assumed premise is a defect
- Most work is a delta. What the running system already commits to is a constraint to establish — neither re-decided nor accepted blindly; deviating from an established pattern is itself a decision, with a migration note
- Nothing running yet: conventions, stack, and structure are themselves the decisions — make them explicit
- Effort follows reversibility: a one-way choice with wide blast radius earns alternatives and written rationale; a local reversible one earns a sentence

</core_concepts>

<aspects_to_weigh>

- What is being decided vs what is already settled — separated before options exist
- Requirements in force: a decision conflicting with one is surfaced, not silently overridden
- Which quality attributes collide here, and which wins — weighting set by the domain, not by generic best practice
- Alternatives that are genuinely different shapes, always including the boring one; each pushed until its failure mode shows
- Why each loser lost — recorded, so it is not re-litigated or quietly re-implemented
- Boundaries, responsibilities, interfaces at decision granularity — names and contracts, not signatures
- Blast radius: what breaks, who is reached, what must change alongside, what stays compatible
- The transition when something is live: path there, and the way back if it fails
- Operability: how the choice is observed, how it fails, how it recovers
- Second-order consequences: X forces Y, Y breaks Z
- The numbers the design assumes — load, data volume, latency, growth — stated; a design without numbers is a mood
- Tradeoffs above this authority: surfaced as questions with options and a default, never resolved silently
- What would invalidate the decision later

</aspects_to_weigh>

<domain_specifics>

Dominant risk dimension → APPLY SKILL FILE:

- Crossing process/service boundaries: integration, events, async, cross-boundary consistency → `assets/distributed-systems.md`
- Something running becoming something else: rewrite, replatform, upgrade, extraction, provider swap → `assets/migration-cutover.md`
- Many tenants or customers on shared infrastructure → `assets/multi-tenancy.md`
- Authentication, authorization, sessions, service identity → `assets/identity-access.md`
- Money movement, billing, ledgers → `assets/payments.md`
- Personal, health, or otherwise regulated data → `assets/regulated-data.md`
- Pipelines, warehouses, lakes, streaming → `assets/data-platform.md`
- LLM or agent capability in the product → `assets/ai-features.md`
- Trained-model capability: features, training, serving → `assets/classic-ml.md`
- Installed clients that cannot be force-upgraded: mobile, desktop, devices → `assets/mobile.md`
- Cloud infrastructure, IaC, delivery → `assets/iac.md`
- Storefront, cart, checkout, catalog, inventory, orders → `assets/ecommerce.md`
- Standard UI + backend, when nothing above dominates → `assets/web-app.md`

Several apply → load each that carries real risk here; conflicts resolve toward the stricter obligation. None apply → derive that domain's concerns, priorities, and standards to the depth these files show.

</domain_specifics>

<output>

Compressed, terse; diagrams and terms over prose.
Carries: the decision · rationale against the attributes that collided · premises and how each was established · boundaries and interfaces · blast radius and compatibility · rejected alternatives and why each died · reversibility per decision — exit path or none · open decisions for the user, each with options and a default · what would invalidate it.
Depth follows the stakes, not a template.

</output>

<validation_checklist>

- No decision rests on an unverified premise
- Alternatives were real and killed for stated reasons — where stakes warranted them
- Decision traceable to the attributes it optimized and the constraints it accepted
- Interfaces at decision granularity, no lower
- Domain file applied, or the domain's concerns derived to equal depth
- Tradeoffs beyond this authority surfaced, not resolved

</validation_checklist>

<pitfalls>

- Alternatives invented after the favourite was chosen, to dress it
- Re-deciding what the running system already settled
- Assuming a premise a two-minute check would settle
- Uniform depth: ceremony on the reversible, hand-waving on the one-way
- Generic design producible without the domain in front of you
- Drifting into signatures, tasks, estimates

</pitfalls>

</design>

---
name: post-mortem
description: "Diagnose instruction defects and optionally submit Rosetta GitHub issue"
license: Apache-2.0
disable-model-invocation: true
user-invocable: true
argument-hint: "optional: skill/agent/workflow name or concern"
baseSchema: docs/schemas/skill.md
---

<post_mortem>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Explicit user invocation only; never auto-runs. Reviews the ENTIRE harness that produced the outcome — user prompt · workspace files (docs/rules/plans/memory) · repo-local instructions/config · Rosetta instructions (skills/agents/commands/rules) · tooling — NOT the user's artifact.
- Root cause, not symptoms: the defect is in the harness, not the artifact it produced. Fix = GENERALIZED, REUSABLE preventive rule — not an incident-specific patch.
- Attribute every defect to a layer: prompt | workspace files | local config | Rosetta instruction | tooling. Most failures are local; do NOT default to blaming Rosetta.
- Tone: direct, blunt, harsh on defects — no sugarcoating, hedging, or diplomatic filler. Call broken prompts, files, and instructions broken. Critique the harness, never people.
- 2 phases, hard gate between: ① post-mortem report with recommendations per layer → ② GitHub issue to `griddynamics/rosetta`, offered ONLY when a defect is attributed to Rosetta instructions. ② NEVER starts without explicit opt-in.
- Submission MUST be sanctioned: question/suggestion/edit/"fix it" = review ≠ approval. Unclear answer ≠ "no" → ASK AGAIN directly. Re-asking is allowed and expected; unsanctioned submitting is not.
- Issue is PUBLIC: Rosetta instruction feedback ONLY · zero target-repo IP/data.
- Outputs are required as checkpoints and to finalize thinking and to prevent failures we saw in practice.
- Severity: P0 unsafe/false/unusable · P1 quality/reliability/cost/token consumption/privacy risk · P2 friction/duplication/variance · P3 nice-to-have.

</core_concepts>

<process>

① Post-mortem (always), strictly in this order:

1. Collect evidence from available context only: request · instructions used · workspace files read · tool calls · retries · blockers · artifacts · output. Run not in context → ask for it; NEVER invent history.
2. OUTPUT evidence inventory — available vs missing. ONLY THEN proceed.
3. Assess every layer: prompt clarity/completeness · inferred-vs-told requirements · workspace files (stale, wrong, missing, contradictory) · repo-local instructions/config · Rosetta instruction ambiguity/gaps · execution errors · repeated same-approach retries · duplicated effort · tooling/context friction · validation gaps · user-input timing · handoff quality (per subagent if multi-agent).
4. OUTPUT candidate issue list — one line each, suspected layer. ONLY THEN proceed.
5. Take ONE candidate: drill to ROOT CAUSE and attribute the layer: symptom → which prompt phrase / file section / instruction line caused it → why (ambiguity/gap/contradiction/missing gate/stale data). Quote the source; state expected vs actual behavior. Ambiguous → ask 1-3 clarifying questions, do not guess.
6. OUTPUT that candidate's verdict — root cause + verbatim proofs, confirmed or dropped. ONLY THEN take the next candidate: repeat 5-6 until none remain.
7. ONLY AFTER all candidates concluded: convert each confirmed root cause into a generalized preventive change: local layers → concrete edit the user should make (exact file/section + proposed content); Rosetta layer → instruction change proposal (exact file/section + proposed rule + failure mode prevented).
8. OUTPUT recommended changes per layer. ONLY THEN proceed.
9. Store generalized rules in AGENT MEMORY.md (init if missing): what worked and what failed — logically, architecturally, technically. Concise, organized, reusable.
10. OUTPUT final report via template — assembled ONLY from steps 2/4/6/8 outputs, no new findings. Material/recurring issues only; uncertain → label low-confidence. RECOMMEND local fixes to the user; apply NOTHING.

② GitHub issue (only if ≥1 defect attributed to Rosetta instructions; otherwise state "nothing Rosetta-attributable" and stop):

11. GATE A: ask directly — "File the Rosetta-attributed finding(s) as a GitHub issue to griddynamics/rosetta?" Clear no → stop ②. Unclear/partial answer → RE-ASK directly until clear yes/no. NEVER proceed on silence or assumption.
12. ONLY AFTER a clear yes: sanitize — strip ALL target-repo IP and sensitive data — code · file contents/names · business logic · product/client/company names · internal URLs/hosts/datasets · usernames · emails · tickets · secrets/credentials/tokens/keys · PII · etc. Unavoidable refs → `<project>`, `<file>`. Keep: Rosetta component, release, IDE/agent, model.
13. OUTPUT COMPLETE draft verbatim — final title + body, fenced — with sanitization checklist result. ONLY THEN proceed.
14. GATE B: submit ONLY when sanctioned by the exact sentence `Submit the issue as drafted`. Question → answer it, then RE-ASK. Comment/edit → revise → re-OUTPUT full draft → RE-ASK. Unclear → ask directly "Approve submission, or revise?". Loop until sanctioned or declined.
15. ONLY AFTER sanction: submit — `gh issue create --repo griddynamics/rosetta --title <t> --body <b>`. `gh` missing/unauthed → hand user the draft + `https://github.com/griddynamics/rosetta/issues/new`; NO other channels.
16. Report issue URL. Change NOTHING else — this skill fixes nothing.

</process>

<validation_checklist>

- Every defect attributed to a layer (prompt | workspace files | local config | Rosetta instruction | tooling) with the exact source quoted — fixable without the transcript.
- Every recommendation is a generalized preventive rule with the failure mode it prevents — not an incident note.
- Local defects → recommendations to the user only; nothing applied, nothing fixed.
- Generalized rules stored in AGENT MEMORY.md.
- ② offered only for Rosetta-attributed defects, and entered only after a clear "yes" at GATE A; unclear answers were re-asked, not assumed.
- Full final draft shown verbatim BEFORE submit; user typed the exact GATE B sentence.
- Draft: zero target-repo code/paths/names/URLs/credentials/business context.

</validation_checklist>

<pitfalls>

- Attributing every failure to Rosetta — bad prompts, stale workspace files, and local config break runs more often.
- User question or wording suggestion on the draft → treated as approval + submitted. It is review; answer/revise → RE-ASK.
- Unclear user reply → treated as "no" and silently dropped, or as "yes" and submitted. Both wrong: ask directly again.
- User asked to FIX something → fixing AND silently submitting an issue. Fix = separate task; submission still needs both gates.
- Reporting the symptom (bad artifact) instead of the harness root cause that produced it.
- Storing incident notes instead of generalizable rules.
- Softening findings to sound polite → real defects read as minor and get deprioritized.
- IP leaks via "harmless" details: repo names in paths · error messages containing code · URLs in tool output.

</pitfalls>

<templates>

Post-mortem report:

```md
## Post-Mortem
**Component:** {skill|agent|workflow|prompt|file} · **Release:** {r2|r3} · **Delivery:** {MCP|plugin} · **IDE/agent:** {name} · **Model:** {id}
**Task:** {one line} · **Outcome:** {completed | partial | blocked}

**Issues** (repeat per issue)
P{0-3} — {title}
- Layer: {prompt | workspace files | local config | Rosetta instruction | tooling}
- Trigger: {minimal repro — request paraphrase + preconditions}
- Source: {prompt phrase / file section / instruction line — quoted}
- Expected vs actual: {intent vs what agent did}
- Root cause: {ambiguity | gap | contradiction | missing gate | stale data — why}
- Reasons: {terse: why AI concluded this is the root cause — verbatim proof quotes from prompt/instructions/files/output}
- Frequency: {always | intermittent | once} · Workaround: {if any}

**Recommended Changes**
- Local (user applies): {exact file/section + proposed content + failure mode prevented}
- Rosetta (issue candidate): {exact instruction file/section + proposed generalized rule + failure mode prevented}

**Confidence:** {High|Medium|Low} — {why}
```

GitHub issue draft (Rosetta-attributed findings only):

```md
Title: [post-mortem] {component}: {root-cause summary}

## Environment
{release} · {MCP|plugin} · {IDE/agent} · {model}

## Repro / trigger
{sanitized minimal repro}

## Expected vs actual
{quoted instruction line/section} vs {observed agent behavior}

## Root cause
{ambiguity | gap | contradiction | missing gate — why}

## Reasons
{terse: why this is the root cause — verbatim proof quotes from instructions/output, sanitized}

## Suggested change
{exact file/section + proposed generalized rule + failure mode prevented}

## Severity
P{0-3} · Frequency {always|intermittent|once} · Confidence {High|Medium|Low}
```

</templates>

</post_mortem>

<!-- Decision history for maintainers of the diff judge (SCORE-DIFFS.md, BENCHMARKS.md section 6). NOT an input for the judge or the assistant. -->

# Diff-judge methodology — decision log

RECONSTRUCTED 2026-10-27 from the session after the scratchpad was wiped externally (~15:53). Content = the decisions as recorded in the session; corrected states only where a later correction exists (history kept in "Mismatches").

Target: BENCHMARKS.md section 6 + new SCORE-DIFFS.md. No repo edits until the user says so.

## Decisions (current state)
| # | Decision | Why / note |
|---|---|---|
| D1 | All methods of one task × runner in ONE judge context | absolute scores while seeing all implementations; reveals what a run MISSES (E3) |
| D1b | All repo diffs of each run loaded together (pilot 2, tested with dashboard diffs) | cross-repo severity and propagation |
| D2 | Merge-ready = derived verdict, not judged | rule text OPEN-2 (old rule cited removed categories) |
| D3 | Verification evidence out of code score | process metric; agent-report / 0.3 |
| D4 | Generated files and lockfiles: summary only (file + line count) | REFINE (pilot 2): summary hid a hand-edit of a fetched schema → OPEN-7 |
| D5 | Single judge pass (+ self-challenge + validator) | user rejected per-run subagents |
| D6 | Judge assigns numbers by MUST anchors; script computes totals | S3, S8 |
| D7 | Judge reads base repos at baseline-v1 (test-library/saleor-not-initialized-repos.zip) | pilot 1 F1, pilot 2 P2-1 |
| D8 | No executed check | judge scores HOW; WHETHER is in the report |
| D9 | MECE categories, no repetition of existing metrics | removed: requirements coverage, hidden reqs, tests pass, verification evidence, merge-ready |
| D10 | Scope: only lines the run changed; pre-existing out; following an existing pattern is never a defect | |
| D11 | Each metric scored separately | |
| D12 | Total = Σ(v×w)/Σ(10×w)×100 over number and "-" values ("-" = 7); "?" and N/A excluded; + bonus | user agreed normalization |
| D13 | Weights per metric: Critical 1 · High 0.9 · Medium 0.75 · Low 0.5 | |
| D14 | H9 Extra scored, Low weight; N/A if none | push-back rejected; routing keeps MECE |
| D15 | 8.4 AI-session docs scored, 0.5, N/A if absent (bonus only) | known limit: de-blinds |
| D16 | Input = repo diffs only (no workspace-root) | |
| D17 | Finding types GAP / FLAW / EXCESS / STRENGTH; GAP that can cause a future defect ≥ Major | |
| D18 | H0 Completeness, Critical, first: 0.1 in-repo, 0.2 cross-repo propagation | |
| D19 | Materiality gate (5 checks) | |
| D20 | Evidence kinds new / old / base + quote; never another run | |
| D21 | Values: number · "-" (+checked) · "?" (+why) · N/A | |
| D22 | Process: judge → self-challenge (operator) → validator (general-purpose, Opus 5.5, xhigh) → judge decides → script. Judge also xhigh | |
| D23 | Centered scale, "-" = 7; deterministic mapping OPEN-1 | |
| D24 | Base repos from the not-initialized zip | |
| D25 | 9.1 metric AND bug-fix bonus both count; bonus = fixed bug's severity weight (1 / 0.9 / 0.75 / 0.5) | corrected by user |
| D26 | Reporting a bug earns nothing; only fixing | fixing is paid in cost; finding is a strong point in the report |
| D27 | Self-challenge and validator are declared for REAL judge runs; not executed in this session | |
| D28 | "We define methodology, instructions and test it. WE ARE NOT THE JUDGES NOW." | |
| D29 | SCORE-DIFFS.md style: CAPS, MoSCoW, numbered lists, record ALL rules; mandatory self-check "item no. → where applied → fully or not" | |
| D30 | Final deliverables: BENCHMARKS.md section (what/how/why, incl. self-challenge) + SCORE-DIFFS.md (clean judge prompt) | |
| D31 | Fixed bugs are big advantages: never penalized, always rewarded | |

## Metric set (38): H0 0.1 0.2 (1,1) · H1 1.1–1.5 (1, .9, 1, 1, .75) · H2 2.1–2.4 (1, .9, 1, 1) · H3 3.1–3.4 (.9 ×4) · H4 4.1–4.5 (.9, .9, .9, .75, 1) · H5 5.1–5.3 (.75, .75, .5) · H6 6.1–6.4 (.9, .75, .75, .75) · H7 7.1–7.5 (.9, .75, .75, .5, .75) · H8 8.1–8.4 (.75, .5, .5, .5) · H9 9.1–9.2 (.5, .5). Definitions: step4/SCORE-DIFFS.md section 5.

## Lessons (root causes of my failures; SCORE-DIFFS.md rules map to them)
- Rev 1: categories repeated existing metrics; not MECE. → D9, routing.
- Pilot 1: E1 mixed diff-file and source line numbers; E2 overstated rule text; E3 rule seen only in other run; S1 double counting; S2 nitpicks; S3 anchors not followed; S4 wrong metric; S5 ceiling compression; S6 "10" for unverifiable; S7 10s without evidence; S8 count errors; U1 no WHY; U2 negative-only view; ROOT: attention on nitpicks, not on gaps. → R1–R18.
- Mismatches ×2 (pilot 2): retired 9.1 on my own; planned to run self-challenge/validator myself. Root cause: extended the user's rule beyond its words. Rule: apply decisions literally; derived change → ask first.
- Pilot 2: closed it without loading the dashboard diffs; concluded "load together" by inference, not by test. Rule: a pilot step is done only when every input it names is loaded.

## Pilot 1 (react-storefront, baseline B vs rosetta-light RL) — old rules, not re-scored
Findings that survive rev 4 (provisional): B bypassed the documented fork extension point (`mapProductExtensions`, "do not edit mappers/product.ts or the product route") — 3.2; B deleted a repo guidance comment — 6.1; RL edited the route — 3.2 minor; RL storefront comment "≤250 chars in Saleor" = STRENGTH (user, U2), confirmed by backend max_length=250.

## Pilot 2 (saleor + saleor-dashboard, B vs RL), rev-4 rules, base repo
Files: pilot2/judge.json, score.py, strip-generated.py, pilot2/in/*-dashboard.diff (generated files stripped).
Backend findings: B-1 1.4 major (productTranslate input → ProductTranslationInput breaks `$input: TranslationInput!` clients; base dashboard src/translations/mutations.ts:L6); B-2/RL-3 8.1 minor (no ADDED_IN marker, base categories.py:L52); RL-1 0.1 GAP major (get_translated_keys not extended → translation webhooks miss the field; base models.py:L303-L310, payloads.py:L1192); RL-2 3.2 minor (hand-written 250 check parallel to clean_instance/MAX_LENGTH); RL-4 4.2 strength; RL-5 9.1 strength + bonus medium 0.75 (bulk translate error codes, base utils.py:L441).
Dashboard (Pass B) results:
- B-1 severity_if RESOLVED: B's dashboard switched to ProductTranslationInput (dashboard mutations.ts:L6) → stays Major (external clients), not Blocker.
- B 1.1 RESOLVED "-": B dashboard sends "" on clear (handlers/utils.ts:L80-L82); backend default "" accepts it.
- B-3 3.4 FLAW major: hand-edited `schema-staging.graphql` (+typesStaging) with the fork's fields; base package.json:L42 fetches staging from upstream saleor main via curl → next fetch reverts it; repo mechanism `@lockSchema(schema: "main")` (src/graphql/lockSchema.ts, 11 uses) exists for this. WHY positive: staging build compiles today.
- RL-6 0.2 GAP major: STORAGE_CONDITIONS not added to the export dialog field list (base ProductExportDialogInfo.tsx:L593-L596; default fields [] at ProductExportDialog.tsx:L49) → staff cannot export the field from the dashboard; RL added only the label (messages.ts) [overlaps checklist HQ6 → OPEN-8].
- RL-7 8.2 GAP minor: no changeset; base .github/PULL_REQUEST_TEMPLATE.md:L29 requires one for user-facing features; `lint:changesets` exists (package.json:L51).
- Dropped (R6/R5): RL storage field in CreateProductDialog (unrequested but harmless; not material); constants duplicated in 2 dashboard files; B extends shared builder with optional label vs RL dedicated builder.
Pilot-2 methodology findings: P2-1 base repo decisive; P2-2 cross-run view = discovery only; P2-3 WHY changed 2 outcomes; P2-4 cross-repo REQUIRED (now TESTED: 2 "?" resolved, 3 new findings only visible cross-repo); P2-5 totals compress toward 70 → counts + profile primary; P2-6 severity_if rule works; P2-7 exposed pre-existing bug → D31; P2-8 summary-only generated files hid B-3 (needed content of schema-staging) → OPEN-7; P2-9 checklist item partly propagated (export) collides with 0.3 → OPEN-8.

## Open decisions
- OPEN-1 deterministic anchors (8/9/10 by strength count; 3/2 by major count).
- OPEN-2 verdict rule (Acceptable) replacing "Requirements coverage ≥ 4".
- OPEN-3 does "?" in H0/H1/H2 block Acceptable.
- OPEN-4 tie band.
- OPEN-5 downstream follow-ups (data-block fields, collect-results.py, templates/README.md, score-diffs.py) — own approval.
- OPEN-6 bug_severity definitions for bonus.
- OPEN-7 generated files: schema/contract files (*.graphql) in FULL, other generated + lockfiles as summary (or content on demand).
- OPEN-8 checklist item present in one repo, missing in a consumer repo: judge 0.2 GAP, or leave to 0.3 only.
- Durable location for working files (scratchpad was wiped).

## Decisions after pilot 2 (user)
- D4 REPLACED: judge has full source access; reads ANY file and ANY diff in full; NOTHING summarized ("I said give access to judge to source code. PERIOD."). OPEN-7 closed. strip-generated.py is obsolete.
- OPEN-8 CLOSED: checklist item present in one repo, missing in a consumer repo = judge 0.2 GAP (R17 exception).
- Storefront re-score: NO. "YOUR PRIMARY GOAL STEERED TO DEFINE METHODOLOGY NOT TO SCORE."
- Location: keep scratchpad (wipe = laptop crash).
- MISMATCH ×3 root cause: I drift from defining/testing the method into producing scores. Rule: pilots exist only to test the method; collect method findings, never polish scores.

## Step 3 (pilot 2) — probes (user Q&A)
- Reframe (user): judge works by REASONING over code and diffs only; nobody asks for rendering or measurement. "Cannot prove statically" was a wrong framing → real issue: metrics not actively probed (default N/A) and no proof technique.
- Probes: T1 sibling parity (0.1, 0.2, 1.5, 5.3, 8.1, 8.3) · T2 data-flow trace + exposure inventory (1.1, 1.3, 2.2, 2.4, 5.1) · T3 contract trace (1.4, 0.2, 3.4) · T4 CI/tooling rule sweep (1.3, 3.4, 8.2, 7.5) · T5 import-edge delta (3.3) · T6 migration op classes + deploy order (5.2, 1.3) · T7 pre-existing-lines inventory (6.1, 6.4, 9.1, 9.2) · T8 behavior→test matrix (4.1, 4.2).
- D32 (user): T1–T3 MANDATORY; T4–T8 optional.
- D33 (user): N/A only with probe proof that there is nothing to judge.
- D34 (user): "?" only for evidence outside the repos (third-party internals, environment); the judge names the missing evidence.
- D35 (user): T4 findings route to existing metrics; no new metric.
- Pilot correction: 2.4 was wrongly N/A; correct = "-" with data classification (public by HQ7) + channel list.
- OPEN-9: optional probes vs D33/D34 — if T4–T8 skipped, a metric has no legal value → interpretation pending.
- D36 (user, OPEN-9 closed): T4–T8 = optional TECHNIQUE; evidence for "-" / N/A is still MUST.
- D37 (user): metrics MAY be removed if not useful with our diffs.
- Surface scan (17 runs with diffs: small CC 7, small CP 4, large CC 5, large CP 1): debug leftovers 0/17 · TODO/FIXME 1/17 (3 lines) · logging added 1/17 (large rosetta-light, 9 lines) · AI-session docs in repo diffs 3/7 small CC (grill CONTEXT.md; rosetta-skills agents/IMPLEMENTATION.md + docs/CONTEXT.md ×3 repos; superpowers changed storefront CLAUDE.md = team rules file) · new imports 7/7 · migrations 7/7.
- Merge candidates (0 material findings in both pilots + overlap with a sibling): 6.3→6.1, 5.3→1.2, 3.3→3.1, 4.4→4.3, 7.2→7.1, 7.3→7.5, 8.3→8.2. Keep: 2.4, 1.5, 5.2, 8.4, 9.2 (surface exists or user decision). Pending user.
- Side observation (protocol, not scoring): superpowers small CC run modified react-storefront CLAUDE.md (team rules file; BENCHMARKS 3.3 says never change it during the study).

## Simplification (user, after over-engineering)
- DROPPED: probes T1–T8, required/optional split (D32, D35, D36 superseded), all metric merge proposals (D37 stays: removal allowed, none proposed now). Metrics stay 38.
- D38 (user): values are ONLY a number or "-" WITH evidence. No N/A, no "?" (D21, D33, D34 superseded; OPEN-3 closed). "-" also covers "nothing to judge in this run" (evidence says why); "-" = 7 in totals over ALL metrics.
- D39 (user): short "Hints" section approved (sibling compare · follow the data · find API consumers · classify changed old lines / migrations / imports). Added as SCORE-DIFFS.md section 6a.
- ROOT CAUSE (mismatch #4): over-engineering a small thing (probe taxonomy, required/optional, merges). Rule: simplest form that serves code analysis; hints over procedures; no new structure without a user request.

## Mismatch #5 (step 4, item 1, chunk 2) — ROOT CAUSES
- Treated "missing" as absolutely severe ("gap ≥ Major", "missing pieces have the largest impact"). USER RULE (universal, whole session): severity = the IMPACT of the finding ITSELF (what is harmed, how much, for whom), NEVER its type (missing / wrong / extra / could be better).
- Rephrased the user's bug rule wrongly ("reporting a bug earns nothing"). USER RULE: a bug only reported, not fixed, earns NO BONUS POINTS; the run report records it as a strong point.
- Lesson: every sentence that will land in BENCHMARKS.md / SCORE-DIFFS.md must keep the user's exact meaning; re-check wording against the user's words before showing it.
- CONFIRMED by user and applied: D17 "GAP ≥ Major" REMOVED → R7 "IMPACT DECIDES SEVERITY"; R12 GAP clause removed; R14 + section 6 bug sentence = "only reported, not fixed: no bonus points; the run report records it as a strong point". Decision 7 why = impact rule; H0 Critical = user decision.
- D40 APPROVED (OPEN-1 closed): impact levels for negatives AND strengths (critical/major/minor); mapping 0 ≥2 blockers · 1 one blocker · 2 ≥3 majors · 3 two majors · 4 one major · 5 ≥2 minors · 6 one minor · "-"=7 · 8 minor strengths only · 9 one major strength · 10 a critical strength or ≥2 major strengths; mixed → worst negative. Applied to SCORE-DIFFS.md section 7, R12, JSON.

## Mismatch #6 (item 1, chunk 3) — ROOT CAUSES
- INVENTED rule 15 ("inputs do not fit → STOP") and attributed it to the user. User's actual words (first message): "It is must for all matching diffs to be loaded at once." Nothing about stopping. Real Claude Code behavior when context grows: the conversation is auto-summarized (compaction) → silent detail loss, not a failure.
- Decision 14 ("two reading passes") was imprecise and unproven: in one context the order changes nothing technically; pilot 2 found cross-repo facts because the dashboard diff was LOADED. Keep only R16 (resolve cross-repo dependencies before scoring).
- 16 imprecise: the self-challenge prompt is defined in SCORE-DIFFS.md; the assistant gives it to the operator; the operator only sends it.
- 18 incomplete: the script must be written and tested, then documented as ONE usage line so the judge does not read it.
- NEW (user): size check (words × 1.3 ≈ tokens, budget 300K) + subagent rounds when it does not fit (groups of disjoint runs mixing small and large diffs → parallel subagents with the same prompt + temp ratings file → drop clear losers → merge JSON → re-judge top runs that fit → repeat to top-of-the-top).

## Mismatch #7 — ROOT CAUSES + user rules
- 15: the user's sentence IS the rule ("all matching diffs MUST be loaded at once"); I must not build rules on top of user rules. Size check + rounds = the user's procedure.
- 16: SCORE-DIFFS.md is given to the judge IMMEDIATELY; it is the judge's main rule. The self-challenge prompt MUST NOT be in it (it must come as a surprise). BENCHMARKS.md defines process and procedures and holds the self-challenge prompt.
- Rounds wording: clear losers are EXCLUDED from further rounds; the merged JSON keeps their ratings UNMODIFIED.
- Do not define "clear loser" or decide for the judge. Judge gets ideas only; subagents report clear losers by their own judgement. Tell the judge the same: give subagents the same prompt, do not add own rules or definitions (it would behave as I did).
- Root cause: I over-specify and decide for the judge, and I write imprecise sentences.
- D41 (user): the JUDGE relays. SCORE-DIFFS.md must make it clear: if any question comes about decisions a subagent made, the judge MUST relay it to that subagent (resume it if stopped). The self-challenge prompt is NOT named in SCORE-DIFFS.md.
- D42 (user): documentation MUST clearly distinguish who does what (operator, assistant, judge, round subagents, validator) and which file is for whom (BENCHMARKS.md = process for operator + assistant; SCORE-DIFFS.md = judge's main rule).
- CORRECTION (user): the ASSISTANT is NOT the judge. Two separate Claude sessions: (A) assistant session — operator + assistant, follows BENCHMARKS.md; (B) judge session — operator + judge, judge reads SCORE-DIFFS.md; the judge's subagents live inside B. Chain for the self-challenge: assistant (A) gives the prompt → operator sends it in B → judge relays to its subagents (D41). This session = author of the docs only. Root cause: I merged roles ("you/assistant = judge").
- D43 (user Q&A, roles): input folders (blinded runs, task, Q&A) → assistant (A) · judge's first message with SCORE-DIFFS.md → assistant gives the text, operator sends · totals script → judge (B) runs it · results into run reports → assistant (A). My assumption "assistant runs the script" was WRONG.
- D44 (user): NO blinding, NO copying, NO input-folder preparation. The assistant gives the judge the ROOT folder that holds all runs. Keep it simple. (D43 "assistant prepares input folders" superseded.) Old BENCHMARKS section 6 is NOT a source; everything is decided new.
- D45 (user): ROLE PRINCIPLE — the assistant prepares, explains, provides (incl. the base-repos folder); the judge uses it to judge. Rounds (size check, groups, subagents, merge) = judge's responsibility, written in SCORE-DIFFS.md.
- D46 (user): the JUDGE updates the merged JSON with the final ratings; the JSON is persisted and is the source of information.
- D47 (user): item 2 chunk 1 (size check first → fits: load all at once → else rounds; judge keeps final JSON) CORRECT. Chunk 2 rules 1–16 accepted ("next").
- D48 (user): fixed bug's bonus level (critical 1 / high 0.9 / medium 0.75 / low 0.5) is rated by the bug's OWN impact. "Run report records an only-reported bug as a strong point" moves to BENCHMARKS.md (assistant), out of the judge's rule.
- D49 (user): validator — no rounds: verifies all runs; with rounds: verifies ONLY the final resulting leaderboard (the runs of the final round, which fit one context). Item 2 chunk 3 otherwise as shown (JSON at assistant-provided path; objections + decisions recorded in JSON; judge runs the script; script prints totals; assistant writes them to run reports).
- D49 CORRECTED (user): the validator verifies ONLY the leaderboard taken from the final JSON — the top-ranked runs that fit in one context. Independent of rounds. (My "runs of the final round" was WRONG.)
- D50 (user): ORDER = judge rating → validator → self-challenge (supersedes D22 order). All three are done by the JUDGE SESSION ("Who" column = judge session for all).
- Placement in BENCHMARKS.md section 6: only judge parts change; rest word for word. Measures table rows 4–6 replace old rows 4–5 (progressive disclosure: short rows name absolute rating + categories; full detail in the "Diff judge" subsection).
- Writing rule (user): no in-document navigation hints like "(see X below)"; the assistant loads the entire file at once.
- D51 (user): judge session runs in a CLEAN Claude Code config: no plugins, skills or hooks. Assistant prepares it (role principle D45).
- BENCHMARKS chunks approved: rows 4–6; "Diff judge" background block (for the assistant's understanding only); Sequence table (10 steps); self-challenge prompt (+ "Anything else you see is wrong?").
- Writing rule (user): documents never mention the pilots or this session.
- "Why" chunk approved (no pilot references).
- D52 (user): merge-ready is ALWAYS the user's (operator's) decision. The judge may only RECOMMEND an adjustment (e.g. blockers or many majors); the user decides. → SCORE-DIFFS.md: judge outputs a merge-ready recommendation per run.
- D53 (user): the verdict rules are NOT my concern; do not think for the judge. Verdict text stays unchanged.
- D54 (user): data-block changes approved: templates/run-report-small.md + run-report-large.md L59–63 → new judge fields (judge_total, judge_bonus, judge_blockers, judge_majors, judge_minors, judge_strengths, judge_merge_ready_advice none|no|yes); templates/README.md L55–56 rows; collect-results.py L121, L147 to read new fields (code shown separately). Existing reports have old judge fields → BENCHMARKS gets a task for the ASSISTANT: read the template and bring each report's data block to it. Field names are NOT repeated in BENCHMARKS.md.
- D55 (user): section 7 tree: + SCORE-DIFFS.md (diff judge prompt), + saleor/scripts/score-diffs.py (totals from the diff judge's JSON), reports/ = "diff judge JSON, summary tables" (mapping.csv removed).
- D56 (user): section 4 line 328 → "...it is not a mistake. Applies to section 4, running the task. Does not apply to the section 6 diff judge, which uses its own prompt." No file link there.
- D57 (user): row 4 uses plain text "(prompt: SCORE-DIFFS.md)", no link (a link invites the assistant to read it; the prompt is ONLY for the judge).
- D58 (user): NO "not told = not a defect" rule in SCORE-DIFFS.md: the judge compares diffs, not task implementation.
- Item 3 (BENCHMARKS.md text) complete pending approval.
- LESSON (user): think about consequences of every proposed rule. "Not told = not a defect" in the judge prompt = an escape hatch: the AI would use it to avoid thinking and exclude everything. Check each rule for how a judge could misuse it.
- ITEM 3 APPROVED (user: "approve item 3"). Item 4 starts: author SCORE-DIFFS.md using cto-knowledge-hub/skills-authoring.md.
- CORRECTION (user): consequence thinking is NOT about "rules like X" — it is a plain, independent principle that applies EVERYWHERE.
- Item 4: user: "just draft the prompt using this file rules, you already had a lot answered. Ask directly what is unclear or partially clear."
- D59 (user): judge uses ONLY git diffs and repos; anything else ONLY when REALLY-REALLY needed → constraint SOURCES. "Instructions from real failures" kept. Draft length accepted. Script approved → written: rosetta-benchmarks/saleor/scripts/score-diffs.py (repo, uncommitted); tested in scratchpad/script-test: totals match hand calc (69.0, 69.1); rejects missing metric, '-' without evidence, 7, N/A, unknown finding, bad advice.
- OPEN: leaderboard order — script sorts by total; a run with a blocker can top it via bonus (test: run-b 1 blocker 69.1 > run-a 1 major 69.0). Primary result = counts. Ask.
- D60 (user): the script does NOT sort. The JUDGE (or subagent judge) decides the leaderboard. Script prints runs in the JSON order; the judge writes runs in its leaderboard order. No-goal fixed: "Rating a run relative to another run" (was "Ranking runs against each other", which contradicted the judge's leaderboard).
- D61 (user): SCOPE "is NOT a defect". BONUS (was FIXED-BUG): fixed pre-existing bug → 9.1 strength + bonus; distinct improvement related to the job → 9.2 strength + bonus; level by own impact; only reported → no bonus. 9.2 check text = "distinct improvement related to the job". SUBAGENTS rule (replaces RELAY): with rounds, do NOT decide or think for subagents; ask them for info; forward any request/question about a subagent's decision to it (resume if stopped); never answer it yourself. JSON/script bonus field renamed bug_level → level. Section 2 approved with these changes.
- CONSEQUENCE: approved BENCHMARKS text says bonus = "each fixed bug" and README row "Bonus points for bugs the run fixed" → must also say "or distinct related improvement".
- D62 (user): BENCHMARKS bonus text + README judge_bonus row extended to "fixed bugs and distinct improvements related to the job" (approved). Script: writes "totals" (total, bonus, blockers, majors, minors, strengths, categories) into each run of the SAME JSON; prints ONLY the calculated values per run; no table, no repeated JSON data. Tested: values match, rerun idempotent, invalid JSON untouched (exit 1). SCORE-DIFFS JSON: "totals" written by the script; the judge NEVER writes it.
- D63 (user): script prints, per run report, exactly the data-block fields the assistant copies (judge_total, judge_bonus, judge_blockers, judge_majors, judge_minors, judge_strengths, judge_merge_ready_advice) under the report path saleor/runs/<task>/<runner>/<method>/report.md. JSON shape: {"task", "runner", "runs": {<method folder>: ...}}; script fails if the report.md for a folder name does not exist. Tested OK. NOTE: templates still hold old fields until the approved template edits are applied.
- D64 (user): script output starts with a guiding line: "GIVE THIS OUTPUT TO THE USER, field names unchanged, to build the run reports: each block goes into the data block of the report.md named above it." Tested.
- D65 (user): rounds subagents get EXACTLY the same original prompt, this file and the same inputs (+ temp file). Validator checks the top runs of the FINAL leaderboard that fit one context (all fit → all); gets the same original prompt, this file, inputs, JSON + its own prompt (quick check, then dig into each conflict; checks evidence, grounding, both sides, impact, missed gaps/strengths, nitpicks, count-once, values table, cross-run evidence). The judge DIGS into each conflict to confirm or refute; never decides a conflict from its own earlier view without digging.
- D66 (user, CORRECTED): the VALIDATOR digs: quick check of everything, then DIG DEEPER into each conflict until it confirms its conclusion; never reports a conflict from its own thoughts alone. The judge DECIDES each conflict (accept/reject + reason). (My "judge digs" was a misreading; I also flipped instead of explaining.) Section 3 APPROVED.
- D67 (user): hint 5 = why the validator digs; real failures 11 (rule invented and stated as given) and 12 (conclusion before ALL inputs loaded) added.
- D68 (user): 9.2 renamed "Related improvements" in SCORE-DIFFS.md AND in the BENCHMARKS.md background H9 line ("H9 Extra: fixes of earlier bugs 0.5, related improvements 0.5"). Section 5 APPROVED.
- D69 (user): BENCHMARKS self-challenge prompt ends "...and repeat the RULE-REPORT" (not "self-check report"). Clear losers are NOT stored in the JSON: subagents report them in their output; the judge reads subagent output and can message subagents. Temp ratings file stays (user's procedure). Section 6 approved.
- TEST CLEAN (user: ONE subagent, the same two methods): fixture scratchpad/test1 (real copies of baseline + rosetta-light run folders, task.md from BENCHMARKS task 1 + its extra answers, out/). Judge = fresh general-purpose subagent, Sonnet 5.5, first message as the assistant would give it. Running.
## TEST CLEAN result (1 Sonnet judge, baseline vs rosetta-light, 6 diffs + base repos + task.md)
Verified by me: CONTRIBUTING.md L30 "CI requires one [changeset]" → RL 8.2 major grounded · extra answer 6 (trim whitespace) → 1.1 minors grounded (I missed them in pilots) · baseline saleor.diff removes NO test function → "test for it was dropped" not in the diff (came from report.md/agent-report; judge.json never cites them).
Method findings (candidates, pending audit answer):
- T1 SOURCES too weak: judge read report.md + agent-report.md "for facts the diff cannot show"; one such fact is visible in the diff anyway; report.md holds operator scores (anchoring). GROUNDED lists "the run's Q&A" (lives in report.md) → conflicts with SOURCES.
- T2 Relative contamination via strengths: RL got strengths for NOT breaking (1.4 major), for mitigating a crash its OWN design would cause (1.2 major), for following documented repo mechanisms (mapProductExtensions, @lockSchema). Prompt has "pattern = NOT a defect" but nothing says "expected behavior / following the rule = '-' (not a strength)", and "prevents harm" is read as "prevents harm it introduced itself".
- T3 SCOPE breach: baseline 1.2 minor for a PRE-EXISTING bulk-translate bug (fixed by the other run) + unsupported "test dropped".
- T4 Nitpicks still recorded: RL 7.1 triple normalization (user called this kind ok-ish), RL 8.2 "Next" heading.
- T5 Validator not run, no reason given (subagent likely has no Agent tool); RULE-REPORT gave "NOT" without why and used N/A (format allows only FULLY|PARTLY|NOT).
- T6 Self-report unreliable: ABSOLUTE/SCOPE/MATERIAL marked FULLY/PARTLY despite T2–T4 → validator + self-challenge are needed (confirms design).
- T7 Wrote /tmp/mk.py outside the allowed folder (harness rule breach).
Good: grounded use of extra answers (6, 25), cross-repo levels settled, after-state reconstructed for line numbers, JSON valid, script run without reading it.
- Test fixes APPROVED and applied: P4 (MATERIAL + "If you hesitate whether it is material, it is NOT."), P5 (VALIDATOR MUST; cannot start → say so), P6 (routing restored in COUNT-ONCE), P7 (value = WORST level present + its count), P9 (No-goals: "whether tests pass"). P8 REJECTED (user): the judge reviews diffs with the base code; new-file line numbers come from hunk headers; no rebuild needed.
- P1 (user): why/where is the run's Q&A needed? The assistant already gives hidden answers + extra answers. → "the run's Q&A" in GROUNDED and "decision the agent was told" were my wording without a provided source. P2/P3 wording rejected as imprecise → rework.
- User rule (alwayson) now: "MUST be professionally direct, concise, precise, terse, no filler, polite; ..." — imprecision was NOT caused by "compressed" (P3 proves it).
- P1 APPROVED + applied: GROUNDED without "the run's Q&A"; blocker = "contradicts a hidden-question answer or an extra answer".
- NEW RULE (user) applied as constraint 1 QUALITY: "be SYSTEMATIC and METHODICAL. PRECISION is important: it builds the actual evidence and the report. QUALITY matters most."
- P2 (user): the RL guard followed the original code and did not exist before → it did right. My fix pushed my vision; the fresh-eye review exists for that. Strength baseline = BEYOND the task and the HIDDEN-question answers (NOT extra answers: extra answers mean the agent ASKED and did MORE than expected).
- P3 (user): "even when the run's new code passes through it" = overly complex → something is wrong in the big picture. Pre-existing defects are already a No-goal; the judge broke it; the validator exists to catch that.
- P2 APPROVED + applied: constraint STRENGTH (after IMPACT): "a strength is a positive impact BEYOND what the task and the hidden-question answers require. Doing what they require is `-`." P3 APPROVED + applied: real failure 13 "A defect that existed before the run rated against the run." (no new rule).
- D70 (user): round subagents are also general-purpose (Opus 5.5, xhigh). Applied to step 3.2.
- User: "we are good with this prompt" (no rerun). Authoring RULE-REPORT written: scratchpad/step4/RULE-REPORT.md. Repo edits still pending user's go ("No edits at all - I'll tell").
- REPO EDITS APPLIED (user go): SCORE-DIFFS.md (new), score-diffs.py (new), BENCHMARKS.md (s4 L328, s6, s7), templates small/large L59–63, templates/README.md rows, collect-results.py (new judge columns; tested on real reports). User confirmed: self-challenge "values table"; SCORE-DIFFS step 3.5 general-purpose subagent. EXPERIMENTS.md L20 → "This ID is for operators only; the diff judge uses the run folder names." Not committed.
- D71 (user): judge size budget 300K → ~350K tokens (SCORE-DIFFS.md process steps 1 and 3.1). Judge folder `~/saleor-judge` outside the Rosetta repo (BENCHMARKS.md section 6, rows 1 and 3, "Why"); totals script path = the path given in the first message.
- D72 (user): rule 11 "VERIFY every line number in the file" made the judge apply the diffs to copies of the base repos to build after-change trees. User: a judge reads, it does not build or calculate. EVIDENCE now: `new` = `repo:path` after the change · `old` = `repo:path` before the change (deletions) · `base` = `repo:path:Lx-Ly` at `baseline-v1` · ALWAYS + a verbatim quote. The quote is the evidence for changed code; line numbers stay only for base files, which are on disk. JSON example: `"loc": "repo:path (base: repo:path:Lx-Ly)"`. Supersedes P8 ("new-file line numbers come from hunk headers").
- D73 (user): no guard sentence for a one-off judge mistake. The judge added two sentences to SCORE-DIFFS.md in the session and removed both (02:18 UTC): (1) rule 2 SOURCES, appended "READ them as they are: NEVER apply a diff, check out, copy or build a repo, or run code or tests."; (2) rule 11 EVIDENCE, appended "NEVER count lines in a diff.". Reason: the cause was the old rule 11 text "VERIFY every line number in the file.", which D72 removed.
- D74 (user): SCORE-DIFFS.md top: "JOB: JUDGE, nothing else. NEVER transform the inputs: no splitting, copying, converting or applying of diffs, no worktrees, no tag or git-state checks." Cause: the judge split the diffs into hand-written and generated parts and checked repo tags instead of rating. The first message to the judge has no input notes about the diffs.
- D75 (user): SCORE-DIFFS.md gets the CONTEXT paragraph under JOB: diffs or rounds first, nothing in advance. Cause: the judge loaded base-repo code before it read any diff.
- D76 (user): Starter process: heading without "ADAPT to context"; step 1: only the word-count estimate decides FITS or ROUNDS, no other count, no override; step 3.1: every group in every round must have at least 3 runs. Cause: the judge recounted with the Read tool's token numbers, overrode FITS citing "ADAPT to context", and put superpowers alone in a group with nothing to compare.
- D77 (user): self-challenge prompt names "missing findings (negatives and strengths) in any run and any metric"; SCORE-DIFFS.md constraint 20 ALL: record every material finding, never stop at the first blocker, first major, a few findings, or a value that cannot get worse.
- D78 (user): order = rating → self-challenge → validator (supersedes the D50 order). SCORE-DIFFS.md step 4: after the JSON, run totals, report the leaderboard and STOP; step 5 starts only after the operator's explicit approval. BENCHMARKS.md section 6: measures rows 5/6 swapped, sequence rows 4–9 follow this order; the approval is `Approved, continue.`
- D79 (user): JSON run order does not matter; points do. JSON heading without "runs in YOUR leaderboard order"; the judge reads the totals and selects the top runs itself. Supersedes the JSON-order part of D60.

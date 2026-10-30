# SCORE-DIFFS

FOLLOW EXACTLY. REPORT on EVERY rule by rule-id at the end (RULE-REPORT).

JOB: JUDGE, nothing else. NEVER transform the inputs: no splitting, copying, converting or applying of diffs, no worktrees, no tag or git-state checks.

LLM CONTEXT IS CRITICALLY IMPORTANT. After SIZE (step 1), FIRST load the diffs (step 2) or start the rounds (step 3). Everything else ONLY when a specific finding or `-` needs it. NOTHING in advance.

## Responsibility

Rate HOW each run built its change: code quality, coverage, edge cases, complexity, maintainability, DSM, coupling, following original architecture and principles, minimal and fully correct changes, logging. Ratings are ABSOLUTE, except the DELTA bonus (constraint 22). Keep the FINAL ratings in the JSON.

## No-goals

- WHETHER the task was done. Follow-ups, hidden-question coverage, whether tests pass, time and usage are measured elsewhere.
- Code, defects and patterns that existed before the run.
- Rating a run relative to another run. Only exception: the DELTA bonus against the `baseline` run (constraint 22).
- The merge-ready decision. The operator decides; you only advise.

## Constraints

1. QUALITY: be SYSTEMATIC and METHODICAL. PRECISION is important: it builds the actual evidence and the report. QUALITY matters most.
2. SOURCES: use ONLY the git diffs and the repos. Anything else ONLY when REALLY-REALLY needed. NEVER read `report.md`, `agent-report.md` or `BENCHMARKS.md`.
3. SCOPE: rate ONLY lines the run added, changed or removed, and their direct effect on code that uses them. Following an existing project pattern is NOT a defect.
4. ABSOLUTE: rate against rules, patterns and answers. Another run MAY show you where to look. It is NEVER evidence. Only exception: DELTA (22) compares with the `baseline` run by design. The answers a run was directed with explain its reason (23) and ground findings (5); a run that was NOT directed with an answer is STILL rated against it.
5. GROUNDED: EVERY finding cites a base-repo rule or pattern, the task, a hidden-question answer, an extra answer, an answer the run was directed with, or a concrete failure in the code. NO invention. NO assumption. Cannot prove it → NOT a finding.
6. BOTH-SIDES: BEFORE recording ANY difference, state its purpose and value. Weigh the POSITIVE side against the NEGATIVE side.
7. MATERIAL: record ONLY what a senior reviewer would act on: fix it or praise it. NO nitpicks. If you hesitate whether it is material, it is NOT.
8. IMPACT: the level of a finding = the impact of the finding ITSELF (what is harmed or improved, how much, for whom). NEVER its type (missing, wrong, extra, could be better). The level = the harm that REMAINS after existing safeguards (in the run's diff or the base repo: a downstream trim, a linter or CI check, an existing validation), cited as evidence. Name who is affected.
9. STRENGTH: a strength is a positive impact BEYOND what the task and the hidden-question answers require. Doing what they require is `-`. Tests that guard MORE than the new behaviour itself ARE a strength in their 4.x metric: a contract or architecture rule, a negative path the repo leaves untested, a shared mechanism. The level comes from the impact.
10. COUNT-ONCE: one root cause = ONE finding = ONE metric. Route by root cause: behaves → H1 · safe → H2 · where it sits, what it reuses or depends on → H3 · tests → H4 · cost → H5 · how much changed → H6 · how it is written → H7 · docs → H8 · beneficial extra → H9 · missing in another place of the repo / another repo → 0.1 / 0.2. A missing doc or changelog entry for a change already rated negative is at most minor.
11. EVIDENCE: `new` = `repo:path` after the change · `old` = `repo:path` before the change (deletions) · `base` = `repo:path:Lx-Ly` at `baseline-v1`. ALWAYS + a verbatim quote.
12. VALUES: EVERY metric of EVERY run gets a value from the values table OR `-` with evidence of what you checked. NOTHING ELSE.
13. CROSS-REPO: a level that depends on another repo is settled from that repo's diff BEFORE you record the finding.
14. CHECKLIST: do NOT rate whether the "Done when" items and the hidden-question answers exist. Rate HOW they were built. Present in one repo, missing in a consumer repo → 0.2. A UI surface that a hidden-question or extra answer names (a screen, a dialog), supported by the backend but missing in the consumer repo → 0.2.
15. OUT-OF-SCOPE: necessary for the task → no metric · beneficial → H9 · noise or harmful → 6.1 · breaks something → H1.
16. BONUS: a pre-existing bug the run fixed = a 9.1 strength AND a bonus entry. A distinct improvement related to the job = a 9.2 strength AND a bonus entry. A proactive safeguard = a 9.3 strength AND a bonus entry. Every DELTA item (22) = a bonus entry. The level comes from its own impact. Only reported, not fixed → NO bonus.
17. AI-DOCS: rate AI-session docs ONLY in 8.4.
18. SUBAGENTS: if rounds are used, do NOT make decisions or think for subagents. Ask them for any additional info you need. Forward ANY request or question about a subagent's decision to that subagent, resume it if it stopped, use its answer. NEVER answer it yourself.
19. MERGE-ADVICE: per run, advise on merge-ready with the reason: `none` = no advice · `no` = should not be merge-ready · `yes` = should be merge-ready. The operator decides.
20. ALL: record EVERY material finding of EVERY run in EVERY metric. NEVER stop at the first blocker, the first major, a few findings, or a value that cannot get worse.
21. SYMMETRY: missing coverage of a required behaviour, or of a 4.2 path (permission denied, public read, boundaries, empty values), is a negative even when the run wrote NO test. Writing tests NEVER scores lower than writing none for the same root cause.
22. DELTA: after rating, compare EVERY run with the `baseline` run (method folder `baseline`). List EVERY material, correct thing the run did that the baseline run did not do or did wrong, INCLUDING required items rated `-` under 9. Each item: evidence from the run, what the baseline run did instead (`repo:path` + verbatim quote, or absent + what you checked), the finding id that covers it or `-` + rule, and a bonus level by the item's own impact. Every item = a bonus entry. COUNT-ONCE: one root cause = one item; an item already rewarded by a 9.x bonus is NOT added again. An item with a negative finding of the same root cause gets the level of its net impact (6). The `baseline` run gets no DELTA. DELTA NEVER changes metric values and is NEVER evidence for them.
23. INTENT: think from the positive side FIRST. For EVERY difference from a base pattern, the task or an answer, ask why the run did it that way: does it make sense, does it follow a base rule or pattern, does it solve a problem the others may have missed. Check the reason in the base repos. A sound, proven reason with no real harm is NOT a negative; a reason that solves a real problem beyond the task is a strength. A contradiction of a hidden-question or extra answer is NEVER a blocker by itself: level it by its own impact (8), after weighing the reason. Write the reason you found, or that you found none, in `why`.

## Starter process

1. SIZE: tokens ≈ words in ALL diffs of ALL runs × 1.3. Budget: ~650K tokens (not bytes). ONLY this number decides FITS or ROUNDS: no other count, no override.
2. FITS: load ALL diffs of ALL runs at once. Rate.
3. ROUNDS (does not fit):
   1. Split the runs into disjoint groups that fit budget. Mix runs with small diffs and runs with large diffs. EVERY group in EVERY round MUST have at least 3 runs.
   2. One general-purpose subagent (Opus 5.5, xhigh) per group, in parallel. Give EXACTLY the same original prompt, this file and the same inputs, plus a temp file for its ratings. Every subagent also gets the `baseline` run's diffs as the DELTA reference; the `baseline` run is rated in ONE group only. Each subagent reports which of its runs are clear losers.
   3. Clear losers are EXCLUDED from further rounds. Their ratings stay UNCHANGED in the merged JSON.
   4. Merge all ratings into one JSON.
   5. Give the top-rated runs that fit a new context to a general-purpose subagent (Opus 5.5, xhigh) to build or revalidate their ratings.
   6. Repeat until the top of the top is selected.
   7. NEVER add your own rules or definitions for subagents.
4. JSON: write it to the path you were given. Run TOTALS (step 6), report the leaderboard, then STOP. Start step 5 ONLY after the operator's explicit approval.
5. VALIDATOR (MUST; cannot start it → say so, NEVER skip it silently): a FRESH general-purpose subagent (Opus 5.5, xhigh) checks the top runs of your FINAL leaderboard that fit one context (all fit → all). Give it EXACTLY the same original prompt, this file, the same inputs, the JSON and this:
   ```text
   Fresh-eye check of the judge's ratings for runs <list>. Do not modify any file.
   1. QUICK CHECK of every finding and every "-".
   2. For EACH conflict found: DIG DEEPER in the code until you CONFIRM your conclusion. NEVER report a conflict from your own thoughts alone.
   A conflict is: evidence is wrong (the line does not exist, the quote does not match) or not grounded; only one side, positive or negative, was weighed; a level does not follow the impact of the finding itself; a material gap or strength is missed; a nitpick is recorded; one root cause is counted more than once; a value does not follow the values table; another run is used as evidence outside DELTA; a SYMMETRY gap is missed; a DELTA item is missed, not grounded, counted twice or mis-leveled; the run's reason for a difference was not weighed, or a contradicted answer was leveled as a blocker without blocker-level impact (INTENT); a major whose `why` does not name the existing safeguards and the remaining harm.
   Return a numbered list: finding or metric · what is wrong · evidence · proposed change.
   ```
   DECIDE EACH conflict: accept or reject + reason. Record it in the JSON.
6. TOTALS: `python3 <totals script path you were given> <json>`. DO NOT read the script.

## Hints — ideas, not steps

1. Compare with a sibling: a similar existing field or feature in the base repo; check every place it appears. A place the new code skips → 0.1, 0.2, 1.5, 8.x.
2. Follow the data: each new value from input to storage to every output (API, webhooks, export, UI, logs) → 1.1, 2.2, 2.4 (who may see it and why), 5.1, 5.3.
3. Find every consumer of a changed API in all repos → 1.4, 0.2, 3.4.
4. Changed old lines, migrations, new imports: say what each is. Needed, a fix, an improvement or noise → 6.1, 6.4, 9.1, 9.2. Rewrite or lock of a table → 5.2. Import direction → 3.3.
5. Validator: a quick check alone gives false alarms. Unconfirmed objections would either damage correct ratings or be rejected by your own earlier view. So the validator confirms each conflict in the code, and you decide on its proof, not on opinion.

## Instructions from real failures

1. Line numbers taken from the diff file → wrong evidence.
2. A rule quoted from partial context lines → overstated.
3. One root cause rated in two or three metrics.
4. Points taken for nitpicks: similar tests in two files, a harmless wrapper.
5. A repeated limit rated as DRY waste. It gave the consumer knowledge it would otherwise guess → STRENGTH.
6. A level set by type ("missing = major"), not by impact.
7. A metric rated without evidence.
8. A backend change rated without the dashboard diff → wrong level.
9. A generated file not opened → a hand-edit of a downloaded schema missed.
10. A rule seen only in another run's diff used as evidence.
11. A rule invented and stated as if it were given.
12. A conclusion drawn before ALL inputs were loaded.
13. A defect that existed before the run rated against the run.
14. Every contradicted answer rated as a blocker by type: a non-null column with a default, a dialog the base keeps minimal on purpose.
15. Only the negative side read: a design that obeys a base rule ("do not edit the product route") rated as needless complexity.
16. A small remaining harm rated major as "ongoing cost": whitespace already trimmed downstream, a changeset type that the linter catches.
17. A missing option in an existing UI list, when the backend already supports it (a field in the export dialog), rated major. It is minor.

## Metrics — weight: critical 1 · high 0.9 · medium 0.75 · low 0.5

| # | Metric | Checks | W |
| --- | --- | --- | ---: |
| 0.1 | In-repo propagation | every place in the repo that this kind of change needs is updated | 1 |
| 0.2 | Cross-repo propagation | every consumer repo takes the change (queries, fragments, generated types, limits) | 1 |
| 1.1 | Logic & edge cases | null, empty, whitespace, boundaries, fallbacks | 1 |
| 1.2 | Error handling | the project's error mechanism; nothing swallowed; no crash path | 0.9 |
| 1.3 | Data & migration integrity | correct; nullable or with a default; no data rewrite; database matches API validation | 1 |
| 1.4 | Backward compatibility | no break of the API, payloads, exports, existing clients | 1 |
| 1.5 | UI accessibility & i18n | labels, semantics, strings through the repo's i18n | 0.75 |
| 2.1 | Authorization | enforced on the server by the project's mechanism | 1 |
| 2.2 | Input validation | on the server, the same as the UI limits | 0.9 |
| 2.3 | Injection & output encoding | no raw HTML, no unsafe queries | 1 |
| 2.4 | Data exposure | no PII or secrets in the API, logs, webhooks, exports | 1 |
| 3.1 | Logical placement | each concern in the layer the project uses for it | 0.9 |
| 3.2 | Reuse of existing mechanisms | extension points, helpers, framework mechanisms; files the repo marks off-limits | 0.9 |
| 3.3 | Coupling & dependency structure | no new cross-module dependencies or cycles; dependency direction kept | 0.9 |
| 3.4 | Cross-repo contract consistency | same names and types; generated files regenerated, not edited by hand | 0.9 |
| 4.1 | Behavior coverage | every new behavior has a test | 0.9 |
| 4.2 | Edge & negative coverage | boundaries, empty values, permission denied, partial updates | 0.9 |
| 4.3 | Assertion strength | tests fail if the feature breaks (API and stored state) | 0.9 |
| 4.4 | Test design & placement | right level, the repo's fixtures, not brittle | 0.75 |
| 4.5 | Existing-test integrity | no existing test weakened, skipped, deleted | 1 |
| 5.1 | Runtime & query cost | no N+1 queries, dataloaders used, no extra round trips | 0.75 |
| 5.2 | Migration & deploy cost | locks, table rewrites, deploy order | 0.75 |
| 5.3 | Logging & diagnostics | the project's logger, useful context, no noise | 0.5 |
| 6.1 | Scope discipline | no features, refactors, files nobody asked for | 0.9 |
| 6.2 | DRY | no duplicated logic, constants, fragments, tests | 0.75 |
| 6.3 | Leftovers & dead code | no unused or commented-out code, debug output, temp files | 0.75 |
| 6.4 | Incidental churn | no reformatting of untouched lines, no whole-file regeneration | 0.75 |
| 7.1 | KISS / YAGNI | simplest design that works; no speculative abstraction; no repeated defensive checks | 0.9 |
| 7.2 | SRP & complexity | one job per unit; size, nesting, branches | 0.75 |
| 7.3 | Naming | says what it is; domain terms | 0.75 |
| 7.4 | Comments | only where not obvious; no stale facts; no process references | 0.5 |
| 7.5 | Idiomatic & type-safe | idioms; precise types; no `any`; no unchecked casts | 0.75 |
| 8.1 | API docs | schema descriptions, "added in" markers | 0.75 |
| 8.2 | Changelog / changeset | as the repo's rules require; breaking changes in the breaking section | 0.5 |
| 8.3 | Developer & user docs | only where the project documents similar features | 0.5 |
| 8.4 | AI-session context docs | accurate, short, the same as the code; updated together with the code = minor strength | 0.5 |
| 9.1 | Fixes of earlier bugs | each fixed bug (also a bonus entry) | 0.5 |
| 9.2 | Related improvements | distinct improvement related to the job (also a bonus entry) | 0.5 |
| 9.3 | Proactive safeguards | a non-test check beyond the task that prevents a future regression (also a bonus entry); tests go to 4.x | 0.5 |

## Levels and values — MUST

| Level | Negative | Strength |
| --- | --- | --- |
| Critical | **Blocker**: breaks behavior, data or security. A contradicted answer is a blocker only when its impact is (23) | prevents or fixes blocker-level harm (behavior, data, security) |
| Major | real harm that remains after existing safeguards, to customers, staff, API clients or other teams | removes a real risk or ongoing cost, OR clearly helps users or other teams |
| Minor | worth fixing, small impact | helpful, small positive impact |

| Value | Findings in the metric |
| --- | --- |
| 0 | ≥ 2 blockers |
| 1 | 1 blocker |
| 2 | ≥ 3 majors |
| 3 | 2 majors |
| 4 | 1 major |
| 5 | ≥ 2 minors |
| 6 | 1 minor |
| `-` | nothing material; evidence says what you checked |
| 8 | minor strengths only |
| 9 | 1 major strength |
| 10 | a critical strength, OR ≥ 2 major strengths |

The value comes from the WORST level present and its count. Lower levels and strengths do not change it.

Bonus levels: critical · high · medium · low, by the fix's, improvement's or DELTA item's own impact: critical = prevents or fixes blocker-level harm · high = removes a real risk or ongoing cost, or clearly helps users or other teams · medium = a clear but contained benefit · low = a small benefit.

Bonus points per entry: critical 1 · high 0.9 · medium 0.75 · low 0.5.

## JSON — folder names exactly

```jsonc
{
  "task": "<task folder>", "runner": "<runner folder>",
  "runs": {
    "<method folder>": {
      "findings": [{"id": "<method>-1", "metric": "1.4", "type": "negative | strength",
                    "level": "critical | major | minor",
                    "evidence": [{"kind": "new | old | base", "loc": "repo:path (base: repo:path:Lx-Ly)", "quote": "..."}],
                    "grounding": "...", "why": "positive: ... / negative: ...", "impact": "..."}],
      "values": {"0.1": {"v": 4, "findings": ["<method>-1"]}, "0.2": {"v": "-", "checked": "..."}},
      "bonus": [{"finding": "<method>-3", "level": "critical | high | medium | low"},
                {"finding": "<method>-d1", "level": "critical | high | medium | low"}],  // -dN = a DELTA item
      "delta": [{"id": "<method>-d1", "item": "...",
                 "evidence": [{"kind": "new | old | base", "loc": "...", "quote": "..."}],
                 "baseline": "what the baseline run did instead: repo:path + quote, or absent + what was checked",
                 "covered_by": "<finding id> | - + rule", "level": "critical | high | medium | low"}],
      "merge_advice": {"advice": "none | no | yes", "reason": "..."},
      "objections": [{"from": "validator", "text": "...", "decision": "accept | reject", "reason": "..."}],
      "totals": {}  // written by the totals script; NEVER write it yourself
    }
  }
}
```

## RULE-REPORT

At the end, for EVERY constraint and EVERY process step: `<rule-id> → where applied → FULLY | PARTLY | NOT + why`. A rule missing from the report counts as NOT applied.

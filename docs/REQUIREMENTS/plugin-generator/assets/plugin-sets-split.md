# Plugin sets split: what is where

Record of the split of `instructions/r3/` into five plugin-set folders (ticket #315). Use it to re-split the instruction tree later. Related units: [FR-SET-0001](../FR-SET.md), [FR-SET-0020](../FR-SET.md). Catalog copy: [plugins.split.json](plugins.split.json) (byte copy of `src/rosettify-plugins/plugins.json` for the split layout).

## Summary

| Set folder | Files | `requires` | Bootstrap | Hooks | Destination after collapse |
|---|---|---|---|---|---|
| `core` | 223 | none | yes | dangerous-actions, read-once, loose-files, md-file-advisory, codemap-refresh, lint-format-advisory | stays in `core/` |
| `workflows` | 38 | `core` | no | none | merged into `core/`, same relative subpath |
| `qe` | 60 | `core`, `workflows` | no | none | merged into `core/`, same relative subpath |
| `search` | 42 | `core`, `workflows` | no | none | merged into `core/`, same relative subpath |
| `modernization` | 9 | `core`, `workflows` | no | none | merged into `core/`, same relative subpath |

Moved files: 149. `core` keeps its 223 files.

The catalog also declares a set `rosetta` (folders `core, workflows, qe, search, modernization`, `requires` none, bootstrap yes, hooks as `core`, release `r3`, variants `` and `-light`). It builds the combined plugin from all five folders.

## Sets

### `core`

- Purpose: Rosetta Core - foundation instruction set, rules, skills, and guardrails.
- Releases: r2, r3. `requires`: none. Bootstrap: yes. Hooks: dangerous-actions, read-once, loose-files, md-file-advisory, codemap-refresh, lint-format-advisory.
- Files: 223 (`git ls-files instructions/r3/core`).
- Target path: unchanged.
- File list: not repeated here; run `git ls-files instructions/r3/core`. The 33 split-era text edits to core files are listed under Split-era text edits.

### `workflows`

- Purpose: Rosetta Workflows - orchestration workflows and specialist subagents. Requires Rosetta Core.
- Releases: r3. `requires`: core. Bootstrap: no. Hooks: none (no `hooks/` folder, no `hooks.json`).
- Files: 38 (listed below; the folder existed up to commit `a3e42a6c`).
- Target path: `instructions/r3/core/<same relative subpath>`.

| File (relative to set folder) | Target path after collapse |
|---|---|
| `agents/architect.md` | `core/agents/architect.md` |
| `agents/architect~profile-lightweight-only~overwrite~.md` | `core/agents/architect~profile-lightweight-only~overwrite~.md` |
| `agents/discoverer.md` | `core/agents/discoverer.md` |
| `agents/discoverer~profile-lightweight-only~overwrite~.md` | `core/agents/discoverer~profile-lightweight-only~overwrite~.md` |
| `agents/engineer.md` | `core/agents/engineer.md` |
| `agents/engineer~profile-lightweight-only~overwrite~.md` | `core/agents/engineer~profile-lightweight-only~overwrite~.md` |
| `agents/executor.md` | `core/agents/executor.md` |
| `agents/executor~profile-lightweight-only~overwrite~.md` | `core/agents/executor~profile-lightweight-only~overwrite~.md` |
| `agents/planner.md` | `core/agents/planner.md` |
| `agents/planner~profile-lightweight-only~overwrite~.md` | `core/agents/planner~profile-lightweight-only~overwrite~.md` |
| `agents/prompt-engineer.md` | `core/agents/prompt-engineer.md` |
| `agents/prompt-engineer~profile-lightweight-only~overwrite~.md` | `core/agents/prompt-engineer~profile-lightweight-only~overwrite~.md` |
| `agents/requirements-engineer.md` | `core/agents/requirements-engineer.md` |
| `agents/requirements-engineer~profile-lightweight-only~overwrite~.md` | `core/agents/requirements-engineer~profile-lightweight-only~overwrite~.md` |
| `agents/researcher.md` | `core/agents/researcher.md` |
| `agents/researcher~profile-lightweight-only~overwrite~.md` | `core/agents/researcher~profile-lightweight-only~overwrite~.md` |
| `agents/reviewer.md` | `core/agents/reviewer.md` |
| `agents/reviewer~profile-lightweight-only~overwrite~.md` | `core/agents/reviewer~profile-lightweight-only~overwrite~.md` |
| `agents/validator.md` | `core/agents/validator.md` |
| `agents/validator~profile-lightweight-only~overwrite~.md` | `core/agents/validator~profile-lightweight-only~overwrite~.md` |
| `workflows/adhoc-flow.md` | `core/workflows/adhoc-flow.md` |
| `workflows/code-analysis-flow.md` | `core/workflows/code-analysis-flow.md` |
| `workflows/coding-agents-prompting-flow.md` | `core/workflows/coding-agents-prompting-flow.md` |
| `workflows/coding-flow.md` | `core/workflows/coding-flow.md` |
| `workflows/coding-flow~profile-lightweight-only~overwrite~.md` | `core/workflows/coding-flow~profile-lightweight-only~overwrite~.md` |
| `workflows/coding-light-flow.md` | `core/workflows/coding-light-flow.md` |
| `workflows/external-lib-flow.md` | `core/workflows/external-lib-flow.md` |
| `workflows/requirements-authoring-flow.md` | `core/workflows/requirements-authoring-flow.md` |
| `workflows/research-flow.md` | `core/workflows/research-flow.md` |
| `workflows/security-flow-authorize.md` | `core/workflows/security-flow-authorize.md` |
| `workflows/security-flow-deterministic-gates.md` | `core/workflows/security-flow-deterministic-gates.md` |
| `workflows/security-flow-independent-review.md` | `core/workflows/security-flow-independent-review.md` |
| `workflows/security-flow-inspect-and-test.md` | `core/workflows/security-flow-inspect-and-test.md` |
| `workflows/security-flow-model-and-select.md` | `core/workflows/security-flow-model-and-select.md` |
| `workflows/security-flow-normalize-and-triage.md` | `core/workflows/security-flow-normalize-and-triage.md` |
| `workflows/security-flow-readiness.md` | `core/workflows/security-flow-readiness.md` |
| `workflows/security-flow-report-and-package.md` | `core/workflows/security-flow-report-and-package.md` |
| `workflows/security-flow.md` | `core/workflows/security-flow.md` |

### `qe`

- Purpose: Rosetta QE - test automation and quality-engineering workflows. Requires Rosetta Core and Workflows.
- Releases: r3. `requires`: core, workflows. Bootstrap: no. Hooks: none (no `hooks/` folder, no `hooks.json`).
- Files: 60 (listed below; the folder existed up to commit `a3e42a6c`).
- Target path: `instructions/r3/core/<same relative subpath>`.

| File (relative to set folder) | Target path after collapse |
|---|---|
| `skills/qa-knowledge/README.md` | `core/skills/qa-knowledge/README.md` |
| `skills/qa-knowledge/SKILL.md` | `core/skills/qa-knowledge/SKILL.md` |
| `skills/qa-knowledge/assets/api-analysis-template.md` | `core/skills/qa-knowledge/assets/api-analysis-template.md` |
| `skills/qa-knowledge/assets/api-aqa-test-impl-record.md` | `core/skills/qa-knowledge/assets/api-aqa-test-impl-record.md` |
| `skills/qa-knowledge/assets/approval-gate.md` | `core/skills/qa-knowledge/assets/approval-gate.md` |
| `skills/qa-knowledge/assets/code-analysis-report-template.md` | `core/skills/qa-knowledge/assets/code-analysis-report-template.md` |
| `skills/qa-knowledge/assets/failure-report-template.md` | `core/skills/qa-knowledge/assets/failure-report-template.md` |
| `skills/qa-knowledge/assets/gap-finding-templates.md` | `core/skills/qa-knowledge/assets/gap-finding-templates.md` |
| `skills/qa-knowledge/assets/page-source-capture-instructions.md` | `core/skills/qa-knowledge/assets/page-source-capture-instructions.md` |
| `skills/qa-knowledge/assets/proposed-change-template.md` | `core/skills/qa-knowledge/assets/proposed-change-template.md` |
| `skills/qa-knowledge/assets/test-spec-template.md` | `core/skills/qa-knowledge/assets/test-spec-template.md` |
| `skills/qa-knowledge/assets/ui-aqa-clarification-templates.md` | `core/skills/qa-knowledge/assets/ui-aqa-clarification-templates.md` |
| `skills/qa-knowledge/assets/ui-aqa-plan-template.md` | `core/skills/qa-knowledge/assets/ui-aqa-plan-template.md` |
| `skills/qa-knowledge/assets/ui-aqa-test-impl-record.md` | `core/skills/qa-knowledge/assets/ui-aqa-test-impl-record.md` |
| `skills/qa-knowledge/references/analysis-modes.md` | `core/skills/qa-knowledge/references/analysis-modes.md` |
| `skills/qa-knowledge/references/api-aqa-failure-taxonomy.md` | `core/skills/qa-knowledge/references/api-aqa-failure-taxonomy.md` |
| `skills/qa-knowledge/references/gap-analysis-catalogs.md` | `core/skills/qa-knowledge/references/gap-analysis-catalogs.md` |
| `skills/qa-knowledge/references/gwt-spec.md` | `core/skills/qa-knowledge/references/gwt-spec.md` |
| `skills/qa-knowledge/references/implementation-examples.md` | `core/skills/qa-knowledge/references/implementation-examples.md` |
| `skills/qa-knowledge/references/synthesis-catalogs.md` | `core/skills/qa-knowledge/references/synthesis-catalogs.md` |
| `skills/qa-knowledge/references/test-execution-triage.md` | `core/skills/qa-knowledge/references/test-execution-triage.md` |
| `skills/qa-knowledge/references/testrail-export.md` | `core/skills/qa-knowledge/references/testrail-export.md` |
| `skills/qa-knowledge/references/testrail-format.md` | `core/skills/qa-knowledge/references/testrail-format.md` |
| `skills/qa-knowledge/references/ui-aqa-failure-taxonomy.md` | `core/skills/qa-knowledge/references/ui-aqa-failure-taxonomy.md` |
| `skills/qa-knowledge/references/vendor-fork-guide.md` | `core/skills/qa-knowledge/references/vendor-fork-guide.md` |
| `skills/qa-structure/README.md` | `core/skills/qa-structure/README.md` |
| `skills/qa-structure/SKILL.md` | `core/skills/qa-structure/SKILL.md` |
| `skills/qa-structure/assets/api-aqa-config-interview.md` | `core/skills/qa-structure/assets/api-aqa-config-interview.md` |
| `skills/qa-structure/assets/api-aqa-project-config-template.md` | `core/skills/qa-structure/assets/api-aqa-project-config-template.md` |
| `skills/qa-structure/assets/ui-aqa-state-template.md` | `core/skills/qa-structure/assets/ui-aqa-state-template.md` |
| `skills/qa-structure/references/api-aqa-layout.md` | `core/skills/qa-structure/references/api-aqa-layout.md` |
| `skills/qa-structure/references/config-schema.md` | `core/skills/qa-structure/references/config-schema.md` |
| `skills/qa-structure/references/ui-aqa-layout.md` | `core/skills/qa-structure/references/ui-aqa-layout.md` |
| `workflows/api-aqa-flow-api-spec-analysis.md` | `core/workflows/api-aqa-flow-api-spec-analysis.md` |
| `workflows/api-aqa-flow-data-collection.md` | `core/workflows/api-aqa-flow-data-collection.md` |
| `workflows/api-aqa-flow-execution-and-report-analysis.md` | `core/workflows/api-aqa-flow-execution-and-report-analysis.md` |
| `workflows/api-aqa-flow-gap-and-requirements-clarification.md` | `core/workflows/api-aqa-flow-gap-and-requirements-clarification.md` |
| `workflows/api-aqa-flow-project-config-loading.md` | `core/workflows/api-aqa-flow-project-config-loading.md` |
| `workflows/api-aqa-flow-test-case-specification.md` | `core/workflows/api-aqa-flow-test-case-specification.md` |
| `workflows/api-aqa-flow-test-correction.md` | `core/workflows/api-aqa-flow-test-correction.md` |
| `workflows/api-aqa-flow-test-implementation.md` | `core/workflows/api-aqa-flow-test-implementation.md` |
| `workflows/api-aqa-flow.md` | `core/workflows/api-aqa-flow.md` |
| `workflows/aqa-flow.md` | `core/workflows/aqa-flow.md` |
| `workflows/testgen-flow-data-collection.md` | `core/workflows/testgen-flow-data-collection.md` |
| `workflows/testgen-flow-gap-and-contradiction-analysis.md` | `core/workflows/testgen-flow-gap-and-contradiction-analysis.md` |
| `workflows/testgen-flow-project-config-loading.md` | `core/workflows/testgen-flow-project-config-loading.md` |
| `workflows/testgen-flow-question-generation.md` | `core/workflows/testgen-flow-question-generation.md` |
| `workflows/testgen-flow-requirements-document-generation.md` | `core/workflows/testgen-flow-requirements-document-generation.md` |
| `workflows/testgen-flow-test-case-export.md` | `core/workflows/testgen-flow-test-case-export.md` |
| `workflows/testgen-flow-test-case-generation.md` | `core/workflows/testgen-flow-test-case-generation.md` |
| `workflows/testgen-flow.md` | `core/workflows/testgen-flow.md` |
| `workflows/ui-aqa-flow-code-analysis.md` | `core/workflows/ui-aqa-flow-code-analysis.md` |
| `workflows/ui-aqa-flow-data-collection.md` | `core/workflows/ui-aqa-flow-data-collection.md` |
| `workflows/ui-aqa-flow-requirements-clarification.md` | `core/workflows/ui-aqa-flow-requirements-clarification.md` |
| `workflows/ui-aqa-flow-selector-identification.md` | `core/workflows/ui-aqa-flow-selector-identification.md` |
| `workflows/ui-aqa-flow-selector-implementation.md` | `core/workflows/ui-aqa-flow-selector-implementation.md` |
| `workflows/ui-aqa-flow-test-correction.md` | `core/workflows/ui-aqa-flow-test-correction.md` |
| `workflows/ui-aqa-flow-test-implementation.md` | `core/workflows/ui-aqa-flow-test-implementation.md` |
| `workflows/ui-aqa-flow-test-report-analysis.md` | `core/workflows/ui-aqa-flow-test-report-analysis.md` |
| `workflows/ui-aqa-flow.md` | `core/workflows/ui-aqa-flow.md` |

### `search`

- Purpose: Rosetta Search - Solr schema, query, and semantic-search skills. Requires Rosetta Core and Workflows.
- Releases: r3. `requires`: core, workflows. Bootstrap: no. Hooks: none (no `hooks/` folder, no `hooks.json`).
- Files: 42 (listed below; the folder existed up to commit `a3e42a6c`).
- Target path: `instructions/r3/core/<same relative subpath>`.

| File (relative to set folder) | Target path after collapse |
|---|---|
| `skills/solr-extending/README.md` | `core/skills/solr-extending/README.md` |
| `skills/solr-extending/SKILL.md` | `core/skills/solr-extending/SKILL.md` |
| `skills/solr-extending/references/01-search-component.md` | `core/skills/solr-extending/references/01-search-component.md` |
| `skills/solr-extending/references/02-doc-transformer.md` | `core/skills/solr-extending/references/02-doc-transformer.md` |
| `skills/solr-extending/references/03-query-parser.md` | `core/skills/solr-extending/references/03-query-parser.md` |
| `skills/solr-extending/references/04-update-processor.md` | `core/skills/solr-extending/references/04-update-processor.md` |
| `skills/solr-extending/references/05-value-source-parser.md` | `core/skills/solr-extending/references/05-value-source-parser.md` |
| `skills/solr-extending/references/06-plugin-wiring.md` | `core/skills/solr-extending/references/06-plugin-wiring.md` |
| `skills/solr-query/README.md` | `core/skills/solr-query/README.md` |
| `skills/solr-query/SKILL.md` | `core/skills/solr-query/SKILL.md` |
| `skills/solr-query/references/01-lucene-syntax.md` | `core/skills/solr-query/references/01-lucene-syntax.md` |
| `skills/solr-query/references/02-local-params.md` | `core/skills/solr-query/references/02-local-params.md` |
| `skills/solr-query/references/03-edismax.md` | `core/skills/solr-query/references/03-edismax.md` |
| `skills/solr-query/references/04-block-join.md` | `core/skills/solr-query/references/04-block-join.md` |
| `skills/solr-query/references/05-json-facets.md` | `core/skills/solr-query/references/05-json-facets.md` |
| `skills/solr-query/references/06-tag-exclude.md` | `core/skills/solr-query/references/06-tag-exclude.md` |
| `skills/solr-query/references/07-knn.md` | `core/skills/solr-query/references/07-knn.md` |
| `skills/solr-query/references/08-explain.md` | `core/skills/solr-query/references/08-explain.md` |
| `skills/solr-query/references/09-function-spatial.md` | `core/skills/solr-query/references/09-function-spatial.md` |
| `skills/solr-query/references/10-common-errors.md` | `core/skills/solr-query/references/10-common-errors.md` |
| `skills/solr-query/references/11-doc-transformers.md` | `core/skills/solr-query/references/11-doc-transformers.md` |
| `skills/solr-query/references/12-relevancy.md` | `core/skills/solr-query/references/12-relevancy.md` |
| `skills/solr-schema/README.md` | `core/skills/solr-schema/README.md` |
| `skills/solr-schema/SKILL.md` | `core/skills/solr-schema/SKILL.md` |
| `skills/solr-schema/references/01-field-types.md` | `core/skills/solr-schema/references/01-field-types.md` |
| `skills/solr-schema/references/02-analyzer-asymmetry.md` | `core/skills/solr-schema/references/02-analyzer-asymmetry.md` |
| `skills/solr-schema/references/03-docvalues-stored-indexed.md` | `core/skills/solr-schema/references/03-docvalues-stored-indexed.md` |
| `skills/solr-schema/references/04-synonyms.md` | `core/skills/solr-schema/references/04-synonyms.md` |
| `skills/solr-schema/references/05-solrconfig-review.md` | `core/skills/solr-schema/references/05-solrconfig-review.md` |
| `skills/solr-schema/references/06-anti-patterns.md` | `core/skills/solr-schema/references/06-anti-patterns.md` |
| `skills/solr-schema/references/07-live-inspection.md` | `core/skills/solr-schema/references/07-live-inspection.md` |
| `skills/solr-schema/references/08-schemaless-managed-api.md` | `core/skills/solr-schema/references/08-schemaless-managed-api.md` |
| `skills/solr-semantic-search/README.md` | `core/skills/solr-semantic-search/README.md` |
| `skills/solr-semantic-search/SKILL.md` | `core/skills/solr-semantic-search/SKILL.md` |
| `skills/solr-semantic-search/references/01-architecture.md` | `core/skills/solr-semantic-search/references/01-architecture.md` |
| `skills/solr-semantic-search/references/02-concept-indexing.md` | `core/skills/solr-semantic-search/references/02-concept-indexing.md` |
| `skills/solr-semantic-search/references/03-tagging.md` | `core/skills/solr-semantic-search/references/03-tagging.md` |
| `skills/solr-semantic-search/references/04-graph-paths.md` | `core/skills/solr-semantic-search/references/04-graph-paths.md` |
| `skills/solr-semantic-search/references/05-ambiguity-resolution.md` | `core/skills/solr-semantic-search/references/05-ambiguity-resolution.md` |
| `skills/solr-semantic-search/references/06-query-building.md` | `core/skills/solr-semantic-search/references/06-query-building.md` |
| `skills/solr-semantic-search/references/07-applying-to-domain.md` | `core/skills/solr-semantic-search/references/07-applying-to-domain.md` |
| `skills/solr-semantic-search/references/08-query-model-implementation.md` | `core/skills/solr-semantic-search/references/08-query-model-implementation.md` |

### `modernization`

- Purpose: Rosetta Modernization - conversion, upgrade, and re-architecture workflows. Requires Rosetta Core and Workflows.
- Releases: r3. `requires`: core, workflows. Bootstrap: no. Hooks: none (no `hooks/` folder, no `hooks.json`).
- Files: 9 (listed below; the folder existed up to commit `a3e42a6c`).
- Target path: `instructions/r3/core/<same relative subpath>`.

| File (relative to set folder) | Target path after collapse |
|---|---|
| `workflows/modernization-flow-analysis.md` | `core/workflows/modernization-flow-analysis.md` |
| `workflows/modernization-flow-crossproject.md` | `core/workflows/modernization-flow-crossproject.md` |
| `workflows/modernization-flow-grouping.md` | `core/workflows/modernization-flow-grouping.md` |
| `workflows/modernization-flow-implement.md` | `core/workflows/modernization-flow-implement.md` |
| `workflows/modernization-flow-mapping.md` | `core/workflows/modernization-flow-mapping.md` |
| `workflows/modernization-flow-reuse.md` | `core/workflows/modernization-flow-reuse.md` |
| `workflows/modernization-flow-review.md` | `core/workflows/modernization-flow-review.md` |
| `workflows/modernization-flow-testing.md` | `core/workflows/modernization-flow-testing.md` |
| `workflows/modernization-flow.md` | `core/workflows/modernization-flow.md` |

## Path mapping

| From | To |
|---|---|
| `workflows/agents/**` | `core/agents/` |
| `workflows/workflows/**` | `core/workflows/` |
| `qe/skills/**` | `core/skills/` |
| `qe/workflows/**` | `core/workflows/` |
| `search/skills/**` | `core/skills/` |
| `modernization/workflows/**` | `core/workflows/` |

## Marker lines

These 24 lines end with a `(requires the ... plugin)` marker. Collapse removes each marker with its leading whitespace. A re-split restores them. Regex: `\(requires the [^)]*plugins?\)`. Two lines use the plural form (`arrange-workspace-flow.md:101`, `init-workspace-flow.md:158`).

| # | File:line | Line text |
|---|---|---|
| 1 | `instructions/r3/core/workflows/arrange-workspace-flow.md:77` | ``    "/coding-flow Implement left navigation sidebar on the home page, ..."   (requires the `workflows` plugin) `` |
| 2 | `instructions/r3/core/workflows/arrange-workspace-flow.md:79` | ``    "/coding-flow Identify and implement fix, ..."   (requires the `workflows` plugin) `` |
| 3 | `instructions/r3/core/workflows/arrange-workspace-flow.md:81` | ``    "/coding-flow Improve unit tests coverage to 85% for ..."   (requires the `workflows` plugin) `` |
| 4 | `instructions/r3/core/workflows/arrange-workspace-flow.md:87` | ``    "/requirements-authoring-flow extract detailed business and technical requirements from community of ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."   (requires the `workflows` plugin) `` |
| 5 | `instructions/r3/core/workflows/arrange-workspace-flow.md:89` | ``    "/requirements-authoring-flow extract high-level business and technical requirements at end-point level for controllers according to glob ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."   (requires the `workflows` plugin) `` |
| 6 | `instructions/r3/core/workflows/arrange-workspace-flow.md:97` | ``    "/modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents."   (requires the `modernization` plugin)  `` |
| 7 | `instructions/r3/core/workflows/arrange-workspace-flow.md:99` | ``    "/modernization-flow Perform modernization phase 2 to analyze service module ... using subagents. Target microservice name is ... ."   (requires the `modernization` plugin) `` |
| 8 | `instructions/r3/core/workflows/arrange-workspace-flow.md:101` | ``    "/modernization-flow Perform modernization phase 8 for target service to analyze service module ... using subagents. Must USE FLOW `coding-flow.md` to actually implement and as the main flow. Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."   (requires the `modernization` and `workflows` plugins) `` |
| 9 | `instructions/r3/core/workflows/help-flow.md:25` | `` /coding-flow Implement side bar on the home page, ...   (requires the `workflows` plugin) `` |
| 10 | `instructions/r3/core/workflows/help-flow.md:26` | `` /coding-flow Identify and implement fix, ...   (requires the `workflows` plugin) `` |
| 11 | `instructions/r3/core/workflows/help-flow.md:27` | `` /coding-flow Improve unit tests coverage to 85% for ...   (requires the `workflows` plugin) `` |
| 12 | `instructions/r3/core/workflows/help-flow.md:28` | `` /requirements-authoring-flow Extract detailed business and technical requirements from ... using subagents.   (requires the `workflows` plugin) `` |
| 13 | `instructions/r3/core/workflows/help-flow.md:29` | `` /modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents.   (requires the `modernization` plugin) `` |
| 14 | `instructions/r3/core/workflows/help-flow.md:30` | `` /research-flow Investigate OAuth 2.0 implementation options for our stack   (requires the `workflows` plugin) `` |
| 15 | `instructions/r3/core/workflows/help-flow.md:31` | `` /ui-aqa-flow Create UI test automation for the checkout flow   (requires the `qe` plugin) `` |
| 16 | `instructions/r3/core/workflows/help-flow.md:32` | `` /api-aqa-flow Automate backend API tests for TC-1234 with Swagger: https://api.example.com/swagger.json   (requires the `qe` plugin) `` |
| 17 | `instructions/r3/core/workflows/init-workspace-flow.md:134` | ``    "/coding-flow Implement left navigation sidebar on the home page, ..."   (requires the `workflows` plugin) `` |
| 18 | `instructions/r3/core/workflows/init-workspace-flow.md:136` | ``    "/coding-flow Identify and implement fix, ..."   (requires the `workflows` plugin) `` |
| 19 | `instructions/r3/core/workflows/init-workspace-flow.md:138` | ``    "/coding-flow Improve unit tests coverage to 85% for ..."   (requires the `workflows` plugin) `` |
| 20 | `instructions/r3/core/workflows/init-workspace-flow.md:144` | ``    "/requirements-authoring-flow extract detailed business and technical requirements from community of ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."   (requires the `workflows` plugin) `` |
| 21 | `instructions/r3/core/workflows/init-workspace-flow.md:146` | ``    "/requirements-authoring-flow extract high-level business and technical requirements at end-point level for controllers according to glob ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."   (requires the `workflows` plugin) `` |
| 22 | `instructions/r3/core/workflows/init-workspace-flow.md:154` | ``    "/modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents."   (requires the `modernization` plugin)  `` |
| 23 | `instructions/r3/core/workflows/init-workspace-flow.md:156` | ``    "/modernization-flow Perform modernization phase 2 to analyze service module ... using subagents. Target microservice name is ... ."   (requires the `modernization` plugin) `` |
| 24 | `instructions/r3/core/workflows/init-workspace-flow.md:158` | ``    "/modernization-flow Perform modernization phase 8 for target service to analyze service module ... using subagents. Must USE FLOW `coding-flow.md` to actually implement and as the main flow. Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."   (requires the `modernization` and `workflows` plugins) `` |

## Split-era text edits that stay in core

These 33 core files carry text edits made during the split. They stay after collapse (decision D8). Only the marker lines above change. List source: `git diff --name-status ff164dd0 HEAD -- instructions/r3/core | grep ^M`.

- `instructions/r3/core/rules/local-files-mode.md`
- `instructions/r3/core/rules/mcp-files-mode.md`
- `instructions/r3/core/rules/plugin-files-mode.md`
- `instructions/r3/core/rules/speckit-integration-policy.md`
- `instructions/r3/core/skills/codemap/README.md`
- `instructions/r3/core/skills/coding-agents-hooks-authoring/README.md`
- `instructions/r3/core/skills/coding-agents-prompt-authoring/README.md`
- `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-adapt.md`
- `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-rosetta.md`
- `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-schemas.md`
- `instructions/r3/core/skills/dangerous-actions/README.md`
- `instructions/r3/core/skills/debugging/README.md`
- `instructions/r3/core/skills/deviation/README.md`
- `instructions/r3/core/skills/harness/README.md`
- `instructions/r3/core/skills/load-project-context/README.md`
- `instructions/r3/core/skills/natural-writing/README.md`
- `instructions/r3/core/skills/orchestration/README.md`
- `instructions/r3/core/skills/post-mortem/README.md`
- `instructions/r3/core/skills/questioning/README.md`
- `instructions/r3/core/skills/reasoning/README.md`
- `instructions/r3/core/skills/requirements-authoring/README.md`
- `instructions/r3/core/skills/research/README.md`
- `instructions/r3/core/skills/risk-assessment/README.md`
- `instructions/r3/core/skills/rosetta/README.md`
- `instructions/r3/core/skills/self-learning/README.md`
- `instructions/r3/core/skills/self-organization/README.md`
- `instructions/r3/core/skills/sensitive-data/README.md`
- `instructions/r3/core/skills/subagent-directives/README.md`
- `instructions/r3/core/skills/testing/README.md`
- `instructions/r3/core/workflows/arrange-workspace-flow.md`
- `instructions/r3/core/workflows/help-flow.md`
- `instructions/r3/core/workflows/init-workspace-flow-shells.md`
- `instructions/r3/core/workflows/init-workspace-flow.md`

## How to re-split

1. Create the folders `instructions/r3/{workflows,qe,search,modernization}`.
2. For each moved file in the Sets tables, run `git mv instructions/r3/core/<relative> instructions/r3/<set>/<relative>`. Use the Target path column in reverse.
3. Restore the 24 markers in the Marker lines table: append the marker (three spaces before it) to each listed line.
4. Restore the catalog: copy [plugins.split.json](plugins.split.json) over `src/rosettify-plugins/plugins.json`, or run the generator with `--config docs/REQUIREMENTS/plugin-generator/assets/plugins.split.json`.
5. Add one marketplace entry per set (`workflows`, `qe`, `search`, `modernization`) next to the existing `rosetta` entries, for each IDE target. Each set builds to `<set>-<ide>` plus the variant suffix.
6. Regenerate `plugins/` with the local build and check that file counts per set match the Summary table.

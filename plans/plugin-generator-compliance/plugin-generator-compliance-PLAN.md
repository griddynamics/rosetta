# Plugin Generator Compliance - Implementation Plan

## Document Metadata

- **Plan ID:** plugin-generator-compliance-PLAN
- **Related Specs:** plugin-generator-compliance-SPECS.md
- **Created:** 2026-06-10
- **Status:** Ready for Implementation
- **Estimated Total Effort:** 4 hours 15 minutes

## Executive Summary

This plan implements the architectural refactoring outlined in the specs to achieve clean architecture compliance for the plugin generator. The work is sequenced to first establish vocabulary processing infrastructure (Task #17), then refactor the monolithic generator (Task #8). This ordering minimizes merge conflicts and enables incremental validation of parity with the existing system.

## Sequencing Decision

**Order:** Task #17 → Task #8

**Rationale:**
1. **Dependency:** Task #8 refactors `generatePlugin()` to use vocabulary processors, which Task #17 creates
2. **Merge Conflict Minimization:** Task #17 creates new files (no existing code modified), Task #8 then refactors existing code
3. **Incremental Validation:** After Task #17, we can unit test vocabulary processors in isolation before integrating
4. **Risk Mitigation:** If Task #17 reveals gaps in the spec, we can adjust before touching the working generator

**Alternative Rejected:** Task #8 first would require either (a) duplicating vocabulary logic inline as a temporary measure, or (b) creating stub processors that get replaced by Task #17 implementations.

## Task #17: Vocabulary Processing Infrastructure

**Effort:** 15 minutes  
**Deliverable:** New vocabulary processor modules per specs Section 4.2.1

### Implementation Steps

1. **Create Directory Structure** (1 min)
   ```bash
   mkdir -p /Users/isolomatov/Sources/GAIN/rosetta/ai-agents-farm/plugin-generator/src/vocabulary
   ```

2. **Implement Base Types** (2 min)
   - File: `src/vocabulary/types.ts`
   - Define: `VocabularyEntry`, `ProcessedVocabulary`, `VocabularyProcessor` interface
   - Reference: SPECS Section 4.2.1

3. **Implement API Vocabulary Processor** (3 min)
   - File: `src/vocabulary/processApiVocabulary.ts`
   - Extract tools → vocabulary entries
   - Map type definitions
   - Test: Unit test with sample ToolDefinition

4. **Implement Skill Vocabulary Processor** (3 min)
   - File: `src/vocabulary/processSkillVocabulary.ts`
   - Extract skills → vocabulary entries
   - Handle aliases and descriptions
   - Test: Unit test with sample SkillDefinition

5. **Implement Subagent Vocabulary Processor** (3 min)
   - File: `src/vocabulary/processSubagentVocabulary.ts`
   - Extract subagent names → vocabulary entries
   - Map to communication patterns
   - Test: Unit test with sample SubagentDefinition

6. **Create Vocabulary Index** (1 min)
   - File: `src/vocabulary/index.ts`
   - Export all processors and types
   - Barrel export pattern

7. **Unit Tests** (2 min)
   - File: `src/vocabulary/__tests__/processors.test.ts`
   - Test each processor with mock inputs
   - Verify output structure matches `ProcessedVocabulary`

### Validation Checkpoint

**Exit Criteria:**
- All vocabulary processors pass unit tests
- Types compile without errors
- Vocabulary processors callable from external modules
- No modifications to existing generator code

### Rollback Plan

Single atomic commit for Task #17. If issues arise:
```bash
git revert HEAD  # Removes all vocabulary/ files
```

---

## Task #8: Generator Refactoring

**Effort:** 4 hours  
**Deliverable:** Refactored plugin generator with clean architecture compliance

### Phase 1: Shared Helpers (30 min)

#### Step 1.1: Create Base Validation Module (10 min)
- **File:** `src/validation/baseValidation.ts`
- **Content:**
  - Extract validation logic from `generatePlugin()`
  - Functions: `validatePluginName()`, `validateOutputPath()`, `validateVocabulary()`
  - Error types: `ValidationError`, `ValidationResult`
- **Test:** Unit test each validator with valid/invalid inputs

#### Step 1.2: Create Core Utilities Module (10 min)
- **File:** `src/utils/coreUtils.ts`
- **Content:**
  - `generatePluginId()` - consistent ID generation
  - `sanitizeFileName()` - safe file name conversion
  - `formatTimestamp()` - ISO 8601 timestamp
- **Test:** Unit test each utility function

#### Step 1.3: Create Common String Templates (10 min)
- **File:** `src/templates/commonTemplates.ts`
- **Content:**
  - Header template with metadata
  - Footer template with attribution
  - Common XML fragments (e.g., `<vocabulary>` structure)
- **Test:** Snapshot test for template outputs

**Phase 1 Validation:**
- All helpers pass unit tests
- No circular dependencies
- Helpers callable from other modules

---

### Phase 2: Per-Vocabulary Processors (45 min)

#### Step 2.1: API Processor Module (15 min)
- **File:** `src/processors/apiProcessor.ts`
- **Dependencies:** `processApiVocabulary()` from Task #17
- **Functions:**
  - `generateApiSection()` - takes `ProcessedVocabulary`, returns XML string
  - `generateToolExamples()` - creates usage examples per tool
- **Test:** Unit test with sample `ProcessedVocabulary` from Task #17

#### Step 2.2: Skill Processor Module (15 min)
- **File:** `src/processors/skillProcessor.ts`
- **Dependencies:** `processSkillVocabulary()` from Task #17
- **Functions:**
  - `generateSkillSection()` - takes `ProcessedVocabulary`, returns XML string
  - `generateSkillInvocationExamples()` - creates usage patterns
- **Test:** Unit test with sample `ProcessedVocabulary` from Task #17

#### Step 2.3: Subagent Processor Module (15 min)
- **File:** `src/processors/subagentProcessor.ts`
- **Dependencies:** `processSubagentVocabulary()` from Task #17
- **Functions:**
  - `generateSubagentSection()` - takes `ProcessedVocabulary`, returns XML string
  - `generateCommunicationPatterns()` - creates SendMessage examples
- **Test:** Unit test with sample `ProcessedVocabulary` from Task #17

**Phase 2 Validation:**
- Each processor generates valid XML
- Outputs match structure in SPECS Section 4.2.2
- Processors do not share mutable state

---

### Phase 3: Per-IDE Bootstrap Assemblers (45 min)

#### Step 3.1: VSCode Bootstrap Assembler (15 min)
- **File:** `src/assemblers/vscodeAssembler.ts`
- **Function:** `assembleVSCodeBootstrap(sections: BootstrapSections): string`
- **Content:**
  - IDE-specific header (VSCode metadata)
  - Section ordering per SPECS Section 4.2.4
  - IDE-specific footer (VSCode hints)
- **Test:** Snapshot test with sample sections

#### Step 3.2: Cursor Bootstrap Assembler (15 min)
- **File:** `src/assemblers/cursorAssembler.ts`
- **Function:** `assembleCursorBootstrap(sections: BootstrapSections): string`
- **Content:**
  - IDE-specific header (Cursor metadata)
  - Section ordering per SPECS Section 4.2.4
  - IDE-specific footer (Cursor hints)
- **Test:** Snapshot test with sample sections

#### Step 3.3: Windsurf Bootstrap Assembler (15 min)
- **File:** `src/assemblers/windsurfAssembler.ts`
- **Function:** `assembleWindsurfBootstrap(sections: BootstrapSections): string`
- **Content:**
  - IDE-specific header (Windsurf metadata)
  - Section ordering per SPECS Section 4.2.4
  - IDE-specific footer (Windsurf hints)
- **Test:** Snapshot test with sample sections

**Phase 3 Validation:**
- Each assembler produces valid bootstrap files
- Outputs parseable by target IDE
- Section ordering consistent across IDEs

---

### Phase 4: Refactor Existing Generator (30 min)

#### Step 4.1: Extract Orchestrator (10 min)
- **File:** `src/generatePlugin.ts` (modify existing)
- **Changes:**
  - Replace inline logic with calls to Phase 1 helpers
  - Replace inline processing with calls to Phase 2 processors
  - Replace inline assembly with calls to Phase 3 assemblers
- **Preserve:**
  - Function signature: `generatePlugin(config: PluginConfig): Promise<GeneratorResult>`
  - Error handling behavior
  - Side effects (file writes, logging)

#### Step 4.2: Update File Writers (10 min)
- **Files:** `src/writers/fileWriter.ts`, `src/writers/bootstrapWriter.ts`
- **Changes:**
  - Accept pre-assembled bootstrap content (string) instead of raw config
  - Decouple from vocabulary processing
- **Test:** Unit test with mock file system

#### Step 4.3: Update Main Entry Point (10 min)
- **File:** `src/index.ts` (modify existing)
- **Changes:**
  - Update imports to use new module structure
  - Preserve public API: `generatePlugin()` still exported
- **Test:** Integration test calling `generatePlugin()` end-to-end

**Phase 4 Validation:**
- `generatePlugin()` still passes all existing integration tests
- No changes to public API surface
- All helper/processor/assembler modules correctly wired

---

### Phase 5: Update Type Definitions (15 min)

#### Step 5.1: Refactor PluginConfig Type (5 min)
- **File:** `src/types/pluginConfig.ts`
- **Changes:**
  - Split into `PluginConfig`, `VocabularyConfig`, `OutputConfig` per SPECS Section 4.1
  - Add JSDoc comments for each field
- **Preserve:** Backward compatibility for existing config objects

#### Step 5.2: Add New Types (5 min)
- **File:** `src/types/index.ts`
- **Content:**
  - `ProcessedVocabulary` (moved from `src/vocabulary/types.ts`)
  - `BootstrapSections` (for assemblers)
  - `GeneratorResult` (return type for `generatePlugin()`)
- **Test:** TypeScript compiler validates usage sites

#### Step 5.3: Update Type Exports (5 min)
- **File:** `src/types/index.ts`
- **Changes:**
  - Export all new types
  - Maintain existing type exports for backward compatibility
- **Test:** TypeScript compiler validates external usage

**Phase 5 Validation:**
- All types compile without errors
- No breaking changes to existing config objects
- New types used consistently across modules

---

### Phase 6: Update Specifications (45 min)

#### Step 6.1: Add Module Specifications (20 min)
- **Files:**
  - `specs/modules/vocabulary-processor-SPECS.md`
  - `specs/modules/section-processor-SPECS.md`
  - `specs/modules/bootstrap-assembler-SPECS.md`
- **Content per file:**
  - Purpose and responsibilities
  - Input/output contracts
  - Usage examples
  - Test coverage requirements

#### Step 6.2: Update Generator Specification (15 min)
- **File:** `specs/plugin-generator-SPECS.md`
- **Changes:**
  - Replace monolithic logic description with module references
  - Update data flow diagram to show new architecture
  - Update component responsibilities per SPECS Section 4.2.4

#### Step 6.3: Add Architecture Decision Record (10 min)
- **File:** `specs/ADR-001-vocabulary-processing.md`
- **Content:**
  - Context: Why refactor from monolithic to modular
  - Decision: Vocabulary processing → Section processing → Assembly
  - Consequences: Improved testability, IDE extensibility
  - Alternatives considered: Inline processing, plugin system

**Phase 6 Validation:**
- All spec files render correctly (Markdown syntax)
- Cross-references between specs resolve
- Specs match actual implementation

---

### Phase 7: Delete Old Files (15 min)

#### Step 7.1: Identify Deprecated Files (5 min)
- **Candidates:**
  - Old monolithic generator helpers (if extracted to new modules)
  - Unused type definitions
  - Deprecated test fixtures
- **Method:** `git grep` for usage, confirm zero references

#### Step 7.2: Remove Deprecated Files (5 min)
- **Command:**
  ```bash
  git rm <deprecated-file-1> <deprecated-file-2> ...
  ```
- **Validation:** Run full test suite to catch broken imports

#### Step 7.3: Update Import Paths (5 min)
- **Files:** Any remaining files importing from old paths
- **Changes:** Update to new module paths
- **Test:** TypeScript compiler validates all imports

**Phase 7 Validation:**
- No dead code in repository
- All tests pass
- TypeScript compiler shows zero errors

---

### Phase 8: Parity Verification (30 min)

#### Step 8.1: Golden File Testing (10 min)
- **Test File:** `__tests__/parity/goldenFiles.test.ts`
- **Method:**
  1. Run old generator on reference config → save output as `golden/old-output.xml`
  2. Run new generator on same config → save output as `golden/new-output.xml`
  3. Diff outputs (ignoring timestamps and non-semantic whitespace)
- **Pass Criteria:** Semantic equivalence (same vocabulary entries, same section structure)

#### Step 8.2: Integration Test Suite (10 min)
- **Test File:** `__tests__/integration/generator.test.ts`
- **Cases:**
  - Generate plugin with API vocabulary only
  - Generate plugin with skill vocabulary only
  - Generate plugin with subagent vocabulary only
  - Generate plugin with all vocabulary types
  - Generate plugin with empty vocabulary
- **Pass Criteria:** All outputs valid, match expected structure

#### Step 8.3: End-to-End Validation (10 min)
- **Method:**
  1. Generate a plugin using new generator
  2. Install plugin in VSCode/Cursor/Windsurf
  3. Verify plugin loads without errors
  4. Verify vocabulary items accessible in IDE
- **Pass Criteria:** Plugin functional in all three IDEs

**Phase 8 Validation:**
- Golden file test passes (semantic equivalence)
- Integration tests pass (all scenarios)
- E2E validation passes (plugin functional)

---

## Parity Strategy

### Checkpoint Verification

**After Task #17:**
- Unit tests for vocabulary processors pass
- No existing tests broken (new files only)

**After Task #8 Phase 4:**
- All existing integration tests pass
- `generatePlugin()` produces outputs matching old behavior

**After Task #8 Phase 8:**
- Golden file test confirms semantic equivalence
- E2E test confirms plugin functionality preserved

### Metrics

**Success Criteria:**
- Test coverage ≥ 90% for new modules
- Zero regression in existing tests
- Golden file diff shows only non-semantic changes (timestamps, whitespace)

---

## Rollback Plan

### Atomic Commits

**Commit Structure:**
1. Task #17: "feat: add vocabulary processing infrastructure"
2. Phase 1: "refactor: extract shared helpers"
3. Phase 2: "refactor: add per-vocabulary processors"
4. Phase 3: "refactor: add per-IDE assemblers"
5. Phase 4: "refactor: update generator orchestration"
6. Phase 5: "refactor: update type definitions"
7. Phase 6: "docs: update specifications"
8. Phase 7: "chore: remove deprecated files"
9. Phase 8: "test: add parity verification"

**Rollback Commands:**
```bash
# Rollback entire Task #8
git revert HEAD~8..HEAD

# Rollback specific phase (e.g., Phase 4)
git revert <phase-4-commit-hash>
```

### Fallback Strategy

If parity verification fails in Phase 8:
1. Do NOT merge refactored code to main
2. Create branch `feature/plugin-generator-refactor-investigation`
3. Use golden file diff to identify semantic differences
4. Fix differences in isolated commits
5. Re-run parity verification
6. Only merge after Phase 8 passes

---

## Test Strategy

### Unit Tests

**Scope:** Individual functions/modules in isolation

**Targets:**
- All vocabulary processors (Task #17)
- All shared helpers (Phase 1)
- All section processors (Phase 2)
- All bootstrap assemblers (Phase 3)

**Coverage Target:** ≥ 95% for new modules

**Tools:** Jest, `@testing-library/jest-dom` (if applicable)

### Integration Tests

**Scope:** Multi-module workflows

**Targets:**
- Vocabulary processing → section processing pipeline
- Section processing → bootstrap assembly pipeline
- Full `generatePlugin()` orchestration

**Coverage Target:** ≥ 85% for orchestration paths

**Tools:** Jest, mock file system (e.g., `memfs`)

### End-to-End Tests

**Scope:** Full plugin generation → IDE installation

**Targets:**
- Generate plugin with real vocabulary sources
- Install in VSCode/Cursor/Windsurf
- Verify vocabulary items accessible

**Coverage Target:** At least one E2E test per IDE

**Tools:** Manual verification (IDE installation), automated script for plugin generation

### Parity Tests

**Scope:** Old generator vs. new generator output equivalence

**Targets:**
- Golden file comparison (semantic diff)
- Regression test suite (all existing tests)

**Coverage Target:** 100% of existing test cases pass

**Tools:** Jest snapshot testing, custom diff utility for XML

---

## Risks and Mitigations

### Risk 1: Merge Conflicts

**Likelihood:** Low (Task #17 creates new files, Task #8 refactors sequentially)

**Impact:** Medium (delays implementation)

**Mitigation:**
- Task #17 completes before Task #8 starts
- Frequent commits during Task #8 phases
- Each phase commits independently

### Risk 2: Parity Regression

**Likelihood:** Medium (refactoring changes behavior unintentionally)

**Impact:** High (breaks existing plugins)

**Mitigation:**
- Golden file testing in Phase 8
- Integration tests run after each phase
- Semantic diff tool ignores non-functional changes (timestamps, whitespace)

### Risk 3: Incomplete Specification

**Likelihood:** Low (specs reviewed and approved)

**Impact:** High (requires spec updates mid-implementation)

**Mitigation:**
- Task #17 validates vocabulary processing contracts early
- If gaps found, update specs before Phase 2
- HITL checkpoint after Task #17 completion

### Risk 4: Performance Degradation

**Likelihood:** Low (modular design should not impact performance)

**Impact:** Medium (slower plugin generation)

**Mitigation:**
- Benchmark old vs. new generator (measure `generatePlugin()` execution time)
- If >10% slowdown detected, profile and optimize hot paths
- Cache vocabulary processing results if needed

### Risk 5: Type Safety Issues

**Likelihood:** Low (TypeScript compiler enforces contracts)

**Impact:** Medium (runtime errors in production)

**Mitigation:**
- Strict TypeScript mode enabled (`strict: true`, `noImplicitAny: true`)
- Phase 5 validates all type definitions compile
- Integration tests catch type mismatches at boundaries

---

## Success Criteria

**Task #17 Complete:**
- Vocabulary processors unit tested
- No existing code modified
- Processors callable from external modules

**Task #8 Complete:**
- All phases 1-8 finished
- Parity verification passes (golden file test)
- Integration tests pass (all scenarios)
- E2E validation passes (plugin functional in all IDEs)
- Test coverage ≥ 90% for new modules
- Zero regression in existing tests
- Specifications updated and accurate

**Post-Implementation:**
- Plugin generator maintainable (SPECS Section 5.3)
- Future IDE additions require only new assembler (no core logic changes)
- Vocabulary sources extensible (add new source = implement `VocabularyProcessor`)

---

## Next Steps

1. **Implementation Team:** Assign Task #17 and Task #8 to engineer(s)
2. **Reviewer:** Assign code reviewer for each phase commit
3. **Timeline:** Schedule 5-hour implementation window (15 min + 4 hrs + buffer)
4. **Communication:** Set up HITL checkpoint after Task #17 completion
5. **Deployment:** Plan merge to main after Phase 8 passes

---

## Appendix: File Tree After Implementation

```
plugin-generator/
├── src/
│   ├── vocabulary/               # Task #17
│   │   ├── types.ts
│   │   ├── processApiVocabulary.ts
│   │   ├── processSkillVocabulary.ts
│   │   ├── processSubagentVocabulary.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── processors.test.ts
│   ├── validation/               # Phase 1
│   │   └── baseValidation.ts
│   ├── utils/                    # Phase 1
│   │   └── coreUtils.ts
│   ├── templates/                # Phase 1
│   │   └── commonTemplates.ts
│   ├── processors/               # Phase 2
│   │   ├── apiProcessor.ts
│   │   ├── skillProcessor.ts
│   │   └── subagentProcessor.ts
│   ├── assemblers/               # Phase 3
│   │   ├── vscodeAssembler.ts
│   │   ├── cursorAssembler.ts
│   │   └── windsurfAssembler.ts
│   ├── writers/                  # Phase 4
│   │   ├── fileWriter.ts
│   │   └── bootstrapWriter.ts
│   ├── types/                    # Phase 5
│   │   ├── pluginConfig.ts
│   │   └── index.ts
│   ├── generatePlugin.ts         # Phase 4 (refactored orchestrator)
│   └── index.ts                  # Phase 4 (main entry point)
├── specs/                        # Phase 6
│   ├── modules/
│   │   ├── vocabulary-processor-SPECS.md
│   │   ├── section-processor-SPECS.md
│   │   └── bootstrap-assembler-SPECS.md
│   ├── plugin-generator-SPECS.md
│   └── ADR-001-vocabulary-processing.md
└── __tests__/                    # Phase 8
    ├── parity/
    │   └── goldenFiles.test.ts
    └── integration/
        └── generator.test.ts
```

---

## Document Control

**Version:** 1.0  
**Last Updated:** 2026-06-10  
**Approved By:** Pending  
**Implementation Status:** Ready  
**Related Documents:**
- plugin-generator-compliance-SPECS.md
- plugin-generator-SPECS.md (existing)

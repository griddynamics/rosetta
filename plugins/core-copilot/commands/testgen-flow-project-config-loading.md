---
name: testgen-flow-project-config-loading
description: Phase 0 of Test Generation - Project Config Loading
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 0: Project Config Loading

## Prerequisites

- MUST be starting new test generation flow
- User provided Jira ticket key or URL

## Objective

- Find or create the project config file
- Obtain all necessary information about the project's configuration and flow, either directly from the user
or from the existing config file
- Initialize ticket's directory with initial data provided

## Requirements

### Step 1: Parse Initial User Input

**Extract from user's initial prompt**:
1. **Jira ticket**: Key or URL (REQUIRED)

**Supported formats (examples)**:
```
"Analyze requirements for PROJ-123"
"Analyze ticket PROJ-123, Google Drive pages: URL1, URL2, URL3"
"PROJ-123 + https://confluence.com/display/PROJ/Auth"
...
```

### Step 2: Setup Output Directory

Create output directory structure:
```
agents/testgen/{TICKET-KEY}/
└── testgen-state.md (initialize)
```

### Step 3: Load Project Config File

**Find and load project file if it exists**:
- find `testgen-project-config.md` file in the repo's agent-specific directory
- if you cannot find the file, create a new one in the repo's agent-specific directory

**If the project config file exists and is not empty, proceed to Step 5**

**If the project config file does not exist, proceed to Step 4**

### Step 4: Obtain Project Info From User

**NOTE: Execute ONLY IF project file does not already exist!**

**Goal**: Obtain all necessary project-specific information from user
- **Especially applies to** knowledge base and required documents

#### Step 4.1: Ask user about knowledge base setup, providing the default data retrieval process as a reference:

**Tell user**:
```
According to test generation process rules, I require more details related to your project.

- How should I retrieve the information necessary for test case generation?

As a reference, I provide the default Data Retrieval scheme below:

** Default Setup **
- retrieve Jira ticket fields (summary+description)
- retrieve provided Confluence documents, if any
- search for Confluence pages using keywords extracted from the ticket
- combine all the information as a basis for test case generation

Is the above accurate for your project? 

Please answer YES or NO
- If your answer is NO then please provide details about data retrieval for your project.
- If you have links to any additional documentation or materials that need to be considered, 
you can provide them here as well.
```

#### Step 4.2: Validate Answer to ensure it answers the questions and provides the necessary information

#### Step 4.3: Save the collected information (data retrieval scheme + additional links) in the project file you created

Save the information to `<agent_folder>/testgen-project-config.md`.

This file should be used for any future queries related to this project.

### Step 5: Create initial-data file

This file will be used in the next step

**File**: `agents/testgen/{TICKET_KEY}/initial-data.md`

**Create new file**:
```markdown
# Initial data - [TICKET-KEY]

**Initial user prompt:** [USER PROMPT]
**Project config file - USE AS REFERENCE FOR THE NEXT PHASE:** [PROJECT CONFIG FILENAME]
```

### Step 6: Update State File

**File**: `agents/testgen/{TICKET-KEY}/testgen-state.md`

**Create initial state**:
```markdown
# Test Generation State - [TICKET-KEY]

**Last Updated**: [DateTime]
**Current Phase**: 0 - Project Config Loading (COMPLETED)
**Jira Ticket**: [TICKET-KEY]

## Phase Completion Status

- [x] Phase 0: Project Config Retrieval - Completed [DateTime]
- [ ] Phase 1: Data Collection - Not Started
- [ ] Phase 2: Gap Analysis - Not Started
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started

## Phase Details

### Phase 0: Project Config Loading
- **Completed**: [DateTime]
- **Jira Ticket**: [KEY]
- **Files Created**: initial-data.md, testgen-state.md
- **Notes**: [Any relevant notes or issues]
```

## Validation

Before completing Phase 1, verify:
- ✅ `agents/testgen/{TICKET-KEY}/` directory exists
- ✅ `<agent_folder>/testgen-project-config.md` file exists with non-empty content
- ✅ `initial-data.md` created with initial prompt and project config info
- ✅ `testgen-state.md` created with Phase 0 marked complete

## Tools Used

- `write()` - File creation

## Common Issues

## Next Phase

After Phase 0 completion:
1. Tell user: "Phase 0 complete. Project setup complete"
2. Ask: "Ready to proceed to Phase 1 (Data Retrieval)?"
3. Wait for confirmation
4. Load Phase 1: ACQUIRE testgen-phase1-md FROM KB

## Notes

---
name: coding-iac
description: Rosetta planning, coding, and reviewing skill for IaC implementation (Terraform, Polumi, CloudFormation, ARM, Bicep, Crossplane, CDK, Helm, Kustomize, etc). MUST use when implementing features, fixing bugs, or making code changes to any IaC.
baseSchema: docs/schemas/skill.md
---

<coding>

<role>

Senior software infrastructure engineer and IaC implementation specialist. Writes clean, minimal, production-grade code. 

</role>

<when_to_use_skill>

Use when implementing features, bug fixes, refactors, or any code changes including DevOps, IaC, and pipelines.

</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- **Module-Based Generation** - Use company-approved modules first (fast, reliable, free)
- **Template-Based Generation** - Use company-approved templates second (fast, reliable, free)
- **LLM Fallback** - Generate code with LLM if no module and no template available
- **Modular Code** - Create separate files: main.tf, variables.tf, outputs.tf
- **Documentation** - Generate comprehensive README.md
- **Best Practices** - Follow naming conventions and security standards
- **HITL** - MUST HAVE ADDITIONAL DIRECT HITL if work involves DELETION of resources in all environments.
- **Security** - IS THE TOP PRIORITY.
- **Reuse** - MUST check existing infrastructure for existing resources. If ACCESS is limited MUST ASK USER! THIS IS CRITICAL!
- **Self-Healing Loop** - Retry code generation if validation fails.
- **CLI** - Use cloud and IaC provided CLIs for READ-ONLY operations ONLY. Use for planning and verification.
- **Subagents** - There is a lot of work, delegate to subagents. Be explicit to require use of this SKILL in subagent. Don't explain this content.

</core_concepts>

<planning>

## Planning Responsibilities

1. **Intent Decomposition** - Break complex requests into micro-tasks
2. **Context Harvesting** - Understand existing cloud infrastructure
3. **Dependency Mapping** - Create execution graphs with proper order
4. Etc.

### Understand the Request

- Analyze what the user is asking for
- Identify resource types (S3, RDS, VPC, etc.)
- Determine operation type (CREATE, DELETE, MODIFY)
- Extract project name, environment, region if provided
- Use 

### Check Knowledge Base and available MCPs for Company Policies

**CRITICAL:** Always check and search using all available tools

### Step 3: Gather Cloud Context & Check Conflicts

**CRITICAL:** Always check for resource conflicts BEFORE creating the plan!

Examples:
- Check resource name availability
- Check credentials availability (but do not read them!)
- Check availability zones are valid for the region
- Check limits
- Query existing infrastructure to avoid conflicts
- Identify used CIDR blocks and conflicts
- Understand naming conventions
- Verify public vs private
- Etc.

If issues detected - document, resolve with user, HITL.

</planning>

<coding>

**CRITICAL:** ALWAYS try module catalog and template-based generation first! 
**CRITICAL:** ALWAYS fetch modules/templates from repository!
**CRITICAL:** MUST check existing infrastructure for existing resources.
**CRITICAL:** MUST ALWAYS apply security best practices. Run security and validation tools on generated code.
**CRITICAL:** MUST search approved modules/templates/catalogs.
**CRITICAL:** MUST perform risk assessment (blast radius analysis, consequences, pre-requisites, simulation: what will happen with what when this will deploying or deployed).
**CRITICAL:** MUST NOT use CLIs to change settings or anything manually (who will do that in prod?). CLIs must only be used for READ-ONLY purposes.

**TOP PRIORITY:** YOU MUST NOT CONTINUE IF ANY CRITICAL ITEMS ABOVE ARE NOT MET. MUST ASK USER FOR INFORMATION AND DETAILS! NO SKIPPING! COST OF SKIPPING: SECURITY INCIDENT WITH CIO, CISO, AND MULTIMILLION FINES!

**REMEMBER**: Enterprise customers always have a pre-created modules and templates! They have always strict policy to use the existing first (modules, templates, resources). You must seek user advice if required functionality is not exposed via modules/templates.

- Pay attention to details: CIDR blocks, module and provider versions
- Check if newer versions are available AND can be used
- Verify backward compatibility BY CHECKING THE ACTUAL source code
- Absolutely no hardcoding!
- Use formatting, linking, multi-engine security scanning (minimum 2), secrets checking, cost estimation, pre-deployments checks, tools, CLIs
- Etc.

</coding>

<review>

## Review Responsibilities

1. **Static Analysis** - Syntax and format checking
2. **Linting & Best Practices** - tflint, terraform-docs validation
3. **Multi-Engine Security Scanning** - Checkov, tfsec, Terrascan (run at least two)
4. **Secrets Detection** - Scan code and git history for leaked secrets
5. **Policy Enforcement** - OPA/Conftest with Rego policies
6. **Plan Analysis** - Detailed blast radius and dangerous change detection
7. **Cost Estimation** - Estimate infrastructure costs
8. **Cloud Pre-Deployment Checks** - Real-time cloud validation for resources
9. **Module & Provider Hygiene** - Version pinning and provenance checks
10. **Risk Assessment** - Data loss risk, deployment risk scoring
11. **Review Reports** - Comprehensive human-readable validation reports
12. Etc.

## Your Capabilities

You have access to:
1. **Rosetta/Context7/Fetch/DeepWiki/WebSearch Tools/MCPs** - Security policies, compliance rules, best practices
2. **IaC CLI** - For syntax validation, formatting, plan generation
3. **Checkov** - Policy/controls security scanning
4. **tfsec** - Fast static security analysis
5. **Terrascan** - Policy-as-code rulesets
6. **tflint** - Terraform linter with provider plugins
7. **terraform-docs** - Documentation validation
8. **Conftest/OPA** - Policy-as-code enforcement with Rego
9. **truffleHog/detect-secrets** - Secrets detection in code and git history
10. **infracost** - Cost estimation (if available)
11. **CLI** - Real-time resource validation
12. Any other applicable or alternative or specific to the user request

### Rule
- **PASSED** = Tool ran successfully, no issues found
- **SKIPPED** = Tool not available, check not performed
- **FAILED** = Tool ran, issues found 

If required tools are unavailable REQUEST USER PERMISSION TO INSTALL IT.

**Enforce rules:**
- Capture output with file/line hints
- Check for missing variables, invalid references, deprecated syntax
- Typed variables with descriptions
- Documented outputs
- Naming conventions
- Provider requirements
- Verify all variables have descriptions
- Verify all outputs have descriptions
- Flag missing documentation as warnings
- **Flag any secrets found as CRITICAL**

**Enforce organizational policies:**
- Required tagging (Name, Environment, Owner, CostCenter)
- Naming conventions
- Region constraints
- Max resource count limits
- Encryption requirements
- Public access restrictions

MUST Suggest true remediation for all failed rules.

</review>

<documentation>

Create comprehensive README.md:

- Project description
- Prerequisites
- Usage instructions
- Variable descriptions
- Output descriptions
- Deployment steps

</documentation>

<error-handling>

### Planner Errors
- Invalid request → Return error, suggest alternatives
- Unsupported resource → Explain limitations
- Missing information → Ask clarifying questions

### Coder Errors
- Template unavailable → Use LLM fallback
- Generation failed → Return error, suggest manual approach
- Invalid plan → Return to Planner for correction

### Syntax Errors
- Return to Coder with specific error messages
- Include file and line numbers
- Suggest fixes

### Security Issues
- Flag critical/high issues as BLOCKING
- Provide Checkov/tfsec check IDs
- Include remediation steps

### Validator Errors
- Syntax errors → Return to Coder with feedback
- Security issues → Return to Coder with specific fixes
- Compliance violations → Return to Coder with policy references

### Cloud Errors
- Credentials invalid → Return error, check configuration
- Resource conflicts → Warn user, suggest alternatives
- Quota exceeded → Return error, suggest cleanup

### Check Step Failures
- **CRITICAL:** If ANY validation check step fails, mark it as FAILED and proceed to next step
- Do NOT halt validation pipeline on individual step errors - we must see full picture
- Continue executing all remaining validation steps
- Document all failures in the final report with error details

</error-handling>

<self-healing-logic>

**Retry Conditions:**
- Validation failed
- Retry count < 3
- Errors are fixable (not fundamental issues)

**Retry Process:**
1. Extract feedback from ValidationResult
2. Call Coder Agent with feedback
3. Re-validate
4. Repeat until passed or max retries

**Stop Conditions:**
- Validation passed
- Max retries reached (3)
- Fundamental errors (can't be fixed automatically)

</self-healing-logic>

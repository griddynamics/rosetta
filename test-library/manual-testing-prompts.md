# Overview

These prompts should be used for manual testing.
It could be also utilized in test-library.
Note, that there is inherent instability: you should check multiple times in multiple sessions.
If it fails even ones, it is a failure.

Note, check bootstrap.md and bootstrap-core-policy.md to identify currently required actions from AI.

At minimum it should read and grep CONTEXT.md, ARCHITECTURE.md, it should load workflow, orchestration, HITL (can be excluded if you use "No HITL" prompt) skills.

# Prompts

- What can you do?
- /self-help-flow What can you do?
- What are your capabilities?
- /self-help-flow What are your capabilities?
- Change home page title to follow pattern `<icon> <product>: <actual page title>`
- /coding-flow Change home page title to follow pattern `<icon> <product>: <actual page title>`
- Implement a small shell script to cleanup build artifacts
- Build a web scrapper script to download any web site
- Please recommend me what should I learn in my personal time

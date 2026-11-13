---
applyTo: "**"
---
# Team engineering rules

This repository is part of the Saleor e-commerce platform:

- `saleor` — backend and GraphQL API (Python, Django)
- `saleor-dashboard` — admin dashboard for staff (React, TypeScript)
- `react-storefront` — customer storefront (Next.js, TypeScript)

The three repositories are checked out side by side in the same workspace.

## Rules

- Follow the existing code style, structure and patterns of the repository.
- Keep changes focused on the task. Don't refactor unrelated code.
- Don't add new dependencies unless they are really needed.
- Add or update automated tests for every change.
- Before finishing, run the relevant tests and linters and make sure they pass.
- Don't commit or push. Leave changes in the working tree.
- When finished, summarize what you changed and how you checked it.

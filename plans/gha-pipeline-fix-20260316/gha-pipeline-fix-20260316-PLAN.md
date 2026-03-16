# GHA Pipeline Fix Plan

## Steps

1. Inspect the failed GitHub Actions run and identify the first broken step.
2. Patch the shared Jira loader without changing the workflow output contract.
3. Add a focused regression test for the loader.
4. Validate locally with targeted checks.
5. Commit, push, rerun the affected workflows with `gh`, and inspect the results.

# GHA Pipeline Fix Specs

## Scope

- Restore the shared Jira story loader used by `repo-plan.yml` and `repo-implement.yml`.
- Keep workflow behavior unchanged apart from the Jira API call migration.

## Requirements

- Replace the removed Jira issue-search request with a supported endpoint.
- Preserve the existing GitHub Actions outputs:
  - `plan_matrix`, `impl_matrix`
  - `has_plan`, `has_impl`
  - `plan_count`, `impl_count`
- Keep the loader non-destructive.
- Add a local regression test for the Jira request contract and story filtering behavior.

## Validation

- The new targeted pytest file passes locally.
- The updated workflow run reaches or passes the `Load stories from Jira` step.

<tt_write_artifact_templates>

The three composable operations. Path: `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`. Composition rules, sequence numbering, and the pre-compose gate: APPLY SKILL FILE `references/tt-write-artifacts.md`.

Every artifact contains exactly `op`, `target_issue_key`, `payload`, and `composed_at` (ISO8601). `target_issue_key` is always the source ticket's key, including in `create_issue` and `link_issues`.

<add_comment>

```json
{"op": "add_comment", "target_issue_key": "<key>", "payload": {"body": "<composed body>"}, "composed_at": "<ISO8601>"}
```

</add_comment>

<create_issue>

```json
{"op": "create_issue", "target_issue_key": "<source ticket key>", "payload": {"project": ..., "issue_type": ..., "summary": ..., "description": ..., "custom_fields": {...}, "assignee_account_id": <optional>}, "composed_at": "<ISO8601>"}
```

`description` is plain text, one item per line. Never hand-author rich-document markup (ADF or equivalent) — converting plain text into whatever body format the integration requires belongs to the execution step.

</create_issue>

<link_issues>

```json
{"op": "link_issues", "target_issue_key": "<source ticket key>", "payload": {"link_type_name": ..., "inward_key": <confirmed target-project issue key>, "outward_key": <source ticket key>}, "composed_at": "<ISO8601>"}
```

Keep the payload keys in that order. `inward` = the confirmed target-project issue, `outward` = the source ticket: that direction is what makes the pair read "the new issue *is an action item from* the source ticket". **Never re-order to make a phrase scan better** — direction gives the relationship its meaning.

</link_issues>

</tt_write_artifact_templates>

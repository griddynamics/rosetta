---
name: collect-github-stats
description: Collect GitHub repo health/usage stats into merged JSON.
disable-model-invocation: true
user-invocable: true
---

# collect-github-stats

Runs one script: fetch GitHub stats for a repo, merge into `docs/github-stats.json`.

## Run (MUST)

```bash
python3 <skill_dir>/scripts/collect_stats.py [--repo OWNER/NAME] [--out PATH] [--no-enrich]
```

Defaults: `--repo griddynamics/rosetta`, `--out docs/github-stats.json`. MUST run from
repo root (or pass absolute `--out`). `--no-enrich` skips company/location lookups.

## CRITICAL

- **NEVER DELETE OR OVERWRITE `docs/github-stats.json`.** Script APPEND-MERGES. Traffic is
  a 14-DAY ROLLING WINDOW — deleted history is GONE FOREVER, unrecoverable from the API.
- **PUSH ACCESS REQUIRED.** No push → traffic 403 → script FAILS LOUD with fix steps.
  MUST NOT accept a partial file.

## Rules (MoSCoW)

- MUST have `gh` authenticated, `repo` scope, push access to the target repo.
- SHOULD relay the script's post-run summary to the user.
- COULD normalize company variants when REPORTING; MUST NOT mutate stored raw values.
- WON'T fabricate cloner identity (cloners are ANONYMOUS — counts only), store PII/secrets.

If you learned something new, relevant to this shill, update `## Lessons learned` below.

## Lessons learned (keep updating, first line is template, follow <instructions>)

- **<key action item, less then 7 words>** <concise: what happened, why, root cause, reasoning, less then 25 words>.

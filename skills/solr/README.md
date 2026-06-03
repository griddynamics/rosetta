# Solr Skills

This directory contains **four Solr-focused AI skills** plus an evals harness, for use with Claude Code, OpenCode, and any OpenAI-compatible local LLM.

## Where to start

If you're setting up for the first time, **read `INTERN_SETUP.md`** end-to-end. It walks through installation on macOS — Claude Code first, then optionally OpenCode + LM Studio for local use.

After setup, keep `INTERN_QUICK_REFERENCE.md` handy — it's the daily-use cheat sheet.

To verify your setup at any time:

```bash
chmod +x check-setup.sh
./check-setup.sh
```

## What's in here

```
skills/solr/
├── README.md                       ← this file
├── INTERN_SETUP.md                 ← full installation guide
├── INTERN_QUICK_REFERENCE.md       ← daily-use cheat sheet
├── check-setup.sh                  ← diagnostic script (checks all 4 skills)
│
├── solr-query/                     ← SKILL: query construction & relevancy
│   ├── SKILL.md
│   └── references/                 ← 12 topic files
│       ├── 01-lucene-syntax.md
│       ├── 02-local-params.md
│       ├── 03-edismax.md
│       ├── 04-block-join.md
│       ├── 05-json-facets.md
│       ├── 06-tag-exclude.md
│       ├── 07-knn.md
│       ├── 08-explain.md
│       ├── 09-function-spatial.md
│       ├── 10-common-errors.md
│       ├── 11-doc-transformers.md  ← [child] vs [subquery], performance
│       └── 12-relevancy.md         ← BM25, similarities, scoring, LTR brief
│
├── solr-extending/                 ← SKILL: writing custom Solr plugins
│   ├── SKILL.md
│   └── references/
│       ├── 01-search-component.md
│       ├── 02-doc-transformer.md
│       ├── 03-query-parser.md
│       ├── 04-update-processor.md
│       ├── 05-value-source-parser.md
│       └── 06-plugin-wiring.md
│
├── solr-semantic-search/           ← SKILL: tagging + graph + query building
│   ├── SKILL.md
│   └── references/
│       ├── 01-architecture.md
│       ├── 02-concept-indexing.md
│       ├── 03-tagging.md
│       ├── 04-graph-paths.md
│       ├── 05-ambiguity-resolution.md
│       ├── 06-query-building.md
│       ├── 07-applying-to-domain.md
│       └── 08-query-model-implementation.md
│
├── solr-schema/                    ← SKILL: audit/design schema + solrconfig
│   ├── SKILL.md
│   └── references/                 ← 8 topic files
│       ├── 01-field-types.md
│       ├── 02-analyzer-asymmetry.md
│       ├── 03-docvalues-stored-indexed.md
│       ├── 04-synonyms.md
│       ├── 05-solrconfig-review.md
│       ├── 06-anti-patterns.md
│       ├── 07-live-inspection.md
│       └── 08-schemaless-managed-api.md
│
└── evals/                          ← test harness (advanced; ignore initially)
    ├── README.md
    ├── cases/
    │   ├── query/                  ← 146 cases across 12 files
    │   ├── extending/              ← 40 cases across 3 files
    │   ├── semantic-search/        ← 58 cases across 6 files
    │   └── schema/                 ← 40 cases across 8 files
    └── runner/                     ← Python CLI (supports --skill query|extending|semantic-search|schema|all)
```

**Total**: ~284 evals cases across the four skills.

## What this is for

Each `solr-*/` folder is a **skill** — a structured set of instructions that AI coding assistants (Claude Code, OpenCode) load on demand. Once installed at `~/.claude/skills/`, both assistants will use them when you ask Solr-related questions.

- **solr-query** — any work involving writing or debugging Solr queries
- **solr-extending** — writing your own Solr plugins (search components, transformers, parsers, URPs, value sources)
- **solr-semantic-search** — designing or extending a tagging-based semantic search system
- **solr-schema** — auditing an existing schema/solrconfig, or designing field types, analyzers, and synonyms

Without skills, you'd get generic Solr advice — sometimes wrong, often missing key gotchas. With skills loaded, the AI behaves like a Solr engineer who has all the production traps memorized.

## When to read what

Examples of how the AI assistant chooses references:

| User asks | Skill triggered | Reference loaded |
|---|---|---|
| "How do I write a JSON Facets request with sub-facets?" | solr-query | 05-json-facets.md |
| "Why is `[subquery]` faster than `[child]` for top-N children?" | solr-query | 11-doc-transformers.md |
| "How do I tune BM25 k1 for short product titles?" | solr-query | 12-relevancy.md |
| "Why use BooleanSimilarity instead of BM25 for tag-based clauses with config boosts?" | solr-query | 12-relevancy.md |
| "How do I write a custom SearchComponent that pre-fetches data?" | solr-extending | 01-search-component.md |
| "Help me write a custom DocTransformer for hierarchical block-join children" | solr-extending | 02-doc-transformer.md |
| "How do I package my plugin jar without bundling Solr core?" | solr-extending | 06-plugin-wiring.md |
| "How does the tagger turn a phrase into ProducedTags?" | solr-semantic-search | 03-tagging.md |
| "Should I use Solr's built-in TaggerRequestHandler or write my own?" | solr-semantic-search | 03-tagging.md |
| "Explain the K-shortest-paths algorithm and quasi-positions" | solr-semantic-search | 04-graph-paths.md |
| "I want to apply this architecture to a new domain — where do I start?" | solr-semantic-search | 07-applying-to-domain.md |
| "Show me the actual code for SmBooleanQuery and the Solr translator" | solr-semantic-search | 08-query-model-implementation.md |
| "Why does my multi-word synonym match at index time but not at query time?" | solr-schema | 02-analyzer-asymmetry.md |
| "Audit my managed-schema — is brand_s set up right for faceting?" | solr-schema | 03-docvalues-stored-indexed.md |

The AI auto-loads the right reference based on the question. You don't need to know which file holds what; just ask naturally.

## Targeted Solr version

These skills target **Apache Solr 9.x**. Solr 10 differences are flagged where they matter; Solr 8.x and earlier are not directly supported (most patterns still apply but specific syntax may differ).

## Questions

Setup issues — work through `INTERN_SETUP.md` Section 4 (Troubleshooting) and run `check-setup.sh` first. If still stuck, ping your manager.

Skill content issues (AI gave wrong answer) — collect the prompt + response + what you expected, then ping your manager.

Daily Solr questions — ask Claude or a local model directly in the relevant tool.

## Acknowledgments

All credit goes to Dmitry T.

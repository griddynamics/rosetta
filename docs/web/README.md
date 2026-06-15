# Rosetta GitHub Pages Site (Jekyll)

This folder is a Jekyll site for GitHub Pages.

## Local preview

```bash
cd docs/web
cp ../../llms-full.txt llms-full.txt   # static agent context file (not linked in nav)
bundle exec jekyll serve
```

If you don't have Bundler/Jekyll locally, GitHub Actions builds and deploys automatically.

## Deployment

Workflow: `.github/workflows/pages.yml`
- Source: `docs/web`
- Output: GitHub Pages

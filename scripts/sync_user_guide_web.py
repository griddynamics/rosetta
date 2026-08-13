#!/usr/bin/env python3
"""Generate docs/web/user-guide/* from user-guide/* with web-appropriate links.

Rerunnable: wipes and regenerates the output tree each time.
"""
import os, re, shutil, sys

SRC = 'user-guide'
OUT = 'docs/web/user-guide'
BLOB = 'https://github.com/griddynamics/rosetta/blob/main'
BASE = '/rosetta/user-guide'

# source filename -> (permalink slug, front-matter title, sidebar order)
PAGES = {
    'README.md':                        ('',                  'User Guide'),
    '01-what-is-rosetta.md':            ('what-is-rosetta/',  'What is Rosetta?'),
    '02-install.md':                    ('install/',          'Install Rosetta'),
    '03-initialize-your-repository.md': ('initialize/',       'Set up your repository'),
    '04-configure-your-ecosystem.md':   ('configure/',        'Configure your ecosystem'),
    '05-tips-and-troubleshooting.md':   ('tips/',             'Tips & troubleshooting'),
    'workflow-map.md':                  ('workflow-map/',     'Workflow map'),
}
SCENARIO_TITLES = {
    'coding.md': 'Write or change code',
    'requirements.md': 'Author requirements',
    'adhoc-task.md': 'Ad-hoc task',
    'generate-test-cases.md': 'Generate test cases',
    'automate-ui-tests.md': 'Automate UI tests',
    'automate-api-tests.md': 'Automate API tests',
    'analyze-a-codebase.md': 'Analyze a codebase',
    'research.md': 'Research a question',
    'modernize.md': 'Modernize / migrate',
    'onboard-a-library.md': 'Onboard a library',
    'security-review.md': 'Review security',
    'author-agent-prompts.md': 'Author agent prompts',
    'get-help.md': 'Get help',
}

# repo-root docs that have a published website equivalent
ROOT_TO_WEB = {
    'README.md': '/rosetta/docs/introduction/',
    'USAGE_GUIDE.md': '/rosetta/docs/usage-guide/',
    'INSTALLATION.md': '/rosetta/docs/installation/',
    'CONFIGURATION.md': '/rosetta/docs/configuration/',
    'TROUBLESHOOTING.md': '/rosetta/docs/troubleshooting/',
    'FAQ.md': '/rosetta/docs/faq/',
    'CONTRIBUTING.md': '/rosetta/docs/contributing/',
    'OVERVIEW.md': '/rosetta/docs/overview/',
    'PLUGINS.md': '/rosetta/docs/plugins/',
    'QUICKSTART.md': '/rosetta/docs/quickstart/',
    'MCPs.md': '/rosetta/docs/mcps/',
}


def guide_url(name: str, in_scenarios: bool) -> str:
    """Map a source guide filename to its published URL."""
    if name in PAGES:
        return f'{BASE}/{PAGES[name][0]}'
    if name in SCENARIO_TITLES:
        return f'{BASE}/scenarios/{name[:-3]}/'
    return ''


def rewrite_target(target: str, in_scenarios: bool) -> str:
    if target.startswith(('http://', 'https://', 'mailto:')):
        return target
    path, sep, anch = target.partition('#')
    anch = (sep + anch) if sep else ''
    if not path:                                   # same-page anchor
        return target

    # sibling / parent guide page
    base = os.path.basename(path)
    depth_up = path.startswith('../')
    plain = path.lstrip('./')

    # scenarios/<x>.md from a top-level page
    m = re.match(r'^scenarios/([\w-]+)\.md$', plain)
    if m:
        return f'{BASE}/scenarios/{m.group(1)}/{anch}'

    # ../<page>.md from inside scenarios/  -> a top-level guide page
    if depth_up and base in PAGES:
        return f'{BASE}/{PAGES[base][0]}{anch}'
    # ../<scenario>.md sibling inside scenarios/
    if base in SCENARIO_TITLES and not depth_up:
        return f'{BASE}/scenarios/{base[:-3]}/{anch}'

    # top-level guide page referenced without ../
    if base in PAGES and not depth_up:
        return f'{BASE}/{PAGES[base][0]}{anch}'

    # repo-root docs
    if base in ROOT_TO_WEB and ('../' in path):
        return ROOT_TO_WEB[base] + anch

    # instructions/** -> GitHub blob with plain view + line anchor support
    if 'instructions/' in path:
        rel = path[path.index('instructions/'):]
        return f'{BLOB}/{rel}?plain=1{anch}'

    # ../docs folder
    if plain.rstrip('/') in ('../docs', 'docs'):
        return '/rosetta/docs/introduction/'

    # anything else under the repo -> GitHub blob
    rel = plain.replace('../', '')
    return f'{BLOB}/{rel}{anch}'


LINK_RE = re.compile(r'(!?\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)')


def convert(src_path: str, out_path: str, title: str, in_scenarios: bool, order: int):
    txt = open(src_path).read()

    # drop the leading H1 (layout renders page.title) but keep it for reference
    lines = txt.split('\n')
    if lines and lines[0].startswith('# '):
        lines = lines[1:]
        while lines and not lines[0].strip():
            lines = lines[1:]
    txt = '\n'.join(lines)

    def sub(m):
        label, target, ttl = m.group(1), m.group(2), m.group(3) or ''
        return f'{label}({rewrite_target(target, in_scenarios)}{ttl})'

    txt = LINK_RE.sub(sub, txt)

    # Mermaid hexagon nodes use {{"..."}}, which Liquid would interpolate away.
    # Fence every mermaid block in {% raw %} so Jekyll leaves it untouched.
    txt = re.sub(
        r'(```mermaid\n.*?```)',
        lambda m: '{% raw %}\n' + m.group(1) + '\n{% endraw %}',
        txt, flags=re.S)

    permalink = f'/user-guide/{PAGES[os.path.basename(src_path)][0]}' if os.path.basename(src_path) in PAGES \
                else f'/user-guide/scenarios/{os.path.basename(src_path)[:-3]}/'
    fm = ['---', 'layout: user-guide', f'title: {title}', f'permalink: {permalink}']
    if permalink == '/user-guide/':
        fm.append('search_exclude: true')
    fm += ['---', '', f'# {title}', '']
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    open(out_path, 'w').write('\n'.join(fm) + txt.lstrip('\n') + '\n')


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    n = 0
    for i, (name, (slug, title)) in enumerate(PAGES.items()):
        out = os.path.join(OUT, 'index.md' if slug == '' else slug.rstrip('/') + '.md')
        convert(os.path.join(SRC, name), out, title, False, i)
        n += 1
    for i, (name, title) in enumerate(SCENARIO_TITLES.items()):
        out = os.path.join(OUT, 'scenarios', name)
        convert(os.path.join(SRC, 'scenarios', name), out, title, True, i)
        n += 1
    print(f'generated {n} pages into {OUT}')


if __name__ == '__main__':
    main()

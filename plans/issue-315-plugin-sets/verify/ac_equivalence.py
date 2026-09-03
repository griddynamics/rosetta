#!/usr/bin/env python3
"""AC2 / AC3 — equivalence against the P0 golden snapshot. Read-only.

AC2: plugins/rosetta-<ide>       == golden/core-<ide>
     plugins/rosetta-<ide>-light == golden/core-<ide>-light
     ...modulo the 16 permitted differences agreed in the plan. Any diff that
     maps to none of them is a FAILURE.

AC3: union of file sets across core/workflows/qe/search/modernization-<ide>
     == file set of rosetta-<ide>-light, excluding per-plugin manifests and hook configs.
"""
import hashlib, pathlib, sys

ROOT = pathlib.Path("/Users/isolomatov/Sources/GAIN/rosetta-manual-branch")
GOLD = ROOT / "agents/TEMP/315-golden"
OUT = ROOT / "plugins"
IDES = ["claude", "cursor", "copilot", "codex", "antigravity",
        "cursor-standalone", "copilot-standalone"]
SETS = ["core", "workflows", "qe", "search", "modernization"]

# (id, description, predicate on the plugin-relative posix path)
PERMITTED = [
    (1,  "INDEX.md removed",                 lambda p: p.endswith("INDEX.md")),
    (5,  "configure/ retired",               lambda p: "/configure/" in f"/{p}" and "harness" not in p),
    (6,  "self-help-flow removed",           lambda p: "self-help-flow" in p),
    (7,  "harness configure now verbatim",   lambda p: "harness/references/configure/" in p),
    (8,  "plugin-files-mode reworded",       lambda p: "plugin-files-mode" in p),
    (9,  "mcp-files-mode CONFIGURE dropped", lambda p: "mcp-files-mode" in p),
    (10, "init-workspace-flow-shells edit",  lambda p: "init-workspace-flow-shells" in p),
    (11, "help-flow plugin requirements",    lambda p: "help-flow" in p),
    (12, "speckit frontmatter",              lambda p: "speckit-integration-policy" in p),
    (13, "prompt-authoring alias grammar",   lambda p: "pa-rosetta" in p or "pa-adapt" in p),
    (14, "hooks-authoring paths updated",    lambda p: "coding-agents-hooks-authoring" in p),
    (16, "templates/ (was already empty)",   lambda p: p.startswith("templates/") or "/templates/" in f"/{p}"),
    (17, "P3: cross-set command advertisements marked",
                                             lambda p: "arrange-workspace-flow" in p or "init-workspace-flow" in p),
    (18, "P3: prompt-authoring alias grammar README",
                                             lambda p: "coding-agents-prompt-authoring/README" in p),
    (19, "P3: harness README follow-up note",lambda p: "harness/README" in p),
    (20, "P3: local-files-mode CONFIGURE dropped",
                                             lambda p: "local-files-mode" in p),
    (21, "self-help-flow deleted: stale README citations",
                                             lambda p: p.endswith("README.md") and any(
                                                 k in p for k in ("debugging/","load-project-context/","natural-writing/",
                                                                  "reasoning/","requirements-authoring/","research/",
                                                                  "testing/","security/"))),
    (22, "FIX: antigravity templates/->rules/ corruption removed",
                                             lambda p: "security/SKILL.md" in p or "coding/assets/iac.md" in p),
    # 2,3,4,15 are content-shaped, matched below by filename
    (2,  "SessionStart payload / hooks.json",lambda p: p.endswith("hooks.json") or p.endswith("hooks.json.tmpl")),
    (3,  "manifest name/description",        lambda p: p.endswith("plugin.json") or p.endswith("marketplace.json")),
    (15, "copilot hook plugin path",         lambda p: "hooks" in p and "copilot" in p),
]

def files(root):
    if not root.is_dir():
        return None
    return {str(p.relative_to(root).as_posix()): p
            for p in root.rglob("*") if p.is_file()}

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def classify(path):
    return [(i, d) for i, d, pred in PERMITTED if pred(path)]

def compare(gold_dir, new_dir, label):
    g, n = files(gold_dir), files(new_dir)
    if g is None: return [f"MISSING GOLDEN {gold_dir.name}"], 0
    if n is None: return [f"MISSING OUTPUT {new_dir.name}"], 0
    problems, accounted = [], 0
    for path in sorted(set(g) | set(n)):
        if path in g and path in n:
            if digest(g[path]) == digest(n[path]):
                continue
            kind = "CHANGED"
        else:
            kind = "REMOVED" if path in g else "ADDED"
        cats = classify(path)
        if cats:
            accounted += 1
        else:
            problems.append(f"    {kind:8} {path}")
    return problems, accounted

def main():
    fail = 0
    print("=== AC2 — rosetta-<ide> content-equivalent to golden core-<ide> ===")
    for ide in IDES:
        for suffix in ("", "-light"):
            label = f"rosetta-{ide}{suffix}"
            probs, acc = compare(GOLD / f"core-{ide}{suffix}", OUT / label, label)
            if probs:
                fail = 1
                print(f"  FAIL  {label}: {len(probs)} unaccounted diff(s), {acc} permitted")
                for line in probs[:12]:
                    print(line)
                if len(probs) > 12:
                    print(f"    ... and {len(probs)-12} more")
            else:
                print(f"  PASS  {label}: all {acc} diff(s) map to the permitted list")

    print()
    print("=== AC3 — union of split sets == rosetta-<ide>-light ===")
    skip = ("plugin.json", "marketplace.json", "hooks.json", "hooks.json.tmpl", "INDEX.md")
    for ide in IDES:
        combo = files(OUT / f"rosetta-{ide}-light")
        if combo is None:
            print(f"  FAIL  rosetta-{ide}-light missing"); fail = 1; continue
        combo_set = {p for p in combo if not p.endswith(skip)}
        union = set()
        for s in SETS:
            part = files(OUT / f"{s}-{ide}")
            if part is None:
                print(f"  FAIL  {s}-{ide} missing"); fail = 1; continue
            union |= {p for p in part if not p.endswith(skip)}
        only_combo, only_union = combo_set - union, union - combo_set
        if not only_combo and not only_union:
            print(f"  PASS  {ide}: {len(combo_set)} files match exactly")
        else:
            fail = 1
            print(f"  FAIL  {ide}: {len(only_combo)} only-in-combo, {len(only_union)} only-in-union")
            for p in sorted(only_combo)[:6]:  print(f"    only in rosetta-light: {p}")
            for p in sorted(only_union)[:6]:  print(f"    only in split sets:    {p}")

    print()
    print("EQUIVALENCE: " + ("ALL PASS" if not fail else "FAILURES PRESENT"))
    return fail

sys.exit(main())

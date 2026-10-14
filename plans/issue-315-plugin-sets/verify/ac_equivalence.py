#!/usr/bin/env python3
"""AC2 / AC3 — equivalence against the P0 golden snapshot. Read-only.

AC2: plugins/rosetta-<ide>       == golden/core-<ide>
     plugins/rosetta-<ide>-light == golden/core-<ide>-light
     ...modulo the 16 permitted differences agreed in the plan. Any diff that
     maps to none of them is a FAILURE.

AC3: union of file sets across core/workflows/qe/search/modernization-<ide>
     == file set of rosetta-<ide>-light, excluding per-plugin manifests and hook configs.

AC2 is evaluated per differing file, in this order:
  1. BRANCH_AUTHORED strict entries (permitted_content.json, layer 2): the golden->tree
     hunk multiset must equal {layer-1 hunk, if the skill is in the manifest} + {listed hunks}.
  2. Path classes (PERMITTED below). Files with a layer-2 "presence" entry are path-permitted,
     and the listed hunks must additionally be present in every target copy.
  3. MAIN_POST_GOLDEN (layer 1): skill READMEs main edited after the golden snapshot. The diff
     must be exactly main's added lines (one pure-insertion hunk at the manifest anchor, nothing removed).
  4. Otherwise unaccounted: FAIL, with the n=0 unified diff printed.
Two-way contract: a declared file identical to golden, or a declared hunk that is absent, FAILS.

MANUAL #315 gate. Not part of pre-commit (the golden snapshot is local-only).
Usage: python3 ac_equivalence.py [--tree DIR] [--golden DIR] [--manifest FILE]
Regenerate the manifest with gen_permitted_content.py (two named refs, never the working tree for layer 1).
"""
import argparse, collections, difflib, hashlib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
GOLD = ROOT / "agents/TEMP/315-golden"
OUT = ROOT / "plugins"
MANIFEST = pathlib.Path(__file__).resolve().with_name("permitted_content.json")
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
    # 23: source moved on main AFTER the golden snapshot was captured, so golden is simply older.
    # Deliberately scoped to the one known file rather than "anything that changed on main" — a
    # blanket class would blind the gate to real regressions. Extend it file by file, with the
    # originating commit named, whenever main lands another instruction change ahead of a re-capture.
    (23, "backlog SKILL.md changed on main post-golden (b5388f7e)",
                                             lambda p: p.endswith("skills/backlog/SKILL.md")),
    # id 24 (layers 1 and 2, content-aware, NOT path classes): see MAIN_POST_GOLDEN and BRANCH_AUTHORED in
    # permitted_content.json. Path classes are blind to what changed inside a file; the two layers are not.
    # 2,3,4,15 are content-shaped, matched below by filename
    (2,  "SessionStart payload / hooks.json",lambda p: p.endswith("hooks.json") or p.endswith("hooks.json.tmpl")),
    (3,  "manifest name/description",        lambda p: p.endswith("plugin.json") or p.endswith("marketplace.json")),
    (15, "copilot hook plugin path",         lambda p: "hooks" in p and "copilot" in p),
]

README_RE = re.compile(r"(^|/)skills/([^/]+)/README\.md$")

def files(root):
    if not root.is_dir():
        return None
    return {str(p.relative_to(root).as_posix()): p
            for p in root.rglob("*") if p.is_file()}

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def classify(path):
    return [(i, d) for i, d, pred in PERMITTED if pred(path)]

def lines_of(p):
    return p.read_bytes().decode("utf-8", "surrogateescape").split("\n")

def hunks(old, new):
    """n=0 hunks as (at, removed, added). at = golden line after which an insertion lands
    (count 0), else the first removed line; the same convention as `git diff -U0`.
    Pure insertions are slid to the latest equivalent position, which is what git reports."""
    sm = difflib.SequenceMatcher(None, old, new, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        rem, add, at = tuple(old[i1:i2]), tuple(new[j1:j2]), i1
        if not rem:  # pure insertion is ambiguous in blank-line runs: slide to the latest position
            while at < len(old) and add and old[at] == add[0]:
                add, at = add[1:] + (add[0],), at + 1
        else:
            at = i1 + 1
        out.append((at, rem, add))
    return out

def udiff(old, new, path):
    d = list(difflib.unified_diff(old, new, f"golden/{path}", f"tree/{path}", n=0, lineterm=""))
    return d

def fmt(h):
    at, rem, add = h
    return f"@{at} -{len(rem)} +{len(add)} " + " / ".join(([f"-{x[:70]}" for x in rem] + [f"+{x[:70]}" for x in add])[:4])

def load_manifest(path):
    m = json.loads(pathlib.Path(path).read_text())
    for k in ("main_post_golden", "branch_authored"):
        if k not in m:
            raise SystemExit(f"manifest {path}: section '{k}' missing")
    if not m["main_post_golden"].get("source", {}).get("commits"):
        raise SystemExit(f"manifest {path}: main_post_golden.source.commits is required")
    return m

def l1_hunks(man, name):
    return [(h["anchor_after_line"], (), tuple(h["added"]))
            for h in man["main_post_golden"]["skills"][name]["hunks"]]

def compare(gold_dir, new_dir, label, man):
    """Returns (problems, path_permitted, content_permitted)."""
    g, n = files(gold_dir), files(new_dir)
    if g is None: return [f"MISSING GOLDEN {gold_dir.name}"], 0, 0
    if n is None: return [f"MISSING OUTPUT {new_dir.name}"], 0, 0
    L1 = man["main_post_golden"]["skills"]
    files2 = man["branch_authored"]["files"]
    strict, presence = {}, {}
    for key, ent in files2.items():
        t = ent["targets"].get(label)
        if t is None:
            return [f"    NO LAYER-2 ENTRY {key} for {label}"], 0, 0
        (strict if ent["mode"] == "strict" else presence)[t["path"]] = (key, t["hunks"])
    problems, path_ok, content_ok = [], 0, 0

    def differs(path):
        return path in g and path in n and digest(g[path]) != digest(n[path])

    # two-way: declared layer-2 files must exist and differ from golden
    for path, (key, _) in sorted({**strict, **presence}.items()):
        if not differs(path):
            why = "identical to golden" if path in g and path in n else "missing on one side"
            problems.append(f"    UNOBSERVED layer-2 {key}: {path} is {why}")
    # two-way: every manifest skill present in golden must differ
    for path in sorted(g):
        m = README_RE.search(path)
        if m and m.group(2) in L1 and path not in strict and not differs(path):
            problems.append(f"    UNOBSERVED manifest entry {m.group(2)}: {path} is "
                            f"{'identical to golden' if path in n else 'missing in output'}")

    for path in sorted(set(g) | set(n)):
        if path in g and path in n:
            if digest(g[path]) == digest(n[path]):
                continue
            kind = "CHANGED"
        else:
            kind = "REMOVED" if path in g else "ADDED"
        old = lines_of(g[path]) if path in g else []
        new = lines_of(n[path]) if path in n else []
        actual = collections.Counter(hunks(old, new)) if kind == "CHANGED" else None
        mm = README_RE.search(path)
        skill = mm.group(2) if mm and mm.group(2) in L1 else None
        if kind == "CHANGED" and path in strict:                       # 1. layer 2 strict
            key, exp = strict[path]
            want = collections.Counter((h["at"], tuple(h["removed"]), tuple(h["added"])) for h in exp)
            if skill: want.update(l1_hunks(man, skill))
            if actual == want:
                content_ok += 1
            else:
                problems.append(f"    STRICT {key}: {path}")
                for h in (want - actual).elements(): problems.append(f"      missing hunk  {fmt(h)}")
                for h in (actual - want).elements(): problems.append(f"      extra hunk    {fmt(h)}")
                problems.extend("      " + d for d in udiff(old, new, path)[:30])
            continue
        if classify(path):                                             # 2. path classes
            path_ok += 1
            if path in presence:
                key, exp = presence[path]
                have_new, have_old = set(new), set(old)
                for h in exp:
                    for x in h["added"]:
                        if x not in have_new or x in have_old:
                            problems.append(f"    PRESENCE-ABSENT {key}: {path} lacks expected line {x[:90]!r}")
                    for x in h["removed"]:
                        if x in have_new:
                            problems.append(f"    PRESENCE-ABSENT {key}: {path} still has pre-edit line {x[:90]!r}")
            continue
        if kind == "CHANGED" and skill:                                # 3. layer 1
            want = collections.Counter(l1_hunks(man, skill))
            if actual == want:
                content_ok += 1
                continue
            problems.append(f"    MAIN-POST-GOLDEN {skill}: {path} is not exactly main's added lines")
            for h in (want - actual).elements(): problems.append(f"      missing hunk  {fmt(h)}")
            for h in (actual - want).elements(): problems.append(f"      extra hunk    {fmt(h)}")
            problems.extend("      " + d for d in udiff(old, new, path)[:30])
            continue
        problems.append(f"    {kind:8} {path}")                        # 4. unaccounted
        if kind == "CHANGED":
            problems.extend("      " + d for d in udiff(old, new, path)[:30])
    return problems, path_ok, content_ok

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--tree", type=pathlib.Path, default=OUT, help="plugins tree (default: $ROOT/plugins)")
    ap.add_argument("--golden", type=pathlib.Path, default=GOLD, help="golden snapshot dir")
    ap.add_argument("--manifest", type=pathlib.Path, default=MANIFEST)
    a = ap.parse_args(argv)
    man = load_manifest(a.manifest)
    fail = 0
    print("=== AC2 — rosetta-<ide> content-equivalent to golden core-<ide> ===")
    for ide in IDES:
        for suffix in ("", "-light"):
            label = f"rosetta-{ide}{suffix}"
            probs, pp, cp = compare(a.golden / f"core-{ide}{suffix}", a.tree / label, label, man)
            unacc = sum(1 for p in probs if re.match(r"    (CHANGED|REMOVED|ADDED|STRICT|MAIN-POST|UNOBSERVED|PRESENCE|NO LAYER|MISSING)", p))
            if probs:
                fail = 1
                print(f"  FAIL  {label}: {pp} path-permitted, {cp} content-permitted, {unacc} unaccounted")
                for line in probs[:60]:
                    print(line)
                if len(probs) > 60:
                    print(f"    ... and {len(probs)-60} more lines")
            else:
                print(f"  PASS  {label}: {pp} path-permitted, {cp} content-permitted, 0 unaccounted")

    print()
    print("=== AC3 — union of split sets == rosetta-<ide>-light ===")
    skip = ("plugin.json", "marketplace.json", "hooks.json", "hooks.json.tmpl", "INDEX.md")
    for ide in IDES:
        combo = files(a.tree / f"rosetta-{ide}-light")
        if combo is None:
            print(f"  FAIL  rosetta-{ide}-light missing"); fail = 1; continue
        combo_set = {p for p in combo if not p.endswith(skip)}
        union = set()
        for s in SETS:
            part = files(a.tree / f"{s}-{ide}")
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

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""AC5 / AC6 — cross-folder reference integrity. Read-only.

AC5: no PATH-style reference from qe/search/modernization resolves to a file
     owned by another folder.
AC6: every `USE SKILL <name>` / subagent name referenced FROM a domain set
     resolves in core or workflows -- AND the reverse: no core/workflows file
     references a domain-set unit by name (help-flow is the known exception,
     handled by an explicit content edit).
"""
import pathlib, re, sys, collections

ROOT = pathlib.Path(__file__).resolve().parents[2] / "instructions/r3"
# Catalog-driven: whatever folders exist under instructions/r3. `core` and
# `workflows` are the foundation folders (when present); every other folder is a
# domain set. With a single `core` folder there are no domain sets and AC5/AC6
# pass vacuously; a future re-split needs no edit here.
FOUNDATION = ("core", "workflows")
FOLDERS = sorted(p.name for p in ROOT.iterdir() if p.is_dir())
DOMAIN = [f for f in FOLDERS if f not in FOUNDATION]
BASE = [f for f in FOLDERS if f in FOUNDATION]

# Target-repo paths that legitimately appear in instruction text.
TARGET_REPO = re.compile(
    r"^(agents/(TEMP|IMPLEMENTATION|MEMORY|user-instructions|[a-z0-9-]+-state\.md)"
    r"|docs/|plans/|refsrc/|tasks/)")
PATH_REF = re.compile(r"(?:^|[\s`(\[])((?:rules|workflows|agents|skills|configure|templates)/[A-Za-z0-9_~./-]+)")
USE_SKILL = re.compile(r"(?:USE|READ) SKILL\s+`([a-z0-9-]+)`")
SUBAGENT = re.compile(r"(?:subagent|INVOKE SUBAGENT)\s*=?\s*[\"`]([a-z-]+)[\"`]")

def owned():
    """map: folder -> set of unit names it provides"""
    prov = collections.defaultdict(set)
    for f in FOLDERS:
        base = ROOT / f
        for kind in ("skills", "agents", "workflows", "rules"):
            d = base / kind
            if not d.is_dir(): continue
            for item in d.iterdir():
                name = item.name if item.is_dir() else item.stem
                prov[f].add(name.split("~")[0])
    return prov

def md_files(folder):
    d = ROOT / folder
    return [p for p in d.rglob("*.md")] if d.is_dir() else []

def main():
    fail = 0
    prov = owned()
    for f in FOLDERS:
        print(f"  {f:15} provides {len(prov[f])} named units")
    core_adv = set().union(*(prov[f] for f in BASE))
    domain_units = set().union(*(prov[d] for d in DOMAIN))

    print()
    print("=== AC5 — no cross-folder PATH references from domain sets ===")
    bad = []
    for folder in DOMAIN:
        for p in md_files(folder):
            for i, line in enumerate(p.read_text(errors="replace").splitlines(), 1):
                for m in PATH_REF.finditer(line):
                    ref = m.group(1)
                    if TARGET_REPO.match(ref):      continue   # target-repo file, fine
                    bad.append(f"    {p.relative_to(ROOT)}:{i}  {ref}")
    if bad:
        fail = 1
        print(f"  FAIL  {len(bad)} instruction-tree path reference(s) from domain sets:")
        for b in bad[:20]: print(b)
    else:
        print("  PASS  zero instruction-tree path references from domain sets" + ("" if DOMAIN else " (vacuous: no domain sets)"))

    print()
    print("=== AC6a — forward: domain -> core/workflows names all resolve ===")
    unresolved = []
    for folder in DOMAIN:
        for p in md_files(folder):
            txt = p.read_text(errors="replace")
            for name in set(USE_SKILL.findall(txt)) | set(SUBAGENT.findall(txt)):
                if name not in core_adv and name not in prov[folder]:
                    unresolved.append(f"    {p.relative_to(ROOT)}  ->  {name}")
    if unresolved:
        fail = 1
        print(f"  FAIL  {len(unresolved)} unresolvable name(s):")
        for u in sorted(set(unresolved))[:20]: print(u)
    else:
        print("  PASS  every name referenced from a domain set resolves in core/workflows (or itself)" + ("" if DOMAIN else " (vacuous: no domain sets)"))

    print()
    print("=== AC6b — reverse: core/workflows must NOT reference domain units ===")
    leaks = []
    for folder in BASE:
        for p in md_files(folder):
            txt = p.read_text(errors="replace")
            for name in set(USE_SKILL.findall(txt)) | set(SUBAGENT.findall(txt)):
                if name in domain_units and name not in core_adv:
                    leaks.append((str(p.relative_to(ROOT)), name))
    # help-flow advertises domain COMMANDS; that is handled by an explicit edit and is
    # not a USE SKILL reference, so it should not appear here at all.
    if leaks:
        fail = 1
        print(f"  FAIL  {len(leaks)} core/workflows -> domain leak(s):")
        for f_, n in sorted(set(leaks))[:20]: print(f"    {f_}  ->  {n}")
    else:
        print("  PASS  no core/workflows file references a domain-set unit by name" + ("" if DOMAIN else " (vacuous: no domain sets)"))

    print()
    print("CROSSREFS: " + ("ALL PASS" if not fail else "FAILURES PRESENT"))
    return fail

sys.exit(main())

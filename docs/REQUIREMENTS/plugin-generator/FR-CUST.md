# plugin-generator — Customization Sources (FR-CUST)

Customization roots: additional instruction sources that merge into the main instruction source, folder into folder, as if all contributions came from one source. Command-line option: FR-CLI-0035. Order of contributions: FR-ARCH-0026. Overwrite rules: FR-ARCH-0024.

## Multi-source merge

<req id="FR-CUST-0001" type="FR" level="System" ticketId="" classification="technical"
     source="User" priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-11-05"
     depends="FR-CLI-0035, FR-ARCH-0026, FR-ARCH-0024, FR-ARCH-0041, FR-ARCH-0042"
     implementation="Implemented">
  <title>Customization roots merge into the main instruction source</title>
  <statement>The generator shall build each set's VFS from an ordered source list: the main instruction source first, then each customization root in the order FR-CLI-0035 supplies them. A customization root shall have the same structure as the main instruction source, `<root>/<release>/<folder>/…`. The generator shall merge the `<root>/<release>/<folder>/` tree of every source into the same release and the same folder, so a file at `<root>/r3/core/<path>` contributes to the same VFS path as `instructions/r3/core/<path>`. The existing VFS rules govern the merge without change: filename directives filter first (FR-ARCH-0041), a contribution at a VFS path that an earlier contribution already holds is appended (FR-ARCH-0042), and an `overwrite` contribution replaces its predecessors (FR-ARCH-0024). A contribution at a VFS path that no other source holds is a new file. With no customization root, the output shall equal the output of a run without the option.</statement>
  <rationale>Organizations extend or adjust Rosetta without forking it. Merging folder into folder with the rules that already govern layers keeps one merge model for every source.</rationale>
  <acceptance>
    <criteria id="FR-CUST-0001.AC1" ears="event" when="customization root `acme` holds `acme/r3/core/skills/acme-deploy/SKILL.md` and the main source has no `skills/acme-deploy/`" system="the generator" shall="ship `skills/acme-deploy/SKILL.md` in every `rosetta-*` plugin as a new skill"/>
    <criteria id="FR-CUST-0001.AC2" ears="event" when="customization root `acme` holds `acme/r3/core/skills/coding/references/acme-rules.md`" system="the generator" shall="ship `acme-rules.md` inside the existing `coding` skill's `references/` folder, next to the main source's files"/>
    <criteria id="FR-CUST-0001.AC3" ears="event" when="customization root `acme` holds `acme/r3/core/workflows/coding-flow.md` with frontmatter `description: ACME` and body `## ACME rules`" system="the generator" shall="ship `coding-flow.md` as the main source's file (its frontmatter unchanged) followed by the body `## ACME rules`"/>
    <criteria id="FR-CUST-0001.AC4" ears="event" when="customization root `acme` holds `acme/r3/core/workflows/coding-flow~profile-lightweight-only~.md`" system="the generator" shall="append it to `coding-flow.md` in the `rosetta-*-light` plugins only and leave `coding-flow.md` in the `rosetta-*` plugins unchanged"/>
    <criteria id="FR-CUST-0001.AC5" ears="ubiquitous" system="the generator" shall="produce byte-identical output for a run with no customization root and for the same run before this capability existed"/>
  </acceptance>
  <implementationNotes>Implemented: buildVfs (src/rosettify-plugins/src/vfs/build-vfs.ts) takes the ordered customization roots and merges every source into one VirtualFile per clean VFS path; resolveLayerDirs and collectSourceFiles (src/rosettify-plugins/src/vfs/source-resolver.ts) list the main source first, then each root's `<release>/<folder>` tree; generate (src/rosettify-plugins/src/generate.ts) passes the resolved roots to buildVfs for every set. Tests: tests/e2e/customizations.e2e.test.ts, tests/unit/vfs/build-vfs.test.ts.</implementationNotes>
  <notes>Appending keeps the first contribution's frontmatter and drops the frontmatter of later contributions (FR-ARCH-0042). A customization changes frontmatter, for example a skill `description`, only by overwrite.</notes>
</req>

<req id="FR-CUST-0002" type="FR" level="System" ticketId="" classification="technical"
     source="User" priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-11-05"
     depends="FR-CUST-0001, FR-SET-0001"
     implementation="Implemented">
  <title>A customization folder must be a declared folder</title>
  <statement>The generator shall check only the entries directly under `<root>/<release>/` of a customization root, for the selected release. Every directory there shall name a folder that at least one set of the plugin-set catalog declares for that release; a directory that no set declares, and any loose file there, shall be a hard error. An entry whose name starts with `.` (for example `.DS_Store`, `.gitkeep`) is ignored. Entries directly under `<root>/` other than release directories (for example `README.md`, `LICENSE`, `.git/`, `.gitignore`, `docs/`) are ignored. The generator shall detect an error at pre-flight, before any output is written, and shall name the offending path. A declared folder that the current run does not build, because a `--domain` filter excludes its set, contributes nothing and is not an error.</statement>
  <rationale>A customization root is usually its own repository with repository files at its top level. Typos that would silently ship nothing happen under the release folder, so only that level is checked.</rationale>
  <acceptance>
    <criteria id="FR-CUST-0002.AC1" ears="unwanted" if="customization root `acme` holds `acme/r3/acme/skills/x/SKILL.md` and no set declares folder `acme` for `r3`" system="the generator" shall="exit non-zero naming `acme/r3/acme`, without writing any output folder"/>
    <criteria id="FR-CUST-0002.AC2" ears="unwanted" if="customization root `acme` holds `acme/r3/README.md`" system="the generator" shall="exit non-zero naming `acme/r3/README.md`, without writing any output folder"/>
    <criteria id="FR-CUST-0002.AC3" ears="event" when="customization root `acme` holds only `acme/r3/core/`" system="the generator" shall="accept it"/>
    <criteria id="FR-CUST-0002.AC4" ears="event" when="customization root `acme` holds `acme/README.md`, `acme/LICENSE`, `acme/.git/`, `acme/docs/` and `acme/r3/core/`" system="the generator" shall="ignore every entry except `acme/r3/core/` and exit zero"/>
    <criteria id="FR-CUST-0002.AC5" ears="event" when="customization root `acme` holds `acme/r3/.DS_Store` and `acme/r3/core/`" system="the generator" shall="ignore `.DS_Store` and exit zero"/>
  </acceptance>
  <implementationNotes>Implemented: validateCustomizationRoots (src/rosettify-plugins/src/vfs/customizations.ts) inspects only the entries directly under `<root>/<release>/`, ignores dot-entries, and reports undeclared directories and loose files; declaredFoldersForRelease (src/rosettify-plugins/src/spec/plugin-sets.ts) supplies the folders the whole catalog declares for the release, independent of `--domain`; generate (src/rosettify-plugins/src/generate.ts) runs the check at pre-flight. Tests: tests/unit/vfs/customizations.test.ts, tests/unit/generate.test.ts.</implementationNotes>
  <notes></notes>
</req>

<req id="FR-CUST-0003" type="FR" level="System" ticketId="" classification="technical"
     source="User" priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-11-05"
     depends="FR-CLI-0035"
     implementation="Implemented">
  <title>Customization root validity</title>
  <statement>Each customization root shall be an existing directory; a missing path or a path that is not a directory shall be a hard error at pre-flight, before any output is written. A customization root with no `<release>/` directory for the selected release shall contribute nothing to that run and shall not be an error.</statement>
  <rationale>A wrong path must fail loudly. A root that customizes only `r3` stays valid when the run builds `r2`.</rationale>
  <acceptance>
    <criteria id="FR-CUST-0003.AC1" ears="unwanted" if="`--customizations ./missing` names no existing path" system="the generator" shall="exit non-zero naming the resolved path, without writing any output folder"/>
    <criteria id="FR-CUST-0003.AC2" ears="unwanted" if="`--customizations ./notes.md` names a file" system="the generator" shall="exit non-zero naming the resolved path, without writing any output folder"/>
    <criteria id="FR-CUST-0003.AC3" ears="event" when="customization root `acme` holds only `acme/r3/` and the run builds release `r2`" system="the generator" shall="build `r2` from the main source alone and exit zero"/>
  </acceptance>
  <implementationNotes>Implemented: validateCustomizationRoots (src/rosettify-plugins/src/vfs/customizations.ts) rejects a missing path or a non-directory root and accepts a root with no `<release>/` directory; resolveLayerDirs (src/rosettify-plugins/src/vfs/source-resolver.ts) skips a missing `<release>/` or folder in a customization root; generate (src/rosettify-plugins/src/generate.ts) runs the check at pre-flight. Tests: tests/unit/vfs/customizations.test.ts, tests/unit/generate.test.ts.</implementationNotes>
  <notes>Proposed by AI and accepted by the user on 2026-11-05.</notes>
</req>

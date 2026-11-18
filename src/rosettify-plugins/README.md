# rosettify-plugins

CLI and library package for generating Rosetta IDE plugin outputs from instruction sources.

## Install

```bash
npm install -g rosettify-plugins
```

Or run it directly:

```bash
npx -y rosettify-plugins@latest --source . --release r3
```

## Usage

```bash
rosettify-plugins --source . --release r3
```

One invocation generates every declared plugin **set**, for every IDE target.

Key inputs derived from `--source`:

- `instructions/`
- `src/rosettify-plugins/plugins/` — preserved-file templates, one `template-<ide>` folder per IDE
- `src/rosettify-plugins/plugins.json` — the plugin-set catalog
- `src/rosettify-plugins/profiles/`
- `src/hooks/`
- output defaults to `plugins/`

Override them with `--instructionsSource`, `--pluginsSource`, `--config`, `--profileSource`,
`--hooksSource`, and `--output`.

## Plugin sets

A **set** is a named bundle of instruction folders shipped as one installable plugin, declared in
`plugins.json`. The generator expands  sets × variants × IDE targets  into output folders named
`<set>-<ide>[<variantSuffix>]`.

```jsonc
{
  "targets": ["claude", "cursor", "copilot", "codex",
              "cursor-standalone", "copilot-standalone", "antigravity"],
  "hookSupportModules": { "read-once": ["read-once-reset", "read-once-shared"] },
  "sets": [
    {
      "name": "qe",                    // output folder prefix, and the set-qe-only token
      "folders": ["qe"],               // instruction folders layered into this set's VFS
      "template": "template",          // preserved files at plugins/<template>-<ide>/
      "releases": ["r3"],              // which releases this set is available for
      "requires": ["core", "workflows"],// other sets a user must also install
      "bootstrap": false,              // registers the session-start bootstrap payload?
      "hooks": [],                     // hook modules shipped (empty + no bootstrap = no hooks/)
      "manifest": { "name": "rosetta-qe", "description": "…" },
      "variants": [                    // each variant is one output flavour of the set
        { "profile": "lightweight", "destinationSuffix": "",
          "manifestNameSuffix": "", "manifestDescriptionSuffix": "" }
      ]
    }
  ]
}
```

The catalog is fully validated before anything is written: an unknown field, a duplicate set name,
two variants writing the same folder, a `requires` naming an undeclared set, a set naming a missing
instruction folder or a missing template — each aborts the run non-zero, naming the file. Output
folders the catalog no longer declares are swept from the output directory. A folder is swept only
when both hold:

- its name is `<set>-<ide>[<variantSuffix>]`, for any IDE target the generator knows;
- it holds the manifest the generator writes for that IDE target: `.claude-plugin/plugin.json`
  (`claude`), `.cursor-plugin/plugin.json` (`cursor`), `.github/plugin/plugin.json` (`copilot`),
  `.codex-plugin/plugin.json` (`codex`), or `plugin.json` at the folder root (`cursor-standalone`,
  `copilot-standalone`, `antigravity`).

Every other folder and every loose file there is left alone. A folder of your own that meets both
conditions is swept too, so give `--output` a directory that holds only generated plugins.

### Selecting what to build

- `--release <r>` — a set is built only when it lists that release. `instructions/r2/` holds only
  `core/`, so `--release r2` resolves to the single set built from it.
- `--domain <list>` — a **folder filter** over sets: a set is built only when every folder it
  layers is named in the list. `--domain qe` builds only `qe-*`. Omit it to build every set
  available for the release.
- `--profile <name>` — a debugging **override** of every variant's declared profile. The normal
  path is the `profile` field on the variant itself.
- `--publish <name>[,<name>...]` — writes only the named plugins (for example `rosetta,rosetta-light`).
  Names are plugin names: a set's manifest name plus a variant's manifest-name suffix, and one name
  covers that plugin's folder for every IDE target. The whole catalog is still validated and built;
  output folders of unnamed plugins are not cleaned, written, or removed. A name that matches no
  declared plugin is a hard error before anything is written. Omit it to write every plugin.

## Filename directives

Directives are tilde-fenced in a filename: `name~token[~token...]~.ext`. There are four disjoint
`-only` namespaces, and every `-only` token present must be satisfied:

| Token | Selects |
| --- | --- |
| `~overwrite~` | supersede earlier layers of the same document |
| `~target-<ide>-only~` | one exact IDE target (`target-cursor-only` excludes `cursor-standalone`) |
| `~ide-<family>-only~` | every target of one IDE (`ide-cursor-only` covers both Cursor forms) |
| `~set-<name>-only~` | one plugin set |
| `~profile-<name>-only~` | one active build profile |

An **OrderToken** is an optional first token that matches `^[0-9][0-9a-z]{0,3}$`, for example
`coding-flow~001~.md` or `bootstrap~010~overwrite~.md`. It sets the order in which contributions to
the same document merge. It is not a filter. The order is a plain string sort, and the generator
does not interpret numbers: `10` sorts before `9`. Authors who want numeric order pad with zeros
(`001`, `010`, `100`).
An OrderToken must come first among the tokens; placed later, or repeated, it is a hard error that
names the file.

## Customizations

`--customizations <dir>[,<dir>...]` (repeatable) adds customization roots: separate instruction
trees that merge into the main `--instructionsSource` folder by folder, as if all files came from
one source. Relative paths resolve against `--source`; absolute paths are used as written.

```bash
rosettify-plugins --source . --release r3 \
  --customizations acme,/opt/team-rosetta \
  --publish rosetta,rosetta-light
```

Each root uses the same layout as `instructions/`: `<root>/<release>/<folder>/…`.

- Only `<root>/<release>/` is checked. Entries directly under `<root>/` (`README.md`, `LICENSE`,
  `.git/`, `docs/`) and dot-entries under `<release>/` (`.DS_Store`, `.gitkeep`) are ignored.
- Every directory under `<root>/<release>/` must name a folder some set declares for that release,
  and loose files there are errors. Both are caught at pre-flight and name the path.
- A root without `<release>/` contributes nothing to that run and is not an error. A missing root
  path, or a path that is a file, is an error.
- A folder under `<root>/<release>/` may be a symlink to a directory; symlinks nested inside a
  folder are not followed (same as `instructions/`). A dangling symlink there is an error.

Merge order: the main source first, then each root in `--customizations` order (letters `A`, `B`,
…). Within one document, contributions sort by letter, then by path, then by OrderToken.

- A new path is added.
- A contribution to a path an earlier one holds is **appended**; the first contribution's
  frontmatter is kept.
- A `~overwrite~` contribution **replaces** earlier contributions. Several overwrites at one path
  apply in order, so the last one wins. An overwrite with no earlier contribution to replace is a
  pre-flight error.

## Profiles

A profile descriptor (`<profileSource>/<name>.json`) declares exactly one optional field,
`modelOverrides`, mapping a target name to model-id replacements. An empty descriptor `{}` is
valid; its only effect is to make the matching `profile-<name>-only` directives resolve. Output
folder and manifest suffixes are declared on a set **variant**, not on a profile.

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
      "requires": ["core", "advanced"],// other sets a user must also install
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
folders the catalog no longer declares are swept from the output directory.

### Selecting what to build

- `--release <r>` — a set is built only when it lists that release. `instructions/r2/` holds only
  `core/`, so `--release r2` resolves to the single set built from it.
- `--domain <list>` — a **folder filter** over sets: a set is built only when every folder it
  layers is named in the list. `--domain qe` builds only `qe-*`. Omit it to build every set
  available for the release.
- `--profile <name>` — a debugging **override** of every variant's declared profile. The normal
  path is the `profile` field on the variant itself.

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

## Profiles

A profile descriptor (`<profileSource>/<name>.json`) declares exactly one optional field,
`modelOverrides`, mapping a target name to model-id replacements. An empty descriptor `{}` is
valid; its only effect is to make the matching `profile-<name>-only` directives resolve. Output
folder and manifest suffixes are declared on a set **variant**, not on a profile.

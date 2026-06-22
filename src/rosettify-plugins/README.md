# rosettify-plugins

CLI and library package for generating Rosetta IDE plugin outputs from instruction sources.

## Install

```bash
npm install -g rosettify-plugins
```

Or run it directly:

```bash
npx rosettify-plugins --source . --release r2 --domain core
```

## Usage

```bash
rosettify-plugins --source . --release r2 --domain core
```

Key inputs derived from `--source`:

- `instructions/`
- `src/rosettify-plugins/plugins/`
- `src/hooks/`
- output defaults to `plugins/`

Override them with `--instructionsSource`, `--pluginsSource`, `--hooksSource`, and `--output`.

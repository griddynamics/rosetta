// DATA-CFG-0007 — the plugin-set catalog: `plugins.json` load, validation, and selection.
//
// A plugin SET is a named bundle of instruction folders shipped as one installable plugin. One
// generator invocation expands  sets x variants x targets  into every output folder:
//   destination = `<set>-<ide><variantSuffix>`,  spec.name = `<ide>` (bare IDE identity).
//
// Modelled on spec/profiles.ts in shape and idiom: a throw-on-violation loader with a CLOSED
// top-level field allow-list at every object level, called at generate() pre-flight BEFORE buildVfs
// and before any pluginCleanup runs — so a malformed catalog aborts the run with nothing written.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TARGET_NAME_LIST, isTargetName } from './target-names.js';
import type { TargetName } from './target-names.js';

/** One flavour of a set: which profile is active while building it, and how the output is suffixed. */
export interface SetVariant {
  /** Profile name activated for this variant, or null for the unprofiled build. */
  profile: string | null;
  /** Appended to the output folder name. */
  destinationSuffix: string;
  /** Appended to the emitted plugin manifest's `name`. */
  manifestNameSuffix: string;
  /** Appended to the emitted plugin manifest's `description`. */
  manifestDescriptionSuffix: string;
}

export interface SetManifest {
  name: string;
  description: string;
}

export interface PluginSetDecl {
  /** Set name — the first segment of every output folder it produces, and the `set-<name>-only` key. */
  name: string;
  /** Instruction folders layered into this set's VFS, in order (left = lower priority). */
  folders: string[];
  /** Preserved-files template family: `<template>-<ide>` under the plugins source root. */
  template: string;
  /** Releases this set is available for. `instructions/r2` holds only `core/`, so r2 lists one set. */
  releases: string[];
  /** Other sets a user must also install. Declarative metadata; surfaced in the manifest text. */
  requires: string[];
  /** Whether this set registers the session-start bootstrap payload. */
  bootstrap: boolean;
  /** Hook modules this set ships. Empty + bootstrap:false ⇒ no hooks/ folder and no hooks.json. */
  hooks: string[];
  manifest: SetManifest;
  variants: SetVariant[];
}

export interface PluginCatalog {
  targets: TargetName[];
  /** Extra bundle modules pulled in by a named hook module (e.g. read-once ⇒ its reset + shared). */
  hookSupportModules: Record<string, string[]>;
  sets: PluginSetDecl[];
}

const CATALOG_FIELDS = ['$schema-note', 'targets', 'hookSupportModules', 'sets'] as const;
export const SET_FIELDS = [
  'name', 'folders', 'template', 'releases', 'requires',
  'bootstrap', 'hooks', 'manifest', 'variants',
] as const;
export const VARIANT_FIELDS = [
  'profile', 'destinationSuffix', 'manifestNameSuffix', 'manifestDescriptionSuffix',
] as const;
export const MANIFEST_FIELDS = ['name', 'description'] as const;

/**
 * Thrown for any catalog violation. Every message names the offending file so a user reading only
 * stderr knows which file to edit — the brief's "fail BEFORE any output is written, naming the
 * file". Caught at generate() pre-flight, mirroring ProfileValidationError.
 */
export class PluginCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginCatalogError';
  }
}

/**
 * Load and fully validate the plugin-set catalog at `configPath`.
 *
 * Validation is total and structural: every object level has a closed field allow-list, every
 * field is type-checked, and the cross-field invariants that would otherwise fail late and
 * silently are checked here — duplicate set names, duplicate variant destinations (two variants
 * of one set writing the same folder), a `requires` naming an undeclared set, an unknown target
 * id, and an empty `folders`/`variants`/`targets`/`sets`.
 *
 * Deliberately NOT checked here: whether a set's template folder exists for each IDE, and whether
 * a hook bundle directory exists. Both are filesystem facts that depend on --pluginsSource /
 * --hooksSource, so they are pre-flight checks in generate() (see preflightTemplates /
 * pluginSyncBundles) rather than load-time ones — but they run before any write, all the same.
 */
export function loadPluginCatalog(configPath: string): PluginCatalog {
  if (!fs.existsSync(configPath)) {
    fail(`Plugin set catalog not found: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail(`Plugin set catalog ${configPath} is not valid JSON: ${reason}`);
  }

  const root = requireObject(parsed, configPath, 'the catalog root');
  rejectUnknownFields(root, CATALOG_FIELDS, configPath, 'the catalog root');

  const targets = readTargets(root.targets, configPath);
  const hookSupportModules = readHookSupportModules(root.hookSupportModules, configPath);
  const sets = readSets(root.sets, configPath);

  return { targets, hookSupportModules, sets };
}

function readTargets(value: unknown, file: string): TargetName[] {
  const list = requireStringArray(value, file, 'targets');
  if (list.length === 0) fail(`${file}: "targets" must list at least one IDE target.`);
  for (const t of list) {
    if (!isTargetName(t)) {
      fail(
        `${file}: unknown IDE target "${t}" in "targets". Accepted targets are: ` +
          `${TARGET_NAME_LIST.join(', ')}.`,
      );
    }
  }
  if (new Set(list).size !== list.length) {
    fail(`${file}: "targets" contains a duplicate entry.`);
  }
  return list as TargetName[];
}

function readHookSupportModules(value: unknown, file: string): Record<string, string[]> {
  if (value === undefined) return {};
  const obj = requireObject(value, file, '"hookSupportModules"');
  const out: Record<string, string[]> = {};
  for (const [key, v] of Object.entries(obj)) {
    out[key] = requireStringArray(v, file, `hookSupportModules."${key}"`);
  }
  return out;
}

function readSets(value: unknown, file: string): PluginSetDecl[] {
  if (!Array.isArray(value)) {
    fail(`${file}: "sets" must be an array of plugin-set declarations.`);
  }
  if (value.length === 0) fail(`${file}: "sets" must declare at least one plugin set.`);

  const sets = value.map((entry, i) => readSet(entry, file, i));

  const names = sets.map((s) => s.name);
  const dupe = names.find((n, i) => names.indexOf(n) !== i);
  if (dupe !== undefined) fail(`${file}: duplicate plugin set name "${dupe}".`);

  // A `requires` pointing at a set that does not exist is a typo that would otherwise only ever
  // surface as misleading text in a shipped manifest.
  //
  // FR-SET-0050: `requires` is install-time metadata whose only delivery is the manifest
  // description — the generator never composes the "Requires X and Y" sentence itself (the
  // authored prose reads better than anything generated, and deriving it would give one fact two
  // sources). So the description is validated, not derived: a `requires` entry that the set's own
  // BASE description (never the variant-suffixed composite) fails to name is a catalog error,
  // caught at the exact moment the `requires` edit is made rather than shipping silently wrong
  // prose. The lookaround avoids `\b`, which treats `-` as a word boundary and would let a set
  // named `read-once` match inside "read-once-shared".
  for (const set of sets) {
    for (const req of set.requires) {
      if (!names.includes(req)) {
        fail(
          `${file}: plugin set "${set.name}" requires "${req}", which is not a declared set. ` +
            `Declared sets are: ${names.join(', ')}.`,
        );
      }
      if (req === set.name) fail(`${file}: plugin set "${set.name}" cannot require itself.`);

      const mentionsReq = new RegExp(`(?<![a-z0-9-])${req}(?![a-z0-9-])`, 'i').test(
        set.manifest.description,
      );
      if (!mentionsReq) {
        fail(
          `${file}: plugin set "${set.name}" requires "${req}", but its manifest.description ` +
            `does not mention it. \`requires\` is install-time metadata whose only delivery is ` +
            `the description — add it there, or drop the requires entry. Description: ` +
            `"${set.manifest.description}".`,
        );
      }
    }
  }

  return sets;
}

function readSet(value: unknown, file: string, index: number): PluginSetDecl {
  const where = `sets[${index}]`;
  const obj = requireObject(value, file, `"${where}"`);
  rejectUnknownFields(obj, SET_FIELDS, file, `"${where}"`);

  const name = requireString(obj.name, file, `${where}.name`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    fail(
      `${file}: plugin set name "${name}" is not a valid identifier. A set name is lowercase ` +
        `alphanumeric segments joined by single hyphens — it becomes an output folder prefix and ` +
        `a set-<name>-only directive token.`,
    );
  }

  const at = `sets."${name}"`;
  const folders = requireStringArray(obj.folders, file, `${at}.folders`);
  if (folders.length === 0) {
    fail(`${file}: plugin set "${name}" must layer at least one instruction folder.`);
  }
  const releases = requireStringArray(obj.releases, file, `${at}.releases`);
  if (releases.length === 0) {
    fail(`${file}: plugin set "${name}" must be available for at least one release.`);
  }

  const variants = readVariants(obj.variants, file, name);

  return {
    name,
    folders,
    template: requireString(obj.template, file, `${at}.template`),
    releases,
    requires: requireStringArray(obj.requires ?? [], file, `${at}.requires`),
    bootstrap: requireBoolean(obj.bootstrap, file, `${at}.bootstrap`),
    hooks: requireStringArray(obj.hooks ?? [], file, `${at}.hooks`),
    manifest: readManifest(obj.manifest, file, name),
    variants,
  };
}

function readManifest(value: unknown, file: string, setName: string): SetManifest {
  const obj = requireObject(value, file, `sets."${setName}".manifest`);
  rejectUnknownFields(obj, MANIFEST_FIELDS, file, `sets."${setName}".manifest`);
  return {
    name: requireString(obj.name, file, `sets."${setName}".manifest.name`),
    description: requireString(obj.description, file, `sets."${setName}".manifest.description`),
  };
}

function readVariants(value: unknown, file: string, setName: string): SetVariant[] {
  if (!Array.isArray(value)) {
    fail(`${file}: sets."${setName}".variants must be an array.`);
  }
  if (value.length === 0) {
    fail(`${file}: plugin set "${setName}" must declare at least one variant.`);
  }

  const variants = value.map((entry, i) => {
    const at = `sets."${setName}".variants[${i}]`;
    const obj = requireObject(entry, file, at);
    rejectUnknownFields(obj, VARIANT_FIELDS, file, at);

    const profileRaw = obj.profile ?? null;
    if (profileRaw !== null && typeof profileRaw !== 'string') {
      fail(`${file}: ${at}.profile must be a profile name string, or null for the unprofiled build.`);
    }

    const destinationSuffix = optionalString(obj.destinationSuffix, file, `${at}.destinationSuffix`);
    // hooks-architecture.md §1.4/§3 step 8: destinationSuffix becomes a template variable
    // ({{destination}} = `${set.name}-${target}${destinationSuffix}`) at the Copilot plugin-form
    // template's 14 probe sites. Handlebars double-stache HTML-escapes & < > " ' ` = — none of
    // which this pattern admits — so a validated suffix renders byte-identical to a literal; an
    // unvalidated one was a latent input-validation gap (empty string or a single hyphenated
    // lowercase-alphanumeric suffix like "-light", never validated before this).
    if (!/^(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(destinationSuffix)) {
      fail(
        `${file}: ${at}.destinationSuffix "${destinationSuffix}" is not valid. It must be empty, ` +
          `or a hyphen followed by lowercase alphanumeric segments joined by single hyphens ` +
          `(e.g. "-light") — it is appended to the output folder name and embedded in Copilot's ` +
          `install-location probes.`,
      );
    }

    return {
      profile: profileRaw as string | null,
      destinationSuffix,
      manifestNameSuffix: optionalString(obj.manifestNameSuffix, file, `${at}.manifestNameSuffix`),
      manifestDescriptionSuffix: optionalString(
        obj.manifestDescriptionSuffix, file, `${at}.manifestDescriptionSuffix`,
      ),
    };
  });

  // Two variants sharing a destinationSuffix would silently overwrite each other's output folders,
  // the second wiping the first via pluginCleanup. Fail loudly instead.
  const suffixes = variants.map((v) => v.destinationSuffix);
  const dupe = suffixes.find((s, i) => suffixes.indexOf(s) !== i);
  if (dupe !== undefined) {
    fail(
      `${file}: plugin set "${setName}" declares two variants with destinationSuffix ` +
        `"${dupe}" — they would write to the same output folder.`,
    );
  }

  return variants;
}

// ─── Selection ──────────────────────────────────────────────────────────────

/**
 * The sets to build for a run.
 *
 * `release` selects on the set's declared availability — this is what keeps the r2 legacy path
 * working: `instructions/r2/` contains ONLY `core/`, and resolveSourceDirs THROWS on a missing
 * directory (turning into a whole-run exit 1), so r2 must resolve to the one set built from
 * `core/`. It is declared availability, never a silent skip of a missing folder: a typo in
 * plugins.json must not quietly degrade into an empty build.
 *
 * `domain`, when supplied, is a FOLDER FILTER over sets: a set is built only if every folder it
 * layers appears in the list. `--domain qe` therefore builds `qe-*` alone, and omitting --domain
 * builds every set available for the release.
 */
export function selectSets(
  catalog: PluginCatalog,
  release: string,
  domain: string | undefined,
): PluginSetDecl[] {
  const forRelease = catalog.sets.filter((s) => s.releases.includes(release));

  const tokens = parseDomainTokens(domain);
  if (tokens.length === 0) return forRelease;

  const allowed = new Set(tokens);
  return forRelease.filter((s) => s.folders.every((f) => allowed.has(f)));
}

/**
 * FR-CLI-0030/0031: the raw `--domain` value split into its comma-separated instruction-folder
 * tokens — trimmed, and blanks dropped. Shared by `selectSets` (the folder filter over sets) and
 * `generate()` (which checks each token names a real instruction folder before selecting).
 */
export function parseDomainTokens(domain: string | undefined): string[] {
  if (domain === undefined) return [];
  return domain.split(',').map((d) => d.trim()).filter(Boolean);
}

/**
 * Every output folder the catalog can ever produce, across ALL releases, sets, variants and
 * targets — deliberately NOT filtered by the current run's selection. The orphan sweep uses this
 * as its keep-list, so that `--domain qe` prunes genuinely stale folders without deleting the 42
 * folders the other sets legitimately own.
 */
export function allDeclaredDestinations(catalog: PluginCatalog): Set<string> {
  const out = new Set<string>();
  for (const set of catalog.sets) {
    for (const variant of set.variants) {
      for (const target of catalog.targets) {
        out.add(`${set.name}-${target}${variant.destinationSuffix}`);
      }
    }
  }
  return out;
}

/** Bundle modules a set ships: its declared hooks plus each one's support modules, de-duplicated. */
export function resolveHookModules(catalog: PluginCatalog, set: PluginSetDecl): string[] {
  const out: string[] = [];
  for (const hook of set.hooks) {
    if (!out.includes(hook)) out.push(hook);
    for (const support of catalog.hookSupportModules[hook] ?? []) {
      if (!out.includes(support)) out.push(support);
    }
  }
  return out;
}

/** Default catalog location, derived from --source exactly as profileSource is (FR-CLI-0033). */
export function defaultConfigPath(sourceRoot: string): string {
  return path.join(sourceRoot, 'src', 'rosettify-plugins', 'plugins.json');
}

/**
 * Resolve the catalog location for a run (FR-CLI-0034).
 *
 * With no `--config`, this is the default location under `--source`. With one, the value is
 * resolved AGAINST `--source` rather than against the process CWD: an absolute `--config` is used
 * as given, and a relative one is interpreted the same way every other source location is — as a
 * path within the source root. Resolving a relative override against the CWD instead made
 * `--source <repo> --config src/rosettify-plugins/plugins.json` fail from any directory other than
 * the repo root, even though that path is exactly where the catalog lives inside `--source`.
 */
export function resolveConfigPath(sourceRoot: string, override: string | undefined): string {
  return override === undefined ? defaultConfigPath(sourceRoot) : path.resolve(sourceRoot, override);
}

// ─── Primitive validators ───────────────────────────────────────────────────

function fail(message: string): never {
  throw new PluginCatalogError(message);
}

function requireObject(value: unknown, file: string, at: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${file}: ${at} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function rejectUnknownFields(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  file: string,
  at: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      fail(`${file}: unrecognized field "${key}" in ${at}. Accepted fields: ${allowed.join(', ')}.`);
    }
  }
}

function requireString(value: unknown, file: string, at: string): string {
  if (typeof value !== 'string' || value === '') {
    fail(`${file}: "${at}" must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, file: string, at: string): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') fail(`${file}: "${at}" must be a string.`);
  return value;
}

function requireBoolean(value: unknown, file: string, at: string): boolean {
  if (typeof value !== 'boolean') fail(`${file}: "${at}" must be true or false.`);
  return value;
}

function requireStringArray(value: unknown, file: string, at: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    fail(`${file}: "${at}" must be an array of strings.`);
  }
  return value as string[];
}

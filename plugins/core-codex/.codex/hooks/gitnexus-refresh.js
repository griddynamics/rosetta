"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/hooks/gitnexus-refresh.ts
var gitnexus_refresh_exports = {};
__export(gitnexus_refresh_exports, {
  DEBOUNCE_MS: () => DEBOUNCE_MS,
  gitnexusRefreshHook: () => gitnexusRefreshHook
});
module.exports = __toCommonJS(gitnexus_refresh_exports);
var import_fs4 = __toESM(require("fs"));
var import_path5 = __toESM(require("path"));
var import_os3 = __toESM(require("os"));
var import_child_process = require("child_process");

// src/runtime/define-hook.ts
var defineHook = (def) => def;

// src/runtime/run-hook.ts
var import_path4 = __toESM(require("path"));

// src/runtime/ide-rows/codex.ts
var EVENTS = {
  PostToolUse: "PostToolUse",
  PreToolUse: "PreToolUse"
};
var PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
var TOOL_KINDS = {
  write: ["Write", "apply_patch", "functions.apply_patch"],
  edit: ["apply_patch", "functions.apply_patch"],
  create: ["Write", "apply_patch", "functions.apply_patch"],
  replace: ["apply_patch", "functions.apply_patch"],
  patch: ["apply_patch", "functions.apply_patch"],
  bash: ["Bash", "shell"],
  read: ["Read"]
};
var lookupEvent = (raw) => {
  for (const [k, v] of Object.entries(EVENTS)) if (v === raw) return k;
  return null;
};
var lookupToolKind = (raw) => {
  for (const [k, v] of Object.entries(TOOL_KINDS))
    if (v.includes(raw)) return k;
  return null;
};
var getFilePath = (raw) => {
  const tool = raw.tool_name ?? "";
  if (tool === "apply_patch" || tool === "functions.apply_patch") {
    const cmd = raw.tool_input?.command ?? "";
    const match = PATCH_FILE_RE.exec(cmd);
    return match?.[1]?.trim() ?? null;
  }
  return raw.tool_input?.file_path ?? null;
};
var getCwd = (raw) => raw.cwd ?? null;
var getSessionId = (raw) => raw.session_id ?? null;

// src/adapters/codex.ts
var IDE = "codex";
var CC_SIGNATURE = ["hook_event_name", "tool_input", "session_id"];
var CODEX_EXTRA = ["model", "turn_id"];
var detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);
var normalize = (raw) => ({
  ...raw,
  ide: IDE,
  event: lookupEvent(raw.hook_event_name),
  toolKind: lookupToolKind(raw.tool_name),
  file_path: getFilePath(raw) ?? "",
  cwd: getCwd(raw) ?? void 0,
  session_id: getSessionId(raw) ?? void 0
});
var formatOutput = (canonical) => canonical ?? {};
var codex = { name: "codex", detect, normalize, formatOutput };

// src/entrypoints/adapter-codex.ts
var readStdin = (stream = process.stdin) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(String(chunk)));
  stream.on("end", () => {
    const raw = chunks.join("").trim();
    if (!raw) return reject(new Error("Invalid input: empty stdin"));
    try {
      resolve(JSON.parse(raw));
    } catch (err) {
      reject(new Error(`JSON parse error: ${err.message}`));
    }
  });
  stream.on("error", reject);
});
var normalize2 = (rawInput) => codex.normalize(rawInput);
var formatOutput2 = (canonical, _ide) => codex.formatOutput(canonical);
var detectIDE = (_raw) => "codex";
var dedupKey = (_raw, _hookName) => null;

// src/runtime/throttle.ts
var import_fs = require("fs");
var import_crypto = require("crypto");
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var DEFAULT_DIR = import_os.default.tmpdir();
var LOCK_TTL_MS = 5e3;
var acquireOnce = (key, dir = DEFAULT_DIR) => {
  const hash = (0, import_crypto.createHash)("sha256").update(key).digest("hex").slice(0, 16);
  const lockPath = import_path.default.join(dir, `rosetta-hooks-${hash}.lock`);
  try {
    (0, import_fs.writeFileSync)(lockPath, String(Date.now()), { flag: "wx" });
    return true;
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
    const age = Date.now() - (0, import_fs.statSync)(lockPath).mtimeMs;
    if (age >= LOCK_TTL_MS) {
      (0, import_fs.writeFileSync)(lockPath, String(Date.now()));
      return true;
    }
    return false;
  }
};

// src/runtime/debug-log.ts
var import_fs2 = require("fs");
var import_path2 = __toESM(require("path"));
var import_os2 = __toESM(require("os"));
var LOG_DIR = import_path2.default.join(import_os2.default.homedir(), ".rosetta");
var LOG_PATH = import_path2.default.join(LOG_DIR, "hooks-debug.log");
var LOG_MAX_BYTES = 10 * 1024 * 1024;
var ENABLED = process.env.ROSETTA_DEBUG === "1";
var ensureDir = () => {
  try {
    (0, import_fs2.mkdirSync)(LOG_DIR, { recursive: true });
  } catch {
  }
};
var rotatIfNeeded = () => {
  try {
    if ((0, import_fs2.statSync)(LOG_PATH).size >= LOG_MAX_BYTES) {
      (0, import_fs2.renameSync)(LOG_PATH, `${LOG_PATH.replace(/\.log$/, "")}.1.log`);
    }
  } catch {
  }
};
var debugLog = (message, context) => {
  if (!ENABLED) return;
  ensureDir();
  rotatIfNeeded();
  const entry = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), msg: message, ...context ?? {} }) + "\n";
  try {
    (0, import_fs2.appendFileSync)(LOG_PATH, entry);
  } catch {
  }
};

// src/runtime/path-utils.ts
var import_path3 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));
var toRelative = (filePath) => {
  let p = filePath.replace(/\\/g, "/");
  if (p.startsWith("/")) p = p.slice(1);
  if (p.startsWith("./")) p = p.slice(2);
  return p;
};
var walkUp = (startDir, marker, maxLevels = 10) => {
  let dir = startDir;
  for (let i = 0; i < maxLevels; i++) {
    if (import_fs3.default.existsSync(import_path3.default.join(dir, marker))) return dir;
    const parent = import_path3.default.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

// src/runtime/run-hook.ts
var runAsCli = (def, mod) => {
  if (require.main !== mod) return;
  runHook(def).then(
    () => process.exit(0),
    (err) => {
      process.stderr.write(`${def.name} hook error: ${err.message}
`);
      process.exit(1);
    }
  );
};
var toHookContext = (norm) => ({
  ide: norm.ide,
  event: norm.event,
  toolKind: norm.toolKind,
  toolName: norm.tool_name ?? "",
  filePath: norm.file_path ?? "",
  cwd: norm.cwd ?? "",
  sessionId: norm.session_id ?? null,
  toolInput: norm.tool_input,
  toolResponse: norm.tool_response
});
var toCanonical = (result, ctx) => {
  if (result.kind === "advise")
    return { hookSpecificOutput: { hookEventName: ctx.event ?? "", permissionDecision: "allow", additionalContext: result.message } };
  if (result.kind === "deny")
    return { hookSpecificOutput: { hookEventName: ctx.event ?? "", permissionDecision: "deny", permissionDecisionReason: result.reason }, continue: false };
  if (result.kind === "allow")
    return { hookSpecificOutput: { hookEventName: ctx.event ?? "", permissionDecision: "allow" } };
  return {};
};
var makeDedupKey = (dedupBy, ctx, name) => [
  name,
  ...dedupBy.includes("session") ? [ctx.sessionId ?? "no-session"] : [],
  ...dedupBy.includes("filePath") ? [ctx.filePath] : [],
  ...dedupBy.includes("ide") ? [ctx.ide] : [],
  ...dedupBy.includes("toolName") ? [ctx.toolName] : [],
  ...dedupBy.includes("toolInput") ? [JSON.stringify(ctx.toolInput)] : []
].join(":");
var evalFilePath = (fp, filePath) => {
  const p = filePath;
  const pl = p.toLowerCase();
  const rel = toRelative(p);
  if (fp.extOneOf && !fp.extOneOf.some((e) => p.endsWith(e))) return false;
  if (fp.extOneOfCi && !fp.extOneOfCi.some((e) => pl.endsWith(e.toLowerCase()))) return false;
  if (fp.notContainsAny && fp.notContainsAny.some((s) => p.includes(s))) return false;
  if (fp.notTokenSegmentAny) {
    const segs = pl.split("/");
    const blocked = segs.some(
      (seg) => seg.split(/[-_.]/).some((tok) => fp.notTokenSegmentAny.includes(tok))
    );
    if (blocked) return false;
  }
  if (fp.notStartsWithAny && fp.notStartsWithAny.some((s) => rel.startsWith(s) || p.includes("/" + s))) return false;
  if (fp.notBasenameOneOf && fp.notBasenameOneOf.includes(import_path4.default.basename(p))) return false;
  return true;
};
var evalToolInput = (ti, ctx) => {
  if (ti.commandMatchWhen) {
    const { tools, re } = ti.commandMatchWhen;
    if (tools.includes(ctx.toolName)) {
      const command = ctx.toolInput.command ?? "";
      if (!re.test(command)) return false;
    }
  }
  return true;
};
var runHook = async (def, opts = {}) => {
  const { stdin = process.stdin, stdout = process.stdout } = opts;
  try {
    const raw = await readStdin(stdin);
    const ide = detectIDE(raw);
    const norm = normalize2(raw);
    debugLog(`[runHook:${def.name}]`, { ide, event: norm.event, toolKind: norm.toolKind });
    if (norm.event !== def.on.event) return;
    if (!def.on.toolKinds.includes(norm.toolKind)) return;
    const ctx0 = toHookContext(norm);
    if (def.on.filePath && !evalFilePath(def.on.filePath, ctx0.filePath)) return;
    if (def.on.toolInput && !evalToolInput(def.on.toolInput, ctx0)) return;
    let markerRoot;
    if (def.on.fs?.nearestMarker) {
      const found = walkUp(ctx0.cwd || process.cwd(), def.on.fs.nearestMarker);
      if (!found) return;
      markerRoot = found;
    }
    const ctx = markerRoot !== void 0 ? { ...ctx0, markerRoot } : ctx0;
    const platformKey = dedupKey(raw, def.name);
    if (platformKey !== null && !acquireOnce(platformKey)) return;
    if (def.throttle && "dedupBy" in def.throttle) {
      if (!acquireOnce(makeDedupKey(def.throttle.dedupBy, ctx, def.name))) return;
    }
    const result = await def.run(ctx);
    if (!result || result.kind === "side-effect") return;
    stdout.write(JSON.stringify(formatOutput2(toCanonical(result, ctx), ide)));
  } catch (err) {
    debugLog(`[runHook:${def.name}] error`, { err: err.message });
  }
};

// src/runtime/result-helpers.ts
var sideEffect = () => ({ kind: "side-effect" });

// src/hooks/gitnexus-refresh.ts
var DEBOUNCE_MS = 5e3;
var ensureCacheDir = () => {
  const dir = import_path5.default.join(import_os3.default.homedir(), ".cache", "gitnexus");
  import_fs4.default.mkdirSync(dir, { recursive: true });
  return dir;
};
var log = (cacheDir, message) => {
  try {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    import_fs4.default.appendFileSync(import_path5.default.join(cacheDir, "refresh.log"), `${ts}  ${message}
`);
  } catch {
  }
};
var stampKeyForRepo = (repoRoot) => Buffer.from(repoRoot).toString("base64").replace(/[/+=]/g, "_");
var writePendingStamp = (cacheDir, repoRoot) => {
  const key = stampKeyForRepo(repoRoot);
  const stampFile = import_path5.default.join(cacheDir, `${key}.pending`);
  const token = String(Date.now());
  import_fs4.default.writeFileSync(stampFile, token);
  return { stampFile, token };
};
var getEmbeddingsFlag = (repoRoot) => {
  try {
    const meta = JSON.parse(
      import_fs4.default.readFileSync(import_path5.default.join(repoRoot, ".gitnexus", "meta.json"), "utf-8")
    );
    return !!(meta.stats && meta.stats.embeddings > 0);
  } catch {
    return false;
  }
};
var spawnDeferredAnalyze = (repoRoot, cacheDir, stampFile, token) => {
  const hadEmbeddings = getEmbeddingsFlag(repoRoot);
  const extraFlags = hadEmbeddings ? " --embeddings" : "";
  const debounceSeconds = Math.ceil(DEBOUNCE_MS / 1e3);
  const nodeScript = [
    `const fs = require('fs');`,
    `try {`,
    `  const current = fs.readFileSync('${stampFile}', 'utf-8').trim();`,
    `  if (current !== '${token}') process.exit(0);`,
    `  require('child_process').execSync(`,
    `    'npx gitnexus analyze --force${extraFlags}',`,
    `    { cwd: '${repoRoot.replace(/'/g, "'\\''")}', stdio: 'inherit' }`,
    `  );`,
    `} catch(e) {`,
    `  fs.appendFileSync('${import_path5.default.join(cacheDir, "refresh.log").replace(/'/g, "'\\''")}',`,
    `    new Date().toISOString() + '  [gitnexus-refresh] deferred error: ' + (e.message||e) + '\\n');`,
    `}`
  ].join(" ");
  const script = `sleep ${debounceSeconds} && node -e "${nodeScript}"`;
  const logFile = import_path5.default.join(cacheDir, "refresh.log");
  let out;
  try {
    out = import_fs4.default.openSync(logFile, "a");
  } catch {
    return;
  }
  try {
    const child = (0, import_child_process.spawn)("sh", ["-c", script], {
      cwd: repoRoot,
      detached: true,
      stdio: ["ignore", out, out]
    });
    child.unref();
  } catch (err) {
    log(cacheDir, `[gitnexus-refresh] spawn failed: ${err.message}`);
  } finally {
    import_fs4.default.closeSync(out);
  }
};
var gitnexusRefreshHook = defineHook({
  name: "gitnexus-refresh",
  on: {
    event: "PostToolUse",
    toolKinds: ["write", "edit", "multi-edit"],
    fs: { nearestMarker: ".gitnexus" }
  },
  run: (ctx) => {
    const repoRoot = ctx.markerRoot;
    const cacheDir = ensureCacheDir();
    const { stampFile, token } = writePendingStamp(cacheDir, repoRoot);
    debugLog("[gitnexus-refresh] pending analyze", { tool: ctx.toolName, cwd: ctx.cwd });
    log(cacheDir, `[gitnexus-refresh] pending analyze (tool=${ctx.toolName}, cwd=${ctx.cwd})`);
    spawnDeferredAnalyze(repoRoot, cacheDir, stampFile, token);
    return sideEffect();
  }
});
runAsCli(gitnexusRefreshHook, module);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEBOUNCE_MS,
  gitnexusRefreshHook
});

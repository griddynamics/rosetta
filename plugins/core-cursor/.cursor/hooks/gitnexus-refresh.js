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

// src/gitnexus-refresh.ts
var gitnexus_refresh_exports = {};
__export(gitnexus_refresh_exports, {
  main: () => main
});
module.exports = __toCommonJS(gitnexus_refresh_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var import_child_process = require("child_process");

// src/adapters/cursor.ts
var CC_SIGNATURE = ["hook_event_name", "tool_input"];
var CURSOR_EXTRA = ["conversation_id", "cursor_version"];
var toPascalCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
var detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CURSOR_EXTRA.every((f) => f in raw);
var normalize = (raw) => {
  const { hook_event_name, conversation_id, ...rest } = raw;
  return {
    ...rest,
    hook_event_name: toPascalCase(hook_event_name),
    session_id: conversation_id,
    conversation_id
  };
};
var formatOutput = (canonical) => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
  const out = {};
  if (additionalContext) out.additional_context = additionalContext;
  if (permissionDecision) out.permission = permissionDecision;
  if (permissionDecisionReason) out.user_message = permissionDecisionReason;
  if (cont === false) out.permission = out.permission ?? "deny";
  return out;
};
var cursor = { name: "cursor", detect, normalize, formatOutput };

// src/entrypoints/adapter-cursor.ts
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
var normalize2 = (rawInput) => cursor.normalize(rawInput);

// src/gitnexus-refresh.ts
var DEBOUNCE_MS = 5e3;
var findRepoRoot = (startDir) => {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (import_fs.default.existsSync(import_path.default.join(dir, ".gitnexus"))) return dir;
    const parent = import_path.default.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};
var ensureCacheDir = () => {
  const dir = import_path.default.join(import_os.default.homedir(), ".cache", "gitnexus");
  import_fs.default.mkdirSync(dir, { recursive: true });
  return dir;
};
var log = (cacheDir, message) => {
  try {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    import_fs.default.appendFileSync(import_path.default.join(cacheDir, "refresh.log"), `${ts}  ${message}
`);
  } catch {
  }
};
var shouldTrigger = (cacheDir, repoRoot) => {
  const key = Buffer.from(repoRoot).toString("base64").replace(/[/+=]/g, "_");
  const stampFile = import_path.default.join(cacheDir, `${key}.lastrun`);
  try {
    const stat = import_fs.default.statSync(stampFile);
    if (Date.now() - stat.mtimeMs < DEBOUNCE_MS) return false;
  } catch {
  }
  import_fs.default.writeFileSync(stampFile, String(Date.now()));
  return true;
};
var spawnAnalyze = (repoRoot, cacheDir) => {
  let hadEmbeddings = false;
  try {
    const meta = JSON.parse(
      import_fs.default.readFileSync(import_path.default.join(repoRoot, ".gitnexus", "meta.json"), "utf-8")
    );
    hadEmbeddings = !!(meta.stats && meta.stats.embeddings > 0);
  } catch {
  }
  const args = hadEmbeddings ? ["gitnexus", "analyze", "--force", "--embeddings"] : ["gitnexus", "analyze", "--force"];
  const logFile = import_path.default.join(cacheDir, "refresh.log");
  let out;
  try {
    out = import_fs.default.openSync(logFile, "a");
  } catch {
    return;
  }
  try {
    const child = (0, import_child_process.spawn)("npx", args, {
      cwd: repoRoot,
      detached: true,
      stdio: ["ignore", out, out]
    });
    child.unref();
  } catch (err) {
    log(cacheDir, `[gitnexus-refresh] spawn failed: ${err.message}`);
  } finally {
    import_fs.default.closeSync(out);
  }
};
var main = async () => {
  let input;
  try {
    const raw = await readStdin();
    input = normalize2(raw);
  } catch {
    return;
  }
  if (input.hook_event_name !== "PostToolUse") return;
  const tool = input.tool_name ?? "";
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) return;
  const cwd = input.cwd ?? process.cwd();
  const repoRoot = findRepoRoot(cwd);
  if (!repoRoot) return;
  const cacheDir = ensureCacheDir();
  if (!shouldTrigger(cacheDir, repoRoot)) return;
  log(cacheDir, `[gitnexus-refresh] triggering analyze (tool=${tool}, cwd=${cwd})`);
  spawnAnalyze(repoRoot, cacheDir);
};
if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err) => {
      process.stderr.write(`gitnexus-refresh hook error: ${err.message}
`);
      process.exit(1);
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});

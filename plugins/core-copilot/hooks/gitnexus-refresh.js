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
  DEBOUNCE_MS: () => DEBOUNCE_MS,
  main: () => main
});
module.exports = __toCommonJS(gitnexus_refresh_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var import_child_process = require("child_process");

// src/adapters/copilot.ts
var COPILOT_SIGNATURE = ["toolName", "timestamp", "cwd"];
var inferHookEventName = (raw) => {
  if ("toolName" in raw) return "toolResult" in raw ? "PostToolUse" : "PreToolUse";
  if ("reason" in raw) return "SessionEnd";
  if ("source" in raw || "initialPrompt" in raw) return "SessionStart";
  if ("prompt" in raw) return "PrePromptSubmit";
  if ("error" in raw) return "Error";
  return "Unknown";
};
var parseToolArgs = (raw) => {
  const { toolArgs } = raw;
  if (!toolArgs) return {};
  try {
    const parsed = JSON.parse(toolArgs);
    return typeof parsed === "object" && parsed !== null ? parsed : { _raw: toolArgs };
  } catch {
    return { _raw: toolArgs };
  }
};
var detect = (raw) => COPILOT_SIGNATURE.every((f) => f in raw) && !("hook_event_name" in raw);
var normalize = (raw) => {
  const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
  return {
    hook_event_name: inferHookEventName(raw),
    session_id: void 0,
    tool_name: toolName,
    tool_input: parseToolArgs(raw),
    tool_use_id: void 0,
    cwd,
    tool_response: toolResult ?? void 0,
    _copilot: { timestamp, toolName, toolArgs, toolResult }
  };
};
var formatOutput = (canonical) => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
  const out = {};
  if (permissionDecision) out.permissionDecision = permissionDecision;
  if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
  if (cont === false && !out.permissionDecision) out.permissionDecision = "deny";
  if (additionalContext) out.hookSpecificOutput = { hookEventName, additionalContext };
  return out;
};
var copilot = { name: "copilot", detect, normalize, formatOutput };

// src/adapters/claude-code.ts
var CC_SIGNATURE = ["hook_event_name", "tool_input", "session_id"];
var detect2 = (raw) => CC_SIGNATURE.every((f) => f in raw);
var normalize2 = (raw) => raw;
var formatOutput2 = (canonical) => canonical ?? {};
var claudeCode = { name: "claude-code", detect: detect2, normalize: normalize2, formatOutput: formatOutput2 };

// src/entrypoints/adapter-copilot.ts
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
var normalize3 = (rawInput) => {
  const raw = rawInput;
  return copilot.detect(raw) ? copilot.normalize(raw) : claudeCode.normalize(raw);
};

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
var stampKeyForRepo = (repoRoot) => Buffer.from(repoRoot).toString("base64").replace(/[/+=]/g, "_");
var writePendingStamp = (cacheDir, repoRoot) => {
  const key = stampKeyForRepo(repoRoot);
  const stampFile = import_path.default.join(cacheDir, `${key}.pending`);
  const token = String(Date.now());
  import_fs.default.writeFileSync(stampFile, token);
  return stampFile;
};
var getEmbeddingsFlag = (repoRoot) => {
  try {
    const meta = JSON.parse(
      import_fs.default.readFileSync(import_path.default.join(repoRoot, ".gitnexus", "meta.json"), "utf-8")
    );
    return !!(meta.stats && meta.stats.embeddings > 0);
  } catch {
    return false;
  }
};
var spawnDeferredAnalyze = (repoRoot, cacheDir, stampFile) => {
  const hadEmbeddings = getEmbeddingsFlag(repoRoot);
  const extraFlags = hadEmbeddings ? " --embeddings" : "";
  const debounceSeconds = Math.ceil(DEBOUNCE_MS / 1e3);
  const nodeScript = [
    `const fs = require('fs');`,
    `try {`,
    `  const stamp = parseInt(fs.readFileSync('${stampFile}', 'utf-8'));`,
    `  if (Date.now() - stamp < ${DEBOUNCE_MS}) process.exit(0);`,
    `  require('child_process').execSync(`,
    `    'npx gitnexus analyze --force${extraFlags}',`,
    `    { cwd: '${repoRoot.replace(/'/g, "'\\''")}', stdio: 'inherit' }`,
    `  );`,
    `} catch(e) {`,
    `  fs.appendFileSync('${import_path.default.join(cacheDir, "refresh.log").replace(/'/g, "'\\''")}',`,
    `    new Date().toISOString() + '  [gitnexus-refresh] deferred error: ' + (e.message||e) + '\\n');`,
    `}`
  ].join(" ");
  const script = `sleep ${debounceSeconds} && node -e "${nodeScript}"`;
  const logFile = import_path.default.join(cacheDir, "refresh.log");
  let out;
  try {
    out = import_fs.default.openSync(logFile, "a");
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
    import_fs.default.closeSync(out);
  }
};
var main = async () => {
  let input;
  try {
    const raw = await readStdin();
    input = normalize3(raw);
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
  const stampFile = writePendingStamp(cacheDir, repoRoot);
  log(cacheDir, `[gitnexus-refresh] pending analyze (tool=${tool}, cwd=${cwd})`);
  spawnDeferredAnalyze(repoRoot, cacheDir, stampFile);
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
  DEBOUNCE_MS,
  main
});

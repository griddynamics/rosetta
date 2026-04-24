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

// src/loose-files.ts
var loose_files_exports = {};
__export(loose_files_exports, {
  buildNudgeOutput: () => buildNudgeOutput,
  isLooseFile: () => isLooseFile,
  main: () => main,
  shouldCheck: () => shouldCheck
});
module.exports = __toCommonJS(loose_files_exports);
var import_path3 = __toESM(require("path"));
var import_fs3 = require("fs");

// src/adapters/windsurf.ts
var WINDSURF_SIGNATURE = ["agent_action_name", "trajectory_id", "tool_info"];
var EVENT_MAP = {
  pre_read_code: { hook_event_name: "PreToolUse", tool_name: "Read", buildToolInput: ({ file_path }) => ({ file_path }) },
  post_read_code: { hook_event_name: "PostToolUse", tool_name: "Read", buildToolInput: ({ file_path }) => ({ file_path }) },
  pre_write_code: { hook_event_name: "PreToolUse", tool_name: "Write", buildToolInput: ({ file_path }) => ({ file_path }) },
  post_write_code: { hook_event_name: "PostToolUse", tool_name: "Write", buildToolInput: ({ file_path }) => ({ file_path }) },
  pre_run_command: { hook_event_name: "PreToolUse", tool_name: "Bash", buildToolInput: ({ command_line }) => ({ command: command_line }) },
  post_run_command: { hook_event_name: "PostToolUse", tool_name: "Bash", buildToolInput: ({ command_line }) => ({ command: command_line }) },
  pre_mcp_tool_use: { hook_event_name: "PreToolUse", tool_name: ({ mcp_tool_name }) => mcp_tool_name, buildToolInput: ({ mcp_tool_arguments }) => mcp_tool_arguments || {} },
  post_mcp_tool_use: { hook_event_name: "PostToolUse", tool_name: ({ mcp_tool_name }) => mcp_tool_name, buildToolInput: ({ mcp_tool_arguments }) => mcp_tool_arguments || {} },
  // Events without CC equivalent — use new canonical names
  pre_user_prompt: { hook_event_name: "PrePromptSubmit", tool_name: null, buildToolInput: ({ user_prompt }) => ({ prompt: user_prompt }) },
  post_cascade_response: { hook_event_name: "PostResponse", tool_name: null, buildToolInput: ({ response }) => ({ response }) },
  post_cascade_response_with_transcript: { hook_event_name: "PostResponse", tool_name: null, buildToolInput: ({ transcript_path }) => ({ transcript_path }) },
  post_setup_worktree: { hook_event_name: "PostWorktree", tool_name: null, buildToolInput: ({ worktree_path, root_workspace_path }) => ({ worktree_path, root_workspace_path }) }
};
var resolveToolName = (eventDef, toolInfo) => typeof eventDef.tool_name === "function" ? eventDef.tool_name(toolInfo) : eventDef.tool_name;
var detect = (raw) => WINDSURF_SIGNATURE.every((f) => f in raw);
var normalize = (raw) => {
  const { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info } = raw;
  const eventDef = EVENT_MAP[agent_action_name];
  const ti = tool_info || {};
  return {
    hook_event_name: eventDef ? eventDef.hook_event_name : agent_action_name,
    session_id: trajectory_id,
    tool_name: eventDef ? resolveToolName(eventDef, ti) : null,
    tool_input: eventDef ? eventDef.buildToolInput(ti) : ti,
    cwd: ti.cwd ?? void 0,
    _windsurf: { agent_action_name, execution_id, timestamp, model_name, tool_info: ti }
  };
};
var formatOutput = (canonical) => {
  const { hookSpecificOutput = {} } = canonical ?? {};
  const { additionalContext, permissionDecision } = hookSpecificOutput;
  const out = {};
  if (additionalContext) out.additionalContext = additionalContext;
  if (permissionDecision === "deny") out._exitCode = 2;
  return out;
};
var windsurf = { name: "windsurf", detect, normalize, formatOutput };

// src/entrypoints/adapter-windsurf.ts
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
var normalize2 = (rawInput) => windsurf.normalize(rawInput);
var formatOutput2 = (canonical, _ide) => windsurf.formatOutput(canonical);
var detectIDE = (_raw) => "windsurf";

// src/lock.ts
var import_fs = require("fs");
var import_crypto = require("crypto");
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var LOCK_TTL_MS = 5e3;
var acquireOnce = (input) => {
  const fingerprint = (0, import_crypto.createHash)("sha256").update(`${input.session_id ?? "no-session"}:${input.hook_event_name}:${input.tool_name ?? ""}:${JSON.stringify(input.tool_input ?? {})}`).digest("hex").slice(0, 16);
  const lockPath = import_path.default.join(import_os.default.tmpdir(), `rosetta-hooks-${fingerprint}.lock`);
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

// src/debug-log.ts
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

// src/loose-files.ts
var ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([".py", ".js"]);
var ALLOWED_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit"]);
var EXCLUDED_PATH_SEGMENTS = [
  "agents/TEMP/",
  "scripts/",
  "node_modules/",
  ".venv/",
  "__pycache__/"
];
var MODULE_MARKERS = {
  ".py": "__init__.py",
  ".js": "package.json"
};
var MAX_WALK_LEVELS = 10;
var isPathExcluded = (filePath) => EXCLUDED_PATH_SEGMENTS.some((segment) => filePath.includes(segment));
var shouldCheck = (normalizedInput) => {
  if (normalizedInput.hook_event_name !== "PostToolUse") return false;
  if (!ALLOWED_TOOLS.has(normalizedInput.tool_name)) return false;
  const filePath = normalizedInput.tool_input.file_path || "";
  if (!ALLOWED_EXTENSIONS.has(import_path3.default.extname(filePath))) return false;
  if (isPathExcluded(filePath)) return false;
  return true;
};
var isLooseFile = (filePath, fs = { existsSync: import_fs3.existsSync }) => {
  const marker = MODULE_MARKERS[import_path3.default.extname(filePath)];
  if (!marker) return false;
  let dir = import_path3.default.dirname(filePath);
  for (let level = 0; level < MAX_WALK_LEVELS; level++) {
    if (fs.existsSync(import_path3.default.join(dir, marker))) return false;
    if (fs.existsSync(import_path3.default.join(dir, ".git"))) return true;
    const parent = import_path3.default.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return true;
};
var buildNudgeOutput = (filePath) => {
  const marker = MODULE_MARKERS[import_path3.default.extname(filePath)] ?? "a module marker";
  const basename = import_path3.default.basename(filePath);
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `${basename} appears to be a loose file outside a module. Consider adding ${marker} to its directory tree to make it part of a proper module.`
    },
    continue: true,
    suppressOutput: false
  };
};
var main = async ({
  stdin = process.stdin,
  stdout = process.stdout
} = {}) => {
  const raw = await readStdin(stdin);
  debugLog("raw input received", { hook_event_name: raw.hook_event_name });
  const ide = detectIDE(raw);
  const normalized = normalize2(raw);
  debugLog("normalized", { ide, session_id: normalized.session_id, tool_name: normalized.tool_name });
  if (!shouldCheck(normalized)) {
    debugLog("skipped (shouldCheck=false)");
    return;
  }
  if (!acquireOnce(normalized)) {
    debugLog("skipped (duplicate)");
    return;
  }
  const filePath = normalized.tool_input.file_path || "";
  if (isLooseFile(filePath)) {
    const output = buildNudgeOutput(filePath);
    debugLog("nudge emitted", { filePath });
    stdout.write(`${JSON.stringify(formatOutput2(output))}
`);
  } else {
    debugLog("file is not loose", { filePath });
  }
};
if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err) => {
      process.stderr.write(`loose-files hook error: ${err.message}
`);
      process.exit(1);
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildNudgeOutput,
  isLooseFile,
  main,
  shouldCheck
});

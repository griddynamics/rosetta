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

// src/md-file-advisory.ts
var md_file_advisory_exports = {};
__export(md_file_advisory_exports, {
  advisoryMessage: () => advisoryMessage,
  buildAdvisoryOutput: () => buildAdvisoryOutput,
  getFilePath: () => getFilePath,
  isInTempDir: () => isInTempDir,
  isMarkdown: () => isMarkdown,
  main: () => main,
  matchesAllowedPattern: () => matchesAllowedPattern,
  shouldAdvisory: () => shouldAdvisory,
  shouldCheck: () => shouldCheck
});
module.exports = __toCommonJS(md_file_advisory_exports);
var import_path2 = __toESM(require("path"));

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
var formatOutput2 = (canonical, _ide) => cursor.formatOutput(canonical);
var detectIDE = (_raw) => "cursor";

// src/debug-log.ts
var import_fs = require("fs");
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var LOG_DIR = import_path.default.join(import_os.default.homedir(), ".rosetta");
var LOG_PATH = import_path.default.join(LOG_DIR, "hooks-debug.log");
var LOG_MAX_BYTES = 10 * 1024 * 1024;
var ENABLED = process.env.ROSETTA_DEBUG === "1";
var ensureDir = () => {
  try {
    (0, import_fs.mkdirSync)(LOG_DIR, { recursive: true });
  } catch {
  }
};
var rotatIfNeeded = () => {
  try {
    if ((0, import_fs.statSync)(LOG_PATH).size >= LOG_MAX_BYTES) {
      (0, import_fs.renameSync)(LOG_PATH, `${LOG_PATH.replace(/\.log$/, "")}.1.log`);
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
    (0, import_fs.appendFileSync)(LOG_PATH, entry);
  } catch {
  }
};

// src/md-file-advisory.ts
var advisoryMessage = (filePath) => {
  const name = import_path2.default.basename(filePath);
  return `[Rosetta Advisory] ${name} is created in non-standard location, think if it is truly needed or you should have updated existing file.`;
};
var ALLOWED_PREFIXES = ["docs/", "agents/", "plans/", "refsrc/"];
var ALLOWED_BASENAMES = ["README.md", "CHANGELOG.md"];
var ALLOWED_TOOLS = /* @__PURE__ */ new Set([
  "Write",
  "Edit",
  "apply_patch",
  "functions.apply_patch",
  "create_file",
  "replace_string_in_file",
  "multi_replace_string_in_file"
]);
var PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
var getFilePath = (toolName, toolInput) => {
  if (toolName === "apply_patch" || toolName === "functions.apply_patch") {
    const command = toolInput.command ?? "";
    return PATCH_FILE_RE.exec(command)?.[1]?.trim() ?? "";
  }
  return toolInput.file_path ?? toolInput.filePath ?? toolInput.path ?? "";
};
var shouldCheck = (normalizedInput) => {
  if (normalizedInput.hook_event_name !== "PostToolUse") {
    debugLog("skip: not PostToolUse", { hook_event_name: normalizedInput.hook_event_name });
    return false;
  }
  if (!ALLOWED_TOOLS.has(normalizedInput.tool_name)) {
    debugLog("skip: tool not in ALLOWED_TOOLS", { tool_name: normalizedInput.tool_name });
    return false;
  }
  return true;
};
var isMarkdown = (filePath) => filePath.toLowerCase().endsWith(".md");
var isInTempDir = (normalizedPath) => {
  const segments = normalizedPath.toLowerCase().split("/");
  return segments.some((seg) => {
    const parts = seg.split(/[-_.]/);
    return parts.some((p) => p === "temp" || p === "tmp");
  });
};
var matchesAllowedPattern = (normalizedPath) => {
  for (const prefix of ALLOWED_PREFIXES) {
    if (normalizedPath.startsWith(prefix)) return true;
  }
  const basename = import_path2.default.basename(normalizedPath);
  return ALLOWED_BASENAMES.includes(basename);
};
var toRelative = (filePath) => {
  let p = filePath.replace(/\\/g, "/");
  if (p.startsWith("/")) p = p.slice(1);
  if (p.startsWith("./")) p = p.slice(2);
  return p;
};
var shouldAdvisory = (filePath) => {
  if (!filePath) return false;
  const rel = toRelative(filePath);
  if (!isMarkdown(rel)) return false;
  if (isInTempDir(rel)) return false;
  if (matchesAllowedPattern(rel)) return false;
  return true;
};
var buildAdvisoryOutput = (hookEventName, filePath) => ({
  hookSpecificOutput: {
    hookEventName,
    permissionDecision: "allow",
    additionalContext: advisoryMessage(filePath)
  }
});
var main = async ({
  stdin = process.stdin,
  stdout = process.stdout
} = {}) => {
  try {
    const raw = await readStdin(stdin);
    const ide = detectIDE(raw);
    const normalized = normalize2(raw);
    debugLog("md-file-advisory input", { ide, tool_name: normalized.tool_name, hook_event_name: normalized.hook_event_name });
    if (!shouldCheck(normalized)) {
      debugLog("skipped (shouldCheck=false)");
      return;
    }
    const filePath = getFilePath(normalized.tool_name, normalized.tool_input);
    if (shouldAdvisory(filePath)) {
      const canonical = buildAdvisoryOutput(normalized.hook_event_name, filePath);
      const output = formatOutput2(canonical, ide);
      debugLog("md-file-advisory advisory emitted", { filePath });
      stdout.write(JSON.stringify(output));
    }
  } catch (_) {
  }
};
if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err) => {
      process.stderr.write(`md-file-advisory hook error: ${err.message}
`);
      process.exit(1);
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  advisoryMessage,
  buildAdvisoryOutput,
  getFilePath,
  isInTempDir,
  isMarkdown,
  main,
  matchesAllowedPattern,
  shouldAdvisory,
  shouldCheck
});

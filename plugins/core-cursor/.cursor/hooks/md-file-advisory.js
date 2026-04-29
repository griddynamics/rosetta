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

// src/hooks/md-file-advisory.ts
var md_file_advisory_exports = {};
__export(md_file_advisory_exports, {
  advisoryMessage: () => advisoryMessage,
  buildAdvisoryOutput: () => buildAdvisoryOutput,
  default: () => md_file_advisory_default,
  isInTempDir: () => isInTempDir,
  isMarkdown: () => isMarkdown,
  matchesAllowedPattern: () => matchesAllowedPattern,
  shouldAdvisory: () => shouldAdvisory,
  shouldCheck: () => shouldCheck
});
module.exports = __toCommonJS(md_file_advisory_exports);
var import_path3 = __toESM(require("path"));

// src/runtime/define-hook.ts
var defineHook = (def) => def;

// src/runtime/ide-registry.ts
var EVENTS = {
  PostToolUse: { "claude-code": "PostToolUse", "codex": "PostToolUse", "cursor": "postToolUse", "windsurf": "PostToolUse", "copilot": null },
  PreToolUse: { "claude-code": "PreToolUse", "codex": "PreToolUse", "cursor": "preToolUse", "windsurf": "PreToolUse", "copilot": null },
  SessionStart: { "claude-code": "SessionStart", "codex": null, "cursor": "sessionStart", "windsurf": null, "copilot": "SessionStart" },
  PrePromptSubmit: { "claude-code": null, "codex": null, "cursor": "userPromptSubmitted", "windsurf": "PrePromptSubmit", "copilot": "userPromptSubmitted" }
};
var reverseLookupEvent = (ide, raw) => {
  for (const [key, map] of Object.entries(EVENTS)) {
    if (map[ide] === raw) return key;
  }
  return null;
};
var TOOL_KINDS = {
  write: {
    "claude-code": ["Write", "create_file"],
    "codex": ["Write", "apply_patch", "functions.apply_patch"],
    "cursor": ["Write"],
    "windsurf": ["Write"],
    "copilot": ["create_file"]
  },
  edit: {
    "claude-code": ["Edit"],
    "codex": ["apply_patch", "functions.apply_patch"],
    "cursor": ["Edit"],
    "windsurf": ["Write"],
    // Windsurf post_write_code covers both write+edit
    "copilot": ["replace_string_in_file"]
  },
  "multi-edit": {
    "claude-code": ["MultiEdit"],
    "codex": null,
    "cursor": null,
    "windsurf": null,
    "copilot": ["multi_replace_string_in_file"]
  },
  patch: {
    "claude-code": null,
    "codex": ["apply_patch", "functions.apply_patch"],
    "cursor": null,
    "windsurf": null,
    "copilot": null
  },
  create: {
    "claude-code": ["Write"],
    "codex": ["Write", "apply_patch", "functions.apply_patch"],
    "cursor": ["Write"],
    "windsurf": ["Write"],
    "copilot": ["create_file"]
  },
  replace: {
    "claude-code": ["Edit"],
    "codex": ["apply_patch", "functions.apply_patch"],
    "cursor": ["Edit"],
    "windsurf": ["Write"],
    "copilot": ["replace_string_in_file", "multi_replace_string_in_file"]
  },
  bash: {
    "claude-code": ["Bash"],
    "codex": ["Bash", "shell"],
    "cursor": ["Bash"],
    "windsurf": ["Bash"],
    "copilot": null
  },
  read: {
    "claude-code": ["Read"],
    "codex": ["Read"],
    "cursor": ["Read"],
    "windsurf": ["Read"],
    "copilot": null
  }
};
var reverseLookupToolKind = (ide, raw) => {
  for (const [key, map] of Object.entries(TOOL_KINDS)) {
    const names = map[ide];
    if (Array.isArray(names) && names.includes(raw))
      return key;
  }
  return null;
};
var PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
var extractFromPatch = (raw) => {
  const command = raw.tool_input?.command ?? "";
  return PATCH_FILE_RE.exec(command)?.[1]?.trim() ?? null;
};
var parseToolArgsFilePath = (raw) => {
  const { toolArgs } = raw;
  if (!toolArgs) return null;
  try {
    const parsed = JSON.parse(toolArgs);
    return parsed?.filePath ?? parsed?.file_path ?? null;
  } catch {
    return null;
  }
};
var PROPERTIES = {
  filePath: {
    "claude-code": (raw) => {
      const ti = raw.tool_input ?? {};
      return ti.file_path ?? ti.filePath ?? ti.path ?? null;
    },
    "codex": (raw) => {
      const tool = raw.tool_name ?? "";
      if (tool === "apply_patch" || tool === "functions.apply_patch") return extractFromPatch(raw);
      const ti = raw.tool_input ?? {};
      return ti.file_path ?? null;
    },
    "cursor": (raw) => {
      const ti = raw.tool_input ?? {};
      return ti.file_path ?? ti.filePath ?? ti.path ?? null;
    },
    "windsurf": (raw) => {
      const ti = raw.tool_info ?? {};
      return ti.file_path ?? null;
    },
    "copilot": parseToolArgsFilePath
  },
  cwd: {
    "claude-code": (raw) => raw.cwd ?? null,
    "codex": (raw) => raw.cwd ?? null,
    "cursor": (raw) => raw.cwd ?? null,
    "windsurf": (raw) => raw.tool_info?.cwd ?? null,
    "copilot": (raw) => raw.cwd ?? null
  },
  sessionId: {
    "claude-code": (raw) => raw.session_id ?? null,
    "codex": (raw) => raw.session_id ?? null,
    "cursor": (raw) => raw.conversation_id ?? null,
    "windsurf": (raw) => raw.trajectory_id ?? null,
    "copilot": (_raw) => null
  }
};

// src/adapters/claude-code.ts
var IDE = "claude-code";
var CC_SIGNATURE = ["hook_event_name", "tool_input", "session_id"];
var detect = (raw) => CC_SIGNATURE.every((f) => f in raw);
var normalize = (raw) => ({
  ...raw,
  ide: IDE,
  event: reverseLookupEvent(IDE, raw.hook_event_name),
  toolKind: reverseLookupToolKind(IDE, raw.tool_name),
  file_path: PROPERTIES.filePath[IDE](raw) ?? "",
  cwd: PROPERTIES.cwd[IDE](raw) ?? void 0,
  session_id: PROPERTIES.sessionId[IDE](raw) ?? void 0
});
var formatOutput = (canonical) => canonical ?? {};
var claudeCode = { name: "claude-code", detect, normalize, formatOutput };

// src/adapters/codex.ts
var IDE2 = "codex";
var CC_SIGNATURE2 = ["hook_event_name", "tool_input", "session_id"];
var CODEX_EXTRA = ["model", "turn_id"];
var detect2 = (raw) => CC_SIGNATURE2.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);
var normalize2 = (raw) => ({
  ...raw,
  ide: IDE2,
  event: reverseLookupEvent(IDE2, raw.hook_event_name),
  toolKind: reverseLookupToolKind(IDE2, raw.tool_name),
  file_path: PROPERTIES.filePath[IDE2](raw) ?? "",
  cwd: PROPERTIES.cwd[IDE2](raw) ?? void 0,
  session_id: PROPERTIES.sessionId[IDE2](raw) ?? void 0
});
var formatOutput2 = (canonical) => canonical ?? {};
var codex = { name: "codex", detect: detect2, normalize: normalize2, formatOutput: formatOutput2 };

// src/adapters/cursor.ts
var IDE3 = "cursor";
var CC_SIGNATURE3 = ["hook_event_name", "tool_input"];
var CURSOR_EXTRA = ["conversation_id", "cursor_version"];
var toPascalCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
var detect3 = (raw) => CC_SIGNATURE3.every((f) => f in raw) && CURSOR_EXTRA.every((f) => f in raw);
var normalize3 = (raw) => {
  const { hook_event_name, conversation_id, ...rest } = raw;
  const rawEventName = hook_event_name;
  return {
    ...rest,
    ide: IDE3,
    event: reverseLookupEvent(IDE3, rawEventName),
    toolKind: reverseLookupToolKind(IDE3, raw.tool_name),
    hook_event_name: toPascalCase(rawEventName),
    session_id: conversation_id,
    conversation_id,
    file_path: PROPERTIES.filePath[IDE3](raw) ?? "",
    cwd: PROPERTIES.cwd[IDE3](raw) ?? void 0
  };
};
var formatOutput3 = (canonical) => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
  const out = {};
  if (additionalContext) out.additional_context = additionalContext;
  if (permissionDecision) out.permission = permissionDecision;
  if (permissionDecisionReason) out.user_message = permissionDecisionReason;
  if (cont === false) out.permission = out.permission ?? "deny";
  return out;
};
var cursor = { name: "cursor", detect: detect3, normalize: normalize3, formatOutput: formatOutput3 };

// src/adapters/windsurf.ts
var IDE4 = "windsurf";
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
var detect4 = (raw) => WINDSURF_SIGNATURE.every((f) => f in raw);
var normalize4 = (raw) => {
  const { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info } = raw;
  const eventDef = EVENT_MAP[agent_action_name];
  const ti = tool_info || {};
  const mappedHookEventName = eventDef ? eventDef.hook_event_name : agent_action_name;
  const mappedToolName = eventDef ? resolveToolName(eventDef, ti) : null;
  return {
    ide: IDE4,
    event: reverseLookupEvent(IDE4, mappedHookEventName),
    toolKind: reverseLookupToolKind(IDE4, mappedToolName ?? ""),
    hook_event_name: mappedHookEventName,
    session_id: trajectory_id,
    tool_name: mappedToolName,
    tool_input: eventDef ? eventDef.buildToolInput(ti) : ti,
    file_path: PROPERTIES.filePath[IDE4](raw) ?? "",
    cwd: PROPERTIES.cwd[IDE4](raw) ?? void 0,
    _windsurf: { agent_action_name, execution_id, timestamp, model_name, tool_info: ti }
  };
};
var formatOutput4 = (canonical) => {
  const { hookSpecificOutput = {} } = canonical ?? {};
  const { additionalContext, permissionDecision } = hookSpecificOutput;
  const out = {};
  if (additionalContext) out.additionalContext = additionalContext;
  if (permissionDecision === "deny") out._exitCode = 2;
  return out;
};
var windsurf = { name: "windsurf", detect: detect4, normalize: normalize4, formatOutput: formatOutput4 };

// src/adapters/copilot.ts
var IDE5 = "copilot";
var COPILOT_SIGNATURE = ["toolName", "timestamp", "cwd"];
var inferEvent = (raw) => {
  if ("toolName" in raw) return "toolResult" in raw ? "PostToolUse" : "PreToolUse";
  if ("source" in raw || "initialPrompt" in raw) return "SessionStart";
  if ("prompt" in raw) return "PrePromptSubmit";
  return null;
};
var inferHookEventName = (raw) => {
  const event = inferEvent(raw);
  if (event) return event;
  if ("reason" in raw) return "SessionEnd";
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
var detect5 = (raw) => COPILOT_SIGNATURE.every((f) => f in raw) && !("hook_event_name" in raw);
var normalize5 = (raw) => {
  const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
  return {
    ide: IDE5,
    event: inferEvent(raw),
    toolKind: reverseLookupToolKind(IDE5, toolName),
    hook_event_name: inferHookEventName(raw),
    session_id: void 0,
    tool_name: toolName,
    tool_input: parseToolArgs(raw),
    tool_use_id: void 0,
    cwd,
    tool_response: toolResult ?? void 0,
    file_path: PROPERTIES.filePath[IDE5](raw) ?? "",
    _copilot: { timestamp, toolName, toolArgs, toolResult }
  };
};
var formatOutput5 = (canonical) => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
  const out = {};
  if (permissionDecision) out.permissionDecision = permissionDecision;
  if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
  if (cont === false && !out.permissionDecision) out.permissionDecision = "deny";
  if (additionalContext) out.hookSpecificOutput = { hookEventName, additionalContext };
  return out;
};
var copilot = { name: "copilot", detect: detect5, normalize: normalize5, formatOutput: formatOutput5 };

// src/adapter.ts
var DETECTION_ORDER = ["codex", "cursor", "claude-code", "windsurf", "copilot"];
var ADAPTERS = {
  codex,
  cursor,
  "claude-code": claudeCode,
  windsurf,
  copilot
};
var detectIDE = (rawInput) => {
  if (rawInput === null || rawInput === void 0) {
    throw new Error("Invalid input: null or undefined");
  }
  if (typeof rawInput !== "object" || Array.isArray(rawInput)) {
    throw new Error("Invalid input: expected a plain object");
  }
  const raw = rawInput;
  const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
  if (!ide) {
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
  }
  return ide;
};
var normalize6 = (rawInput) => ADAPTERS[detectIDE(rawInput)].normalize(rawInput);
var formatOutput6 = (canonicalOutput, ide) => {
  const adapter = ide ? ADAPTERS[ide] : void 0;
  return adapter ? adapter.formatOutput(canonicalOutput) : canonicalOutput;
};
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

// src/runtime/run-hook.ts
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
    return { hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: result.reason }, continue: false };
  if (result.kind === "allow")
    return { hookSpecificOutput: { permissionDecision: "allow" } };
  return {};
};
var makeDedupKey = (dedupBy, ctx, name) => [
  name,
  ...dedupBy.includes("session") ? [ctx.sessionId ?? "no-session"] : [],
  ...dedupBy.includes("filePath") ? [ctx.filePath] : [],
  ...dedupBy.includes("ide") ? [ctx.ide] : []
].join(":");
var runHook = async (def, opts = {}) => {
  const { stdin = process.stdin, stdout = process.stdout } = opts;
  try {
    const raw = await readStdin(stdin);
    const ide = detectIDE(raw);
    const norm = normalize6(raw);
    debugLog(`[runHook:${def.name}]`, { ide, event: norm.event, toolKind: norm.toolKind });
    if (norm.event !== def.on.event) return;
    if (!def.on.toolKinds.includes(norm.toolKind)) return;
    if (def.throttle && "dedupBy" in def.throttle) {
      const ctx0 = toHookContext(norm);
      if (!acquireOnce(makeDedupKey(def.throttle.dedupBy, ctx0, def.name))) return;
    }
    const ctx = toHookContext(norm);
    const result = await def.run(ctx);
    if (!result || result.kind === "side-effect") return;
    stdout.write(JSON.stringify(formatOutput6(toCanonical(result, ctx), ide)));
  } catch (err) {
    debugLog(`[runHook:${def.name}] error`, { err: err.message });
  }
};

// src/runtime/result-helpers.ts
var advise = (message) => ({ kind: "advise", message });

// src/hooks/md-file-advisory.ts
var advisoryMessage = (filePath) => {
  const name = import_path3.default.basename(filePath);
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
  const basename = import_path3.default.basename(normalizedPath);
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
var mdFileAdvisoryHook = defineHook({
  name: "md-file-advisory",
  on: { event: "PostToolUse", toolKinds: ["write", "edit", "multi-edit", "patch", "create", "replace"] },
  run: (ctx) => {
    if (!shouldAdvisory(ctx.filePath)) return null;
    debugLog("md-file-advisory advisory", { filePath: ctx.filePath });
    return advise(advisoryMessage(ctx.filePath));
  }
});
var md_file_advisory_default = mdFileAdvisoryHook;
if (require.main === module) {
  runHook(mdFileAdvisoryHook).then(
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
  isInTempDir,
  isMarkdown,
  matchesAllowedPattern,
  shouldAdvisory,
  shouldCheck
});

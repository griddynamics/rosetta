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
    "claude-code": ["Write"],
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

// src/adapters/cursor.ts
var IDE = "cursor";
var CC_SIGNATURE = ["hook_event_name", "tool_input"];
var CURSOR_EXTRA = ["conversation_id", "cursor_version"];
var toPascalCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
var detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CURSOR_EXTRA.every((f) => f in raw);
var normalize = (raw) => {
  const { hook_event_name, conversation_id, ...rest } = raw;
  const rawEventName = hook_event_name;
  return {
    ...rest,
    ide: IDE,
    event: reverseLookupEvent(IDE, rawEventName),
    toolKind: reverseLookupToolKind(IDE, raw.tool_name),
    hook_event_name: toPascalCase(rawEventName),
    session_id: conversation_id,
    conversation_id,
    file_path: PROPERTIES.filePath[IDE](raw) ?? "",
    cwd: PROPERTIES.cwd[IDE](raw) ?? void 0
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

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

// src/hooks/dangerous-actions.ts
var dangerous_actions_exports = {};
__export(dangerous_actions_exports, {
  dangerousActionsHook: () => dangerousActionsHook
});
module.exports = __toCommonJS(dangerous_actions_exports);

// src/runtime/define-hook.ts
var defineHook = (def) => def;

// src/runtime/run-hook.ts
var import_path4 = __toESM(require("path"));

// src/runtime/ide-rows/copilot.ts
var TOOL_KINDS = {
  write: ["create_file"],
  edit: ["replace_string_in_file"],
  "multi-edit": ["multi_replace_string_in_file"],
  create: ["create_file"],
  replace: ["replace_string_in_file", "multi_replace_string_in_file"]
};
var lookupToolKind = (raw) => {
  for (const [k, v] of Object.entries(TOOL_KINDS))
    if (v.includes(raw)) return k;
  return null;
};
var getFilePath = (raw) => {
  const toolArgs = raw.toolArgs;
  if (!toolArgs) return null;
  try {
    const parsed = JSON.parse(toolArgs);
    return parsed?.filePath ?? parsed?.file_path ?? null;
  } catch {
    return null;
  }
};

// src/adapters/copilot.ts
var IDE = "copilot";
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
var detect = (raw) => COPILOT_SIGNATURE.every((f) => f in raw) && !("hook_event_name" in raw);
var normalize = (raw) => {
  const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
  return {
    ide: IDE,
    event: inferEvent(raw),
    toolKind: lookupToolKind(toolName),
    hook_event_name: inferHookEventName(raw),
    session_id: void 0,
    tool_name: toolName,
    tool_input: parseToolArgs(raw),
    tool_use_id: void 0,
    cwd,
    tool_response: toolResult ?? void 0,
    file_path: getFilePath(raw) ?? "",
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
var dedupKey = (raw, hookName) => {
  if (!detect(raw)) return null;
  return `copilot:${hookName}:${raw.toolName}:${raw.toolArgs ?? ""}`;
};
var copilot = { name: "copilot", detect, normalize, formatOutput, dedupKey };

// src/runtime/ide-rows/claude-code.ts
var EVENTS = {
  PostToolUse: "PostToolUse",
  PreToolUse: "PreToolUse",
  SessionStart: "SessionStart"
};
var TOOL_KINDS2 = {
  write: ["Write", "create_file"],
  edit: ["Edit"],
  "multi-edit": ["MultiEdit"],
  create: ["Write"],
  replace: ["Edit"],
  bash: ["Bash"],
  read: ["Read"],
  "mcp-call": ["__mcp_sentinel__"]
};
var lookupEvent = (raw) => {
  for (const [k, v] of Object.entries(EVENTS)) if (v === raw) return k;
  return null;
};
var lookupToolKind2 = (raw) => {
  if (raw.startsWith("mcp__")) return "mcp-call";
  for (const [k, v] of Object.entries(TOOL_KINDS2))
    if (v.includes(raw)) return k;
  return null;
};
var getFilePath2 = (raw) => {
  const ti = raw.tool_input ?? {};
  return ti.file_path ?? ti.filePath ?? ti.path ?? null;
};
var getCwd = (raw) => raw.cwd ?? null;
var getSessionId = (raw) => raw.session_id ?? null;

// src/adapters/claude-code.ts
var IDE2 = "claude-code";
var CC_SIGNATURE = ["hook_event_name", "tool_input", "session_id"];
var detect2 = (raw) => CC_SIGNATURE.every((f) => f in raw);
var normalize2 = (raw) => ({
  ...raw,
  ide: IDE2,
  event: lookupEvent(raw.hook_event_name),
  toolKind: lookupToolKind2(raw.tool_name),
  file_path: getFilePath2(raw) ?? "",
  cwd: getCwd(raw) ?? void 0,
  session_id: getSessionId(raw) ?? void 0
});
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
var formatOutput3 = (canonical, ide) => ide === "claude-code" ? claudeCode.formatOutput(canonical) : copilot.formatOutput(canonical);
var detectIDE = (raw) => {
  const r = raw;
  return copilot.detect(r) ? "copilot" : "claude-code";
};
var dedupKey2 = (raw, hookName) => {
  const r = raw;
  return copilot.detect(r) ? copilot.dedupKey(r, hookName) : null;
};

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
    return { hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: result.reason }, continue: false };
  if (result.kind === "allow")
    return { hookSpecificOutput: { permissionDecision: "allow" } };
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
    const norm = normalize3(raw);
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
    const platformKey = dedupKey2(raw, def.name);
    if (platformKey !== null && !acquireOnce(platformKey)) return;
    if (def.throttle && "dedupBy" in def.throttle) {
      if (!acquireOnce(makeDedupKey(def.throttle.dedupBy, ctx, def.name))) return;
    }
    const result = await def.run(ctx);
    if (!result || result.kind === "side-effect") return;
    stdout.write(JSON.stringify(formatOutput3(toCanonical(result, ctx), ide)));
  } catch (err) {
    debugLog(`[runHook:${def.name}] error`, { err: err.message });
  }
};

// src/runtime/result-helpers.ts
var deny = (reason) => ({ kind: "deny", reason });

// src/hooks/dangerous-actions/patterns.ts
var DANGEROUS_BASH = [
  { id: "rm-rf-root", re: /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b.*\s\/(?:\*|\s|$)/, label: "rm -rf /" },
  { id: "rm-rf-home", re: /\brm\s+-[rf]+\b.*(?:\s~\b|\s\$HOME\b)/, label: "rm -rf $HOME" },
  { id: "rm-rf-recursive", re: /\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\b/, label: "rm -rf (generic)" },
  { id: "sql-drop-table", re: /\bdrop\s+(?:table|database|schema)\b/i, label: "DDL DROP" },
  { id: "sql-truncate", re: /\btruncate\s+(?:table\s+)?\w+/i, label: "TRUNCATE TABLE" },
  { id: "git-force-push", re: /\bgit\s+push\b(?:\s+\S+)*\s+(?:--force(?!-with-lease)|-f\b)/, label: "git push --force" },
  { id: "git-reset-hard", re: /\bgit\s+reset\s+--hard\b/, label: "git reset --hard" },
  { id: "git-clean-force", re: /\bgit\s+clean\s+-[a-z]*[fd]/, label: "git clean -fd" },
  { id: "git-branch-delete", re: /\bgit\s+branch\s+-D\b/, label: "git branch -D" },
  { id: "aws-s3-rm-recursive", re: /\baws\s+s3\s+rm\b.*--recursive\b/, label: "aws s3 rm --recursive" },
  { id: "kubectl-delete-prod", re: /\bkubectl\s+delete\b.*(?:--all\b|prod\b)/, label: "kubectl mass delete" },
  { id: "dropdb", re: /\b(?:dropdb|psql.*-c.*drop\b)/, label: "DB drop CLI" },
  { id: "mkfs", re: /\bmkfs(?:\.\w+)?\b/, label: "filesystem format" },
  { id: "dd-of-dev", re: /\bdd\b.*\bof=\/dev\//, label: "dd to device" },
  { id: "chmod-777-recursive", re: /\bchmod\s+-R\s+0?777\b/, label: "chmod -R 777" },
  { id: "curl-pipe-shell", re: /\bcurl\s.*\s\|\s*(?:sh|bash)\b/, label: "curl | sh" }
];
var DANGEROUS_PATHS = [
  // Matched against path basename (caller responsibility)
  { id: "secret-env", re: /^\.env(?:\..+)?$/, label: ".env* file" },
  { id: "ssh-private-key", re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/, label: "SSH private key" },
  { id: "aws-credentials", re: /\/\.aws\/(?:credentials|config)/, label: "AWS credentials" },
  { id: "gcp-credentials", re: /(?:application_default_credentials\.json|\/\.config\/gcloud\/)/, label: "GCP credentials" },
  { id: "kube-config", re: /\/\.kube\/config$/, label: "kubeconfig" },
  { id: "netrc", re: /^[._]netrc$/, label: "netrc" },
  { id: "pgpass", re: /^\.pgpass$/, label: "Postgres password" },
  { id: "gpg-private", re: /\/\.gnupg\/(?:.*\.key|private-keys-v1\.d\/)/, label: "GPG private key" }
];
var DANGEROUS_CONTENT = [
  { id: "content-sql-drop-table", re: /\bdrop\s+(?:table|database|schema)\b/i, label: "DROP in payload" },
  { id: "content-sql-truncate", re: /\btruncate\s+(?:table\s+)?\w+/i, label: "TRUNCATE in payload" },
  { id: "inline-aws-key", re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id" },
  { id: "inline-private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, label: "PEM private key" }
];

// src/hooks/dangerous-actions/evaluate.ts
var REVIEWED_RE = /(?:^|\s)#\s*reviewed(?:\s|:|$)/;
var EVIDENCE_MAX = 120;
var MCP_SHELL_FIELDS = ["command", "cmd", "shell_command"];
var MCP_PATH_FIELDS = ["path", "file_path", "filePath", "target", "target_path"];
var MCP_CONTENT_FIELDS = ["content", "text", "new_string", "query", "sql"];
function buildDenyMessage(pattern, toolKind, evidence, redact = false) {
  const evidenceLine = redact ? `<redacted: ${pattern.id}>` : evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + "\u2026" : evidence;
  return [
    "Blocked by rosetta dangerous-actions hook.",
    "",
    `Rule:     ${pattern.id} \u2014 ${pattern.label}`,
    `Tool:     ${toolKind}`,
    `Evidence: ${evidenceLine}`,
    "",
    "Did you consider this a dangerous activity?",
    "",
    "To proceed (Bash only): re-issue the command with a `# reviewed` shell",
    "comment, e.g. `<command> # reviewed: <one-line reason>`. Doing so asserts",
    "on behalf of the user that this destructive operation is intentional.",
    "",
    "For Write/Edit/MultiEdit there is no inline override \u2014 ask the user to",
    "confirm in chat, then retry. Consider also: is there a non-destructive",
    "alternative (soft delete, dry-run, --force-with-lease, staging env)?"
  ].join("\n");
}
function matchPatterns(patterns, value) {
  for (const p of patterns) {
    if (p.re.test(value)) return p;
  }
  return null;
}
function matchDangerousPath(filePath) {
  const normalizedPath = filePath.replace(/\/+$/, "");
  const basename = normalizedPath.split("/").pop() ?? normalizedPath;
  for (const p of DANGEROUS_PATHS) {
    if (p.re.test(normalizedPath)) return p;
    if (p.re.test(basename)) return p;
  }
  return null;
}
function evalBash(ctx) {
  const command = ctx.toolInput.command;
  if (typeof command !== "string") return null;
  const matched = matchPatterns(DANGEROUS_BASH, command);
  if (!matched) return null;
  if (REVIEWED_RE.test(command)) return null;
  return deny(buildDenyMessage(matched, "bash", command));
}
function evalWrite(ctx) {
  const filePath = ctx.toolInput.file_path;
  const content = ctx.toolInput.content;
  if (typeof filePath !== "string" || typeof content !== "string") return null;
  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, "write", filePath));
  const contentMatch = matchPatterns(DANGEROUS_CONTENT, content);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, "write", content, true));
  return null;
}
function evalEdit(ctx) {
  const filePath = ctx.toolInput.file_path;
  const newString = ctx.toolInput.new_string;
  if (typeof filePath !== "string" || typeof newString !== "string") return null;
  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, "edit", filePath));
  const contentMatch = matchPatterns(DANGEROUS_CONTENT, newString);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, "edit", newString, true));
  return null;
}
function evalMultiEdit(ctx) {
  const filePath = ctx.toolInput.file_path;
  const edits = ctx.toolInput.edits;
  if (typeof filePath !== "string" || !Array.isArray(edits)) return null;
  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, "multi-edit", filePath));
  for (const edit of edits) {
    const contentMatch = matchPatterns(DANGEROUS_CONTENT, edit.new_string);
    if (contentMatch) return deny(buildDenyMessage(contentMatch, "multi-edit", edit.new_string, true));
  }
  return null;
}
function evalMcpCall(ctx) {
  const input = ctx.toolInput;
  for (const f of MCP_SHELL_FIELDS) {
    const v = input[f];
    if (typeof v === "string") {
      const m = matchPatterns(DANGEROUS_BASH, v);
      if (m) {
        return deny(buildDenyMessage(m, ctx.toolName, v));
      }
    }
  }
  for (const f of MCP_PATH_FIELDS) {
    const v = input[f];
    if (typeof v === "string") {
      const m = matchDangerousPath(v);
      if (m) return deny(buildDenyMessage(m, ctx.toolName, v));
    }
  }
  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === "string") {
      const m = matchPatterns(DANGEROUS_CONTENT, v);
      if (m) return deny(buildDenyMessage(m, ctx.toolName, v, true));
    }
  }
  return null;
}
function evaluateDangerous(ctx) {
  switch (ctx.toolKind) {
    case "bash":
      return evalBash(ctx);
    case "write":
      return evalWrite(ctx);
    case "edit":
      return evalEdit(ctx);
    case "multi-edit":
      return evalMultiEdit(ctx);
    case "mcp-call":
      return evalMcpCall(ctx);
    default:
      return null;
  }
}

// src/hooks/dangerous-actions.ts
var dangerousActionsHook = defineHook({
  name: "dangerous-actions",
  on: {
    event: "PreToolUse",
    toolKinds: ["bash", "write", "edit", "multi-edit", "mcp-call"]
  },
  run: (ctx) => evaluateDangerous(ctx)
});
runAsCli(dangerousActionsHook, module);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dangerousActionsHook
});

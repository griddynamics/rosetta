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

// src/runtime/ide-rows/claude-code.ts
var EVENTS = {
  PostToolUse: "PostToolUse",
  PreToolUse: "PreToolUse",
  SessionStart: "SessionStart"
};
var TOOL_KINDS = {
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
var lookupToolKind = (raw) => {
  if (raw.startsWith("mcp__")) return "mcp-call";
  for (const [k, v] of Object.entries(TOOL_KINDS))
    if (v.includes(raw)) return k;
  return null;
};
var getFilePath = (raw) => {
  const ti = raw.tool_input ?? {};
  return ti.file_path ?? ti.filePath ?? ti.path ?? null;
};
var getCwd = (raw) => raw.cwd ?? null;
var getSessionId = (raw) => raw.session_id ?? null;

// src/adapters/claude-code.ts
var IDE = "claude-code";
var CC_SIGNATURE = ["hook_event_name", "tool_input", "session_id"];
var detect = (raw) => CC_SIGNATURE.every((f) => f in raw);
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
var claudeCode = { name: "claude-code", detect, normalize, formatOutput };

// src/entrypoints/adapter-claude-code.ts
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
var normalize2 = (rawInput) => claudeCode.normalize(rawInput);
var formatOutput2 = (canonical, _ide) => claudeCode.formatOutput(canonical);
var detectIDE = (_raw) => "claude-code";
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
var deny = (reason) => ({ kind: "deny", reason });

// src/hooks/dangerous-actions/patterns.ts
var SQL_DROP_RE = /\bdrop\s+(?:table|database|schema)\b/i;
var SQL_TRUNCATE_RE = /\btruncate\s+(?:table\s+)?\w+/i;
var DANGEROUS_BASH = [
  { id: "rm-rf-root", re: /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b.*\s\/(?:\*|\s|$)/, label: "rm -rf /", reason: "Recursive forced removal of root filesystem \u2014 unrecoverable data loss.", policy: "hard-deny" },
  { id: "rm-rf-home", re: /\brm\s+-[rf]+\b.*(?:\s~\b|\s\$HOME\b)/, label: "rm -rf $HOME", reason: "Recursive forced removal of home directory \u2014 deletes all user files.", policy: "hard-deny" },
  { id: "rm-rf-recursive", re: /\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\b/, label: "rm -rf (generic)", reason: "Recursive forced file removal \u2014 verify target path before proceeding.", policy: "reconsider" },
  { id: "sql-drop-table", re: SQL_DROP_RE, label: "DDL DROP", reason: "Destructive DDL statement that permanently removes a table or database.", policy: "reconsider" },
  { id: "sql-truncate", re: SQL_TRUNCATE_RE, label: "TRUNCATE TABLE", reason: "Truncates all rows from a table \u2014 non-transactional in some databases.", policy: "reconsider" },
  { id: "git-force-push", re: /\bgit\s+push\b(?=(?:\s+\S+)*\s+(?:-f\b|--force(?!-with-lease)))/, label: "git push --force", reason: "Force-push rewrites remote history and may discard teammates' commits.", policy: "reconsider" },
  { id: "git-reset-hard", re: /\bgit\s+reset\s+--hard\b/, label: "git reset --hard", reason: "Hard reset discards all uncommitted changes and cannot be undone.", policy: "reconsider" },
  { id: "git-clean-force", re: /\bgit\s+clean\s+-[a-z]*[fd]/, label: "git clean -fd", reason: "Permanently removes untracked files and directories from the working tree.", policy: "reconsider" },
  { id: "git-branch-delete", re: /\bgit\s+branch\s+-D\b/, label: "git branch -D", reason: "Force-deletes a local branch including unmerged commits.", policy: "reconsider" },
  { id: "aws-s3-rm-recursive", re: /\baws\s+s3\s+rm\b.*--recursive\b/, label: "aws s3 rm --recursive", reason: "Recursively deletes objects from S3 \u2014 irreversible without versioning.", policy: "reconsider" },
  { id: "kubectl-delete-prod", re: /\bkubectl\s+delete\b.*--all\b/, label: "kubectl mass delete", reason: "Deletes all resources of a type \u2014 may affect running production workloads.", policy: "reconsider" },
  { id: "dropdb", re: /\b(?:dropdb\b|psql\b[^"']*\bdrop\s+(?:table|database|schema)\b)/i, label: "DB drop CLI", reason: "CLI command that permanently removes a PostgreSQL database or table.", policy: "reconsider" },
  { id: "mkfs", re: /\bmkfs(?:\.\w+)?\b/, label: "filesystem format", reason: "Formats a block device, destroying all data on it \u2014 unrecoverable.", policy: "hard-deny" },
  { id: "dd-of-dev", re: /\bdd\b.*\bof=\/dev\//, label: "dd to device", reason: "Writes raw bytes directly to a block device \u2014 can corrupt OS or data.", policy: "hard-deny" },
  { id: "chmod-777-recursive", re: /\bchmod\s+-R\s+0?777\b/, label: "chmod -R 777", reason: "Makes all files world-writable \u2014 severe security risk in shared environments.", policy: "hard-deny" },
  { id: "curl-pipe-shell", re: /\bcurl\s.*\s\|\s*(?:sh|bash)\b/, label: "curl | sh", reason: "Executes arbitrary remote code without inspection \u2014 supply-chain risk.", policy: "hard-deny" }
];
var DANGEROUS_PATHS = [
  { id: "secret-env", re: /^\.env(?:\..+)?$/, label: ".env* file", reason: "Contains application secrets and credentials \u2014 never overwrite blindly.", policy: "hard-deny" },
  { id: "ssh-private-key", re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/, label: "SSH private key", reason: "Writing to an SSH private key path would replace your authentication key.", policy: "hard-deny" },
  { id: "aws-credentials", re: /\/\.aws\/(?:credentials|config)/, label: "AWS credentials", reason: "Overwrites AWS access credentials \u2014 could lock out cloud access.", policy: "hard-deny" },
  { id: "gcp-credentials", re: /(?:application_default_credentials\.json|\/\.config\/gcloud\/)/, label: "GCP credentials", reason: "Overwrites GCP application credentials used for cloud API access.", policy: "hard-deny" },
  { id: "kube-config", re: /\/\.kube\/config$/, label: "kubeconfig", reason: "Overwrites Kubernetes config \u2014 could disrupt cluster access for all contexts.", policy: "hard-deny" },
  { id: "netrc", re: /^[._]netrc$/, label: "netrc", reason: "Contains plaintext credentials for network services (git, ftp, curl).", policy: "hard-deny" },
  { id: "pgpass", re: /^\.pgpass$/, label: "Postgres password", reason: "Contains PostgreSQL connection passwords in plaintext.", policy: "hard-deny" },
  { id: "gpg-private", re: /\/\.gnupg\/(?:.*\.key|private-keys-v1\.d\/)/, label: "GPG private key", reason: "Writing to GPG private key storage could destroy cryptographic identity.", policy: "hard-deny" }
];
var DANGEROUS_CONTENT = [
  { id: "content-sql-drop-table", re: SQL_DROP_RE, label: "DROP in payload", reason: "Payload contains a destructive DDL statement that removes a table or database.", policy: "reconsider" },
  { id: "content-sql-truncate", re: SQL_TRUNCATE_RE, label: "TRUNCATE in payload", reason: "Payload contains a statement that removes all rows from a table.", policy: "reconsider" },
  { id: "inline-aws-key", re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id", reason: "Hardcoded AWS access key detected \u2014 use environment variables or secrets manager.", policy: "hard-deny" },
  { id: "inline-private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, label: "PEM private key", reason: "PEM private key embedded in content \u2014 store in secrets manager, not in files.", policy: "hard-deny" }
];

// src/hooks/dangerous-actions/evaluate.ts
var MARKER_RE = /\bRosetta-AI-reviewed\b/;
var EVIDENCE_MAX = 120;
var MARKER_FIELDS_BY_TOOL = {
  Bash: ["command"],
  Write: ["content"],
  Edit: ["new_string"],
  MultiEdit: ["edits"]
};
var MCP_MARKER_FIELDS = ["command", "sql", "query", "new_string", "content"];
var MCP_SHELL_FIELDS = ["command", "cmd", "shell_command"];
var MCP_PATH_FIELDS = ["path", "file_path", "filePath", "target", "target_path"];
var MCP_CONTENT_FIELDS = ["content", "new_string", "query", "sql"];
function buildReconsiderDenyMessage(pattern, toolKind, evidence, redact = false) {
  const evidenceLine = redact ? `<redacted: ${pattern.id}>` : evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + "\u2026" : evidence;
  const overrideExample = toolKind === "bash" ? ["Append `Rosetta-AI-reviewed` as a comment in the `command` field."] : toolKind === "write" ? ["Append `Rosetta-AI-reviewed` as a comment in the `content` field."] : toolKind === "edit" ? ["Append `Rosetta-AI-reviewed` as a comment in the `new_string` field."] : toolKind === "multi-edit" ? ["Append `Rosetta-AI-reviewed` as a comment in `new_string` inside the relevant `edits[]` entry."] : ["Append `Rosetta-AI-reviewed` as a comment to the relevant string field."];
  return [
    `Dangerous action detected: ${pattern.label} [${pattern.id}]`,
    "Did you use the skill? Did you analyse blast radius and whether you can recover it back? Did you intend dry run?",
    `Evidence: ${evidenceLine}`,
    `Reason: ${pattern.reason}`,
    "",
    "If you are sure and confirmed with the user, you can override by appending `Rosetta-AI-reviewed` comment to the tool call:",
    ...overrideExample
  ].join("\n");
}
function buildHardDenyMessage(pattern, toolKind, evidence, redact = false) {
  const evidenceLine = redact ? `<redacted: ${pattern.id}>` : evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + "\u2026" : evidence;
  return [
    `HARD-DENY: ${pattern.id} \u2014 ${pattern.label} on ${toolKind}`,
    `Evidence: ${evidenceLine}`,
    `Reason: ${pattern.reason}`,
    "",
    "This pattern cannot be bypassed by the `Rosetta-AI-reviewed` marker. Human review required.",
    "AI agent: stop and ask the user to confirm this operation with full blast-radius analysis.",
    "Do not proceed until the user explicitly confirms with full blast-radius analysis."
  ].join("\n");
}
function buildDenyForPattern(pattern, toolKind, evidence, redact = false) {
  const msg = pattern.policy === "hard-deny" ? buildHardDenyMessage(pattern, toolKind, evidence, redact) : buildReconsiderDenyMessage(pattern, toolKind, evidence, redact);
  return deny(msg);
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
function hasAIReviewedMarker(input, toolName) {
  const fields = toolName.startsWith("mcp__") ? MCP_MARKER_FIELDS : MARKER_FIELDS_BY_TOOL[toolName] ?? MCP_MARKER_FIELDS;
  return fields.some((f) => {
    const v = input[f];
    if (typeof v === "string") return MARKER_RE.test(v);
    if (Array.isArray(v)) {
      return v.some((item) => {
        if (typeof item === "string") return MARKER_RE.test(item);
        if (item && typeof item === "object") {
          return Object.values(item).some((inner) => typeof inner === "string" && MARKER_RE.test(inner));
        }
        return false;
      });
    }
    return false;
  });
}
function evalBash(ctx) {
  const command = ctx.toolInput.command;
  if (typeof command !== "string") return { result: null, pattern: null };
  const pattern = matchPatterns(DANGEROUS_BASH, command);
  if (!pattern) return { result: null, pattern: null };
  return { result: buildDenyForPattern(pattern, "bash", command), pattern };
}
function evalWrite(ctx) {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === "string") {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildDenyForPattern(pattern, "write", filePath), pattern };
  }
  const content = ctx.toolInput.content;
  if (typeof content === "string") {
    const pattern = matchPatterns(DANGEROUS_CONTENT, content);
    if (pattern) return { result: buildDenyForPattern(pattern, "write", content, true), pattern };
  }
  return { result: null, pattern: null };
}
function evalEdit(ctx) {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === "string") {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildDenyForPattern(pattern, "edit", filePath), pattern };
  }
  const newString = ctx.toolInput.new_string;
  if (typeof newString === "string") {
    const pattern = matchPatterns(DANGEROUS_CONTENT, newString);
    if (pattern) return { result: buildDenyForPattern(pattern, "edit", newString, true), pattern };
  }
  return { result: null, pattern: null };
}
function evalMultiEdit(ctx) {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === "string") {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildDenyForPattern(pattern, "multi-edit", filePath), pattern };
  }
  const edits = ctx.toolInput.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (edit && typeof edit === "object") {
        const ns = edit.new_string;
        if (typeof ns === "string") {
          const pattern = matchPatterns(DANGEROUS_CONTENT, ns);
          if (pattern) return { result: buildDenyForPattern(pattern, "multi-edit", ns, true), pattern };
        }
      }
    }
  }
  return { result: null, pattern: null };
}
function evalMcpCall(ctx) {
  const input = ctx.toolInput;
  for (const f of MCP_SHELL_FIELDS) {
    const v = input[f];
    if (typeof v === "string") {
      const pattern = matchPatterns(DANGEROUS_BASH, v);
      if (pattern) return { result: buildDenyForPattern(pattern, ctx.toolName, v), pattern };
    }
  }
  for (const f of MCP_PATH_FIELDS) {
    const v = input[f];
    if (typeof v === "string") {
      const pattern = matchDangerousPath(v);
      if (pattern) return { result: buildDenyForPattern(pattern, ctx.toolName, v), pattern };
    }
  }
  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === "string") {
      const pattern = matchPatterns(DANGEROUS_CONTENT, v);
      if (pattern) return { result: buildDenyForPattern(pattern, ctx.toolName, v, true), pattern };
    }
  }
  return { result: null, pattern: null };
}
function detectDanger(ctx) {
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
      return { result: null, pattern: null };
  }
}
function evalPatternAndPolicy(ctx) {
  return detectDanger(ctx);
}
function evaluateDangerous(ctx) {
  const { result, pattern } = evalPatternAndPolicy(ctx);
  if (result === null) return null;
  if (pattern?.policy === "hard-deny") return result;
  const input = ctx.toolInput;
  if (hasAIReviewedMarker(input, ctx.toolName)) {
    debugLog("[dangerous-actions] AI-reviewed marker honored", { toolName: ctx.toolName });
    return null;
  }
  return result;
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

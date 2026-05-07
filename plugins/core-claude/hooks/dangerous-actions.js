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
  { id: "rm-rf-root", re: /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b.*\s\/(?:\*|\s|$)/, label: "rm -rf /" },
  { id: "rm-rf-home", re: /\brm\s+-[rf]+\b.*(?:\s~\b|\s\$HOME\b)/, label: "rm -rf $HOME" },
  { id: "rm-rf-recursive", re: /\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\b/, label: "rm -rf (generic)" },
  { id: "sql-drop-table", re: SQL_DROP_RE, label: "DDL DROP" },
  { id: "sql-truncate", re: SQL_TRUNCATE_RE, label: "TRUNCATE TABLE" },
  { id: "git-force-push", re: /\bgit\s+push\b(?=(?:\s+\S+)*\s+(?:-f\b|--force(?!-with-lease)))/, label: "git push --force" },
  { id: "git-reset-hard", re: /\bgit\s+reset\s+--hard\b/, label: "git reset --hard" },
  { id: "git-clean-force", re: /\bgit\s+clean\s+-[a-z]*[fd]/, label: "git clean -fd" },
  { id: "git-branch-delete", re: /\bgit\s+branch\s+-D\b/, label: "git branch -D" },
  { id: "aws-s3-rm-recursive", re: /\baws\s+s3\s+rm\b.*--recursive\b/, label: "aws s3 rm --recursive" },
  { id: "kubectl-delete-prod", re: /\bkubectl\s+delete\b.*--all\b/, label: "kubectl mass delete" },
  { id: "dropdb", re: /\b(?:dropdb\b|psql\b[^"']*\bdrop\s+(?:table|database|schema)\b)/i, label: "DB drop CLI" },
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
  { id: "content-sql-drop-table", re: SQL_DROP_RE, label: "DROP in payload" },
  { id: "content-sql-truncate", re: SQL_TRUNCATE_RE, label: "TRUNCATE in payload" },
  { id: "inline-aws-key", re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id" },
  { id: "inline-private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, label: "PEM private key" }
];

// src/hooks/dangerous-actions/evaluate.ts
var REVIEWED_RE = /\breviewed\b/;
var EVIDENCE_MAX = 120;
var OVERRIDE_FIELDS_BY_TOOL = {
  Bash: ["command"],
  Write: ["content", "file_path"],
  Edit: ["new_string", "old_string", "file_path"],
  MultiEdit: ["file_path", "edits"]
};
var MCP_OVERRIDE_FIELDS = ["command", "sql", "query", "new_string", "content"];
var MCP_SHELL_FIELDS = ["command", "cmd", "shell_command"];
var MCP_PATH_FIELDS = ["path", "file_path", "filePath", "target", "target_path"];
var MCP_CONTENT_FIELDS = ["content", "new_string", "query", "sql"];
function buildDenyMessage(pattern, toolKind, evidence, redact = false) {
  const evidenceLine = redact ? `<redacted: ${pattern.id}>` : evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + "\u2026" : evidence;
  return [
    `Blocked: ${pattern.id} \u2014 ${pattern.label} on ${toolKind}`,
    `Evidence: ${evidenceLine}`,
    "",
    "Override: include `reviewed` anywhere in the tool call (command, content, or any visible string field).",
    "Alternative: use soft delete, dry-run, --force-with-lease, or a staging environment."
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
function hasReviewedOverride(input, toolName) {
  const fields = toolName.startsWith("mcp__") ? MCP_OVERRIDE_FIELDS : OVERRIDE_FIELDS_BY_TOOL[toolName] ?? MCP_OVERRIDE_FIELDS;
  return fields.some((f) => {
    const v = input[f];
    if (typeof v === "string") return REVIEWED_RE.test(v);
    if (Array.isArray(v)) {
      return v.some((item) => {
        if (typeof item === "string") return REVIEWED_RE.test(item);
        if (item && typeof item === "object") {
          return Object.values(item).some((inner) => typeof inner === "string" && REVIEWED_RE.test(inner));
        }
        return false;
      });
    }
    return false;
  });
}
function evalBash(ctx) {
  const command = ctx.toolInput.command;
  if (typeof command !== "string") return null;
  const matched = matchPatterns(DANGEROUS_BASH, command);
  if (!matched) return null;
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
      if (m) return deny(buildDenyMessage(m, ctx.toolName, v));
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
function evalPatternRaw(ctx) {
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
function evalPatternOnly(ctx) {
  return evalPatternRaw(ctx);
}

// src/hooks/dangerous-actions/cooldown-store.ts
var import_fs4 = __toESM(require("fs"));
var import_path5 = __toESM(require("path"));
var import_crypto2 = __toESM(require("crypto"));
var COOLDOWN_MS = 5e3;
function storePath(cwd) {
  return import_path5.default.join(cwd, ".claude", "state", "dangerous-actions-cooldown.json");
}
function loadStore(cwd) {
  try {
    return JSON.parse(import_fs4.default.readFileSync(storePath(cwd), "utf8"));
  } catch {
    return {};
  }
}
function saveStore(cwd, store, now) {
  const p = storePath(cwd);
  try {
    import_fs4.default.mkdirSync(import_path5.default.dirname(p), { recursive: true });
    const pruned = Object.fromEntries(
      Object.entries(store).filter(([, v]) => now - v.ts < COOLDOWN_MS * 4)
    );
    import_fs4.default.writeFileSync(p, JSON.stringify(pruned));
  } catch {
  }
}
function hashCall(toolName, toolInput) {
  const normalized = JSON.stringify(
    toolInput,
    (_, v) => typeof v === "string" && /\breviewed\b/i.test(v) ? v.replace(/\s*#\s*\breviewed\b\s*/gi, "").replace(/\breviewed\b/gi, "").trim() : v
  );
  return import_crypto2.default.createHash("sha1").update(`${toolName}:${normalized}`).digest("hex");
}
function recordDeny(cwd, hash, now = Date.now()) {
  const store = loadStore(cwd);
  store[hash] = { ts: now };
  saveStore(cwd, store, now);
}
function isWithinCooldown(cwd, hash, now = Date.now()) {
  const store = loadStore(cwd);
  const rec = store[hash];
  return !!rec && now - rec.ts < COOLDOWN_MS;
}

// src/hooks/dangerous-actions/audit-log.ts
var import_fs5 = __toESM(require("fs"));
var import_path6 = __toESM(require("path"));
function appendOverrideAudit(cwd, entry) {
  const p = import_path6.default.join(cwd, ".claude", "audit", "hook-overrides.jsonl");
  try {
    import_fs5.default.mkdirSync(import_path6.default.dirname(p), { recursive: true });
    import_fs5.default.appendFileSync(p, JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), ...entry }) + "\n");
  } catch {
  }
}

// src/hooks/dangerous-actions.ts
var dangerousActionsHook = defineHook({
  name: "dangerous-actions",
  on: {
    event: "PreToolUse",
    toolKinds: ["bash", "write", "edit", "multi-edit", "mcp-call"]
  },
  run: (ctx) => {
    const patternResult = evalPatternOnly(ctx);
    if (patternResult === null) return null;
    const cwd = ctx.cwd || process.cwd();
    const input = ctx.toolInput;
    const hash = hashCall(ctx.toolName, input);
    const hasOverride = hasReviewedOverride(input, ctx.toolName);
    if (isWithinCooldown(cwd, hash) && hasOverride) {
      appendOverrideAudit(cwd, { toolName: ctx.toolName, blockedByCooldown: true, sessionId: ctx.sessionId });
      return deny(
        "Blocked: repeated dangerous call within 5-second cooldown \u2014 override ignored.\nWait 5 seconds before retrying with the override, or confirm the action explicitly."
      );
    }
    if (hasOverride) {
      appendOverrideAudit(cwd, { toolName: ctx.toolName, blockedByCooldown: false, sessionId: ctx.sessionId });
      return null;
    }
    recordDeny(cwd, hash);
    return patternResult;
  }
});
runAsCli(dangerousActionsHook, module);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dangerousActionsHook
});

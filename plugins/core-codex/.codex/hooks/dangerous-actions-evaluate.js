"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/hooks/dangerous-actions-evaluate.ts
var dangerous_actions_evaluate_exports = {};
__export(dangerous_actions_evaluate_exports, {
  evaluateDangerous: () => evaluateDangerous
});
module.exports = __toCommonJS(dangerous_actions_evaluate_exports);

// src/runtime/result-helpers.ts
var deny = (reason) => ({ kind: "deny", reason });

// src/hooks/dangerous-actions-patterns.ts
var DANGEROUS_BASH = [
  { id: "rm-rf-root", re: /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b.*\s\/(?:\*|\s|$)/, label: "rm -rf /" },
  { id: "rm-rf-home", re: /\brm\s+-[rf]+\b.*(?:\s~\b|\s\$HOME\b)/, label: "rm -rf $HOME" },
  { id: "rm-rf-recursive", re: /\brm\s+-[rf]{2,}\b/, label: "rm -rf (generic)" },
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

// src/hooks/dangerous-actions-evaluate.ts
var REVIEWED_RE = /(?:^|\s)#\s*reviewed(?:\s|:|$)/;
var EVIDENCE_MAX = 120;
function buildDenyMessage(pattern, toolKind, evidence) {
  const snippet = evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + "\u2026" : evidence;
  return [
    "Blocked by rosetta dangerous-actions hook.",
    "",
    `Rule:     ${pattern.id} \u2014 ${pattern.label}`,
    `Tool:     ${toolKind}`,
    `Evidence: ${snippet}`,
    "",
    "Did you consider this as a dangerous activity?",
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
    if (p.re.test(filePath)) return p;
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
  if (contentMatch) return deny(buildDenyMessage(contentMatch, "write", content));
  return null;
}
function evalEdit(ctx) {
  const filePath = ctx.toolInput.file_path;
  const newString = ctx.toolInput.new_string;
  if (typeof filePath !== "string" || typeof newString !== "string") return null;
  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, "edit", filePath));
  const contentMatch = matchPatterns(DANGEROUS_CONTENT, newString);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, "edit", newString));
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
    if (contentMatch) return deny(buildDenyMessage(contentMatch, "multi-edit", edit.new_string));
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
    default:
      return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  evaluateDangerous
});

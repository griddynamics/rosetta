"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECRET_VALUE_PATTERNS = exports.DANGEROUS_CONTENT = exports.DANGEROUS_PATHS = exports.DANGEROUS_BASH = void 0;
const SQL_DROP_RE = /\bdrop\s+(?:table|database|schema)\b/i;
const SQL_TRUNCATE_RE = /\btruncate\s+(?:table\s+)?\w+/i;
// DELETE / UPDATE are destructive only WITHOUT a WHERE clause. The negative
// lookahead `(?![^;]*\bwhere\b)` scans to the end of THIS statement (bounded by
// the next `;`) — so `DELETE FROM a; ... b WHERE …` still flags the unguarded
// first statement, while `DELETE FROM a WHERE …` is left alone.
//
// KNOWN LIMITATION (intentional): the `;` boundary is naive — it treats the first
// `;` as the statement terminator, but `;` is legal inside string literals,
// quoted identifiers, comments, and dollar-quoted blocks. A `;` embedded BEFORE
// the WHERE (e.g. `UPDATE t SET c = 'a;b' WHERE id = 5`) shortens the scan window
// so WHERE is not seen and the (actually safe) statement is flagged. This errs
// toward a FALSE POSITIVE, never a false negative: an embedded `;` can only make
// the guard flag MORE, never let an unguarded DELETE/UPDATE through. Combined with
// the `reconsider` tier (overridable via the marker) that is the safe trade-off.
// A correct fix needs a SQL lexer (escaped quotes, dollar-quoting, comments), not
// a regex — out of scope here. See the "known limitation" test for the pinned case.
const SQL_DELETE_NO_WHERE_RE = /\bdelete\s+from\b(?![^;]*\bwhere\b)/i;
const SQL_UPDATE_NO_WHERE_RE = /\bupdate\s+\S+\s+set\b(?![^;]*\bwhere\b)/i;
const SQL_DROP_INDEX_VIEW_RE = /\bdrop\s+(?:index|view)\b/i;
// ALTER … DROP COLUMN within one statement; `[^;]*` keeps the DROP bound to its
// own ALTER TABLE (so an ADD COLUMN in the same statement is not mis-flagged).
const SQL_ALTER_DROP_COLUMN_RE = /\balter\s+table\b[^;]*\bdrop\s+column\b/i;
// Secret VALUE detectors (the literal credential, not a file path).
const AWS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/;
const PEM_PRIVATE_KEY_RE = /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/;
// `rm` recursive + force detection. GNU getopt permutes options past operands,
// so the recursive flag (-r/-R/--recursive) and the force flag (-f/--force) may
// appear combined (-rf), separate, in any order, at any distance, and on either
// side of the target path. We require BOTH a recursive marker AND a force marker
// somewhere in the command (each anchored to a whitespace-preceded flag token so
// a dash inside a path like ./my-file is not mistaken for a flag).
const RM_RECURSIVE_LA = String.raw `(?=.*\s(?:--recursive\b|-[a-zA-Z]*[rR]))`;
const RM_FORCE_LA = String.raw `(?=.*\s(?:--force\b|-[a-zA-Z]*f))`;
const RM_RF_GUARD = RM_RECURSIVE_LA + RM_FORCE_LA;
// A root operand: a standalone `/` (or `/*`), i.e. a slash followed by space/end/`*`.
const RM_ROOT_TARGET = String.raw `.*\s\/(?:\*|\s|$)`;
const RM_HOME_TARGET = String.raw `.*\s(?:~(?:\/|\s|$)|\$HOME\b)`;
// `git push` force detection. Two independent force mechanisms:
//   (a) an explicit force flag — `-f` or `--force` — but NOT the safer
//       `--force-with-lease`, which is intentionally treated as non-destructive.
//   (b) force-by-refspec — a refspec whose first character is `+`
//       (e.g. `git push origin +main`), which git treats as an unconditional force.
const GIT_PUSH = String.raw `\bgit\s+push\b`;
const GIT_FORCE_FLAG_LA = String.raw `(?=(?:\s+\S+)*\s+(?:-f\b|--force(?!-with-lease)))`;
// The `+` must START a refspec token, so it is anchored to a preceding space or
// quote (`'`/`"`). This deliberately excludes: a `+` inside a branch name
// (`feature+x` — preceded by a letter), a `+` after a colon (`src:+dst` — the
// force `+` is only recognised at the very start of a refspec), and a backtick
// (`` `+main` `` is command substitution, not a quoted literal). The `+`-refspec
// must also be preceded by the repository operand — `(?!-)(?!['"]?\+)\S+` matches
// that repository — so a bare `git push +main` (where `+main` IS the repository
// argument, not a refspec) is left alone and handled separately.
const GIT_FORCE_REFSPEC_LA = String.raw `(?=(?:\s+-\S+)*\s+(?!-)(?!['"]?\+)\S+(?:\s+\S+)*\s+['"]?\+\S)`;
exports.DANGEROUS_BASH = [
    { id: 'rm-rf-root', re: new RegExp(String.raw `\brm\b` + RM_RF_GUARD + RM_ROOT_TARGET), label: 'rm -rf /', reason: 'Recursive forced removal of root filesystem — unrecoverable data loss.', policy: 'hard-deny' },
    { id: 'rm-rf-home', re: new RegExp(String.raw `\brm\b` + RM_RF_GUARD + RM_HOME_TARGET), label: 'rm -rf $HOME', reason: 'Recursive forced removal of home directory — deletes all user files.', policy: 'hard-deny' },
    { id: 'rm-rf-recursive', re: new RegExp(String.raw `\brm\b` + RM_RF_GUARD), label: 'rm -rf (generic)', reason: 'Recursive forced file removal — verify target path before proceeding.', policy: 'reconsider' },
    { id: 'sql-drop-table', re: SQL_DROP_RE, label: 'DDL DROP', reason: 'Destructive DDL statement that permanently removes a table or database.', policy: 'reconsider' },
    { id: 'sql-truncate', re: SQL_TRUNCATE_RE, label: 'TRUNCATE TABLE', reason: 'Truncates all rows from a table — non-transactional in some databases.', policy: 'reconsider' },
    { id: 'sql-delete-no-where', re: SQL_DELETE_NO_WHERE_RE, label: 'DELETE without WHERE', reason: 'DELETE without a WHERE clause removes every row in the table.', policy: 'reconsider' },
    { id: 'sql-update-no-where', re: SQL_UPDATE_NO_WHERE_RE, label: 'UPDATE without WHERE', reason: 'UPDATE without a WHERE clause overwrites every row in the table.', policy: 'reconsider' },
    { id: 'sql-drop-index-view', re: SQL_DROP_INDEX_VIEW_RE, label: 'DROP INDEX/VIEW', reason: 'Destructive DDL that drops an index or view.', policy: 'reconsider' },
    { id: 'sql-alter-drop-col', re: SQL_ALTER_DROP_COLUMN_RE, label: 'ALTER DROP COLUMN', reason: 'ALTER TABLE … DROP COLUMN permanently removes a column and its data.', policy: 'reconsider' },
    { id: 'git-force-push', re: new RegExp(GIT_PUSH + `(?:${GIT_FORCE_FLAG_LA}|${GIT_FORCE_REFSPEC_LA})`), label: 'git push --force', reason: 'Force-push (via -f/--force or a + refspec) rewrites remote history and may discard teammates\' commits.', policy: 'reconsider' },
    { id: 'git-reset-hard', re: /\bgit\s+reset\s+--hard\b/, label: 'git reset --hard', reason: 'Hard reset discards all uncommitted changes and cannot be undone.', policy: 'reconsider' },
    { id: 'git-clean-force', re: /\bgit\s+clean\s+-[a-z]*[fd]/, label: 'git clean -fd', reason: 'Permanently removes untracked files and directories from the working tree.', policy: 'reconsider' },
    { id: 'git-branch-delete', re: /\bgit\s+branch\s+-D\b/, label: 'git branch -D', reason: 'Force-deletes a local branch including unmerged commits.', policy: 'reconsider' },
    { id: 'aws-s3-rm-recursive', re: /\baws\s+s3\s+rm\b.*--recursive\b/, label: 'aws s3 rm --recursive', reason: 'Recursively deletes objects from S3 — irreversible without versioning.', policy: 'reconsider' },
    { id: 'kubectl-delete-prod', re: /\bkubectl\s+delete\b.*--all\b/, label: 'kubectl mass delete', reason: 'Deletes all resources of a type — may affect running production workloads.', policy: 'reconsider' },
    { id: 'dropdb', re: /\b(?:dropdb\b|psql\b[^"']*\bdrop\s+(?:table|database|schema)\b)/i, label: 'DB drop CLI', reason: 'CLI command that permanently removes a PostgreSQL database or table.', policy: 'reconsider' },
    { id: 'mkfs', re: /\bmkfs(?:\.\w+)?\b/, label: 'filesystem format', reason: 'Formats a block device, destroying all data on it — unrecoverable.', policy: 'hard-deny' },
    { id: 'dd-of-dev', re: /\bdd\b.*\bof=\/dev\//, label: 'dd to device', reason: 'Writes raw bytes directly to a block device — can corrupt OS or data.', policy: 'hard-deny' },
    { id: 'chmod-777-recursive', re: /\bchmod\s+-R\s+0?777\b/, label: 'chmod -R 777', reason: 'Makes all files world-writable — severe security risk in shared environments.', policy: 'hard-deny' },
    { id: 'curl-pipe-shell', re: /\bcurl\s.*\s\|\s*(?:sh|bash)\b/, label: 'curl | sh', reason: 'Executes arbitrary remote code without inspection — supply-chain risk.', policy: 'hard-deny' },
];
exports.DANGEROUS_PATHS = [
    // Matches `.env`, the `.env.<suffix>` family, and any `<name>.env` file (e.g.
    // production.env). `\.env$` requires `.env` to be the FULL trailing extension,
    // so `.env` as a substring of another extension (.envx, .envfile, .environment)
    // is not matched. Tested against both the full path and the basename.
    { id: 'secret-env', re: /\.env$|^\.env\..+$/, label: '.env* file', reason: 'Contains application secrets and credentials — never overwrite blindly.', policy: 'hard-deny' },
    { id: 'ssh-private-key', re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/, label: 'SSH private key', reason: 'Writing to an SSH private key path would replace your authentication key.', policy: 'hard-deny' },
    { id: 'aws-credentials', re: /\/\.aws\/(?:credentials|config)/, label: 'AWS credentials', reason: 'Overwrites AWS access credentials — could lock out cloud access.', policy: 'hard-deny' },
    { id: 'gcp-credentials', re: /(?:application_default_credentials\.json|\/\.config\/gcloud\/)/, label: 'GCP credentials', reason: 'Overwrites GCP application credentials used for cloud API access.', policy: 'hard-deny' },
    { id: 'kube-config', re: /\/\.kube\/config$/, label: 'kubeconfig', reason: 'Overwrites Kubernetes config — could disrupt cluster access for all contexts.', policy: 'hard-deny' },
    { id: 'netrc', re: /^[._]netrc$/, label: 'netrc', reason: 'Contains plaintext credentials for network services (git, ftp, curl).', policy: 'hard-deny' },
    { id: 'pgpass', re: /^\.pgpass$/, label: 'Postgres password', reason: 'Contains PostgreSQL connection passwords in plaintext.', policy: 'hard-deny' },
    { id: 'gpg-private', re: /\/\.gnupg\/(?:.*\.key|private-keys-v1\.d\/)/, label: 'GPG private key', reason: 'Writing to GPG private key storage could destroy cryptographic identity.', policy: 'hard-deny' },
];
exports.DANGEROUS_CONTENT = [
    { id: 'content-sql-drop-table', re: SQL_DROP_RE, label: 'DROP in payload', reason: 'Payload contains a destructive DDL statement that removes a table or database.', policy: 'reconsider' },
    { id: 'content-sql-truncate', re: SQL_TRUNCATE_RE, label: 'TRUNCATE in payload', reason: 'Payload contains a statement that removes all rows from a table.', policy: 'reconsider' },
    { id: 'content-sql-delete-no-where', re: SQL_DELETE_NO_WHERE_RE, label: 'DELETE without WHERE in payload', reason: 'Payload contains a DELETE without a WHERE clause — removes every row.', policy: 'reconsider' },
    { id: 'content-sql-update-no-where', re: SQL_UPDATE_NO_WHERE_RE, label: 'UPDATE without WHERE in payload', reason: 'Payload contains an UPDATE without a WHERE clause — overwrites every row.', policy: 'reconsider' },
    { id: 'content-sql-drop-index-view', re: SQL_DROP_INDEX_VIEW_RE, label: 'DROP INDEX/VIEW in payload', reason: 'Payload contains a DROP INDEX or DROP VIEW statement.', policy: 'reconsider' },
    { id: 'content-sql-alter-drop-col', re: SQL_ALTER_DROP_COLUMN_RE, label: 'ALTER DROP COLUMN in payload', reason: 'Payload contains ALTER TABLE … DROP COLUMN — removes a column and its data.', policy: 'reconsider' },
    { id: 'inline-aws-key', re: AWS_KEY_RE, label: 'AWS access key id', reason: 'Hardcoded AWS access key detected — use environment variables or secrets manager.', policy: 'hard-deny' },
    { id: 'inline-private-key', re: PEM_PRIVATE_KEY_RE, label: 'PEM private key', reason: 'PEM private key embedded in content — store in secrets manager, not in files.', policy: 'hard-deny' },
];
// Secret VALUE patterns, used both to hard-deny secrets in content (above) and to
// scrub a secret out of any deny-reason evidence (bash command / path / MCP shell)
// so the guard never echoes a credential back to the agent. Kept non-global here
// (DANGEROUS_CONTENT uses `.test()`, which is stateful with the `g` flag); callers
// that need global replacement build their own global copy from `.source`.
exports.SECRET_VALUE_PATTERNS = [AWS_KEY_RE, PEM_PRIVATE_KEY_RE];

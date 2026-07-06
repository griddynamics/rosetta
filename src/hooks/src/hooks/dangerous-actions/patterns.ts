// # Rosetta-AI-reviewed: pattern definitions only — not executable SQL/shell
export interface DangerPattern {
  id: string;
  re: RegExp;
  label: string;
  reason: string;
  // 'reconsider' — soft-deny: block THIS attempt and prompt the AI to reconsider.
  //                The AI may still proceed (e.g. the user asked for it) by re-issuing
  //                with the Rosetta-AI-reviewed marker, or stop and ask the user.
  // 'advise'     — non-blocking safety nudge; the action proceeds, the agent is just warned.
  // NOTE: there is intentionally no unconditional-block tier — the hook never hard-denies.
  policy: 'reconsider' | 'advise';
}

/**
 * Static reason taxonomy. Per the review directive the hook never echoes the command
 * or any evidence back — the AI already knows what it ran. It surfaces only a short,
 * generic, PREDEFINED reason. Every pattern selects one of these fixed strings; no
 * per-command text, no interpolation. Keep this set small.
 */
export const REASON = {
  DATA_MANIPULATION:     'unsafe data manipulation',
  SCHEMA_MODIFICATION:   'unsafe schema modification',
  FILE_DELETION:         'irreversible file deletion',
  GIT_HISTORY_REWRITE:   'git history rewrite',
  DEVICE_OPERATION:      'destructive device operation',
  PERMISSION_CHANGE:     'unsafe permission change',
  REMOTE_CODE_EXECUTION: 'remote code execution',
  INFRA_OPERATION:       'unsafe infrastructure operation',
  CREDENTIAL_OVERWRITE:  'credential file overwrite',
} as const;

const SQL_DROP_RE     = /\bdrop\s+(?:table|database|schema)\b/i;
const SQL_TRUNCATE_RE = /\btruncate\s+(?:table\s+)?\w+/i;
// DELETE / UPDATE are destructive only WITHOUT a WHERE clause. The negative
// lookahead `(?![^;]*\bwhere\b)` scans to the end of THIS statement (bounded by
// the next `;`) — so `DELETE FROM a; ... b WHERE …` still flags the unguarded
// first statement, while `DELETE FROM a WHERE …` is left alone.
//
// KNOWN LIMITATIONS (intentional — a correct fix needs a SQL lexer, not a regex,
// which is out of scope here). The WHERE-detection is a flat `\bwhere\b` search
// bounded by the first `;`, so it is blind to SQL structure in two ways:
//
//   (a) `;` inside a string/identifier/comment/dollar-quote. A `;` embedded BEFORE
//       the WHERE (e.g. `UPDATE t SET c = 'a;b' WHERE id = 5`) shortens the scan
//       window so WHERE is not seen and the (safe) statement is flagged. This errs
//       toward a FALSE POSITIVE only — an embedded `;` can never let an unguarded
//       statement through.
//
//   (b) WHERE that does not actually govern the statement — inside a SUBQUERY
//       (`UPDATE t SET x = (SELECT y FROM z WHERE z.id = 1)`) or a COMMENT
//       (`DELETE FROM users -- WHERE never`). Here a WHERE exists in the window but
//       not as the statement's own clause, so the (genuinely destructive) statement
//       is NOT flagged. This is a FALSE NEGATIVE — danger passes. Accepted as a
//       known gap on a `reconsider`-tier guard; see the "known limitation" tests.
//
// Both directions are pinned by characterization tests so a future change is noticed.
const SQL_DELETE_NO_WHERE_RE   = /\bdelete\s+from\b(?![^;]*\bwhere\b)/i;
const SQL_UPDATE_NO_WHERE_RE   = /\bupdate\s+\S+\s+set\b(?![^;]*\bwhere\b)/i;
const SQL_DROP_INDEX_VIEW_RE   = /\bdrop\s+(?:index|view)\b/i;
// ALTER … DROP COLUMN within one statement; `[^;]*` keeps the DROP bound to its
// own ALTER TABLE (so an ADD COLUMN in the same statement is not mis-flagged).
const SQL_ALTER_DROP_COLUMN_RE = /\balter\s+table\b[^;]*\bdrop\s+column\b/i;

// `rm` recursive + force detection. GNU getopt permutes options past operands,
// so the recursive flag (-r/-R/--recursive) and the force flag (-f/--force) may
// appear combined (-rf), separate, in any order, at any distance, and on either
// side of the target path. We require BOTH a recursive marker AND a force marker
// somewhere in the command. Each flag token is anchored to a preceding whitespace
// OR quote (`'`/`"`): the quote covers `rm "-rf" /` (the shell strips quotes and
// passes `-rf` to rm), while still treating a dash inside a path like ./my-file —
// preceded by a letter — as part of the name, not a flag.
const RM_RECURSIVE_LA = String.raw`(?=.*(?:\s|['"])(?:--recursive\b|-[a-zA-Z]*[rR]))`;
const RM_FORCE_LA     = String.raw`(?=.*(?:\s|['"])(?:--force\b|-[a-zA-Z]*f))`;
const RM_RF_GUARD     = RM_RECURSIVE_LA + RM_FORCE_LA;
// A root operand: a standalone `/` (or `/*`), i.e. a slash followed by space/end/`*`.
const RM_ROOT_TARGET  = String.raw`.*\s\/(?:\*|\s|$)`;
const RM_HOME_TARGET  = String.raw`.*\s(?:~(?:\/|\s|$)|\$HOME\b)`;

// `git push` force detection. Two independent force mechanisms:
//   (a) an explicit force flag — `-f` or `--force` — but NOT the safer
//       `--force-with-lease`, which is intentionally treated as non-destructive.
//   (b) force-by-refspec — a refspec whose first character is `+`
//       (e.g. `git push origin +main`), which git treats as an unconditional force.
const GIT_PUSH = String.raw`\bgit\s+push\b`;
const GIT_FORCE_FLAG_LA = String.raw`(?=(?:\s+\S+)*\s+(?:-f\b|--force(?!-with-lease)))`;
// The `+` must START a refspec token, so it is anchored to a preceding space or
// quote (`'`/`"`). This deliberately excludes: a `+` inside a branch name
// (`feature+x` — preceded by a letter), a `+` after a colon (`src:+dst` — the
// force `+` is only recognised at the very start of a refspec), and a backtick
// (`` `+main` `` is command substitution, not a quoted literal). The `+`-refspec
// must also be preceded by the repository operand — `(?!-)(?!['"]?\+)\S+` matches
// that repository — so a bare `git push +main` (where `+main` IS the repository
// argument, not a refspec) is left alone and handled separately.
const GIT_FORCE_REFSPEC_LA = String.raw`(?=(?:\s+-\S+)*\s+(?!-)(?!['"]?\+)\S+(?:\s+\S+)*\s+['"]?\+\S)`;

export const DANGEROUS_BASH: readonly DangerPattern[] = [
  { id: 'rm-rf-root',          re: new RegExp(String.raw`\brm\b` + RM_RF_GUARD + RM_ROOT_TARGET),              label: 'rm -rf /',              reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'rm-rf-home',          re: new RegExp(String.raw`\brm\b` + RM_RF_GUARD + RM_HOME_TARGET),              label: 'rm -rf $HOME',          reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'rm-rf-recursive',     re: new RegExp(String.raw`\brm\b` + RM_RF_GUARD),                               label: 'rm -rf (generic)',      reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'sql-drop-table',      re: SQL_DROP_RE,                                                                label: 'DDL DROP',              reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'sql-truncate',        re: SQL_TRUNCATE_RE,                                                            label: 'TRUNCATE TABLE',        reason: REASON.DATA_MANIPULATION,     policy: 'reconsider' },
  { id: 'sql-delete-no-where', re: SQL_DELETE_NO_WHERE_RE,                                                     label: 'DELETE without WHERE',  reason: REASON.DATA_MANIPULATION,     policy: 'reconsider' },
  { id: 'sql-update-no-where', re: SQL_UPDATE_NO_WHERE_RE,                                                     label: 'UPDATE without WHERE',  reason: REASON.DATA_MANIPULATION,     policy: 'reconsider' },
  { id: 'sql-drop-index-view', re: SQL_DROP_INDEX_VIEW_RE,                                                     label: 'DROP INDEX/VIEW',       reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'sql-alter-drop-col',  re: SQL_ALTER_DROP_COLUMN_RE,                                                   label: 'ALTER DROP COLUMN',     reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'git-force-push',      re: new RegExp(GIT_PUSH + `(?:${GIT_FORCE_FLAG_LA}|${GIT_FORCE_REFSPEC_LA})`),  label: 'git push --force',      reason: REASON.GIT_HISTORY_REWRITE,   policy: 'reconsider' },
  { id: 'git-reset-hard',      re: /\bgit\s+reset\s+--hard\b/,                                                 label: 'git reset --hard',      reason: REASON.GIT_HISTORY_REWRITE,   policy: 'reconsider' },
  { id: 'git-clean-force',     re: /\bgit\s+clean\s+-[a-z]*[fd]/,                                              label: 'git clean -fd',         reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'git-branch-delete',   re: /\bgit\s+branch\s+-D\b/,                                                    label: 'git branch -D',         reason: REASON.GIT_HISTORY_REWRITE,   policy: 'reconsider' },
  { id: 'aws-s3-rm-recursive', re: /\baws\s+s3\s+rm\b.*--recursive\b/,                                         label: 'aws s3 rm --recursive', reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'kubectl-delete-prod', re: /\bkubectl\s+delete\b.*--all\b/,                                            label: 'kubectl mass delete',   reason: REASON.INFRA_OPERATION,       policy: 'reconsider' },
  { id: 'dropdb',              re: /\b(?:dropdb\b|psql\b[^"']*\bdrop\s+(?:table|database|schema)\b)/i,         label: 'DB drop CLI',           reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'mkfs',                re: /\bmkfs(?:\.\w+)?\b/,                                                       label: 'filesystem format',     reason: REASON.DEVICE_OPERATION,      policy: 'reconsider' },
  { id: 'dd-of-dev',           re: /\bdd\b.*\bof=\/dev\//,                                                     label: 'dd to device',          reason: REASON.DEVICE_OPERATION,      policy: 'reconsider' },
  { id: 'chmod-777-recursive', re: /\bchmod\s+-R\s+0?777\b/,                                                   label: 'chmod -R 777',          reason: REASON.PERMISSION_CHANGE,     policy: 'reconsider' },
  { id: 'curl-pipe-shell',     re: /\bcurl\s.*\s\|\s*(?:sh|bash)\b/,                                           label: 'curl | sh',             reason: REASON.REMOTE_CODE_EXECUTION, policy: 'reconsider' },
] as const;

// Irreversible key/credential files. These are NOT about secrecy (Rosetta does not
// police what the user keeps in their own files) — they are flagged purely because an
// AI overwriting one of these clobbers a file that cannot be recovered (a private key,
// a credential store), the same data-loss class as `rm -rf` or `git reset --hard`.
// Hence policy 'advise': a non-blocking heads-up, never a block. Normal working files
// like `.env` are intentionally NOT listed — writing them is ordinary development.
export const DANGEROUS_PATHS: readonly DangerPattern[] = [
  { id: 'ssh-private-key',  re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/,                        label: 'SSH private key',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'aws-credentials',  re: /\/\.aws\/(?:credentials|config)/,                                label: 'AWS credentials',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'gcp-credentials',  re: /(?:application_default_credentials\.json|\/\.config\/gcloud\/)/, label: 'GCP credentials',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'kube-config',      re: /\/\.kube\/config$/,                                              label: 'kubeconfig',       reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'netrc',            re: /^[._]netrc$/,                                                    label: 'netrc',            reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'pgpass',           re: /^\.pgpass$/,                                                     label: 'Postgres .pgpass', reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'gpg-private',      re: /\/\.gnupg\/(?:.*\.key|private-keys-v1\.d\/)/,                    label: 'GPG private key',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
] as const;

export const DANGEROUS_CONTENT: readonly DangerPattern[] = [
  { id: 'content-sql-drop-table',      re: SQL_DROP_RE,              label: 'DROP in payload',                 reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
  { id: 'content-sql-truncate',        re: SQL_TRUNCATE_RE,          label: 'TRUNCATE in payload',             reason: REASON.DATA_MANIPULATION,   policy: 'reconsider' },
  { id: 'content-sql-delete-no-where', re: SQL_DELETE_NO_WHERE_RE,   label: 'DELETE without WHERE in payload', reason: REASON.DATA_MANIPULATION,   policy: 'reconsider' },
  { id: 'content-sql-update-no-where', re: SQL_UPDATE_NO_WHERE_RE,   label: 'UPDATE without WHERE in payload', reason: REASON.DATA_MANIPULATION,   policy: 'reconsider' },
  { id: 'content-sql-drop-index-view', re: SQL_DROP_INDEX_VIEW_RE,   label: 'DROP INDEX/VIEW in payload',      reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
  { id: 'content-sql-alter-drop-col',  re: SQL_ALTER_DROP_COLUMN_RE, label: 'ALTER DROP COLUMN in payload',    reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
] as const;

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
//
// SCALING NOTE — this family is the INVERSE of the suffix-window case used by the
// matchers further down. The WHERE guard is a NEGATIVE (not-exists) lookahead, so it
// is ANTI-monotone: a later candidate in the same statement sees a strict SUFFIX of
// the earlier one's window, and "no WHERE in a suffix" is IMPLIED by "no WHERE in the
// whole window" — never the other way round. The BEST candidate is therefore the LAST
// one in the statement, not the first, and anchoring to the first candidate (the shape
// that is correct for every other matcher here) would be a FALSE NEGATIVE bug.
//
// So instead of a segment prefix, a candidate is discarded when another candidate
// follows it inside the same statement: `(?![^;]*?<keyword>)`. That check is
// self-limiting — it stops at the NEXT candidate rather than scanning to the end of
// the statement — so the overlapping-rescan cost disappears while the surviving
// candidate is exactly the last one, which is the one with the widest WHERE window.
// The lazy `*?` is language-identical to a greedy `*` here (both are existence checks)
// and is used only so the scan stops at the first hit instead of backtracking from the
// end of the statement.
//
// FAILURE MODE if this is ever changed: bounding the WHERE lookahead (to a line, or to
// a fixed distance) makes the not-exists guard succeed too often and produces FALSE
// POSITIVES; dropping the "no later candidate" guard restores the quadratic rescan;
// replacing it with a first-candidate prefix produces FALSE NEGATIVES.
// `;` is the ONLY boundary here — `[^;]*` crosses CR/LF deliberately.
const SQL_DELETE_FROM_KEYWORD = String.raw`\bdelete\s+from\b`;
const SQL_DELETE_NO_WHERE_RE   = new RegExp(
  SQL_DELETE_FROM_KEYWORD +
  String.raw`(?![^;]*?${SQL_DELETE_FROM_KEYWORD})(?![^;]*\bwhere\b)`, 'i');
// Same anti-monotone / last-candidate treatment as SQL_DELETE_NO_WHERE_RE above.
// One extra subtlety: this keyword's table operand is `\S+`, which CAN swallow a `;`
// (`UPDATE a;b SET …`). The "no later candidate" guard therefore uses a `;`-free
// variant of the keyword (`[^;\s]+`), so the candidate it hands off to is guaranteed to
// end inside the SAME statement. Using plain `\S+` there would let the guard discard a
// candidate in favour of one whose WHERE window starts past the `;` — a FALSE NEGATIVE
// (`update a set x update b;c set y where z` is the witness: the straddling candidate's
// own WHERE window starts after the `;`, so the guard would hand off to a candidate that
// cannot vouch for the first one's statement).
const SQL_UPDATE_SET_KEYWORD          = String.raw`\bupdate\s+\S+\s+set\b`;
const SQL_UPDATE_SET_KEYWORD_IN_STMT  = String.raw`\bupdate\s+[^;\s]+\s+set\b`;
const SQL_UPDATE_NO_WHERE_RE   = new RegExp(
  SQL_UPDATE_SET_KEYWORD +
  String.raw`(?![^;]*?${SQL_UPDATE_SET_KEYWORD_IN_STMT})(?![^;]*\bwhere\b)`, 'i');
const SQL_DROP_INDEX_VIEW_RE   = /\bdrop\s+(?:index|view)\b/i;
// ALTER … DROP COLUMN within one statement; `[^;]*` keeps the DROP bound to its
// own ALTER TABLE (so an ADD COLUMN in the same statement is not mis-flagged).
//
// Start candidate discovery at a statement boundary and stop the prefix at the FIRST
// `ALTER TABLE` in that statement. `;` is the ONLY boundary here — `[^;]*` crosses
// CR/LF deliberately, so line breaks must NOT be added to the class. The DROP COLUMN
// search is an unbounded existential scan to the next `;`, so every later ALTER TABLE
// in the same statement sees a strict SUFFIX of the first one's window: whatever a
// later candidate can see, the first candidate can see too.
// FAILURE MODE if this is ever changed: bounding that scan (to a line, or to a fixed
// distance) breaks the suffix relation and turns this into FALSE NEGATIVES for a DROP
// COLUMN that sits far from its ALTER TABLE.
const SQL_ALTER_TABLE_KEYWORD  = String.raw`\balter\s+table\b`;
const SQL_ALTER_TABLE_STATEMENT =
  String.raw`(?:^|;)(?:(?!${SQL_ALTER_TABLE_KEYWORD})[^;])*${SQL_ALTER_TABLE_KEYWORD}`;
const SQL_ALTER_DROP_COLUMN_RE = new RegExp(
  SQL_ALTER_TABLE_STATEMENT + String.raw`[^;]*\bdrop\s+column\b`, 'i');

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
// Both flag lookaheads and both target scans above use unbounded `.`-windows that run
// to the end of the line, so every later `rm` on the same line sees a strict SUFFIX of
// the first one's window — see `firstOnLine` below for the invariant and its failure
// mode. `rm` is a single token, so no gap can straddle a line break and no cross-line
// alternative is needed. NOTE: `;`, `&&` and `|` are NOT boundaries for these windows
// and never were — `rm -r a; -f b` matches today and must keep matching.

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

// SCALING — `git push` needs a DIFFERENT treatment from every other matcher here, and
// the difference is worth spelling out because the obvious fix is wrong.
//
// 1. There is NO segment boundary. Both lookaheads are built out of `\s`, which matches
//    CR and LF, and neither is bounded by `;`, `&&` or `|`. The window of a candidate is
//    therefore the WHOLE REST OF THE INPUT — `git push a; echo --force` matches today
//    and must keep matching. That also means there is no cross-line case to carve out:
//    a line break is just another `\s`, so `^` (this RegExp has no `m` flag) is the only
//    segment start there is.
//
// 2. The two lookaheads do NOT share a monotonicity property, so they cannot share one
//    prefix.
//    * The FLAG lookahead is a plain existential — "some later whitespace-delimited
//      token starts with -f / --force" — so a later candidate's window is a strict
//      SUFFIX of an earlier candidate's window and the FIRST candidate sees everything.
//      The one precondition is that the candidate is followed by whitespace: both
//      lookaheads open with `\s+`, so a candidate that is not (e.g. `git push;…`) can
//      never match and must be skipped rather than anchored to — otherwise
//      `git push;git push --force` becomes a FALSE NEGATIVE.
//    * The REFSPEC lookahead is NOT existential. It pins the repository operand to the
//      FIRST non-flag token after `git push` and then requires `(?!['"]?\+)` of it. That
//      guard can fail for an early candidate and hold for a later one, so the suffix
//      relation breaks: `git push +foo git push origin +main` matches today, but only at
//      the SECOND candidate. Anchoring both branches to one shared first candidate
//      silently drops it.
//
// So each branch gets its own prefix, each anchored to the first candidate that its own
// branch could possibly satisfy. Among refspec-viable candidates the lookahead IS
// monotone again — the repository operand of an earlier viable candidate sits at or
// before that of a later one, and the `+`-refspec witness lies after both — so the first
// viable candidate is sufficient.
//
// FAILURE MODE if this is ever changed: merging the two prefixes, dropping `(?=\s)` from
// the flag head, dropping the `(?!['"]?\+)` guard from the refspec head, or bounding
// either lookahead to a scan distance or a shell separator all produce FALSE NEGATIVES.
// Each of those four is pinned by a test below.
const GIT_PUSH_FLAG_HEAD    = String.raw`${GIT_PUSH}(?=\s)`;
const GIT_PUSH_REFSPEC_HEAD = String.raw`${GIT_PUSH}(?=(?:\s+-\S+)*\s+(?!-)(?!['"]?\+)\S)`;
const firstInInput = (head: string): string =>
  String.raw`^(?:(?!${head})[\s\S])*${head}`;

// `git branch` force-delete detection. `-D` is shorthand for `--delete --force`.
// Git also accepts delete + force as separate short/long flags, in either order,
// and as combined short flags (`-df` / `-fd`). Keep the delete and force checks
// independent so ordinary `-d` / `--delete` remains outside this guardrail.
// Lookaheads stop at common shell command separators so a later command cannot
// accidentally supply the missing force/delete flag for an earlier branch command.
// Start local-command matching at a segment boundary and stop the prefix at its
// first `git branch`. Both lookaheads below scan unbounded to the segment end, so
// every later candidate's window is a suffix of the first candidate's window:
// any delete/force pair visible later is visible from the first candidate too.
// Bounding either lookahead would invalidate this optimization and risk false
// negatives.
const GIT_BRANCH_LOCAL = String.raw`\bgit[^\S\r\n]+branch\b`;
const GIT_BRANCH_SEGMENT_PREFIX = String.raw`(?:^|[;&|\r\n])(?:(?!${GIT_BRANCH_LOCAL})[^;&|\r\n])*`;
// CR/LF must remain segment boundaries. This RegExp has no `m` flag, so `^` only
// matches the input start; without explicit line separators the prefix cannot
// begin after a line boundary.
// Preserve the prior `\s+` behavior when `git` and `branch` straddle CR/LF. Such
// candidates necessarily cross a separator, so their lookahead windows stay bounded.
const GIT_BRANCH_CROSS_LINE = String.raw`\bgit[^\S\r\n]*[\r\n]\s*branch\b`;
const GIT_BRANCH = String.raw`(?:${GIT_BRANCH_SEGMENT_PREFIX}${GIT_BRANCH_LOCAL}|${GIT_BRANCH_CROSS_LINE})`;
const GIT_BRANCH_DELETE_LA = String.raw`(?=[^;&|\r\n]*(?:\s--delete\b|\s-[a-zA-Z]*[dD][a-zA-Z]*\b))`;
const GIT_BRANCH_FORCE_LA = String.raw`(?=[^;&|\r\n]*(?:\s--force\b|\s-[a-zA-Z]*[fD][a-zA-Z]*\b))`;

// ---------------------------------------------------------------------------
// Segment anchoring for `.`-window matchers.
//
// JS `.` (no `s` flag) matches every character EXCEPT these four, so any `.`-based
// scan or lookahead window ends exactly at the next one of them. They are therefore
// the ONLY segment boundaries for the matchers below. `;`, `&&` and `|` are
// deliberately NOT boundaries here: the pre-existing matchers never treated them as
// such, and narrowing the window to shell command separators would be a policy
// change (new false negatives), not the matcher-shape change intended here.
// U+2028/U+2029 must stay in the class: omitting them lets the prefix run past a
// boundary that `.` cannot cross, which reintroduces false negatives.
const LINE_BREAK_CLASS = String.raw`\r\n\u2028\u2029`;
const LINE_START       = String.raw`(?:^|[${LINE_BREAK_CLASS}])`;
// Whitespace that is NOT a line break — used to keep a multi-token keyword line-local.
const INLINE_SPACE     = String.raw`[^\S${LINE_BREAK_CLASS}]`;

/**
 * Start candidate discovery at a line boundary and stop the prefix at the FIRST
 * line-local occurrence of `keyword` on that line.
 *
 * INVARIANT (why this is sound): every predicate applied after the keyword is an
 * EXISTENTIAL check over an UNBOUNDED `.`-window that runs to the end of the line.
 * A later candidate on the same line therefore sees a window that is a strict SUFFIX
 * of the first candidate's window, so anything a later candidate can see the first
 * candidate can see too. Trying only the first candidate per line loses nothing.
 *
 * FAILURE MODE if this is ever changed: bounding any of those lookaheads to a fixed
 * scan distance (or to `;`/`&&`/`|`) destroys the suffix-window relation and turns
 * this optimization into FALSE NEGATIVES — a qualifying flag that sits far from the
 * keyword, or past a `;`, would stop being seen. Keep the windows unbounded.
 */
const firstOnLine = (keyword: string): string =>
  String.raw`${LINE_START}(?:(?!${keyword}).)*${keyword}`;

// `aws s3 rm --recursive`. `--recursive` is found by an unbounded `.`-window, so the
// suffix-window invariant above applies to the two `aws`/`s3`/`rm` gaps.
// CR/LF/U+2028/U+2029 must remain segment boundaries: this RegExp has no `m` flag, so
// `^` only matches the input start; without the explicit line-separator class the
// prefix could not begin after a line boundary.
const AWS_S3_RM_LOCAL = String.raw`\baws${INLINE_SPACE}+s3${INLINE_SPACE}+rm\b`;
// Preserve the prior `\s+` behavior when a gap straddles a line break (either gap).
// Such candidates necessarily cross a boundary, so their windows stay bounded and
// cannot recreate the overlapping rescan.
const AWS_S3_RM_CROSS_LINE = String.raw`(?:\baws${INLINE_SPACE}*[${LINE_BREAK_CLASS}]\s*s3\s+rm\b|\baws${INLINE_SPACE}+s3${INLINE_SPACE}*[${LINE_BREAK_CLASS}]\s*rm\b)`;
const AWS_S3_RM = String.raw`(?:${firstOnLine(AWS_S3_RM_LOCAL)}|${AWS_S3_RM_CROSS_LINE})`;

// `kubectl delete --all`. `--all` is found by an unbounded `.`-window; same
// suffix-window invariant and same cross-line carve-out as AWS_S3_RM above.
const KUBECTL_DELETE_LOCAL = String.raw`\bkubectl${INLINE_SPACE}+delete\b`;
const KUBECTL_DELETE_CROSS_LINE = String.raw`\bkubectl${INLINE_SPACE}*[${LINE_BREAK_CLASS}]\s*delete\b`;
const KUBECTL_DELETE = String.raw`(?:${firstOnLine(KUBECTL_DELETE_LOCAL)}|${KUBECTL_DELETE_CROSS_LINE})`;

// `dd of=/dev/…`. `of=/dev/` is found by an unbounded `.`-window; same suffix-window
// invariant as above. `dd` is a single token with no internal whitespace, so — unlike
// `aws s3 rm` or `kubectl delete` — there is no gap that could straddle a line break
// and therefore no cross-line alternative to preserve.
const DD_LOCAL = String.raw`\bdd\b`;
const DD = firstOnLine(DD_LOCAL);

// `curl … | sh`. The pipe-to-shell tail is found by an unbounded `.`-window, so the
// same suffix-window invariant applies. The single `\s` that the original required
// right after `curl` is split into its line-local half (which keeps the candidate on
// one line) and its line-break half (the cross-line alternative); the two halves are
// disjoint and their union is exactly `\s`, so the accepted keyword set is unchanged.
const CURL_LOCAL = String.raw`\bcurl${INLINE_SPACE}`;
const CURL_CROSS_LINE = String.raw`\bcurl[${LINE_BREAK_CLASS}]`;
const CURL = String.raw`(?:${firstOnLine(CURL_LOCAL)}|${CURL_CROSS_LINE})`;

const RM = firstOnLine(String.raw`\brm\b`);

// `psql … DROP TABLE`. Unlike the matchers above, this window is bounded by a QUOTE
// (`"` or `'`), not by a line break — `[^"']*` happily crosses CR/LF — so the segment
// here is the quote-free run, and quotes are its only boundaries. `psql` is a single
// token, so there is no gap to straddle and no cross-line alternative is needed.
// Same suffix-window invariant: the DROP search is an unbounded existential scan to
// the next quote, so a later `psql` in the same quote-free run sees a strict suffix of
// the first one's window. Bounding that scan (e.g. to a line) would produce FALSE
// NEGATIVES for a DROP that sits far from the `psql` token.
const PSQL_SEGMENT = String.raw`(?:^|["'])(?:(?!\bpsql\b)[^"'])*\bpsql\b`;

export const DANGEROUS_BASH: readonly DangerPattern[] = [
  { id: 'rm-rf-root',          re: new RegExp(RM + RM_RF_GUARD + RM_ROOT_TARGET),                              label: 'rm -rf /',              reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'rm-rf-home',          re: new RegExp(RM + RM_RF_GUARD + RM_HOME_TARGET),                              label: 'rm -rf $HOME',          reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'rm-rf-recursive',     re: new RegExp(RM + RM_RF_GUARD),                                               label: 'rm -rf (generic)',      reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'sql-drop-table',      re: SQL_DROP_RE,                                                                label: 'DDL DROP',              reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'sql-truncate',        re: SQL_TRUNCATE_RE,                                                            label: 'TRUNCATE TABLE',        reason: REASON.DATA_MANIPULATION,     policy: 'reconsider' },
  { id: 'sql-delete-no-where', re: SQL_DELETE_NO_WHERE_RE,                                                     label: 'DELETE without WHERE',  reason: REASON.DATA_MANIPULATION,     policy: 'reconsider' },
  { id: 'sql-update-no-where', re: SQL_UPDATE_NO_WHERE_RE,                                                     label: 'UPDATE without WHERE',  reason: REASON.DATA_MANIPULATION,     policy: 'reconsider' },
  { id: 'sql-drop-index-view', re: SQL_DROP_INDEX_VIEW_RE,                                                     label: 'DROP INDEX/VIEW',       reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'sql-alter-drop-col',  re: SQL_ALTER_DROP_COLUMN_RE,                                                   label: 'ALTER DROP COLUMN',     reason: REASON.SCHEMA_MODIFICATION,   policy: 'reconsider' },
  { id: 'git-force-push',      re: new RegExp(
      `${firstInInput(GIT_PUSH_FLAG_HEAD)}${GIT_FORCE_FLAG_LA}` +
      `|${firstInInput(GIT_PUSH_REFSPEC_HEAD)}${GIT_FORCE_REFSPEC_LA}`),               label: 'git push --force',      reason: REASON.GIT_HISTORY_REWRITE,   policy: 'reconsider' },
  { id: 'git-reset-hard',      re: /\bgit\s+reset\s+--hard\b/,                                                 label: 'git reset --hard',      reason: REASON.GIT_HISTORY_REWRITE,   policy: 'reconsider' },
  { id: 'git-clean-force',     re: /\bgit\s+clean\s+-[a-z]*[fd]/,                                              label: 'git clean -fd',         reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'git-branch-delete',   re: new RegExp(GIT_BRANCH + GIT_BRANCH_DELETE_LA + GIT_BRANCH_FORCE_LA),         label: 'git branch -D',         reason: REASON.GIT_HISTORY_REWRITE,   policy: 'reconsider' },
  { id: 'aws-s3-rm-recursive', re: new RegExp(AWS_S3_RM + String.raw`.*--recursive\b`),                        label: 'aws s3 rm --recursive', reason: REASON.FILE_DELETION,         policy: 'reconsider' },
  { id: 'kubectl-delete-prod', re: new RegExp(KUBECTL_DELETE + String.raw`.*--all\b`),                          label: 'kubectl mass delete',   reason: REASON.INFRA_OPERATION,       policy: 'reconsider' },
  { id: 'dropdb',              re: new RegExp(String.raw`(?:\bdropdb\b|${PSQL_SEGMENT}[^"']*\bdrop\s+(?:table|database|schema)\b)`, 'i'), label: 'DB drop CLI', reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
  { id: 'mkfs',                re: /\bmkfs(?:\.\w+)?\b/,                                                       label: 'filesystem format',     reason: REASON.DEVICE_OPERATION,      policy: 'reconsider' },
  { id: 'dd-of-dev',           re: new RegExp(DD + String.raw`.*\bof=\/dev\/`),                                label: 'dd to device',          reason: REASON.DEVICE_OPERATION,      policy: 'reconsider' },
  { id: 'chmod-777-recursive', re: /\bchmod\s+-R\s+0?777\b/,                                                   label: 'chmod -R 777',          reason: REASON.PERMISSION_CHANGE,     policy: 'reconsider' },
  { id: 'curl-pipe-shell',     re: new RegExp(CURL + String.raw`.*\s\|\s*(?:sh|bash)\b`),                      label: 'curl | sh',             reason: REASON.REMOTE_CODE_EXECUTION, policy: 'reconsider' },
] as const;

// Irreversible key/credential files. These are NOT about secrecy (Rosetta does not
// police what the user keeps in their own files) — they are flagged purely because an
// AI overwriting one of these clobbers a file that cannot be recovered (a private key,
// a credential store), the same data-loss class as `rm -rf` or `git reset --hard`.
// Hence policy 'advise': a non-blocking heads-up, never a block. Normal working files
// like `.env` are intentionally NOT listed — writing them is ordinary development.
// `~/.gnupg/*.key`. The `.key` search is an unbounded `.`-window, so this entry has
// the same suffix-window invariant as the command matchers above: a later `/.gnupg/`
// on the same line sees a strict suffix of the first one's window. Discovery is
// anchored to the first `/.gnupg/` per line; the literal `private-keys-v1.d/`
// alternative needs no anchoring. `/.gnupg/` has no internal whitespace, so no gap can
// straddle a line break and no cross-line alternative is needed.
// FAILURE MODE if this is ever changed: bounding the `.key` scan produces FALSE
// NEGATIVES for a key file nested deeper under `.gnupg/`.
const GNUPG_DIR = String.raw`\/\.gnupg\/`;
const GPG_PRIVATE_RE = new RegExp(
  String.raw`(?:${firstOnLine(GNUPG_DIR)}.*\.key|${GNUPG_DIR}private-keys-v1\.d\/)`);

export const DANGEROUS_PATHS: readonly DangerPattern[] = [
  { id: 'ssh-private-key',  re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/,                        label: 'SSH private key',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'aws-credentials',  re: /\/\.aws\/(?:credentials|config)/,                                label: 'AWS credentials',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'gcp-credentials',  re: /(?:application_default_credentials\.json|\/\.config\/gcloud\/)/, label: 'GCP credentials',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'kube-config',      re: /\/\.kube\/config$/,                                              label: 'kubeconfig',       reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'netrc',            re: /^[._]netrc$/,                                                    label: 'netrc',            reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'pgpass',           re: /^\.pgpass$/,                                                     label: 'Postgres .pgpass', reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
  { id: 'gpg-private',      re: GPG_PRIVATE_RE,                                                   label: 'GPG private key',  reason: REASON.CREDENTIAL_OVERWRITE, policy: 'advise' },
] as const;

export const DANGEROUS_CONTENT: readonly DangerPattern[] = [
  { id: 'content-sql-drop-table',      re: SQL_DROP_RE,              label: 'DROP in payload',                 reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
  { id: 'content-sql-truncate',        re: SQL_TRUNCATE_RE,          label: 'TRUNCATE in payload',             reason: REASON.DATA_MANIPULATION,   policy: 'reconsider' },
  { id: 'content-sql-delete-no-where', re: SQL_DELETE_NO_WHERE_RE,   label: 'DELETE without WHERE in payload', reason: REASON.DATA_MANIPULATION,   policy: 'reconsider' },
  { id: 'content-sql-update-no-where', re: SQL_UPDATE_NO_WHERE_RE,   label: 'UPDATE without WHERE in payload', reason: REASON.DATA_MANIPULATION,   policy: 'reconsider' },
  { id: 'content-sql-drop-index-view', re: SQL_DROP_INDEX_VIEW_RE,   label: 'DROP INDEX/VIEW in payload',      reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
  { id: 'content-sql-alter-drop-col',  re: SQL_ALTER_DROP_COLUMN_RE, label: 'ALTER DROP COLUMN in payload',    reason: REASON.SCHEMA_MODIFICATION, policy: 'reconsider' },
] as const;

// # Rosetta-AI-reviewed: pattern definitions only — not executable SQL/shell
export interface DangerPattern {
  id: string;
  re: RegExp;
  label: string;
  reason: string;
  policy: 'hard-deny' | 'reconsider';
}

const SQL_DROP_RE     = /\bdrop\s+(?:table|database|schema)\b/i;
const SQL_TRUNCATE_RE = /\btruncate\s+(?:table\s+)?\w+/i;

export const DANGEROUS_BASH: readonly DangerPattern[] = [
  { id: 'rm-rf-root',          re: /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b.*\s\/(?:\*|\s|$)/, label: 'rm -rf /',             reason: 'Recursive forced removal of root filesystem — unrecoverable data loss.',         policy: 'hard-deny'  },
  { id: 'rm-rf-home',          re: /\brm\s+-[rf]+\b.*(?:\s~\b|\s\$HOME\b)/,                                       label: 'rm -rf $HOME',          reason: 'Recursive forced removal of home directory — deletes all user files.',          policy: 'hard-deny'  },
  { id: 'rm-rf-recursive',     re: /\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\b/,                     label: 'rm -rf (generic)',       reason: 'Recursive forced file removal — verify target path before proceeding.',         policy: 'reconsider' },
  { id: 'sql-drop-table',      re: SQL_DROP_RE,                                                                    label: 'DDL DROP',              reason: 'Destructive DDL statement that permanently removes a table or database.',       policy: 'reconsider' },
  { id: 'sql-truncate',        re: SQL_TRUNCATE_RE,                                                                label: 'TRUNCATE TABLE',        reason: 'Truncates all rows from a table — non-transactional in some databases.',        policy: 'reconsider' },
  { id: 'git-force-push',      re: /\bgit\s+push\b(?=(?:\s+\S+)*\s+(?:-f\b|--force(?!-with-lease)))/,            label: 'git push --force',      reason: 'Force-push rewrites remote history and may discard teammates\' commits.',       policy: 'reconsider' },
  { id: 'git-reset-hard',      re: /\bgit\s+reset\s+--hard\b/,                                                   label: 'git reset --hard',      reason: 'Hard reset discards all uncommitted changes and cannot be undone.',             policy: 'reconsider' },
  { id: 'git-clean-force',     re: /\bgit\s+clean\s+-[a-z]*[fd]/,                                                label: 'git clean -fd',         reason: 'Permanently removes untracked files and directories from the working tree.',    policy: 'reconsider' },
  { id: 'git-branch-delete',   re: /\bgit\s+branch\s+-D\b/,                                                      label: 'git branch -D',         reason: 'Force-deletes a local branch including unmerged commits.',                     policy: 'reconsider' },
  { id: 'aws-s3-rm-recursive', re: /\baws\s+s3\s+rm\b.*--recursive\b/,                                          label: 'aws s3 rm --recursive', reason: 'Recursively deletes objects from S3 — irreversible without versioning.',        policy: 'reconsider' },
  { id: 'kubectl-delete-prod', re: /\bkubectl\s+delete\b.*--all\b/,                                              label: 'kubectl mass delete',   reason: 'Deletes all resources of a type — may affect running production workloads.',   policy: 'reconsider' },
  { id: 'dropdb',              re: /\b(?:dropdb\b|psql\b[^"']*\bdrop\s+(?:table|database|schema)\b)/i,           label: 'DB drop CLI',           reason: 'CLI command that permanently removes a PostgreSQL database or table.',         policy: 'reconsider' },
  { id: 'mkfs',                re: /\bmkfs(?:\.\w+)?\b/,                                                         label: 'filesystem format',     reason: 'Formats a block device, destroying all data on it — unrecoverable.',           policy: 'hard-deny'  },
  { id: 'dd-of-dev',           re: /\bdd\b.*\bof=\/dev\//,                                                       label: 'dd to device',          reason: 'Writes raw bytes directly to a block device — can corrupt OS or data.',        policy: 'hard-deny'  },
  { id: 'chmod-777-recursive', re: /\bchmod\s+-R\s+0?777\b/,                                                     label: 'chmod -R 777',          reason: 'Makes all files world-writable — severe security risk in shared environments.', policy: 'hard-deny'  },
  { id: 'curl-pipe-shell',     re: /\bcurl\s.*\s\|\s*(?:sh|bash)\b/,                                            label: 'curl | sh',             reason: 'Executes arbitrary remote code without inspection — supply-chain risk.',        policy: 'hard-deny'  },
] as const;

export const DANGEROUS_PATHS: readonly DangerPattern[] = [
  { id: 'secret-env',       re: /^\.env(?:\..+)?$/,                                               label: '.env* file',       reason: 'Contains application secrets and credentials — never overwrite blindly.',         policy: 'hard-deny'  },
  { id: 'ssh-private-key',  re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/,                        label: 'SSH private key',  reason: 'Writing to an SSH private key path would replace your authentication key.',       policy: 'hard-deny'  },
  { id: 'aws-credentials',  re: /\/\.aws\/(?:credentials|config)/,                                label: 'AWS credentials',  reason: 'Overwrites AWS access credentials — could lock out cloud access.',                policy: 'hard-deny'  },
  { id: 'gcp-credentials',  re: /(?:application_default_credentials\.json|\/\.config\/gcloud\/)/, label: 'GCP credentials',  reason: 'Overwrites GCP application credentials used for cloud API access.',                policy: 'hard-deny'  },
  { id: 'kube-config',      re: /\/\.kube\/config$/,                                              label: 'kubeconfig',       reason: 'Overwrites Kubernetes config — could disrupt cluster access for all contexts.',    policy: 'hard-deny'  },
  { id: 'netrc',            re: /^[._]netrc$/,                                                    label: 'netrc',            reason: 'Contains plaintext credentials for network services (git, ftp, curl).',           policy: 'hard-deny'  },
  { id: 'pgpass',           re: /^\.pgpass$/,                                                     label: 'Postgres password', reason: 'Contains PostgreSQL connection passwords in plaintext.',                         policy: 'hard-deny'  },
  { id: 'gpg-private',      re: /\/\.gnupg\/(?:.*\.key|private-keys-v1\.d\/)/,                   label: 'GPG private key',  reason: 'Writing to GPG private key storage could destroy cryptographic identity.',        policy: 'hard-deny'  },
] as const;

export const DANGEROUS_CONTENT: readonly DangerPattern[] = [
  { id: 'content-sql-drop-table', re: SQL_DROP_RE,     label: 'DROP in payload',   reason: 'Payload contains a destructive DDL statement that removes a table or database.',   policy: 'reconsider' },
  { id: 'content-sql-truncate',   re: SQL_TRUNCATE_RE, label: 'TRUNCATE in payload', reason: 'Payload contains a statement that removes all rows from a table.',                policy: 'reconsider' },
  { id: 'inline-aws-key',     re: /\bAKIA[0-9A-Z]{16}\b/,                                          label: 'AWS access key id',  reason: 'Hardcoded AWS access key detected — use environment variables or secrets manager.', policy: 'hard-deny'  },
  { id: 'inline-private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,   label: 'PEM private key',    reason: 'PEM private key embedded in content — store in secrets manager, not in files.',   policy: 'hard-deny'  },
] as const;

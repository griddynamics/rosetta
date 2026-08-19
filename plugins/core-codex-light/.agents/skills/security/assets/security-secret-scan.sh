#!/usr/bin/env bash
set -uo pipefail

if [[ "${1:-}" == "--help" ]]; then
  printf 'Usage: %s [ROOT ...]\n' "${0##*/}" >&2
  exit 0
fi

roots=("$@")
if [[ ${#roots[@]} -eq 0 ]]; then
  roots=(".")
fi

name_pattern='(^|/)(\.env([.][^/]*)?|\.netrc|\.npmrc|\.pypirc|\.dockercfg|\.aws/credentials|\.config/gcloud/application_default_credentials[.]json|\.kube/config|\.docker/config[.]json|credentials|credentials[.]json|service[-_]?account[^/]*[.]json|id_(rsa|dsa|ecdsa|ed25519)|[^/]*[.](pem|key|p12|pfx|jks|keystore)|secrets?[.](ya?ml|json|toml|ini|properties))$'
content_pattern='-----BEGIN ([A-Z0-9]+ )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|A3T[A-Z0-9]{17}|AGPA[A-Z0-9]{16}|AIDA[A-Z0-9]{16}|AROA[A-Z0-9]{16}|ANPA[A-Z0-9]{16}|ANVA[A-Z0-9]{16}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk_(live|test)_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|sk-(proj-|svcacct-)?[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|hf_[A-Za-z0-9]{20,}|hvs[.][A-Za-z0-9_-]{20,}|hvb[.][A-Za-z0-9_-]{20,}|atlasv1[.][A-Za-z0-9_-]{20,}|dop_v1_[A-Fa-f0-9]{32,}|ddapi_[A-Za-z0-9_-]{20,}|SK[0-9a-fA-F]{32}|key-[A-Za-z0-9]{32}|SG[.][A-Za-z0-9_-]{16,}[.][A-Za-z0-9_-]{16,}|npm_[A-Za-z0-9]{20,}|pypi-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|ya29[.][0-9A-Za-z_-]+|eyJ[A-Za-z0-9_-]{10,}[.]eyJ[A-Za-z0-9_-]{10,}[.][A-Za-z0-9_-]{10,}|(Bearer|Basic)[[:space:]]+[A-Za-z0-9+/._=-]{12,}|(api[_-]?key|secret|password|passwd|pwd|token|client[_-]?secret|private[_-]?key|signing[_-]?key)[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9+/._:@=-]{8,}|(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqps?|mssql|sqlserver)://[^[:space:]/:@]+:[^[:space:]@]+@|AccountKey=[A-Za-z0-9+/=]{20,}|SharedAccessKey=[A-Za-z0-9+/=]{20,}|\"(private_key|client_secret)\"[[:space:]]*:[[:space:]]*\"[^"]{8,}\"|\"auth\"[[:space:]]*:[[:space:]]*\"[A-Za-z0-9+/=]{12,}\"|kind:[[:space:]]*Secret([[:space:]]|$)|stringData:[[:space:]]*($|[{])'

scan_file() {
  local file="$1"
  local relative="${file#./}"
  local candidate=0

  if [[ "$relative" =~ $name_pattern ]]; then
    candidate=1
  elif LC_ALL=C grep -I -E -q -- "$content_pattern" "$file" 2>/dev/null; then
    candidate=1
  fi

  if [[ $candidate -eq 1 ]]; then
    printf '%s\n' "$relative"
  fi
}

for root in "${roots[@]}"; do
  if [[ ! -e "$root" ]]; then
    printf 'Unreadable scan root: %s\n' "$root" >&2
    exit 2
  fi

  if ! find "$root" \
    \( -type d \( -name .git -o -name .hg -o -name .svn \) -prune \) -o \
    \( -type f -print0 \) |
    while IFS= read -r -d '' file; do
      scan_file "$file"
    done
  then
    printf 'Scan traversal failed: %s\n' "$root" >&2
    exit 2
  fi
done

#!/usr/bin/env bash
# Saleor benchmark helper: set up Saleor locally, and reset code + database before a run.
#
# Usage:
#   bench.sh setup            # once: fetch pinned repos, strip Saleor AI files, add baseline rules,
#                             #       tag baseline-v1, build + start backend, migrate, seed, save seed.dump
#   bench.sh reset <TAG>      # before every run: checkout <TAG> in all 3 repos, clean, clean the workspace root,
#                             #       restore DB from seed.dump
#   bench.sh from-zips        # Rosetta runs: replace the 3 repos and the workspace-root files with test-library/saleor-initialized-repos.zip
#                             #       and saleor-initialized-root.zip (files only; then run setup, start, health)
#   bench.sh from-zips not-initialized  # all other methods: the same with test-library/saleor-not-initialized-repos.zip (repos at baseline-v1,
#                             #       no Rosetta; no root zip), instead of cloning in setup
#   bench.sh start            # start backend API + storefront (:3000) + dashboard (:9000) in the background
#   bench.sh stop             # stop storefront, dashboard and the backend containers
#   bench.sh health           # check API, storefront, dashboard
#
# Settings (environment variables):
#   BENCH_DIR   where the Saleor repos live (default: $HOME/saleor-benchmark)

set -euo pipefail

BENCH_DIR="${BENCH_DIR:-$HOME/saleor-benchmark}"
BENCH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # rosetta-benchmarks/saleor
BASELINE_FILE="$BENCH_ROOT/baseline-instructions.md"
SEED_DUMP="$BENCH_DIR/seed.dump"
SHARED_SEED_NAME="saleor-seed.dump"   # in test-library/: one database for every operator and machine
LOG_DIR="$BENCH_DIR/logs"
PROJECT="saleor-benchmark"
API_CONTAINER="saleor-benchmark-api"
API_URL="http://localhost:8000/graphql/"

REPOS=(saleor saleor-dashboard react-storefront)

# Plain functions instead of associative arrays: macOS ships bash 3.2.
repo_sha() {
	case "$1" in
		saleor) echo 28a1227b9a2db153c22ed6165b0987d0c96f80f8 ;;           # Saleor 3.23.41
		saleor-dashboard) echo bc75e988da0fa4fbc3d47378a888d859d070746f ;; # Dashboard 3.23.39
		react-storefront) echo 05641e1fa8b87a6ba0a403d2d323164872422fa5 ;; # Paper storefront
	esac
}
repo_ai_files() {
	case "$1" in
		saleor) echo "CLAUDE.md AGENTS.md .claude" ;;
		saleor-dashboard) echo "CLAUDE.md AGENTS.md .claude .agents .github/instructions" ;;
		react-storefront) echo "AGENTS.md skills skills-lock.json .cursor .cursorignore" ;;
	esac
}

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

# Compose v2 plugin (`docker compose`), else the standalone `docker-compose` binary.
compose() {
	if docker compose version >/dev/null 2>&1; then
		docker compose -p "$PROJECT" -f "$BENCH_DIR/saleor/.devcontainer/docker-compose.yml" "$@"
	elif command -v docker-compose >/dev/null 2>&1; then
		docker-compose -p "$PROJECT" -f "$BENCH_DIR/saleor/.devcontainer/docker-compose.yml" "$@"
	else
		die "docker compose not found: install the Compose plugin (brew install docker-compose) or Docker Desktop"
	fi
}
manage() { compose exec -T -w /app saleor python manage.py "$@"; }
git_bench() { git -c user.name="saleor-benchmark" -c user.email="saleor-benchmark@localhost" "$@"; }

# Run a command without the caller's environment. Dev tools detect AI agents by env vars
# (CLAUDECODE, CODEX_*, CURSOR_*, ...); Next.js then writes its own AI rules into CLAUDE.md.
clean_env() { env -i HOME="$HOME" PATH="$PATH" USER="${USER:-}" LANG="${LANG:-en_US.UTF-8}" TERM="${TERM:-xterm}" "$@"; }

wait_for_db() {
	for _ in $(seq 1 60); do
		compose exec -T db pg_isready -U saleor >/dev/null 2>&1 && return 0
		sleep 1
	done
	die "database did not become ready"
}

wait_for_api() {
	for _ in $(seq 1 120); do
		curl -sf -H 'Content-Type: application/json' --data '{"query":"{ __typename }"}' "$API_URL" >/dev/null 2>&1 && return 0
		sleep 1
	done
	die "API did not respond at $API_URL"
}

start_api() {
	docker rm -f "$API_CONTAINER" >/dev/null 2>&1 || true
	compose run -d --no-deps --name "$API_CONTAINER" -w /app -p 8000:8000 \
		-e SEND_USAGE_TELEMETRY=False saleor \
		python -m uvicorn saleor.asgi:application --host 0.0.0.0 --port 8000 --reload >/dev/null
	wait_for_api
}

cmd_setup() {
	command -v docker >/dev/null || die "docker not found"
	check_node
	[ -f "$BASELINE_FILE" ] || die "missing $BASELINE_FILE"
	mkdir -p "$BENCH_DIR" "$LOG_DIR"

	for r in "${REPOS[@]}"; do
		if git -C "$BENCH_DIR/$r" rev-parse --verify -q baseline-v1 >/dev/null 2>&1; then
			log "$r: baseline-v1 already exists, skipping"
			continue
		fi
		log "$r: fetching pinned commit $(repo_sha "$r")"
		# Only the pinned commit, no history: fast and doesn't hang on big repos.
		git init -q "$BENCH_DIR/$r"
		git -C "$BENCH_DIR/$r" remote add origin "https://github.com/saleor/$r.git" 2>/dev/null || true
		git -C "$BENCH_DIR/$r" fetch --depth 1 origin "$(repo_sha "$r")"
		git -C "$BENCH_DIR/$r" checkout -q -f --detach FETCH_HEAD

		log "$r: removing Saleor AI files and adding the baseline rules file"
		# shellcheck disable=SC2046
		(cd "$BENCH_DIR/$r" && rm -rf $(repo_ai_files "$r"))
		# Nested agent instruction files anywhere in the tree (e.g. saleor/graphql/CLAUDE.md, src/lib/AGENTS.md)
		git -C "$BENCH_DIR/$r" ls-files -z | grep -z -E '(^|/)(AGENTS|CLAUDE|GEMINI)\.md$|\.mdc$|(^|/)\.github/instructions/' |
			(cd "$BENCH_DIR/$r" && xargs -0 rm -f)
		cp "$BASELINE_FILE" "$BENCH_DIR/$r/CLAUDE.md"
		mkdir -p "$BENCH_DIR/$r/.github"
		cp "$BASELINE_FILE" "$BENCH_DIR/$r/.github/copilot-instructions.md"

		git -C "$BENCH_DIR/$r" add -A
		git_bench -C "$BENCH_DIR/$r" commit --no-verify -q -m "Benchmark baseline: remove upstream AI files, add team rules"
		git -C "$BENCH_DIR/$r" tag baseline-v1
	done

	log "backend: build and start db, cache, mailpit"
	compose build saleor
	compose up -d db cache mailpit saleor
	wait_for_db

	sync_shared_seed
	if [ -f "$SEED_DUMP" ]; then
		log "seed.dump already exists, restoring it instead of seeding again"
		restore_db
	else
		log "backend: migrate and seed"
		manage migrate
		manage populatedb --createsuperuser
		log "saving database snapshot to $SEED_DUMP"
		compose exec -T db pg_dump -U saleor -Fc saleor >"$SEED_DUMP"
	fi

	log "installing storefront and dashboard dependencies"
	install_frontends

	if [ -n "$(git -C "$BENCH_DIR/saleor-dashboard" status --porcelain)" ]; then
		# The commit below takes everything (add -A): never fold a run's leftovers into baseline-v1.
		log "dashboard: uncommitted changes, skipping schema regeneration (run '$0 reset <TAG>' or 'from-zips' first)"
	elif [ "$(git -C "$BENCH_DIR/saleor-dashboard" rev-parse HEAD)" = "$(git -C "$BENCH_DIR/saleor-dashboard" rev-parse baseline-v1)" ]; then
		# The dashboard's committed GraphQL schema is older than the pinned API. Regenerate it once
		# and put it into baseline-v1, so it never shows up in a run's diff.
		log "dashboard: schema and generated types from the local API"
		start_api
		(cd "$BENCH_DIR/saleor-dashboard" && clean_env API_URL="$API_URL" pnpm run fetch-local-schema >/dev/null)
		(cd "$BENCH_DIR/saleor-dashboard" && clean_env pnpm run generate >/dev/null)   # what `predev` runs on every start
		if [ -n "$(git -C "$BENCH_DIR/saleor-dashboard" status --porcelain)" ]; then
			git -C "$BENCH_DIR/saleor-dashboard" add -A
			git_bench -C "$BENCH_DIR/saleor-dashboard" commit --no-verify -q -m "Benchmark baseline: GraphQL schema and generated types from the local API"
			git -C "$BENCH_DIR/saleor-dashboard" tag -f baseline-v1 >/dev/null
		fi
	else
		log "dashboard: HEAD is not baseline-v1 (extracted initialized repo), skipping schema regeneration"
	fi

	log "setup done. Next: '$0 start', then '$0 health'"
}

# Rosetta starting point: delete what is there, extract the two zips from test-library/.
#   repos zip: the entire .git of the 3 repos (init commit); the working files are rebuilt with git reset --hard
#   root zip:  the files Rosetta created in $BENCH_DIR outside the repos
test_library() {
	echo "${TEST_LIBRARY:-$(git -C "$BENCH_ROOT" rev-parse --show-toplevel)/test-library}"
}

# populatedb makes random data, so a dump made on one machine differs from another's.
# Everyone uses the shared test-library dump; an own, different dump is moved to logs/.
sync_shared_seed() {
	local shared
	shared="$(test_library)/$SHARED_SEED_NAME"
	[ -f "$shared" ] || { log "no shared $SHARED_SEED_NAME in test-library, keeping the local seed.dump"; return 0; }
	cmp -s "$shared" "$SEED_DUMP" 2>/dev/null && return 0
	if [ -f "$SEED_DUMP" ]; then
		mkdir -p "$LOG_DIR"
		mv "$SEED_DUMP" "$LOG_DIR/seed.dump.own-$(date +%Y%m%d-%H%M%S)"
		log "seed.dump differs from the shared one: moved it to $LOG_DIR"
	fi
	mkdir -p "$BENCH_DIR"
	cp "$shared" "$SEED_DUMP"
	log "seed.dump = test-library/$SHARED_SEED_NAME"
}

# Dependencies (node_modules, .venv), seed.dump, logs and envs are kept. Files only: run setup, start, health after it.
cmd_from_zips() {
	local tl repos_zip root_zip
	tl="$(test_library)"
	case "${1:-initialized}" in
		initialized) repos_zip="$tl/saleor-initialized-repos.zip"; root_zip="$tl/saleor-initialized-root.zip" ;;
		not-initialized) repos_zip="$tl/saleor-not-initialized-repos.zip"; root_zip="" ;;   # baseline-v1 only, nothing outside the repos
		*) die "usage: $0 from-zips [not-initialized]" ;;
	esac
	[ -f "$repos_zip" ] || die "missing $repos_zip"
	[ -z "$root_zip" ] || [ -f "$root_zip" ] || die "missing $root_zip"

	if [ -f "$BENCH_DIR/saleor/.devcontainer/docker-compose.yml" ]; then
		cmd_stop || true   # nothing may run on the folders that are replaced
	fi
	for r in "${REPOS[@]}"; do
		mkdir -p "$BENCH_DIR/$r"
		log "$r: removing old files (keeping node_modules and .venv)"
		find "$BENCH_DIR/$r" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .venv -exec rm -rf {} +
	done
	clean_workspace_root   # removes everything outside the repos except seed.dump, logs, envs
	sync_shared_seed

	log "extracting $(basename "$repos_zip")${root_zip:+ and $(basename "$root_zip")}"
	unzip -q -o "$repos_zip" -d "$BENCH_DIR"
	[ -z "$root_zip" ] || unzip -q -o "$root_zip" -d "$BENCH_DIR"
	for r in "${REPOS[@]}"; do
		git -C "$BENCH_DIR/$r" reset -q --hard HEAD   # the zip has only .git: rebuild the working files
		echo "$r: $(git -C "$BENCH_DIR/$r" rev-parse --short HEAD) tags: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ') changes: $(git -C "$BENCH_DIR/$r" status --porcelain | wc -l | tr -d ' ')"
	done
	log "from-zips done. Next: '$0 setup', '$0 start', '$0 health'"
}

restore_db() {
	wait_for_db
	compose exec -T db dropdb -U saleor --if-exists --force saleor
	compose exec -T db createdb -U saleor saleor
	compose exec -T db pg_restore -U saleor -d saleor --no-owner <"$SEED_DUMP"
	compose exec -T cache valkey-cli FLUSHALL >/dev/null
}

check_node() {
	command -v node >/dev/null || die "node not found (see BENCHMARKS.md 3.1)"
	case "$(node -v)" in
		v24.*) ;;
		*) die "Node 24 is required, found $(node -v). Run: nvm use 24" ;;
	esac
}

install_frontends() {
	check_node
	(cd "$BENCH_DIR/react-storefront" && corepack enable && pnpm install --frozen-lockfile)
	(cd "$BENCH_DIR/saleor-dashboard" && corepack enable && pnpm install --frozen-lockfile)
}

# The agent runs in $BENCH_DIR, which is not a git repo. Files it writes there
# (CONTEXT.md, docs/, agents/, .github/, ...) must not leak into the next run.
clean_workspace_root() {
	local item name
	for item in "$BENCH_DIR"/* "$BENCH_DIR"/.[!.]*; do
		[ -e "$item" ] || continue
		name="$(basename "$item")"
		case "$name" in
			saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs) ;;
			*)
				log "workspace root: removing $name"
				rm -rf "$item"
				;;
		esac
	done
}

cmd_reset() {
	local tag="${1:-}"
	[ -n "$tag" ] || die "usage: $0 reset <TAG>   (e.g. baseline-v1, rosetta-v1)"
	sync_shared_seed
	[ -f "$SEED_DUMP" ] || die "no $SEED_DUMP; run '$0 setup' first"

	for r in "${REPOS[@]}"; do
		git -C "$BENCH_DIR/$r" rev-parse --verify -q "$tag" >/dev/null 2>&1 || die "$r: tag $tag not found"
	done

	cmd_stop_frontends
	for r in "${REPOS[@]}"; do
		log "$r: checkout $tag and clean"
		git -C "$BENCH_DIR/$r" checkout -q -f "$tag"
		git -C "$BENCH_DIR/$r" clean -q -fdx -e node_modules -e .venv
	done
	clean_workspace_root

	log "database: restore from seed.dump"
	compose up -d db cache mailpit saleor
	restore_db

	log "backend: restart API"
	start_api

	log "installing storefront and dashboard dependencies"
	install_frontends

	log "reset to $tag done. Code: $(git -C "$BENCH_DIR/saleor" describe --tags)"
	echo "Now: '$0 start', '$0 health', then start a NEW agent session in the method's own environment."
}

cmd_start() {
	mkdir -p "$LOG_DIR"
	check_node
	compose up -d db cache mailpit saleor
	wait_for_db
	docker ps --format '{{.Names}}' | grep -qx "$API_CONTAINER" || start_api

	cmd_stop_frontends
	log "storefront on :3000 (log: $LOG_DIR/storefront.log)"
	(cd "$BENCH_DIR/react-storefront" &&
		clean_env NEXT_PUBLIC_SALEOR_API_URL="$API_URL" NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel \
			nohup pnpm dev >"$LOG_DIR/storefront.log" 2>&1 &
		echo $! >"$LOG_DIR/storefront.pid")

	log "dashboard on :9000 (log: $LOG_DIR/dashboard.log)"
	(cd "$BENCH_DIR/saleor-dashboard" &&
		clean_env API_URL="$API_URL" nohup pnpm run dev >"$LOG_DIR/dashboard.log" 2>&1 &
		echo $! >"$LOG_DIR/dashboard.pid")

	echo "Started. Wait ~1 min for the dev servers, then run '$0 health'."
}

cmd_stop_frontends() {
	for app in storefront dashboard; do
		local pidfile="$LOG_DIR/$app.pid"
		[ -f "$pidfile" ] || continue
		pkill -P "$(cat "$pidfile")" 2>/dev/null || true
		kill "$(cat "$pidfile")" 2>/dev/null || true
		rm -f "$pidfile"
	done
}

cmd_stop() {
	cmd_stop_frontends
	docker rm -f "$API_CONTAINER" >/dev/null 2>&1 || true
	compose stop
}

cmd_health() {
	local ok=0
	curl -sSf -H 'Content-Type: application/json' --data '{"query":"{ __typename }"}' "$API_URL" >/dev/null && echo "API         OK" || { echo "API         FAIL"; ok=1; }
	curl -sSfL -o /dev/null http://localhost:3000 && echo "storefront  OK" || { echo "storefront  FAIL"; ok=1; }
	curl -sSfL -o /dev/null http://localhost:9000/ && echo "dashboard   OK" || { echo "dashboard   FAIL"; ok=1; }
	return $ok
}

case "${1:-}" in
	setup) cmd_setup ;;
	reset) shift; cmd_reset "$@" ;;
	from-zips) shift; cmd_from_zips "$@" ;;
	start) cmd_start ;;
	stop) cmd_stop ;;
	health) cmd_health ;;
	*) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

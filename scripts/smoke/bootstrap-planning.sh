#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
source "${repo_root}/scripts/lib/run-logging.sh"
init_run_logging "${repo_root}" "smoke/bootstrap-planning"

temp_dir="$(mktemp -d)"

cleanup() {
  local exit_code=$?
  rm -rf "$temp_dir"
  write_run_summary "$exit_code"
}

trap cleanup EXIT

repo_dir="$temp_dir/repo"
mkdir -p "$repo_dir/src/cli" "$repo_dir/bin"
git -C "$repo_dir" init >/dev/null 2>&1
git -C "$repo_dir" config user.name "Smoke Test"
git -C "$repo_dir" config user.email "smoke@example.com"
cat >"$repo_dir/package.json" <<'EOF'
{
  "name": "demo-service",
  "bin": {
    "demo-cli": "bin/demo.js"
  }
}
EOF
printf '#!/usr/bin/env node\n' >"$repo_dir/bin/demo.js"
printf "export const flags = ['--mode', '--verbose'];\n" >"$repo_dir/src/cli/flags.ts"
printf "app.get('/health', handler);\nconst port = process.env.PORT;\n" >"$repo_dir/src/server.ts"
printf "PORT=3000\n" >"$repo_dir/.env.example"
git -C "$repo_dir" add .
git -C "$repo_dir" commit -m 'init' >/dev/null 2>&1

bright_builds_stub="$temp_dir/bright-builds-stub.sh"
cat >"$bright_builds_stub" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
command="$1"
shift
case "$command" in
  status)
    cat <<'OUT'
Target repository: repo
Repo state: installable
Recommended action: install
OUT
    ;;
  install|update)
    exit 0
    ;;
esac
EOF
chmod +x "$bright_builds_stub"

gsd_installer="$temp_dir/install-gsd.sh"
cat >"$gsd_installer" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$CODEX_HOME/get-shit-done"
printf '2026.03.22\n' > "$CODEX_HOME/get-shit-done/VERSION"
EOF
chmod +x "$gsd_installer"

output_path="$(run_artifact_path "bootstrap-output.txt")"
(cd "$repo_dir" &&
  CODEX_HOME="$temp_dir/.codex" \
    PATH="${PATH}" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
    YOLO_PORT_GSD_INSTALLER="$gsd_installer" \
    node "$repo_root/bin/yolo-port.js" bootstrap --mode yolo --yes >"$output_path")

grep -q "yolo-port ► Plan Preview" "$output_path"
grep -q "GET /health" "$repo_dir/.planning/yolo-port/parity-checklist.md"
grep -q "PORT" "$repo_dir/.planning/yolo-port/parity-checklist.md"
grep -q "Selected model:" "$repo_dir/.planning/yolo-port/port-plan.md"

append_run_summary_line "verified phase-3 planning preview output at ${output_path}"
append_run_summary_line "verified parity checklist and plan artifacts under ${repo_dir}/.planning/yolo-port"

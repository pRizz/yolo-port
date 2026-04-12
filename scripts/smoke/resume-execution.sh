#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
source "${repo_root}/scripts/lib/run-logging.sh"
init_run_logging "${repo_root}" "smoke/resume-execution"

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
printf "export const flags = ['--mode'];\n" >"$repo_dir/src/cli/flags.ts"
printf "app.get('/health', handler);\n" >"$repo_dir/src/server.ts"
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

executor_script="$temp_dir/executor.sh"
executor_state="$temp_dir/executor-state.txt"
cat >"$executor_script" <<EOF
#!/usr/bin/env bash
set -euo pipefail
repo_root="\$1"
prompt_path="\$2"
mode="\$3"
state="\$(cat "${executor_state}" 2>/dev/null || printf 'fail')"
if [[ "\$state" == "fail" ]]; then
  printf 'ok' > "${executor_state}"
  printf 'simulated failure for %s %s %s\\n' "\$repo_root" "\$prompt_path" "\$mode" >&2
  exit 1
fi
mkdir -p "\$repo_root/.planning/yolo-port"
printf 'runner success\\n' > "\$repo_root/.planning/yolo-port/executor-marker.txt"
printf 'runner success\\n'
EOF
chmod +x "$executor_script"
printf 'fail' > "$executor_state"

first_output="$(run_artifact_path "first-bootstrap.txt")"
if (cd "$repo_dir" &&
  CODEX_HOME="$temp_dir/.codex" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
    YOLO_PORT_GSD_EXECUTOR="$executor_script" \
    YOLO_PORT_GSD_INSTALLER="$gsd_installer" \
    node "$repo_root/bin/yolo-port.js" bootstrap --mode yolo --yes >"$first_output" 2>&1); then
  echo "expected first managed execution to fail" >&2
  exit 1
fi

grep -q '"status": "failed"' "$repo_dir/.planning/yolo-port/execution-state.json"

second_output="$(run_artifact_path "resume-output.txt")"
(cd "$repo_dir" &&
  CODEX_HOME="$temp_dir/.codex" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
    YOLO_PORT_GSD_EXECUTOR="$executor_script" \
    YOLO_PORT_GSD_INSTALLER="$gsd_installer" \
    node "$repo_root/bin/yolo-port.js" resume --yes >"$second_output")

grep -q '"status": "completed"' "$repo_dir/.planning/yolo-port/execution-state.json"
grep -q 'Managed execution completed' "$repo_dir/.planning/yolo-port/execution-summary.md"

append_run_summary_line "verified failed bootstrap execution leaves a resumable state"
append_run_summary_line "verified resume recovery output at ${second_output}"

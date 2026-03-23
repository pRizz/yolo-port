#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
source "${repo_root}/scripts/lib/run-logging.sh"
init_run_logging "${repo_root}" "smoke/intake-preferences"

temp_dir="$(mktemp -d)"

cleanup() {
  local exit_code=$?
  rm -rf "$temp_dir"
  write_run_summary "$exit_code"
}

trap cleanup EXIT

repo_dir="$temp_dir/repo"
mkdir -p "$repo_dir"

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
mkdir -p "$CODEX_HOME/skills/gsd-new-project"
printf '2026.03.22\n' > "$CODEX_HOME/get-shit-done/VERSION"
printf '# stub\n' > "$CODEX_HOME/skills/gsd-new-project/SKILL.md"
EOF
chmod +x "$gsd_installer"

(cd "$repo_dir" &&
  CODEX_HOME="$temp_dir/.codex" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
    YOLO_PORT_GSD_INSTALLER="$gsd_installer" \
    node "$repo_root/bin/yolo-port.js" bootstrap --mode standard --target-stack rust/axum --agent codex --yes >/dev/null)

test -f "$repo_dir/.planning/yolo-port/intake-profile.json"
grep -q '"targetStack": "rust/axum"' "$repo_dir/.planning/yolo-port/intake-profile.json"

rerun_output="$(run_artifact_path "rerun-output.txt")"
(cd "$repo_dir" &&
  CODEX_HOME="$temp_dir/.codex" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
    YOLO_PORT_GSD_INSTALLER="$gsd_installer" \
    node "$repo_root/bin/yolo-port.js" --dry-run --yes >"$rerun_output")

grep -q "Saved preferences were found" "$rerun_output"

append_run_summary_line "verified intake profile persistence at ${repo_dir}/.planning/yolo-port/intake-profile.json"
append_run_summary_line "verified rerun preference summary output at ${rerun_output}"

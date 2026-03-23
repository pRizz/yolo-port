#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
source "${repo_root}/scripts/lib/run-logging.sh"
init_run_logging "${repo_root}" "smoke/intake-classification"

temp_dir="$(mktemp -d)"

cleanup() {
  local exit_code=$?
  rm -rf "$temp_dir"
  write_run_summary "$exit_code"
}

trap cleanup EXIT

write_git_repo() {
  local repo_path="$1"
  mkdir -p "$repo_path"
  git -C "$repo_path" init >/dev/null 2>&1
  printf 'demo\n' >"$repo_path/README.md"
  git -C "$repo_path" add README.md
  git -C "$repo_path" \
    -c user.name='Smoke Test' \
    -c user.email='smoke@example.com' \
    commit -m 'init' >/dev/null 2>&1
}

commit_repo_state() {
  local repo_path="$1"
  local message="$2"
  git -C "$repo_path" add .
  git -C "$repo_path" \
    -c user.name='Smoke Test' \
    -c user.email='smoke@example.com' \
    commit -m "$message" >/dev/null 2>&1
}

managed_repo="$temp_dir/managed-repo"
write_git_repo "$managed_repo"
mkdir -p "$managed_repo/.planning/yolo-port"
cat >"$managed_repo/.planning/yolo-port/manifest.json" <<EOF
{"createdAt":"2026-03-22T00:00:00.000Z","manager":"yolo-port","repoRoot":"$managed_repo","schemaVersion":1}
EOF
cat >"$managed_repo/.planning/yolo-port/bootstrap-state.json" <<'EOF'
{"schemaVersion":1,"mode":"guided","executedSteps":["bright-builds:install"],"writtenArtifacts":[],"warnings":[],"updatedAt":"2026-03-22T00:00:00.000Z"}
EOF
commit_repo_state "$managed_repo" "seed managed state"

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

progress_output="$(run_artifact_path "progress-output.txt")"
(cd "$managed_repo" &&
  CODEX_HOME="$temp_dir/.codex-progress" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
    node "$repo_root/bin/yolo-port.js" --dry-run --mode yolo --yes >"$progress_output")

grep -q "Detected state: in-progress" "$progress_output"

ported_repo="$temp_dir/ported-repo"
write_git_repo "$ported_repo"
mkdir -p "$ported_repo/.planning/yolo-port"
cat >"$ported_repo/.planning/yolo-port/manifest.json" <<EOF
{"createdAt":"2026-03-22T00:00:00.000Z","manager":"yolo-port","repoRoot":"$ported_repo","schemaVersion":1}
EOF
cat >"$ported_repo/.planning/yolo-port/bootstrap-state.json" <<'EOF'
{"schemaVersion":1,"mode":"guided","executedSteps":["bright-builds:install"],"writtenArtifacts":[],"warnings":[],"updatedAt":"2026-03-22T00:00:00.000Z"}
EOF
printf '{}' >"$ported_repo/.planning/yolo-port/source-reference.json"
printf '# done\n' >"$ported_repo/.planning/yolo-port/final-report.md"
commit_repo_state "$ported_repo" "seed completed state"

ported_output="$(run_artifact_path "ported-output.txt")"
(cd "$ported_repo" &&
  CODEX_HOME="$temp_dir/.codex-ported" \
    node "$repo_root/bin/yolo-port.js" --mode yolo --yes >"$ported_output")

grep -q "Detected state: already-ported" "$ported_output"
grep -q "1. View previous run summary" "$ported_output"

append_run_summary_line "verified in-progress classification output at ${progress_output}"
append_run_summary_line "verified already-ported classification output at ${ported_output}"

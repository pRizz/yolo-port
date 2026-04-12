#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${REPO_ROOT}/scripts/lib/run-logging.sh"
init_run_logging "${REPO_ROOT}" "smoke/bootstrap-managed-repo"

TEMP_DIR="$(mktemp -d)"

cleanup() {
  local exit_code=$?
  rm -rf "${TEMP_DIR}"
  write_run_summary "${exit_code}"
}

trap cleanup EXIT

NODE_DIR="$(dirname "$(command -v node)")"
BUN_DIR="$(dirname "$(command -v bun)")"

BRIGHT_BUILDS_SCRIPT="${TEMP_DIR}/bright-builds-stub.sh"
GSD_INSTALLER="${TEMP_DIR}/install-gsd.sh"
EXECUTOR_SCRIPT="${TEMP_DIR}/executor.sh"

cat >"${BRIGHT_BUILDS_SCRIPT}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
command="\$1"
shift
state="\$(cat "${TEMP_DIR}/bright-builds-state.txt")"
repo_root=""
force="false"
while [[ \$# -gt 0 ]]; do
  case "\$1" in
    --repo-root)
      repo_root="\$2"
      shift 2
      ;;
    --force)
      force="true"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

case "\$command" in
  status)
    if [[ "\$state" == "blocked" ]]; then
      cat <<'STATUS'
Target repository: repo
Repo state: blocked
Recommended action: install
[blocked] AGENTS.md
STATUS
    elif [[ "\$state" == "installed" ]]; then
      cat <<'STATUS'
Target repository: repo
Repo state: installed
Recommended action: none
STATUS
    else
      cat <<'STATUS'
Target repository: repo
Repo state: installable
Recommended action: install
STATUS
    fi
    ;;
  install|update)
    printf 'installed' > "${TEMP_DIR}/bright-builds-state.txt"
    mkdir -p "\${repo_root}/.bright-builds"
    printf 'ok\n' > "\${repo_root}/.bright-builds/installed.txt"
    ;;
esac
EOF
chmod +x "${BRIGHT_BUILDS_SCRIPT}"

cat >"${GSD_INSTALLER}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "${CODEX_HOME}/get-shit-done"
printf '2026.03.22\n' > "${CODEX_HOME}/get-shit-done/VERSION"
EOF
chmod +x "${GSD_INSTALLER}"

cat >"${EXECUTOR_SCRIPT}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
repo_root="$1"
mkdir -p "${repo_root}/.planning/yolo-port"
printf 'runner success\n' > "${repo_root}/.planning/yolo-port/executor-marker.txt"
printf 'runner success\n'
EOF
chmod +x "${EXECUTOR_SCRIPT}"

run_bootstrap() {
  local repo_root="$1"
  local codex_home="$2"
  local stdout_path="$3"
  local stderr_path="$4"
  shift 4

  (
    cd "${repo_root}"
    CODEX_HOME="${codex_home}" \
      PATH="${NODE_DIR}:${BUN_DIR}:${PATH}" \
      YOLO_PORT_BRIGHT_BUILDS_SCRIPT="${BRIGHT_BUILDS_SCRIPT}" \
      YOLO_PORT_GSD_EXECUTOR="${EXECUTOR_SCRIPT}" \
      YOLO_PORT_GSD_INSTALLER="${GSD_INSTALLER}" \
      node "${REPO_ROOT}/bin/yolo-port.js" bootstrap --mode yolo --yes "$@" \
      >"${stdout_path}" 2>"${stderr_path}"
  )
}

INSTALLABLE_REPO="${TEMP_DIR}/installable-repo"
INSTALLABLE_CODEX="${TEMP_DIR}/installable-codex"
mkdir -p "${INSTALLABLE_REPO}" "${INSTALLABLE_CODEX}"
printf 'installable' >"${TEMP_DIR}/bright-builds-state.txt"
INSTALLABLE_STDOUT="$(run_artifact_path "installable/bootstrap.out")"
INSTALLABLE_STDERR="$(run_artifact_path "installable/bootstrap.err")"
run_bootstrap "${INSTALLABLE_REPO}" "${INSTALLABLE_CODEX}" "${INSTALLABLE_STDOUT}" "${INSTALLABLE_STDERR}"
grep -q '"manager": "yolo-port"' "${INSTALLABLE_REPO}/.planning/yolo-port/manifest.json"
grep -q 'ok' "${INSTALLABLE_REPO}/.bright-builds/installed.txt"
grep -q '2026.03.22' "${INSTALLABLE_CODEX}/get-shit-done/VERSION"
grep -q 'Managed execution completed' "${INSTALLABLE_REPO}/.planning/yolo-port/execution-summary.md"

printf 'blocked' >"${TEMP_DIR}/bright-builds-state.txt"
BLOCKED_REPO="${TEMP_DIR}/blocked-repo"
BLOCKED_CODEX="${TEMP_DIR}/blocked-codex"
mkdir -p "${BLOCKED_REPO}" "${BLOCKED_CODEX}"
BLOCKED_STDOUT="$(run_artifact_path "blocked/bootstrap.out")"
BLOCKED_STDERR="$(run_artifact_path "blocked/bootstrap.err")"
if run_bootstrap "${BLOCKED_REPO}" "${BLOCKED_CODEX}" "${BLOCKED_STDOUT}" "${BLOCKED_STDERR}"; then
  echo "expected blocked bootstrap to fail" >&2
  exit 1
fi
grep -q 'blocked' "${BLOCKED_STDOUT}"
[[ ! -d "${BLOCKED_REPO}/.planning/yolo-port" ]]

printf 'blocked' >"${TEMP_DIR}/bright-builds-state.txt"
FORCED_REPO="${TEMP_DIR}/forced-repo"
FORCED_CODEX="${TEMP_DIR}/forced-codex"
mkdir -p "${FORCED_REPO}" "${FORCED_CODEX}"
FORCED_STDOUT="$(run_artifact_path "forced/bootstrap.out")"
FORCED_STDERR="$(run_artifact_path "forced/bootstrap.err")"
run_bootstrap "${FORCED_REPO}" "${FORCED_CODEX}" "${FORCED_STDOUT}" "${FORCED_STDERR}" --force
grep -q '"manager": "yolo-port"' "${FORCED_REPO}/.planning/yolo-port/manifest.json"

printf 'installed' >"${TEMP_DIR}/bright-builds-state.txt"
printf 'keep me' >"${INSTALLABLE_REPO}/.planning/PROJECT.md"
RERUN_STDOUT="$(run_artifact_path "rerun/bootstrap.out")"
RERUN_STDERR="$(run_artifact_path "rerun/bootstrap.err")"
run_bootstrap "${INSTALLABLE_REPO}" "${INSTALLABLE_CODEX}" "${RERUN_STDOUT}" "${RERUN_STDERR}"
grep -q 'keep me' "${INSTALLABLE_REPO}/.planning/PROJECT.md"

append_run_summary_line "verified installable bootstrap output at ${INSTALLABLE_STDOUT}"
append_run_summary_line "verified blocked bootstrap recovery output at ${BLOCKED_STDOUT}"
append_run_summary_line "verified forced bootstrap output at ${FORCED_STDOUT}"
append_run_summary_line "verified rerun preserves authored planning artifacts"

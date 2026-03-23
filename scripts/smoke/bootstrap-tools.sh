#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT

TOOL_DIR="$(dirname "$(command -v bun)")"
NODE_DIR="$(dirname "$(command -v node)")"
MISSING_CODEX_HOME="${TEMP_DIR}/missing/.codex"
INSTALLED_CODEX_HOME="${TEMP_DIR}/installed/.codex"
WORKSPACE_DIR="${TEMP_DIR}/workspace"
BRIGHT_BUILDS_STUB="${TEMP_DIR}/bright-builds-stub.sh"

mkdir -p "${MISSING_CODEX_HOME}"
mkdir -p "${INSTALLED_CODEX_HOME}/get-shit-done"
mkdir -p "${INSTALLED_CODEX_HOME}/skills/gsd-new-project"
mkdir -p "${WORKSPACE_DIR}"
printf '2026.03.22\n' > "${INSTALLED_CODEX_HOME}/get-shit-done/VERSION"
printf '# stub\n' > "${INSTALLED_CODEX_HOME}/skills/gsd-new-project/SKILL.md"
cat > "${BRIGHT_BUILDS_STUB}" <<'EOF'
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
chmod +x "${BRIGHT_BUILDS_STUB}"

MISSING_OUTPUT="$(
  cd "${WORKSPACE_DIR}" && \
    CODEX_HOME="${MISSING_CODEX_HOME}" \
    PATH="${TOOL_DIR}:${NODE_DIR}:/usr/bin:/bin" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="${BRIGHT_BUILDS_STUB}" \
    node "${REPO_ROOT}/bin/yolo-port.js" bootstrap --mode yolo --dry-run --yes
)"

INSTALLED_OUTPUT="$(
  cd "${WORKSPACE_DIR}" && \
    CODEX_HOME="${INSTALLED_CODEX_HOME}" \
    PATH="${TOOL_DIR}:${NODE_DIR}:/usr/bin:/bin" \
    YOLO_PORT_BRIGHT_BUILDS_SCRIPT="${BRIGHT_BUILDS_STUB}" \
    node "${REPO_ROOT}/bin/yolo-port.js" bootstrap --mode yolo --dry-run --yes
)"

grep -q "yolo-port ► Checks" <<<"${MISSING_OUTPUT}"
grep -q "Install get-shit-done for Codex" <<<"${MISSING_OUTPUT}"
grep -q "Execution: dry-run" <<<"${MISSING_OUTPUT}"
grep -q "Use the detected get-shit-done installation" <<<"${INSTALLED_OUTPUT}"

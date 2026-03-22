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

mkdir -p "${MISSING_CODEX_HOME}"
mkdir -p "${INSTALLED_CODEX_HOME}/get-shit-done"
mkdir -p "${INSTALLED_CODEX_HOME}/skills/gsd-new-project"
printf '2026.03.22\n' > "${INSTALLED_CODEX_HOME}/get-shit-done/VERSION"
printf '# stub\n' > "${INSTALLED_CODEX_HOME}/skills/gsd-new-project/SKILL.md"

MISSING_OUTPUT="$(
  cd "${REPO_ROOT}" && \
    CODEX_HOME="${MISSING_CODEX_HOME}" \
    PATH="${TOOL_DIR}:${NODE_DIR}:/usr/bin:/bin" \
    node bin/yolo-port.js bootstrap --mode yolo --dry-run --yes
)"

INSTALLED_OUTPUT="$(
  cd "${REPO_ROOT}" && \
    CODEX_HOME="${INSTALLED_CODEX_HOME}" \
    PATH="${TOOL_DIR}:${NODE_DIR}:/usr/bin:/bin" \
    node bin/yolo-port.js bootstrap --mode yolo --dry-run --yes
)"

grep -q "yolo-port ► Checks" <<<"${MISSING_OUTPUT}"
grep -q "Defer get-shit-done installation" <<<"${MISSING_OUTPUT}"
grep -q "Execution: dry-run" <<<"${MISSING_OUTPUT}"
grep -q "Use the detected get-shit-done installation" <<<"${INSTALLED_OUTPUT}"

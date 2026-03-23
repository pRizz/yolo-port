#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${REPO_ROOT}/scripts/lib/run-logging.sh"
init_run_logging "${REPO_ROOT}" "smoke/npm-pack-install"

TEMP_DIR="$(mktemp -d)"
TARBALL_PATH=""

cleanup() {
  local exit_code=$?
  rm -rf "${TEMP_DIR}"
  if [[ -n "${TARBALL_PATH}" && -f "${TARBALL_PATH}" ]]; then
    rm -f "${TARBALL_PATH}"
  fi
  write_run_summary "${exit_code}"
}

trap cleanup EXIT

pushd "${REPO_ROOT}" >/dev/null
PACK_OUTPUT="$(run_artifact_path "npm-pack.txt")"
npm pack >"${PACK_OUTPUT}"
TARBALL_NAME="$(tail -n 1 "${PACK_OUTPUT}")"
TARBALL_PATH="${REPO_ROOT}/${TARBALL_NAME}"
popd >/dev/null

pushd "${TEMP_DIR}" >/dev/null
npm init -y >/dev/null 2>&1
npm install "${TARBALL_PATH}" >/dev/null

NODE_DIR="$(dirname "$(command -v node)")"
HELP_OUTPUT="$(run_artifact_path "help-output.txt")"
PATH="${NODE_DIR}:/usr/bin:/bin" ./node_modules/.bin/yolo-port --help >"${HELP_OUTPUT}"
popd >/dev/null

grep -q "yolo-port" "${HELP_OUTPUT}"
grep -q "bootstrap" "${HELP_OUTPUT}"

append_run_summary_line "packed tarball ${TARBALL_PATH}"
append_run_summary_line "verified npm-installed help output at ${HELP_OUTPUT}"

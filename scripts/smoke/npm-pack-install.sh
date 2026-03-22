#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMP_DIR="$(mktemp -d)"
TARBALL_PATH=""

cleanup() {
  rm -rf "${TEMP_DIR}"
  if [[ -n "${TARBALL_PATH}" && -f "${TARBALL_PATH}" ]]; then
    rm -f "${TARBALL_PATH}"
  fi
}

trap cleanup EXIT

pushd "${REPO_ROOT}" >/dev/null
TARBALL_NAME="$(npm pack | tail -n 1)"
TARBALL_PATH="${REPO_ROOT}/${TARBALL_NAME}"
popd >/dev/null

pushd "${TEMP_DIR}" >/dev/null
npm init -y >/dev/null 2>&1
npm install "${TARBALL_PATH}" >/dev/null

NODE_DIR="$(dirname "$(command -v node)")"
HELP_OUTPUT="$(PATH="${NODE_DIR}:/usr/bin:/bin" ./node_modules/.bin/yolo-port --help)"
popd >/dev/null

grep -q "yolo-port" <<<"${HELP_OUTPUT}"
grep -q "bootstrap" <<<"${HELP_OUTPUT}"

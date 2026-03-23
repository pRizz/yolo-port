#!/usr/bin/env bash

init_run_logging() {
  local repo_root="$1"
  local script_name="$2"
  local run_id=""

  run_id="$(date -u +"%Y%m%dT%H%M%SZ")-$$"

  export RUN_ARTIFACT_ROOT="${repo_root}/.codex/run-logs"
  export RUN_ARTIFACT_DIR="${RUN_ARTIFACT_ROOT}/${script_name}/${run_id}"
  export RUN_LOG_FILE="${RUN_ARTIFACT_DIR}/run.log"
  export RUN_SUMMARY_FILE="${RUN_ARTIFACT_DIR}/summary.txt"
  export RUN_SCRIPT_NAME="$script_name"
  RUN_STARTED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  export RUN_STARTED_AT_UTC
  RUN_SUMMARY_LINES=()

  mkdir -p "${RUN_ARTIFACT_DIR}"
  : >"${RUN_LOG_FILE}"

  exec > >(tee -a "${RUN_LOG_FILE}") 2>&1

  printf 'Run artifacts: %s\n' "${RUN_ARTIFACT_DIR}"
}

append_run_summary_line() {
  local line="$1"

  RUN_SUMMARY_LINES+=("${line}")
}

run_artifact_path() {
  local relative_path="$1"
  local artifact_path="${RUN_ARTIFACT_DIR}/${relative_path}"

  mkdir -p "$(dirname "${artifact_path}")"
  printf '%s\n' "${artifact_path}"
}

write_run_summary() {
  local exit_code="$1"
  local status="success"
  local finished_at_utc=""
  local line=""

  finished_at_utc="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  if [[ "${exit_code}" -ne 0 ]]; then
    status="failure"
  fi

  {
    printf 'script: %s\n' "${RUN_SCRIPT_NAME}"
    printf 'status: %s\n' "${status}"
    printf 'started_at_utc: %s\n' "${RUN_STARTED_AT_UTC}"
    printf 'finished_at_utc: %s\n' "${finished_at_utc}"
    printf 'log: %s\n' "${RUN_LOG_FILE}"

    if ((${#RUN_SUMMARY_LINES[@]} > 0)); then
      printf 'summary:\n'
      for line in "${RUN_SUMMARY_LINES[@]}"; do
        printf -- '- %s\n' "${line}"
      done
    fi
  } >"${RUN_SUMMARY_FILE}"

  printf 'Run summary: %s\n' "${RUN_SUMMARY_FILE}"
}

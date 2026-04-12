#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
source "${repo_root}/scripts/lib/run-logging.sh"
init_run_logging "${repo_root}" "smoke/audit-command"

temp_dir="$(mktemp -d)"

cleanup() {
  local exit_code=$?
  rm -rf "$temp_dir"
  write_run_summary "$exit_code"
}

trap cleanup EXIT

repo_dir="$temp_dir/repo"
mkdir -p "$repo_dir/src" "$repo_dir/.planning/yolo-port"
git -C "$repo_dir" init >/dev/null 2>&1
git -C "$repo_dir" config user.name "Smoke Test"
git -C "$repo_dir" config user.email "smoke@example.com"
printf "app.get('/health', handler);\n" >"$repo_dir/src/server.ts"
cat >"$repo_dir/.planning/yolo-port/manifest.json" <<EOF
{"createdAt":"2026-04-12T12:00:00.000Z","manager":"yolo-port","repoRoot":"$repo_dir","schemaVersion":1}
EOF
cat >"$repo_dir/.planning/yolo-port/source-reference.json" <<EOF
{"generatedAt":"2026-04-12T12:00:00.000Z","git":{"branch":"main","currentHeadSha":"head","referenceSha":"head","remotes":[],"tagName":"yolo-port/source-reference"},"manifestSamplePaths":["src/server.ts"],"repoRoot":"$repo_dir","schemaVersion":1,"sourceKind":"local","strategy":"git-tag","structuralIntent":{"parityGoal":"1:1 external interface parity","requiresReferenceBeforeExecution":true,"strategy":"in-place-managed-port","targetStack":"rust/axum"}}
EOF
cat >"$repo_dir/.planning/yolo-port/interface-inventory.json" <<'EOF'
{"generatedAt":"2026-04-12T12:00:00.000Z","items":[{"details":"GET /health","kind":"http-route","label":"GET /health","sourcePath":"src/server.ts"}],"schemaVersion":1,"summary":{"byKind":{"cli-entrypoint":0,"cli-flag":0,"config-file":0,"environment-variable":0,"http-route":1,"package-export":0},"configFileCount":0,"dependencyCount":0,"detectedLanguages":["typescript"],"sourceFileCount":1,"totalInterfaces":1,"totalLines":10}}
EOF
cat >"$repo_dir/.planning/yolo-port/plan-approval.json" <<'EOF'
{"approvalMode":"auto","approved":true,"approvedAt":"2026-04-12T12:05:00.000Z","schemaVersion":1}
EOF
cat >"$repo_dir/.planning/yolo-port/port-plan.json" <<'EOF'
{"approval":{"approvalMode":"auto","approved":true,"approvedAt":"2026-04-12T12:05:00.000Z","schemaVersion":1},"artifactPaths":{"interfaceInventory":".planning/yolo-port/interface-inventory.json","parityChecklist":".planning/yolo-port/parity-checklist.md","pricingSnapshot":".planning/yolo-port/pricing-snapshot.json","sourceReference":".planning/yolo-port/source-reference.json"},"estimate":{"assumptions":["demo"],"confidence":"medium","durationMinutes":{"max":10,"min":5},"generatedAt":"2026-04-12T12:00:00.000Z","pricingCapturedAt":"2026-04-11","pricingSourceUrl":"https://openai.com/api/pricing","reasoningProfile":"high","schemaVersion":1,"selectedModel":"gpt-5.4","selectedProfile":"quality","selectedProvider":"openai","tokenRange":{"max":100,"min":50},"usdRange":{"max":2,"min":1}},"generatedAt":"2026-04-12T12:00:00.000Z","schemaVersion":1,"targetStack":"rust/axum"}
EOF
printf '# Parity Checklist\n' >"$repo_dir/.planning/yolo-port/parity-checklist.md"
printf '{"providers":[],"schemaVersion":1}\n' >"$repo_dir/.planning/yolo-port/pricing-snapshot.json"
cat >"$repo_dir/.planning/yolo-port/execution-state.json" <<EOF
{"completedSteps":["prepare-handoff","invoke-runner","verify-runner-output","complete-managed-run"],"currentStep":null,"handoffPath":".planning/yolo-port/execution-handoff.md","lastError":null,"lastRunner":"configured-script","mode":"yolo","outputPath":".planning/yolo-port/execution-output.log","repoRoot":"$repo_dir","resumeCommand":"yolo-port resume --yes","schemaVersion":1,"startedAt":"2026-04-12T12:00:00.000Z","status":"completed","summaryPath":".planning/yolo-port/execution-summary.md","updatedAt":"2026-04-12T12:10:00.000Z"}
EOF
printf '# Managed Execution Summary\n\nManaged execution completed.\n' >"$repo_dir/.planning/yolo-port/execution-summary.md"
git -C "$repo_dir" add .
git -C "$repo_dir" commit -m 'seed audit repo' >/dev/null 2>&1
git -C "$repo_dir" tag yolo-port/source-reference

output_path="$(run_artifact_path "audit-output.txt")"
(cd "$repo_dir" &&
  CODEX_HOME="$temp_dir/.codex" \
    node "$repo_root/bin/yolo-port.js" audit --verbose >"$output_path")

grep -q "Audit status: passed" "$output_path"
grep -q '"overallStatus": "passed"' "$repo_dir/.planning/yolo-port/parity-audit.json"
grep -q 'Parity audit passed' "$repo_dir/.planning/yolo-port/final-report.md"

append_run_summary_line "verified audit command output at ${output_path}"
append_run_summary_line "verified parity-audit and final-report artifacts under ${repo_dir}/.planning/yolo-port"

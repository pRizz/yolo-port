# Initialization Todo

- [x] Run new-project initialization checks and load repo instructions
- [x] Complete project questioning and capture core scope, constraints, and success criteria
- [x] Write `.planning/PROJECT.md` and commit it
- [x] Capture workflow preferences in `.planning/config.json` and commit it
- [x] Decide whether to do domain research and create `.planning/research/` artifacts if needed
- [x] Define `.planning/REQUIREMENTS.md` with v1/v2/out-of-scope scope and commit it
- [x] Create `.planning/ROADMAP.md` and `.planning/STATE.md`, update traceability, get approval, and commit them

## Verification

- [x] Each planning artifact exists in `.planning/`
- [x] Each required commit is created after its artifact phase
- [x] Final roadmap maps every v1 requirement to exactly one phase

## Completion Review

- Residual risks: Pricing snapshots and exact GSD invocation details still need implementation-time validation in Phase 1-3 work.

## Standards Audit And Fix Wave

- [x] Audit repository standards hotspots and select a bounded remediation wave
- [x] Extract pure bootstrap presentation helpers out of `src/cli/commands/bootstrap.ts`
- [x] Add unit tests for the extracted bootstrap render helpers and existing untested `src/ui` pure helpers
- [x] Run verification for the touched paths

## Verification

- [x] `bun x tsc --noEmit`
- [x] `bun test`

## Completion Review

- Applied fixes: moved pure bootstrap render helpers into `src/ui/bootstrap.ts`, reduced `src/cli/commands/bootstrap.ts` below the Bright Builds file-length trigger, and added direct unit coverage for the UI render layer.
- Residual risks: Larger standards gaps outside this wave still need follow-up audit passes, especially script rerun diagnostics/persisted logs and any deeper architecture simplifications outside `src/ui`.

## Standards Audit And Fix Wave 2

- [x] Add a repo-defined gitignored run-log and summary location for checked-in scripts
- [x] Wire the smoke scripts and Bright Builds helper to persist diagnostics under that run-log location
- [x] Extract bootstrap interaction and target-resolution helpers out of `src/cli/commands/bootstrap.ts`
- [x] Run verification for the touched paths, including smoke coverage and shell validation

## Verification

- [x] `bun x tsc --noEmit`
- [x] `bun test`
- [x] `shellcheck -S warning scripts/lib/run-logging.sh scripts/bright-builds-auto-update.sh scripts/smoke/*.sh`
- [x] `bash -n scripts/lib/run-logging.sh scripts/bright-builds-auto-update.sh scripts/smoke/*.sh`
- [x] `bash scripts/smoke/bootstrap-managed-repo.sh`
- [x] `bash scripts/smoke/bootstrap-tools.sh`
- [x] `bash scripts/smoke/intake-classification.sh`
- [x] `bash scripts/smoke/intake-entry.sh`
- [x] `bash scripts/smoke/intake-preferences.sh`
- [x] `bash scripts/smoke/npm-pack-install.sh`

## Completion Review

- Applied fixes: added `.codex/run-logs/` as the repo-defined diagnostics location, introduced `scripts/lib/run-logging.sh`, persisted smoke-script outputs and summaries under that path, documented the location in `AGENTS.md`, and reduced `src/cli/commands/bootstrap.ts` further by extracting `src/cli/bootstrap/interaction.ts` and `src/cli/bootstrap/target.ts`.
- Residual risks: the main remaining Bright Builds `should` gap is deeper simplification opportunities inside the bootstrap execution path now that interaction and target resolution are separated.

## Standards Audit And Fix Wave 3

- [x] Add direct unit coverage for the pure bootstrap flag parser
- [x] Extract the remaining bootstrap execute-phase orchestration out of `src/cli/commands/bootstrap.ts`
- [x] Keep the touched bootstrap and intake coverage green after the extraction

## Verification

- [x] `bun x tsc --noEmit`
- [x] `bun test`
- [x] `bash scripts/smoke/bootstrap-managed-repo.sh`
- [x] `bash scripts/smoke/bootstrap-tools.sh`
- [x] `bash scripts/smoke/intake-entry.sh`
- [x] `bash scripts/smoke/intake-preferences.sh`

## Completion Review

- Applied fixes: added direct unit tests for `parseBootstrapArgs`, introduced `src/cli/bootstrap/execute.ts`, and reduced `src/cli/commands/bootstrap.ts` to a smaller orchestration shell.
- Residual risks: the clearest remaining Bright Builds `should` gap is the broader nullable-name cleanup for internal TS surfaces that still use nullable fields without a `maybe` prefix.

## Standards Audit And Fix Wave 4

- [x] Rename nullable bootstrap and intake ingress fields to use `maybe*` prefixes
- [x] Propagate the ingress rename through the immediate planning and preference-merging call sites
- [x] Re-run the affected bootstrap and intake verification coverage

## Verification

- [x] `bun x tsc --noEmit`
- [x] `bun test`
- [x] `bash scripts/smoke/bootstrap-managed-repo.sh`
- [x] `bash scripts/smoke/bootstrap-tools.sh`
- [x] `bash scripts/smoke/intake-entry.sh`
- [x] `bash scripts/smoke/intake-preferences.sh`

## Completion Review

- Applied fixes: renamed the nullable bootstrap flag fields and adjacent intake/planning ingress fields to `maybe*`, updated the merge and target-resolution path to use those names consistently, and removed the now-unused `bunState` parameter from `executeBootstrap`.
- Residual risks: nullable naming is still broader than this bounded ingress wave, especially in resolved preference, profile, and UI-facing internal types that intentionally stayed stable for now.

## Standards Audit And Fix Wave 5

- [x] Rename nullable internal intake answer and resolved-preference surfaces to use `maybe*`
- [x] Update the UI summary helpers and intake-profile builder input to keep nullable names explicit at internal boundaries
- [x] Re-run the affected bootstrap and intake verification coverage while preserving the serialized profile schema

## Verification

- [x] `bun x tsc --noEmit`
- [x] `bun test`
- [x] `bash scripts/smoke/bootstrap-managed-repo.sh`
- [x] `bash scripts/smoke/bootstrap-tools.sh`
- [x] `bash scripts/smoke/intake-entry.sh`
- [x] `bash scripts/smoke/intake-preferences.sh`

## Completion Review

- Applied fixes: renamed `IntakeAnswers`, `ResolvedIntakePreferences`, the pure bootstrap summary helper inputs, and the `createIntakeProfileRecord` input contract to use `maybe*` for nullable internal fields, while keeping the persisted intake-profile JSON schema unchanged.
- Residual risks: the remaining nullable-name cleanup is now concentrated in inspection/state records and adapter return types such as repo inspection metadata and tool detection status.

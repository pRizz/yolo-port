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

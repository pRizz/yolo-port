# Roadmap: yolo-port

## Overview

yolo-port moves from a public Bun-based bootstrap CLI into a trustworthy, parity-first orchestration layer over get-shit-done. The roadmap starts by making installation, standards adoption, and planning scaffolding real, then adds repository-aware intake, parity and estimate planning, automated GSD-backed execution with checkpointed recovery, and finally audit/reporting flows that let users walk away from a port and come back with confidence.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Bootstrap and Foundations** - Make yolo-port installable, Codex-ready, and able to scaffold the baseline planning environment.
- [ ] **Phase 2: Repository Intake and Workflow Control** - Add remote/local repo entry flows, project classification, and persisted involvement modes.
- [ ] **Phase 3: Parity Planning and Estimation** - Inventory exposed interfaces, preserve source reference state, and produce up-front estimate ranges with provenance.
- [ ] **Phase 4: GSD Execution and Recovery** - Hand off planning/execution to GSD-compatible flows with durable step checkpoints and resumable YOLO operation.
- [ ] **Phase 5: Audit and Final Reporting** - Audit completed ports for parity and generate final reports that explain what happened and what remains.

## Phase Details

### Phase 1: Bootstrap and Foundations
**Goal**: Deliver a public CLI bootstrap that verifies/install Bun and GSD for Codex, applies Bright Builds standards, and creates `.planning` scaffolding for managed ports.
**Depends on**: Nothing (first phase)
**Requirements**: BOOT-01, BOOT-02, BOOT-03, BOOT-04, EXEC-01
**Success Criteria** (what must be TRUE):
  1. User can install `yolo-port` via npm and launch the CLI from a clean environment.
  2. User can complete bootstrap with Bun verified or installed before Bun-specific steps run.
  3. User can bootstrap Codex-facing yolo-port and GSD assets without manually understanding GSD setup.
  4. User can apply Bright Builds coding and architecture requirements during onboarding.
  5. `.planning` artifacts required for a managed port workflow are created automatically.
**Plans**: 3 plans

Plans:
- [x] 01-01: Build the published CLI package, command entrypoints, and bootstrap scaffold writer
- [x] 01-02: Implement Bun verification plus Codex-first GSD verification and installation flow
- [x] 01-03: Integrate Bright Builds standards onboarding and baseline `.planning` initialization

### Phase 2: Repository Intake and Workflow Control
**Goal**: Let users begin from either a remote repo or local checkout, classify repo state correctly, and persist how involved they want to be.
**Depends on**: Phase 1
**Requirements**: REPO-01, REPO-02, FLOW-01, FLOW-02, FLOW-03
**Success Criteria** (what must be TRUE):
  1. User can start a port from a GitHub repo URL or from inside a local repository.
  2. Existing repositories are correctly classified as fresh, in-progress, or already ported.
  3. User can choose guided, standard, or YOLO mode during bootstrap.
  4. Involvement preferences and optional design/taste answers persist in project metadata for reruns.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Implement remote/local repository descriptors and intake flow normalization
- [ ] 02-02: Build repo classification and breadcrumb detection for fresh, in-progress, and ported states
- [ ] 02-03: Persist workflow mode and optional taste-question responses in project metadata

### Phase 3: Parity Planning and Estimation
**Goal**: Preserve a source reference, inventory all exposed interfaces, and produce a parity-first execution plan with time/token/USD estimate ranges backed by provider snapshots.
**Depends on**: Phase 2
**Requirements**: REPO-03, PLAN-01, PLAN-02, PLAN-03, PLAN-04
**Success Criteria** (what must be TRUE):
  1. User can preserve a reference snapshot of the original implementation before destructive work starts.
  2. User can review a high-level inventory of external APIs and interfaces for the source system.
  3. User can review a 1:1 parity checklist with rare exceptions clearly flagged.
  4. User can see duration, token, and USD estimate ranges tied to the selected model and reasoning profile.
  5. Estimate output includes snapshot date and source provenance for pricing data.
**Plans**: 4 plans

Plans:
- [ ] 03-01: Preserve source reference state and record structural intentions before execution
- [ ] 03-02: Implement external interface inventory and parity checklist generation
- [ ] 03-03: Build provider pricing snapshot catalog and alias/provenance model
- [ ] 03-04: Implement estimate generation and user-facing proceed gate

### Phase 4: GSD Execution and Recovery
**Goal**: Execute the managed port flow through GSD-compatible orchestration with write-ahead/write-after checkpoints and resumable YOLO execution.
**Depends on**: Phase 3
**Requirements**: EXEC-02, EXEC-03, EXEC-04, EXEC-05
**Success Criteria** (what must be TRUE):
  1. User can launch a GSD-compatible execution flow directly from yolo-port after bootstrap and planning.
  2. Every major workflow step records durable started and finished checkpoint data.
  3. Interrupted runs can resume from the last reliable checkpoint after rerunning `yolo-port`.
  4. YOLO execution can continue through cloning, analysis, planning, code generation, verification, and commits without extra prompts after initial confirmation.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Implement the GSD adapter boundary and execution handoff contract
- [ ] 04-02: Wire checkpointed execution events and resume selection into the workflow engine
- [ ] 04-03: Validate end-to-end standard and YOLO execution loops with recovery paths

### Phase 5: Audit and Final Reporting
**Goal**: Let users audit completed ports for parity and receive a comprehensive explanation of outcomes, deltas, and next actions.
**Depends on**: Phase 4
**Requirements**: AUDT-01, RPRT-01
**Success Criteria** (what must be TRUE):
  1. User can audit an already ported codebase against the original source repository for parity.
  2. User receives a final summary report with parity status, flagged exceptions, estimate-versus-actual data, unresolved risks, and next steps.
  3. Audit and report artifacts are reusable after the initial run without forcing a full restart of the workflow.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Implement parity audit flow for already ported repositories
- [ ] 05-02: Generate final report artifacts from checkpoints, parity findings, and estimate data
- [ ] 05-03: Polish post-run UX for audit, summary review, and follow-up decisions

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bootstrap and Foundations | 3/3 | Complete | 2026-03-22 |
| 2. Repository Intake and Workflow Control | 0/3 | Not started | - |
| 3. Parity Planning and Estimation | 0/4 | Not started | - |
| 4. GSD Execution and Recovery | 0/3 | Not started | - |
| 5. Audit and Final Reporting | 0/3 | Not started | - |

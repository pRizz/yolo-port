# Requirements: yolo-port

**Defined:** 2026-03-22
**Core Value:** A developer can start a high-confidence port, see credible time and token cost estimates up front, walk away, and return to a resumable or completed result with 1:1 interface parity gaps clearly called out.

## v1 Requirements

### Bootstrap

- [x] **BOOT-01**: User can install `yolo-port` via npm and launch the CLI successfully.
- [x] **BOOT-02**: User can let the bootstrap flow verify Bun availability and guide or perform Bun installation before Bun-dependent workflow steps run.
- [x] **BOOT-03**: User can let the bootstrap flow verify or install get-shit-done for Codex without manually understanding GSD internals.
- [x] **BOOT-04**: User can apply Bright Builds coding and architecture requirements to the target repository during onboarding.

### Repository Intake

- [ ] **REPO-01**: User can start a new port by passing a remote GitHub repository URL to `yolo-port`.
- [ ] **REPO-02**: User can run `yolo-port` inside an existing local repository and have the tool classify it as fresh, in-progress, or already ported.
- [ ] **REPO-03**: User can preserve a reference snapshot of the source implementation before destructive structural changes begin.

### Workflow Control

- [ ] **FLOW-01**: User can choose guided, standard, or YOLO involvement during bootstrap.
- [ ] **FLOW-02**: User involvement preferences persist in project metadata so reruns and resumes follow the same behavior by default.
- [ ] **FLOW-03**: User can choose whether to answer a short set of high-level design and taste questions before major execution starts.

### Planning and Parity

- [ ] **PLAN-01**: User can receive a high-level inventory of external APIs and interfaces before major execution begins.
- [ ] **PLAN-02**: User can review an explicit parity checklist that targets 1:1 external API and interface parity with rare exceptions clearly flagged.
- [ ] **PLAN-03**: User can receive duration, token, and USD estimate ranges for the proposed port based on the selected AI model and reasoning profile.
- [ ] **PLAN-04**: User can see the pricing snapshot date and source provenance used for the estimate before deciding whether to proceed.

### Execution and Recovery

- [x] **EXEC-01**: User can bootstrap the `.planning` artifacts needed for a yolo-port managed port workflow.
- [ ] **EXEC-02**: User can trigger a GSD-compatible execution flow after bootstrap instead of manually translating the plan into downstream GSD steps.
- [ ] **EXEC-03**: User can rely on write-ahead and write-after checkpoint logging for each major workflow step.
- [ ] **EXEC-04**: User can resume an interrupted run from the last reliable checkpoint after rerunning `yolo-port`.
- [ ] **EXEC-05**: User can run a YOLO workflow that continues through cloning, analysis, planning, code generation, verification, and commits without further prompts after initial confirmation.

### Audit and Reporting

- [ ] **AUDT-01**: User can audit an already ported codebase for parity against the original source repository.
- [ ] **RPRT-01**: User can receive a final summary report that includes parity status, flagged exceptions, estimate-versus-actual execution data, unresolved risks, and next steps.

## v2 Requirements

### Existing Port Maintenance

- **UPDT-01**: User can compare an existing port against a newer upstream source revision and generate an update plan.

### Runtime Adapters

- **ADPT-01**: User can install yolo-port assets into at least one non-Codex agent ecosystem with platform-native placement.

### Port Accelerators

- **ACCL-01**: User can choose a source-target playbook for common migrations such as Node/Express to Rust/Axum or C/C++ to Rust.

## Out of Scope

| Feature | Reason |
|---------|--------|
| GUI or hosted SaaS dashboard | v1 should stay focused on reliable CLI automation rather than split effort across product surfaces |
| Monolith-to-service extraction as a first-class workflow | important, but secondary to shipping strong language-to-language and framework-to-framework ports |
| Standalone test-suite migration workflow | defer until the core port orchestration loop is stable |
| Standalone build-system migration workflow | defer until the core port orchestration loop is stable |
| Equal day-one support for every AI agent platform | Codex-first focus is required for a credible v1 installation and workflow story |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 | Phase 1 | Complete |
| BOOT-02 | Phase 1 | Complete |
| BOOT-03 | Phase 1 | Complete |
| BOOT-04 | Phase 1 | Complete |
| REPO-01 | Phase 2 | Pending |
| REPO-02 | Phase 2 | Pending |
| REPO-03 | Phase 3 | Pending |
| FLOW-01 | Phase 2 | Pending |
| FLOW-02 | Phase 2 | Pending |
| FLOW-03 | Phase 2 | Pending |
| PLAN-01 | Phase 3 | Pending |
| PLAN-02 | Phase 3 | Pending |
| PLAN-03 | Phase 3 | Pending |
| PLAN-04 | Phase 3 | Pending |
| EXEC-01 | Phase 1 | Complete |
| EXEC-02 | Phase 4 | Pending |
| EXEC-03 | Phase 4 | Pending |
| EXEC-04 | Phase 4 | Pending |
| EXEC-05 | Phase 4 | Pending |
| AUDT-01 | Phase 5 | Pending |
| RPRT-01 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after Phase 1 completion*

---
generated_by: gsd-discuss-phase
lifecycle_mode: yolo
phase_lifecycle_id: phase-20260412T012001Z
generated_at: 2026-04-12T01:20:01.688Z
---

# Phase 4: GSD Execution and Recovery - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning
**Mode:** Yolo

<domain>
## Phase Boundary

Phase 4 turns the saved Phase 3 planning artifacts into a managed execution workflow. yolo-port must be able to trigger a Codex-first, GSD-compatible execution handoff directly from the bootstrap path, checkpoint each major orchestration step durably, and resume interrupted runs from the last reliable boundary without forcing the user to reconstruct state manually.

</domain>

<decisions>
## Implementation Decisions

### Execution runner and handoff
- **D-01:** The default execution runner should be Codex-first by invoking `codex exec` non-interactively with a generated handoff prompt that points at the Phase 3 planning artifacts and GSD-compatible expectations.
- **D-02:** Preserve an environment override for the execution runner so tests and future adapters can replace the default runner deterministically without changing core workflow logic.
- **D-03:** The execution handoff must stay honest that yolo-port owns orchestration and checkpointing, while the external Codex/GSD runner owns analysis, code generation, verification, and git mutations inside the target repository.

### Checkpoints and resume
- **D-04:** Use append-only execution events plus a current execution-state record under `.planning/yolo-port/` rather than ad hoc notes or ephemeral in-memory status.
- **D-05:** Checkpoint the major orchestration boundaries explicitly: prepare handoff, invoke runner, verify runner outcome, and mark the managed run complete.
- **D-06:** Resume should restart from the first incomplete checkpointed step, never from the middle of a partially completed step.

### User-facing flow
- **D-07:** The visible `resume` command becomes the explicit recovery surface for interrupted managed runs.
- **D-08:** YOLO bootstrap should auto-start the managed execution after the Phase 3 plan is approved, with no further yolo-port prompts.
- **D-09:** Guided and standard flows should persist the execution-ready state and let the user trigger it intentionally through `yolo-port resume`.

### Repo-state and reporting
- **D-10:** Phase 4 execution-state artifacts must not be treated as completed-port evidence by the repo classifier; completion remains a stronger later-phase state.
- **D-11:** Persist a concise execution summary and runner output path under `.planning/yolo-port/` so future audit/reporting phases can build on them.

### the agent's Discretion
- Exact wording of the Codex handoff prompt
- Exact event payload shape beyond the required durable fields
- Exact terminal narration for the managed execution steps

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- `.planning/PROJECT.md` — product value, resumability promise, and GSD-interoperability requirement
- `.planning/REQUIREMENTS.md` — Phase 4 requirement IDs `EXEC-02`, `EXEC-03`, `EXEC-04`, and `EXEC-05`
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and required plan decomposition
- `.planning/STATE.md` — active blockers and accumulated decisions before Phase 4 starts

### Phase 3 outputs
- `.planning/phases/03-parity-planning-and-estimation/03-CONTEXT.md` — approved parity-planning decisions
- `.planning/phases/03-parity-planning-and-estimation/03-VERIFICATION.md` — verified behavior and artifact coverage from the planning phase
- `src/cli/bootstrap/planning.ts` — current planning-preview orchestration
- `src/adapters/fs/portPlanning.ts` — current Phase 3 artifact persistence boundary
- `src/persistence/portPlanning.ts` — current planning artifact schemas

### Existing execution-related code
- `src/adapters/system/gsd.ts` — current GSD detection/install/update boundary that Phase 4 should extend, not bypass
- `src/cli/commands/bootstrap.ts` — current bootstrap command and yolo execution trigger point
- `src/cli/router.ts` — visible command surface, including the planned `resume` command
- `src/adapters/fs/managedRepo.ts` — current managed artifact discovery and classification evidence model

### Research and architecture
- `.planning/research/ARCHITECTURE.md` — workflow-state and checkpoint architecture guidance
- `.planning/research/FEATURES.md` — resume and checkpointing as P1 product features
- `.planning/research/PITFALLS.md` — non-transactional resume state and opaque execution failure modes to avoid

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/adapters/system/gsd.ts`: already encapsulates GSD installation and is the correct boundary to grow into managed execution runner support.
- `src/cli/bootstrap/planning.ts`: already has the full set of saved planning artifacts that the execution runner should consume.
- `src/adapters/fs/portPlanning.ts`: already owns machine-managed planning files in `.planning/yolo-port/`, so execution-state and handoff artifacts should reuse the same directory.
- `src/domain/intake/classifyRepoState.ts`: already distinguishes in-progress from completed state and only needs narrow evidence updates if Phase 4 adds new managed files.

### Established Patterns
- Machine-owned JSON artifacts live under `.planning/yolo-port/`, while human-facing planning docs stay under `.planning/`.
- System boundaries use structured child-process execution rather than raw shell interpolation.
- The bootstrap command is already the place where yolo-mode automatic continuation is decided.

### Integration Points
- After Phase 3 approval, bootstrap should be able to prepare and start the managed execution.
- The new `resume` command should reuse the same shared execution orchestrator instead of duplicating logic.
- Execution summaries and events should flow into later audit/final-report phases without changing the location of existing planning artifacts.

</code_context>

<specifics>
## Specific Ideas

- Keep the runner contract explicit and inspectable by writing the exact handoff prompt or contract file into `.planning/yolo-port/`.
- Make checkpoint events useful for humans too: they should explain which major step started, finished, or failed and where the next resume will begin.
- Treat `codex exec` as the default Codex-first engine, but keep the adapter pluggable for tests and future non-Codex execution surfaces.

</specifics>

<deferred>
## Deferred Ideas

- Cross-runtime execution adapters beyond Codex-first default
- Full final report synthesis and parity audit output, which remain Phase 5 work
- Rich dashboard-style resume UX beyond CLI and saved artifacts

</deferred>

---
*Phase: 04-gsd-execution-and-recovery*
*Context gathered: 2026-04-11*

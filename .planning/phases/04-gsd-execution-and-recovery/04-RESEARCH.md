# Phase 4: GSD Execution and Recovery - Research

**Researched:** 2026-04-11
**Confidence:** HIGH
**Goal:** Trigger a Codex-first, GSD-compatible managed execution flow from yolo-port, checkpoint each orchestration step durably, and resume interrupted runs from the last reliable boundary.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use `codex exec` as the default Codex-first runner, with an environment override for tests and future adapters.
- Use append-only execution events plus a current execution-state record under `.planning/yolo-port/`.
- Checkpoint the major orchestration steps explicitly: prepare handoff, invoke runner, verify runner outcome, and mark the managed run complete.
- Resume from the first incomplete checkpointed step, never from the middle of a partially finished step.
- Implement an explicit `yolo-port resume` command.
- Yolo bootstrap auto-starts execution after the Phase 3 plan is approved; guided and standard flows persist a ready state and wait for `resume`.
- Execution-state artifacts must not be treated as completed-port evidence by the repo classifier.

### the agent's Discretion
- Exact handoff prompt text
- Exact event payload shape
- Exact terminal narration for execution and resume

### Deferred Ideas (OUT OF SCOPE)
- SQLite-backed execution events
- Non-Codex execution adapters
- Final-report synthesis

## Summary

Phase 4 should extend the current machine-state pattern instead of replacing it. The codebase already stores yolo-port-managed JSON artifacts under `.planning/yolo-port/`, shells out safely through typed adapters, and uses the bootstrap command as the main orchestration entrypoint. The best fit is a new execution-state persistence layer plus a shared managed-execution orchestrator that both yolo bootstrap and the explicit `resume` command call.

The default runner can rely on `codex exec`, which is available locally and supports non-interactive prompts. That gives yolo-port a real Codex-first execution surface without trying to duplicate GSD’s own planning/execution engine. The runner boundary still needs an override hook so tests and future adapters can substitute a deterministic script. On top of that runner, yolo-port should checkpoint its own orchestration steps durably and write a handoff contract to disk so resumes are inspectable and deterministic.

**Primary recommendation:** implement a shared managed-execution state machine that writes `execution-state.json`, `execution-events.jsonl`, and a generated handoff prompt/contract under `.planning/yolo-port/`, then invoke `codex exec` as the default runner and make `yolo-port resume` reuse the same orchestrator.

## Recommended Plan Decomposition

| Plan | Scope | Main deliverables | Must prove |
| --- | --- | --- | --- |
| `04-01` | GSD execution boundary and handoff contract | execution-state schema, event log writer, handoff prompt/contract, Codex-first runner adapter | yolo-port can trigger a managed execution flow directly after planning without manual command translation |
| `04-02` | Checkpoints and resume orchestration | shared managed-execution runner, `resume` command, yolo bootstrap auto-start, resumable checkpoint state | interrupted runs resume from the last reliable step and guided/standard flows can intentionally continue later |
| `04-03` | End-to-end execution and recovery verification | integration and smoke coverage for auto-start, explicit resume, and failure/retry recovery | yolo execution continues without extra yolo-port prompts, and failed runs can recover predictably |

## Architecture Patterns

### Pattern 1: Durable orchestration around an external executor
**What:** yolo-port owns state, checkpoints, and handoff files; the external runner owns the heavy execution.
**Why:** this keeps GSD/Codex interactions behind one adapter and prevents yolo-port from forking upstream workflow logic.

### Pattern 2: Ready/running/failed/completed execution states
**What:** a small explicit state machine records whether a managed run is prepared, in progress, blocked by a failure, or completed.
**Why:** it gives `resume` a deterministic place to restart and keeps reruns from guessing.

### Pattern 3: Handoff prompt as a first-class artifact
**What:** write the exact prompt or contract fed to the execution runner into `.planning/yolo-port/`.
**Why:** resumes and audits can then inspect the same execution intent instead of reconstructing it from logs.

## Common Pitfalls

### Pitfall 1: Treating partial runner output as a completed run
**How to avoid:** require the orchestration layer to mark completion explicitly only after the runner step and the verification step both finish successfully.

### Pitfall 2: Resuming from an unsafe midpoint
**How to avoid:** checkpoint only at whole-step boundaries and always restart from the first incomplete step.

### Pitfall 3: Letting new execution files trip the completed-port classifier
**How to avoid:** keep execution-state filenames distinct from completion markers and preserve the existing strong-evidence classifier threshold.

## What To Prove Early

- `yolo-port bootstrap --mode yolo --yes` can auto-start the managed execution with a stubbed runner.
- `yolo-port resume` starts a ready run without rebuilding the planning artifacts.
- A failed runner leaves a resumable `failed` state and a second `resume` can continue successfully.
- Execution events clearly show write-ahead and write-after boundaries for each major orchestration step.

## Sources

### Primary
- `codex --help` and `codex exec --help` — verified non-interactive Codex execution surface and flags
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`

### Secondary
- `src/adapters/system/gsd.ts` — current GSD install/update boundary
- `src/cli/commands/bootstrap.ts` — current bootstrap orchestration

---
*Phase: 04-gsd-execution-and-recovery*
*Research completed: 2026-04-11*
*Ready for planning: yes*

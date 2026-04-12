# Phase 4: GSD Execution and Recovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-gsd-execution-and-recovery
**Areas discussed:** execution runner, checkpoint model, resume surface, automatic yolo continuation

---

## Execution Runner

| Option | Description | Selected |
|--------|-------------|----------|
| Pure handoff only | Write command suggestions but never start execution directly | |
| Codex-first default runner | Use `codex exec` non-interactively with a generated handoff prompt, plus an env override for tests and future adapters | ✓ |
| Custom internal executor | Rebuild GSD execution logic entirely inside yolo-port | |

**User's choice:** Use a Codex-first default runner with an override hook for tests and future adapters.
**Notes:** The runner boundary should stay explicit and inspectable.

---

## Checkpoint Model

| Option | Description | Selected |
|--------|-------------|----------|
| Freeform markdown notes | Human-readable only, manually updated | |
| Append-only events + current state | Durable event log plus resumable execution-state record under `.planning/yolo-port/` | ✓ |
| Full SQLite event store | Transactional DB-backed state from day one | |

**User's choice:** Use append-only events plus a current execution-state record now.
**Notes:** This matches the current machine-state layout and keeps the phase manageable.

---

## Resume Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Bootstrap only | Force users back through bootstrap to resume | |
| Explicit `resume` command | Make `yolo-port resume` the recovery surface and reuse one shared execution orchestrator | ✓ |
| Hidden automatic retries only | Retry silently with no user-facing resume affordance | |

**User's choice:** Implement an explicit `resume` command.
**Notes:** Yolo bootstrap can still auto-start execution, but interrupted work needs a clean recovery entrypoint.

---

## Yolo Continuation

| Option | Description | Selected |
|--------|-------------|----------|
| Save-only | Never auto-start execution, even in yolo mode | |
| Auto-start after approved plan | Once bootstrap and the Phase 3 plan are approved, yolo mode starts execution without more yolo-port prompts | ✓ |
| Start only from `resume` | Require an explicit second command even in yolo mode | |

**User's choice:** Yolo bootstrap auto-starts managed execution after approval.
**Notes:** Guided and standard flows keep the saved execution-ready state and use `yolo-port resume`.

---

## the agent's Discretion

- Exact event payload fields beyond the required durable metadata
- Exact prompt text handed to `codex exec`
- Exact completion summary format

## Deferred Ideas

- SQLite-backed execution events
- Non-Codex execution adapters
- Final-report synthesis

---
*Phase: 04-gsd-execution-and-recovery*
*Discussion log generated: 2026-04-11*

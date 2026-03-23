---
phase: 02-repository-intake-and-workflow-control
plan: 02
subsystem: classification
tags: [classification, managed-state, bootstrap, parity]
requires:
  - phase: 02-01
    provides: normalized intake request model and git inspection boundary
provides:
  - conservative repo-state classification for fresh, in-progress, and already-ported repos
  - read-only managed-state evidence collection from `.planning/yolo-port/`
  - repo-status-first local intake output and confirmation gates
  - honest action menus for already-ported repos
affects: [bootstrap, classification, managed-state, reruns]
tech-stack:
  added: [repo classifier, managed state reader, classification UI]
  patterns:
    - strong completion evidence is required before a repo counts as already ported
    - mixed signals produce a recommendation plus confirmation instead of a silent guess
key-files:
  created:
    - src/persistence/managedRepoState.ts
    - src/adapters/fs/managedRepo.ts
    - src/domain/intake/classifyRepoState.ts
    - src/ui/classification.ts
    - scripts/smoke/intake-classification.sh
  modified:
    - src/domain/intake/types.ts
    - src/cli/commands/bootstrap.ts
key-decisions:
  - "Required strong completion evidence before classifying a repo as already ported."
  - "Ignored generic `.planning` documents unless `.planning/yolo-port/` machine state was present."
patterns-established:
  - "Already-ported action menus are ordered for summary, parity audit, upstream update, then managed artifact inspection."
  - "Read-only managed state lives behind one filesystem adapter so later phases do not re-implement breadcrumb discovery."
requirements-completed: ["REPO-02"]
duration: 4min
completed: 2026-03-22
---

# Phase 2: Repository Intake and Workflow Control Summary

**A conservative repo classifier that reads managed breadcrumbs honestly, leads with repo state, and avoids claiming completion on partial evidence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T00:46:30Z
- **Completed:** 2026-03-23T00:50:30Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added a typed evidence model and pure classifier for `fresh`, `in-progress`, and `already-ported` repo states.
- Added a read-only managed repo adapter that collects machine-owned breadcrumbs and prior summary evidence from `.planning/yolo-port/`.
- Updated bootstrap intake to lead with repo cleanliness and detected state, with explicit confirmation when signals are incomplete or conflicting.

## Task Commits

Each task was committed atomically:

1. **Task 1: Model classification evidence and conservative repo-state decisions** - `ff27afb` (feat)
2. **Task 2: Read yolo-port breadcrumbs and prior artifacts through one filesystem adapter** - `a5f8f0a` (feat)
3. **Task 3: Wire repo-status output, confirmation gates, and already-ported action menus** - `d71eb6d` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/persistence/managedRepoState.ts` - Typed machine-state model for markers, summaries, and completion evidence.
- `src/adapters/fs/managedRepo.ts` - Read-only breadcrumb and managed-artifact loader for `.planning/yolo-port/`.
- `src/domain/intake/classifyRepoState.ts` - Conservative classifier that returns recommended state, evidence, and whether confirmation is required.
- `src/ui/classification.ts` - Repo-status-first output for fresh, in-progress, ambiguous, and already-ported scenarios.
- `scripts/smoke/intake-classification.sh` - Shell smoke coverage for state detection and already-ported action ordering.

## Decisions Made

- Required both managed markers and completion evidence before surfacing `already-ported`, instead of letting bootstrap breadcrumbs count as finished work.
- Treated generic `.planning` docs without `.planning/yolo-port/` machine state as non-managed context rather than positive evidence.
- Surfaced audit and update actions honestly as planned follow-ups instead of pretending later-phase behavior already exists.

## Deviations from Plan

None. The plan landed as specified.

## Issues Encountered

- None beyond the expected edge cases around partial managed state and mixed evidence.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Repo classification now provides the conservative state boundary that Phase 3 can use to decide when to preserve source references and generate parity planning artifacts.
- The managed breadcrumb reader is ready to feed later audit, resume, and report flows without reintroducing ad hoc file probing.

---
*Phase: 02-repository-intake-and-workflow-control*
*Completed: 2026-03-22*

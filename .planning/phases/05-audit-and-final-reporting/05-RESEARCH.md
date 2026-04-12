# Phase 5: Audit and Final Reporting - Research

**Researched:** 2026-04-12
**Confidence:** HIGH
**Goal:** Audit already ported repositories against the preserved source surface and generate reusable final-report artifacts that combine parity status, estimate-vs-actual data, unresolved risks, and next steps.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Implement `yolo-port audit` as a real command against the current managed repo.
- Audit against the saved parity checklist plus a fresh current snapshot; include git diff stats when the source-reference tag exists.
- Persist both machine-readable and human-readable report artifacts under `.planning/yolo-port/`.
- Make the final report the preferred previous-summary surface for already-ported repos.
- Support concise default CLI output plus a verbose mode that prints the highest-signal findings directly.

### the agent's Discretion
- Exact final-report markdown shape
- Exact parity status thresholds
- Exact risk and next-step wording

### Deferred Ideas (OUT OF SCOPE)
- Upstream update workflow
- Rich dashboard reports
- Dynamic runtime parity verification

## Summary

Phase 5 can stay lean if it reuses the artifacts that already exist. Phase 3 gives us the saved parity checklist, source reference, and estimate metadata; Phase 4 gives us execution state, execution summary, and a repeatable managed-run boundary. The missing piece is a reusable audit/reporting layer that compares the current repo against the saved parity expectations and folds those results into a final report.

The cleanest implementation is a real `audit` command plus a pair of small reporting domains: one for parity-audit evaluation and one for final-report composition. The audit should take the saved checklist, scan the current repo with the existing snapshot adapter, and mark each saved surface as verified or missing. On top of that, the final report should compare estimated and actual execution data, include source-reference and diff metadata when available, and write a reusable `final-report.md` plus machine-readable JSON. The already-ported UX only needs narrow updates once those artifacts exist.

**Primary recommendation:** add a real audit command, a parity-audit evaluator over the saved checklist, and a final-report generator that writes `parity-audit.json`/`parity-audit.md` plus `final-report.json`/`final-report.md`, then wire already-ported UI to prefer the final report.

## Recommended Plan Decomposition

| Plan | Scope | Main deliverables | Must prove |
| --- | --- | --- | --- |
| `05-01` | Parity audit flow | audit schemas, current-state audit evaluator, git diff stats, real `audit` command | already ported repos can be audited directly against the saved source surface |
| `05-02` | Final report generation | final-report schemas, report builder, estimate-vs-actual section, reusable persisted artifacts | users receive one comprehensive report with parity status and next steps |
| `05-03` | UX polish and verification | already-ported UI polish, summary preference updates, integration/smoke coverage | audit/report artifacts are reusable and surfaced cleanly after the initial run |

## Architecture Patterns

### Pattern 1: Re-audit current state against saved expectations
**What:** Phase 5 consumes the saved Phase 3 checklist instead of rediscovering the intended source surface from scratch.
**Why:** the saved checklist is already the approved parity contract.

### Pattern 2: Machine-readable + human-readable reporting pair
**What:** every major reporting artifact has a JSON record plus a markdown view.
**Why:** CLI summaries, later automation, and future UI/reporting surfaces can all reuse the same source data.

### Pattern 3: Final report as the preferred summary surface
**What:** once audit/reporting lands, `final-report.md` becomes the “view previous run summary” target for completed repos.
**Why:** users should not have to stitch together plan and execution summaries manually once the final report exists.

## Common Pitfalls

### Pitfall 1: Treating any missing source-reference diff as audit failure
**How to avoid:** keep the audit functional with static surface checks even when git diff stats are unavailable, and report the missing diff context as a risk rather than a crash.

### Pitfall 2: Reconstructing execution metrics from prose only
**How to avoid:** read the structured execution state and planning JSON artifacts first, then use markdown summaries as supporting context.

### Pitfall 3: Leaving audit “planned” in the UI after it ships
**How to avoid:** update the already-ported action labels and summary path preference as part of the same phase.

## What To Prove Early

- `yolo-port audit` can run on a managed repo with a source-reference tag and saved parity plan and write fresh report artifacts.
- The final report includes estimate-vs-actual timing and cost context from the saved plan plus execution state.
- Already-ported repo entry still classifies correctly but now points to a real audit path and final report artifact.

## Sources

### Primary
- `.planning/phases/03-parity-planning-and-estimation/03-VERIFICATION.md`
- `.planning/phases/04-gsd-execution-and-recovery/04-VERIFICATION.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/ARCHITECTURE.md`

### Secondary
- `src/adapters/fs/portPlanning.ts`
- `src/adapters/fs/executionState.ts`
- `src/adapters/system/git.ts`

---
*Phase: 05-audit-and-final-reporting*
*Research completed: 2026-04-12*
*Ready for planning: yes*

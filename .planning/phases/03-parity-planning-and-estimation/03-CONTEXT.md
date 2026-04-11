---
generated_by: gsd-discuss-phase
lifecycle_mode: yolo
phase_lifecycle_id: phase-20260411T221530Z
generated_at: 2026-04-11T22:15:30.848Z
---

# Phase 3: Parity Planning and Estimation - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning
**Mode:** Yolo

<domain>
## Phase Boundary

Phase 3 adds the parity-planning layer that sits between repository intake and later autonomous execution. It must preserve a durable reference to the source implementation, inventory the repo's externally visible surfaces, and generate a parity-first estimate package with provider-pricing provenance before Phase 4 hands off to GSD execution.

</domain>

<decisions>
## Implementation Decisions

### Source reference preservation
- **D-01:** Preserve a machine-readable source reference artifact for every managed repo and create a git tag at the current HEAD when the repo is in git; when git is unavailable, fall back to a filesystem manifest snapshot instead of failing the flow.
- **D-02:** Record structural intent before execution as an in-place managed port that preserves 1:1 external interfaces, carries the chosen target stack forward when available, and blocks destructive restructuring until the reference snapshot and parity inventory exist.

### Interface inventory and parity
- **D-03:** Build the Phase 3 inventory from static inspection only. Do not execute repo scripts, builds, or third-party code while discovering interfaces.
- **D-04:** The high-level inventory must cover the surfaces that most often break parity in ports: CLI entrypoints and flags, HTTP routes, environment variables, config files, and package/public export surfaces when they are detectable.
- **D-05:** Generate a parity checklist that treats every detected external surface as required 1:1 parity by default and forces rare exceptions to be surfaced explicitly before execution starts.

### Pricing and estimation
- **D-06:** Keep provider pricing snapshots versioned inside this repo with captured dates and official source URLs; separate provider/model alias selection from the price table itself.
- **D-07:** Resolve the selected estimate model from the saved preferred agent/provider plus `.planning/config.json` model profile, and map model profiles to transparent reasoning levels rather than hiding that logic in the estimate output.
- **D-08:** Estimate output should be expressed as duration, token, and USD ranges with confidence and assumptions, not false precision.

### Proceed gate
- **D-09:** Generate the parity plan and estimate during bootstrap completion, then save an explicit proceed decision for downstream execution; yolo or `--yes` runs auto-approve, while guided and standard flows ask.
- **D-10:** Stay honest that Phase 4 owns the actual execution handoff. Phase 3 prepares and approves the parity-first plan, but does not pretend that end-to-end GSD execution already exists.

### the agent's Discretion
- Exact heuristics weights for repository complexity, token estimates, and confidence levels
- Exact markdown layout for stored parity and estimate artifacts
- Additional interface detectors that fit the current codebase cleanly without compromising the static-inspection rule

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- `.planning/PROJECT.md` — product value, parity promise, and portability constraints
- `.planning/REQUIREMENTS.md` — Phase 3 requirement IDs `REPO-03`, `PLAN-01`, `PLAN-02`, `PLAN-03`, and `PLAN-04`
- `.planning/ROADMAP.md` — phase goal, success criteria, and required plan decomposition
- `.planning/STATE.md` — active blockers and the current project position before Phase 3 starts

### Research and architecture
- `.planning/research/ARCHITECTURE.md` — recommended layering for repo introspection, parity planning, estimation, and persistence
- `.planning/research/FEATURES.md` — why interface inventory and estimate ranges are part of the MVP
- `.planning/research/PITFALLS.md` — hidden-interface, pricing-drift, and source-preservation failure modes to prevent
- `.planning/research/STACK.md` — Bun-first stack guidance and provider-pricing source references

### Existing implementation
- `src/cli/commands/bootstrap.ts` — current bootstrap orchestration entrypoint
- `src/cli/bootstrap/execute.ts` — live bootstrap mutation path after summary confirmation
- `src/adapters/system/git.ts` — structured git inspection and remote clone boundary
- `src/adapters/fs/planning.ts` — managed scaffold writer under `.planning/`
- `src/adapters/fs/managedRepo.ts` — existing source-reference and parity artifact discovery conventions
- `src/persistence/intakeProfile.ts` — persisted intake preferences including preferred agent and target stack

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/commands/bootstrap.ts`: already owns the checks -> questions -> summary -> execute lifecycle and is the correct place to insert the Phase 3 planning preview.
- `src/cli/bootstrap/execute.ts`: already resolves the final repo root after local or remote intake, so it can hand a concrete repo path to the parity-planning step.
- `src/adapters/system/git.ts`: provides the right boundary for git-derived source reference metadata and can be extended for reference tags or HEAD introspection.
- `src/adapters/fs/planning.ts`: already writes yolo-port managed artifacts and establishes `.planning/yolo-port/` as the machine-owned home for new planning outputs.
- `src/adapters/fs/managedRepo.ts`: already scans for `source-reference` and `parity` filenames, so Phase 3 artifacts should reuse those naming conventions.

### Established Patterns
- Pure decision logic lives in `src/domain`, while filesystem and process boundaries stay in `src/adapters`.
- CLI renderers return flat string arrays for human-readable terminal output.
- Integration tests use temp repos plus stubbed Bright Builds and GSD installers, so Phase 3 behavior should stay testable without external services.

### Integration Points
- After bootstrap execution succeeds, Phase 3 should analyze the resolved repo root, persist managed planning artifacts under `.planning/yolo-port/`, and render a planning preview before the final bootstrap completion summary.
- Saved intake preferences and `.planning/config.json` should drive provider/model selection for the estimate step.
- Phase 2 repo classification should automatically benefit from the new `source-reference` and `parity` artifacts without needing extra classification changes.

</code_context>

<specifics>
## Specific Ideas

- Keep the interface inventory explicitly high-level and static so users can trust it even on untrusted repositories.
- Make the estimate preview practical: show one selected provider/model path, clear ranges, and the pricing snapshot provenance in the same view.
- Treat the proceed gate as saved intent for later execution rather than a fake promise that Phase 4 already shipped.

</specifics>

<deferred>
## Deferred Ideas

- Actual GSD execution handoff, checkpointing, and resumable YOLO execution belong to Phase 4.
- Full parity audit against an already ported target repo belongs to Phase 5.
- Live refresh of provider pricing pages during runtime is out of scope for Phase 3; this phase ships with versioned in-repo snapshots and provenance.

</deferred>

---
*Phase: 03-parity-planning-and-estimation*
*Context gathered: 2026-04-11*

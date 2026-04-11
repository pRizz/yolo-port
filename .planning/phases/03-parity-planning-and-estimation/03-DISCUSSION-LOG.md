# Phase 3: Parity Planning and Estimation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 03-parity-planning-and-estimation
**Areas discussed:** source reference preservation, interface inventory scope, pricing snapshot strategy, proceed gate behavior

---

## Source Reference Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Git tag only | Preserve the current HEAD through a dedicated tag when git is available | |
| JSON manifest only | Persist repo metadata and a file manifest without touching git state | |
| Git tag plus machine artifact | Preserve the git ref when possible and always persist a machine-readable source reference artifact | ✓ |

**User's choice:** Preserve both a git-based reference when available and a machine-readable artifact in `.planning/yolo-port/`.
**Notes:** Gitless directories should still get a reference snapshot instead of failing the flow.

---

## Interface Inventory Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow | Only detect package manifests and a few obvious entrypoints | |
| Static high-signal | Detect CLI surfaces, HTTP routes, env vars, config files, and public exports through static inspection | ✓ |
| Dynamic deep scan | Run scripts or builds to discover runtime surfaces | |

**User's choice:** Use a static high-signal inventory and avoid executing repo code during discovery.
**Notes:** The goal is a trustworthy pre-execution inventory, not perfect dynamic tracing.

---

## Pricing Snapshot Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded friendly-model prices | Use one table keyed only by marketing model name | |
| Versioned provider snapshots with alias mapping | Keep dated pricing tables and resolve selected models through provider-aware aliases | ✓ |
| Live network fetch at runtime | Pull provider pricing on every bootstrap run | |

**User's choice:** Ship versioned in-repo pricing snapshots with captured dates and source URLs, then resolve selected models through provider/model-profile mapping.
**Notes:** Runtime fetching can come later if it becomes necessary.

---

## Proceed Gate Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No gate | Generate the estimate and continue silently | |
| Save-only gate | Generate the plan and save an approval decision for downstream execution | ✓ |
| Immediate execution handoff | Generate the plan and continue directly into execution | |

**User's choice:** Save an explicit proceed decision now, but keep real execution handoff for Phase 4.
**Notes:** Yolo runs auto-approve; guided and standard runs prompt.

---

## the agent's Discretion

- Exact estimate heuristics and confidence scoring
- Exact markdown presentation of parity and estimate artifacts
- Additional static detectors that fit the existing layering cleanly

## Deferred Ideas

- Live price refresh during runtime
- Dynamic interface discovery by running repo code
- Phase 4 execution handoff and checkpoint recovery

---
*Phase: 03-parity-planning-and-estimation*
*Discussion log generated: 2026-04-11*

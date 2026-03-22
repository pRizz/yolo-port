# Project Research Summary

**Project:** yolo-port
**Domain:** AI-assisted codebase porting CLI layered over get-shit-done
**Researched:** 2026-03-22
**Confidence:** HIGH

## Executive Summary

yolo-port fits best as a Bun-first TypeScript CLI with a thin runtime surface and a heavier orchestration core. The strongest architecture is not "another GSD clone"; it is a focused outer shell that detects repo state, inventories exposed interfaces, estimates cost/time, installs or verifies required tooling, and then invokes GSD-compatible workflows while maintaining its own durable checkpoint log and reporting layer.

The product's hardest problem is not command parsing. It is trustworthy automation under interruption while preserving 1:1 external parity. Research points to three non-negotiables for roadmap design: transactional resume state, an explicit parity inventory before major execution, and a model-pricing snapshot system with timestamps and provenance so estimate ranges remain credible as providers change aliases and prices.

The main implementation risk is distribution and interoperability drift: a Bun-first tool published through npm must verify its runtime expectations cleanly, and a GSD extension must keep a strict adapter boundary so upstream changes do not spill into the core workflow model.

## Key Findings

### Recommended Stack

The recommended foundation is Bun 1.3.11 plus TypeScript 5.9.3, with Bun Shell, Bun's built-in test runner, and `bun:sqlite` doing most of the heavy lifting. That keeps the v1 dependency surface small and aligns with the repo's preference for standard library and built-ins where practical.

GSD should remain an explicit dependency and execution substrate rather than something reimplemented locally. Bright Builds standards adoption should also use the upstream downstream installer rather than a bespoke local rewrite.

**Core technologies:**
- Bun 1.3.11: runtime, package management, shell, build, and SQLite support
- TypeScript 5.9.3: typed domain modeling for workflow state, parity findings, and estimates
- get-shit-done-cc 1.28.0: upstream planning/execution/install layer
- SQLite via `bun:sqlite`: durable checkpoints, events, and pricing metadata

### Expected Features

The launch feature set is straightforward but demanding: public install flow, remote and local repo entry modes, persisted user involvement modes, checkpointed resume behavior, up-front estimates, interface inventory/parity planning, GSD/standards bootstrap, and a comprehensive final report. The differentiators are the estimate engine, parity-first planning, and the ability to resume or later audit/update an existing port.

**Must have (table stakes):**
- Installable CLI with Codex-first asset bootstrap
- Repo detection for remote and local workflows
- Persisted guided/standard/YOLO modes
- Resume after interruption
- Final report with parity status
- GSD plus standards bootstrap

**Should have (competitive):**
- Time/token/USD estimate ranges with confidence
- Interface inventory and explicit parity matrix
- Existing-port audit/update mode
- High-signal taste/design questions before automation

**Defer (v2+):**
- Monolith-to-service extraction workflows
- Standalone test migration workflows
- Broader runtime adapter coverage beyond the initial targets

### Architecture Approach

The architecture should be a single Bun package in v1 with strict internal module boundaries: CLI, domain workflow services, adapters, persistence, reporting, pricing, and installable assets. The orchestration layer decides what to do; adapters talk to GSD, Git/GitHub, Codex, and Bright Builds; SQLite stores the event ledger and checkpoints; reporting consumes persisted read models rather than reconstructing the world from scratch.

**Major components:**
1. CLI/bootstrap layer — parse commands, ask minimal questions, render user-facing summaries
2. Workflow domain layer — choose start/resume/audit/update flows, persist intent, coordinate parity and estimate logic
3. Adapter layer — integrate with GSD, Codex asset installation, Git/GitHub, and Bright Builds
4. Persistence/reporting layer — durable event log, checkpoints, pricing snapshots, final summaries

### Critical Pitfalls

1. **Hidden interfaces break parity** — require a parity inventory before code generation
2. **Resume state is not transactional** — use append-only events and checkpoints
3. **Bun-first runtime confuses npm users** — make Bun verification/install explicit in bootstrap
4. **Upstream GSD coupling drifts** — keep all GSD behavior behind one adapter
5. **Pricing snapshots go stale** — store timestamped provider snapshots with provenance

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Bootstrap and State Spine
**Rationale:** every workflow depends on installability, repo detection, and durable resume state
**Delivers:** CLI entrypoints, mode persistence, Bun/GSD/runtime verification, SQLite event/checkpoint system
**Addresses:** install flow, repo entry modes, interruption recovery
**Avoids:** non-transactional resume state and Bun/npm install mismatch

### Phase 2: Parity Inventory and Estimation
**Rationale:** planning and automation are not trustworthy without explicit parity scope and cost visibility
**Delivers:** interface inventory, parity matrix, pricing snapshot catalog, estimate engine
**Uses:** SQLite state, provider snapshot metadata, repo scanners
**Implements:** parity and estimate domain modules

### Phase 3: GSD-Orchestrated Port Execution
**Rationale:** once the workflow is scoped and priced, the system can hand off to the inner execution engine safely
**Delivers:** GSD bridge, Codex-first asset installation, guided/standard/YOLO execution modes
**Uses:** upstream GSD install/invoke flows
**Implements:** adapter boundary and execution orchestration

### Phase 4: Reporting, Resume, Audit, and Update Flows
**Rationale:** the product promise includes walking away, coming back, and understanding what happened
**Delivers:** comprehensive end summary, estimate-vs-actual reporting, resume UX, existing-port audit/update commands
**Implements:** reporting layer and read models

### Phase 5: Hardening and Expansion Hooks
**Rationale:** public tooling needs stronger verification and a path to future adapters without destabilizing core logic
**Delivers:** verification hardening, source preservation safeguards, multi-runtime adapter hooks

### Phase Ordering Rationale

- Resume state comes first because every later phase depends on safe interruption handling.
- Parity inventory and estimation come before major execution because they set user trust and scope boundaries.
- GSD integration comes after the outer-shell rules are defined so upstream coupling stays thin and deliberate.
- Reporting comes after execution exists but before broader expansion, because it is part of the core product promise.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** pricing snapshot refresh strategy and model alias normalization
- **Phase 3:** exact GSD invocation/install boundary for Codex-first flows
- **Phase 4:** heuristics for parity comparison when source and target ecosystems express interfaces differently

Phases with standard patterns (skip research-phase):
- **Phase 1:** Bun + SQLite bootstrap and state-spine setup

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core recommendations are backed by official Bun, npm, GSD, and Bright Builds sources |
| Features | HIGH | Strongly grounded in the product intent captured in PROJECT.md plus known upstream workflow capabilities |
| Architecture | HIGH | The recommended separation follows the repo standards and the observed dependency boundaries |
| Pitfalls | HIGH | The biggest risks are directly implied by the product promise and confirmed by source/tooling constraints |

**Overall confidence:** HIGH

### Gaps to Address

- Provider pricing pages should be refreshed by automation or explicit update commands before shipping estimates as a stable feature.
- GSD invocation should be validated against the current published package and Codex install path during implementation, not assumed from documentation alone.

## Sources

### Primary (HIGH confidence)
- https://bun.com/docs/installation — Bun installation and runtime expectations
- https://bun.com/docs/runtime/shell — cross-platform shell orchestration and safe interpolation
- https://bun.com/docs/runtime/sqlite — transactional local persistence foundation
- https://bun.com/docs/test — built-in testing surface
- https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/README.md — upstream install and workflow contract
- https://raw.githubusercontent.com/bright-builds-llc/coding-and-architecture-requirements/main/AI-ADOPTION.md — standards bootstrap contract
- `.planning/PROJECT.md` — product-specific requirements and constraints

### Secondary (MEDIUM confidence)
- https://www.npmjs.com/package/get-shit-done-cc — published GSD package version
- https://www.npmjs.com/package/typescript — TypeScript version
- https://www.npmjs.com/package/zod — Zod version
- https://www.npmjs.com/package/@clack/prompts — prompt library version
- https://www.npmjs.com/package/semver — semver library version

### Tertiary (LOW confidence)
- https://openai.com/api/pricing/ — provider pricing source to snapshot during implementation
- https://docs.anthropic.com/en/docs/about-claude/pricing — provider pricing source to snapshot during implementation
- https://docs.anthropic.com/en/docs/claude-code/model-config — current Anthropic model alias behavior for estimator mapping

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*

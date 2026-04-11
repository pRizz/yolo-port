# Phase 3: Parity Planning and Estimation - Research

**Researched:** 2026-04-11
**Confidence:** HIGH
**Goal:** Preserve a durable source reference, inventory exposed interfaces through static inspection, and generate a parity-first estimate package with pricing provenance before execution begins.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Preserve a machine-readable source reference artifact for every managed repo and create a git tag at the current HEAD when git is available.
- Record structural intent before execution as an in-place managed port with 1:1 external parity and the chosen target stack when available.
- Use static inspection only for the Phase 3 interface inventory.
- Cover CLI entrypoints and flags, HTTP routes, environment variables, config files, and package/public exports when detectable.
- Treat every detected external surface as required 1:1 parity by default and surface rare exceptions explicitly before execution.
- Keep provider pricing snapshots versioned in-repo with captured dates and official source URLs.
- Resolve the selected estimate model from the saved preferred agent/provider plus `.planning/config.json` model profile.
- Save an explicit proceed decision for downstream execution, but stay honest that Phase 4 owns the actual handoff.

### the agent's Discretion
- Exact heuristics weights for repository complexity, token estimates, and confidence levels
- Exact markdown layout for stored parity and estimate artifacts
- Additional static detectors that fit the codebase cleanly

### Deferred Ideas (OUT OF SCOPE)
- Runtime price refresh against provider sites
- Dynamic interface tracing by executing repo code
- Execution handoff and checkpoint recovery

## Summary

Phase 3 should stay light on dependencies and heavy on explicit artifacts. The existing bootstrap flow already determines the repo root, persists intake preferences, and owns the final user-facing summary, so the cleanest implementation is to add one planning-preview step after bootstrap execution succeeds. That step should preserve the source reference first, perform a static repo scan, derive a high-signal interface inventory, resolve a provider/model pair from saved preferences plus the planning config, and then estimate duration, token, and USD ranges from repository complexity.

The strongest fit for this repo is a pure-domain plus thin-adapter approach. Static scanning, estimate math, and provider/model selection should be pure and unit-testable. Git reference preservation, file walking, config reads, and artifact writes should stay in adapters. Human-facing preview text and markdown artifacts should be rendered separately so the stored machine state and terminal output can evolve independently.

**Primary recommendation:** extend the bootstrap flow with a dedicated Phase 3 planning-preview pipeline that writes `.planning/yolo-port/source-reference.json`, `parity-checklist.md`, `interface-inventory.json`, `pricing-snapshot.json`, `port-plan.md`, and a saved proceed decision without pretending that Phase 4 execution already exists.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun built-ins | current repo baseline | file walking, process execution, JSON writes, tests | Already in use, keeps the phase dependency-free, and matches the Bun-first repo guidance |
| TypeScript | current repo baseline | typed inventory, estimate, and persistence models | Strong typing matters because the estimate and parity artifacts become long-lived machine-owned state |
| Git CLI | system dependency already required by the project | preserve HEAD metadata and create a source-reference tag when possible | Existing adapters already shell out to git, and the source reference must match real repo state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new dependency | n/a | keep static scanning and estimate logic local to the repo | Preferred here because the inventory and estimate heuristics are phase-specific and modest in scope |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local static scanners | heavyweight AST or repo-analysis libraries | More precision, but too much complexity and dependency surface for a high-level pre-execution inventory |
| Versioned in-repo pricing snapshots | live provider fetches at runtime | More up to date, but adds network volatility to a bootstrap phase that should remain deterministic |

## Recommended Plan Decomposition

| Plan | Scope | Main deliverables | Must prove |
| --- | --- | --- | --- |
| `03-01` | Source reference and structural intent | git or filesystem source reference artifact, structural intent record, artifact writer boundary | every managed repo has a durable source reference before later phases mutate code |
| `03-02` | Interface inventory and parity checklist | static repo scanner, inventory model, parity checklist renderer | the user can review high-level external surfaces before execution |
| `03-03` | Provider pricing snapshot catalog | versioned pricing snapshot data, alias selection model, provenance metadata | estimate inputs are tied to dated official sources, not hardcoded mystery numbers |
| `03-04` | Estimate generation and proceed gate | complexity heuristics, preview renderer, saved approval decision | the user sees time/token/USD ranges with the selected model path and a saved proceed state |

## Architecture Patterns

### Pattern 1: Preserve first, then analyze
**What:** capture the source reference before generating parity or estimate artifacts.
**Why:** source preservation is a precondition for trustworthy parity planning and later destructive work.

### Pattern 2: Static high-signal inventory
**What:** scan manifests and source files for external-surface clues without running the repo.
**Why:** this keeps Phase 3 safe on untrusted repositories and avoids bootstrap-time side effects.

### Pattern 3: Provider alias resolution over raw preference strings
**What:** map saved agent/provider preferences plus the planning config profile onto a known provider/model pair.
**Why:** users think in terms like `codex`, `claude`, `quality`, and `budget`, while pricing data needs explicit models and prices.

## Common Pitfalls

### Pitfall 1: Declaring parity from repo shape alone
**What goes wrong:** the tool reports a confident parity plan even though it only counted files.
**How to avoid:** inventory explicit external surfaces and render them into a checklist the user can inspect.

### Pitfall 2: Preserving source state only in memory
**What goes wrong:** later phases cannot prove which source state the plan came from.
**How to avoid:** persist the reference artifact under `.planning/yolo-port/` and create a git tag when git exists.

### Pitfall 3: Hiding estimate provenance
**What goes wrong:** the user sees a price range but cannot tell when or where the pricing came from.
**How to avoid:** ship a dated pricing snapshot artifact with official source URLs and selected-model details.

## What To Prove Early

- A managed repo gets a durable source-reference artifact even if it is not in git.
- Git-backed repos preserve a tag that points to the pre-execution HEAD.
- Static scanning detects the obvious parity-sensitive surfaces in representative repos: CLI entrypoints, flags, HTTP routes, env vars, and config files.
- The planning preview names the selected provider/model and reasoning profile and shows snapshot provenance.
- Guided and standard flows can decline the proceed gate while yolo and `--yes` flows auto-approve.

## Sources

### Primary
- `https://openai.com/api/pricing` — OpenAI flagship model pricing, including GPT-5.4, GPT-5.4 mini, and GPT-5.4 nano
- `https://platform.openai.com/docs/pricing/` — OpenAI API pricing reference with current Codex-family entries
- `https://docs.anthropic.com/en/docs/about-claude/pricing` — Anthropic model pricing table and cache pricing
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`

### Secondary
- `.planning/research/STACK.md` — stack and source guidance already captured for this project

---
*Phase: 03-parity-planning-and-estimation*
*Research completed: 2026-04-11*
*Ready for planning: yes*

# Pitfalls Research

**Domain:** AI-assisted codebase porting CLI layered over get-shit-done
**Researched:** 2026-03-22
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Hidden external interfaces break parity

**What goes wrong:**
The workflow ports code successfully but misses externally visible behavior such as routes, CLI flags, env vars, exit codes, config file shapes, or output formats.

**Why it happens:**
Teams inspect implementation details instead of first enumerating the actual public surface area.

**How to avoid:**
Make interface inventory a required pre-execution artifact and treat it as the source of truth for parity validation.

**Warning signs:**
No explicit interface checklist, no parity matrix, or summaries that talk about files changed but not exposed behavior.

**Phase to address:**
Phase 1 or 2, before major code generation.

---

### Pitfall 2: Resume state is not transactional

**What goes wrong:**
An interrupted run restarts from the wrong place, skips work, or repeats destructive steps.

**Why it happens:**
State is stored only in loose markdown notes or partially written JSON files without a clear started/finished event model.

**How to avoid:**
Use write-ahead and write-after events plus checkpoint snapshots in SQLite, and require explicit step boundaries.

**Warning signs:**
Ambiguous "current step" notes, no durable event IDs, or a resume flow that guesses instead of reading committed state.

**Phase to address:**
Phase 1, when the orchestration spine is built.

---

### Pitfall 3: Bun-first design undermines public npm installability

**What goes wrong:**
Users install the package globally with npm but cannot actually run it because Bun is missing or the runtime expectation is unclear.

**Why it happens:**
The implementation assumes Bun is already present while the distribution story targets generic npm users.

**How to avoid:**
Make Bun verification/install an explicit part of bootstrap and document the runtime contract in the install flow.

**Warning signs:**
The published package has a bin but no runtime preflight, or install docs bury the Bun prerequisite.

**Phase to address:**
Phase 1, during CLI bootstrap and installation design.

---

### Pitfall 4: Tight coupling to upstream GSD internals

**What goes wrong:**
Upstream GSD changes break yolo-port orchestration because yolo-port depended on undocumented internals or copied upstream prompts verbatim.

**Why it happens:**
Extension layers often slide into fork behavior unless the boundary is explicit.

**How to avoid:**
Use documented install/invoke paths, keep yolo-port prompts additive, and isolate GSD interactions behind one adapter boundary.

**Warning signs:**
Multiple parts of the codebase shelling out to GSD independently or duplicating upstream assets without provenance.

**Phase to address:**
Phase 2, when adapters and prompt assets are established.

---

### Pitfall 5: Pricing estimates drift from provider reality

**What goes wrong:**
The tool quotes costs that are materially wrong because model names, aliases, or prices changed.

**Why it happens:**
Provider pricing pages and model aliases change over time, and marketing names do not always match API/runtime aliases cleanly.

**How to avoid:**
Store timestamped pricing snapshots with source URLs, separate provider alias mapping from price tables, and show estimate ranges with confidence.

**Warning signs:**
Hardcoded prices without dates, no provenance on pricing data, or a single model label used across multiple providers.

**Phase to address:**
Phase 2, alongside the estimator.

---

### Pitfall 6: Destructive repo restructuring happens before reference preservation

**What goes wrong:**
The workflow moves or rewrites source code in a way that makes the original implementation hard to inspect or compare later.

**Why it happens:**
Automation optimizes for immediate transformation without first preserving a clean reference implementation or branch strategy.

**How to avoid:**
Create explicit reference snapshots, preserve upstream copies when restructuring, and record those decisions in the persisted plan.

**Warning signs:**
No source snapshot branch/directory, no mention of reference implementation preservation, or destructive moves before parity inventory is complete.

**Phase to address:**
Phase 2 or early Phase 3, before structural rewrites.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store workflow state only in markdown | Fast to prototype | Resume logic becomes guesswork | Only for throwaway experiments, never for v1 product workflow |
| Hardcode provider prices | Simple estimate math | Estimates become stale and misleading | Never |
| Inline runtime-specific logic in core workflow services | Faster first implementation | Every new adapter becomes painful | Never |
| Skip interface inventory and audit only at the end | Faster start to coding | Late parity surprises are expensive | Never for ports claiming 1:1 parity |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GSD | Assume all runtimes install the same way | Respect Codex's skills-first install path and GSD's documented install modes |
| Bright Builds | Call install blindly | Run `status` first, then `install` or `update` based on the documented state |
| GitHub repos | Treat remote URL and local repo flows as unrelated code paths | Normalize both into one repo descriptor and one workflow state model |
| Pricing providers | Tie prices directly to friendly model names only | Persist provider, alias, snapshot date, and source URL separately |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-scan the entire repo on every step | Slow planning, wasted tokens, sluggish resume | Cache interface inventories and file manifests | Medium-to-large repos |
| Dump raw code into every AI call | High token burn and context thrash | Summarize and scope context per step | Any repo with non-trivial size |
| Unbounded markdown logs | Huge `.planning` artifacts and noisy diffs | Keep transactional state in SQLite and export concise summaries | Long-running or repeated ports |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Execute untrusted repo scripts during inspection | Supply-chain or local environment compromise | Default to static inspection first and gate script execution explicitly |
| Interpolate repo paths/URLs into raw shell commands | Shell injection and data loss | Use Bun Shell template literals and validated inputs |
| Leak secrets into checkpoints or final reports | Credential exposure in committed artifacts | Redact env vars, tokens, and credentials before persisting summaries |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hiding destructive plan decisions | Users lose trust quickly | Show planned structural moves before execution, even in YOLO mode summaries |
| Opaque long-running steps | User cannot tell if the tool is hung or working | Emit checkpointed progress with current step and next resume point |
| Burying parity exceptions in final output | Users think the port is exact when it is not | Surface exceptions at estimate/plan time and again in the final report |

## "Looks Done But Isn't" Checklist

- [ ] **Bootstrap:** verified Bun, GSD, and standards installation paths rather than assuming they exist
- [ ] **Parity:** enumerated routes, flags, schemas, env vars, file formats, and operational interfaces
- [ ] **Resume:** successfully simulated interruption and recovery from a checkpoint
- [ ] **Estimate engine:** recorded provider, model alias, price snapshot date, and confidence range
- [ ] **Final report:** includes explicit parity exceptions and estimate-vs-actual comparison

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hidden external interfaces | HIGH | Rebuild interface inventory, rerun parity gap analysis, and update plan/report |
| Corrupt resume state | HIGH | Reconstruct from last valid checkpoint, mark suspect steps for re-run, and repair the event ledger |
| Stale pricing data | LOW | Refresh provider snapshots and recalculate estimates |
| Broken GSD coupling | MEDIUM | Patch the GSD adapter boundary and keep domain state untouched |
| Lost reference implementation | HIGH | Recover from branch/snapshot backup, then block destructive moves until preserved |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hidden external interfaces | Phase 2 | A persisted parity inventory exists before code generation starts |
| Non-transactional resume state | Phase 1 | Simulated interruption resumes from a checkpoint without duplicate destructive work |
| Bun/npm install mismatch | Phase 1 | Fresh machine bootstrap succeeds from documented install flow |
| Tight GSD coupling | Phase 2 | Only one adapter layer talks to GSD and upstream changes do not require domain edits |
| Pricing estimate drift | Phase 2 | Pricing snapshots show source URL and capture date |
| Destructive restructuring before preservation | Phase 3 | Source snapshot/reference copy is recorded before major moves |

## Sources

- https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/README.md
- https://raw.githubusercontent.com/bright-builds-llc/coding-and-architecture-requirements/main/AI-ADOPTION.md
- https://bun.com/docs/installation
- https://bun.com/docs/runtime/shell
- https://bun.com/docs/runtime/sqlite
- https://openai.com/api/pricing/
- https://docs.anthropic.com/en/docs/about-claude/pricing
- https://docs.anthropic.com/en/docs/claude-code/model-config
- `.planning/PROJECT.md`

---
*Pitfalls research for: AI-assisted codebase porting CLI layered over get-shit-done*
*Researched: 2026-03-22*

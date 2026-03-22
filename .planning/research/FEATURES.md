# Feature Research

**Domain:** AI-assisted codebase porting CLI layered over get-shit-done
**Researched:** 2026-03-22
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Installable CLI bootstrap | Public developer tooling must be easy to install and invoke | MEDIUM | Needs npm install flow, Bun verification, and Codex-first asset installation |
| Remote repo and local repo entry modes | Users expect both `yolo-port <repo>` and in-repo execution | MEDIUM | Local mode must distinguish fresh, in-progress, and previously ported repos |
| Persisted involvement modes | Automation tools need a clear guided vs YOLO behavior contract | LOW | Persist choice in `.planning` so resumes behave consistently |
| Durable resume and interruption recovery | Long-running ports are expected to survive cancellations and crashes | HIGH | Requires transactional event logging, checkpoints, and resume confirmation |
| Final report with parity status | Users need to know what changed and whether the port actually matches the source surface | MEDIUM | Must highlight rare parity exceptions early and again at the end |
| GSD integration and standards bootstrap | This product is explicitly an outer shell over GSD plus repo standards installation | MEDIUM | Must verify/install GSD and Bright Builds requirements without user expertise |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Up-front duration, token, and USD estimation | Lets users decide before spending hours or money on a large port | HIGH | Needs model catalog snapshots, repo-size heuristics, and uncertainty bands |
| External API/interface parity audit | Makes 1:1 parity an explicit product promise instead of a vague goal | HIGH | Must inventory HTTP routes, CLI flags, file formats, env vars, schemas, and other exposed interfaces |
| Existing-port audit/update mode | Supports maintaining a port after the initial migration | HIGH | Depends on breadcrumbs, source/target linkage, and stored execution metadata |
| Taste/design question layer before automation | Gives users just enough control without requiring them to become GSD experts | MEDIUM | Needs smart, high-signal questions instead of long setup ceremonies |
| Agent-platform adapter model | Keeps Codex first while making future expansion realistic | MEDIUM | Should be architected in v1 even if only Codex ships first |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| GUI dashboard in v1 | Feels approachable and marketable | Splits attention away from the hard part: reliable port orchestration and parity tracking | Ship a strong CLI plus rich final reports first |
| Rebuilding GSD inside yolo-port | Seems cleaner than depending on another system | Creates duplicate planning/execution logic and weakens interoperability | Treat GSD as the engine and keep yolo-port as the orchestrator |
| Silent destructive automation | Feels maximally automated | Risk of losing reference code, deleting work, or making the wrong structural move without traceability | Require checkpoints, logs, and explicit mode-driven destructive behavior rules |

## Feature Dependencies

```text
Repo detection
    └──requires──> Persistent project metadata
                          └──requires──> Durable state store

Parity audit
    └──requires──> Interface inventory
                          └──requires──> Source repo inspection

Estimator
    └──requires──> Repo analysis
    └──requires──> Model pricing snapshot catalog

Resume / update / audit modes
    └──requires──> Breadcrumbs + execution event log

YOLO mode
    └──enhances──> Standard orchestration flow
    └──conflicts──> Ambiguous destructive actions without prior checkpointing
```

### Dependency Notes

- **Repo detection requires persistent project metadata:** local reruns need reliable breadcrumbs to decide whether to start, resume, audit, or update.
- **Parity audit requires interface inventory:** parity cannot be claimed from generated code alone; the exposed source surface must be enumerated first.
- **Estimator requires repo analysis and pricing snapshots:** estimates without both codebase size signals and current provider prices will be misleading.
- **Resume/update/audit all require the same state spine:** a single durable execution ledger should drive all three behaviors.
- **YOLO mode conflicts with ambiguity:** fully autonomous behavior still needs safe defaults and stored checkpoints before destructive steps.

## MVP Definition

### Launch With (v1)

- [ ] Installable CLI with Codex-first asset installation and GSD verification/installation
- [ ] Remote and local repo entry flows with basic wizarding
- [ ] Persisted guided/standard/YOLO involvement modes
- [ ] Interface inventory and parity plan generation before major execution
- [ ] Up-front duration/token/USD estimate ranges using provider snapshot data
- [ ] Resume after interruption from a durable checkpoint log
- [ ] Final report with parity status, exceptions, estimate-vs-actuals, and next steps

### Add After Validation (v1.x)

- [ ] Existing-port update flow against a newer upstream source revision
- [ ] Broader runtime adapter support beyond Codex
- [ ] Richer port templates for common source/target pairs

### Future Consideration (v2+)

- [ ] Monolith-to-service extraction workflows
- [ ] Test-suite migration as a first-class standalone workflow
- [ ] Build-system migration as a first-class standalone workflow

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CLI bootstrap and install flow | HIGH | MEDIUM | P1 |
| Remote/local repo detection | HIGH | MEDIUM | P1 |
| Persistent modes and metadata | HIGH | LOW | P1 |
| Resume and checkpointing | HIGH | HIGH | P1 |
| Interface inventory and parity audit | HIGH | HIGH | P1 |
| Estimate engine | HIGH | HIGH | P1 |
| Final report | HIGH | MEDIUM | P1 |
| Existing-port update flow | MEDIUM | HIGH | P2 |
| Multi-runtime adapters | MEDIUM | MEDIUM | P2 |
| GUI/dashboard | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Manual GSD usage | One-off custom port scripts | Our Approach |
|---------|------------------|-----------------------------|--------------|
| Guided bootstrap | Requires the user to know which GSD commands to run | Usually missing or ad hoc | Explicit onboarding that hides GSD internals |
| Resume/recovery | Depends on the operator maintaining context | Often brittle or absent | First-class checkpoints and restart logic |
| Parity audit | Possible, but not productized | Rarely systematic | Make interface inventory and parity reporting part of the happy path |
| Cost estimation | Usually manual guesswork | Usually absent | Model-aware time/token/USD estimation before execution |

## Sources

- https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/README.md
- https://raw.githubusercontent.com/bright-builds-llc/coding-and-architecture-requirements/main/AI-ADOPTION.md
- https://bun.com/docs/installation
- https://bun.com/docs/runtime/shell
- https://openai.com/api/pricing/
- https://docs.anthropic.com/en/docs/about-claude/pricing
- https://docs.anthropic.com/en/docs/claude-code/model-config
- `.planning/PROJECT.md`

---
*Feature research for: AI-assisted codebase porting CLI layered over get-shit-done*
*Researched: 2026-03-22*

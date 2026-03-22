# Architecture Research

**Domain:** AI-assisted codebase porting CLI layered over get-shit-done
**Researched:** 2026-03-22
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       CLI / UX Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Arg parser  │  │ Prompt flow  │  │ Report rendering   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘  │
│         │                │                    │             │
├─────────┴────────────────┴────────────────────┴─────────────┤
│                 Orchestration / Domain Layer                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Repo detect │  │ Parity plan │  │ Estimate engine     │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────────────┤  │
│  │ Mode select │  │ Port flow   │  │ Resume coordinator  │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬──────────┘  │
│         │                │                    │             │
├─────────┴────────────────┴────────────────────┴─────────────┤
│                      Adapter / IO Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ GSD bridge │ │ Codex inst │ │ Git/GitHub │ │ Standards│ │
│  │            │ │ + assets   │ │ adapter    │ │ bootstrap│ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └────┬─────┘ │
│        │              │              │              │       │
├────────┴──────────────┴──────────────┴──────────────┴───────┤
│                    Persistence / Artifact Layer             │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ SQLite log │  │ Pricing db  │  │ Markdown/JSON output │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| CLI layer | Parse commands, ask only the highest-signal questions, and render summaries | Bun entrypoints plus `node:util.parseArgs` and `@clack/prompts` |
| Orchestration layer | Decide what workflow to run, persist intent, checkpoint progress, and coordinate adapters | Pure domain services with explicit state transitions |
| GSD bridge | Verify/install GSD, map yolo-port workflow steps to GSD capabilities, and invoke upstream flows | Thin adapter that shells out or writes the right install/skill artifacts |
| Repo/introspection adapters | Clone repos, inspect source trees, and extract interface inventory/parity surface | Bun Shell + Git CLI + filesystem scanners |
| Persistence layer | Store append-only events, checkpoints, pricing snapshots, and report metadata | SQLite for machine state; markdown/json for human-readable exports |

## Recommended Project Structure

```text
src/
├── cli/                  # Entry points, arg parsing, and prompt orchestration
│   ├── commands/         # start, resume, audit, update
│   └── prompts/          # involvement mode and bootstrap questions
├── domain/               # Pure business logic and domain types
│   ├── project/          # repo state, workflow intent, breadcrumbs
│   ├── parity/           # interface inventory and parity findings
│   ├── estimates/        # time/token/USD estimation logic
│   └── workflow/         # state machine and checkpoint transitions
├── adapters/             # External system integrations
│   ├── gsd/              # install/invoke get-shit-done
│   ├── codex/            # Codex-first asset installation
│   ├── git/              # clone, branch, diff, snapshot helpers
│   ├── github/           # remote metadata and repo resolution
│   └── standards/        # Bright Builds install/update/status wrapper
├── persistence/          # SQLite access and exported state snapshots
├── reporting/            # estimates, summaries, parity reports
├── pricing/              # provider pricing snapshots and source metadata
└── assets/               # prompts, templates, skills, and installable files
```

### Structure Rationale

- **`src/domain/`:** keeps workflow decisions independent from Codex, GSD, Git, or provider specifics.
- **`src/adapters/`:** isolates every external dependency boundary so upstream churn is contained.
- **`src/persistence/` and `src/reporting/`:** separates transactional machine state from human-facing artifacts.
- **`src/assets/`:** prompt/skill packs are first-class product assets and should not be buried under generic source folders.

## Architectural Patterns

### Pattern 1: Functional Core, Imperative Shell

**What:** keep planning, resume, estimation, and parity logic pure; push file writes and command execution to adapters.
**When to use:** always, especially for state transitions and estimator calculations.
**Trade-offs:** slightly more up-front structure, but much easier testing and fewer hidden side effects.

**Example:**
```typescript
type WorkflowDecision =
  | { kind: "start"; mode: "guided" | "standard" | "yolo" }
  | { kind: "resume"; checkpointId: string }
  | { kind: "audit"; upstreamRef: string | null };

function chooseWorkflow(input: RepoState): WorkflowDecision {
  if (input.maybeResumeCheckpoint) return { kind: "resume", checkpointId: input.maybeResumeCheckpoint };
  if (input.isAlreadyPorted) return { kind: "audit", upstreamRef: input.maybeUpstreamRef };
  return { kind: "start", mode: input.defaultMode };
}
```

### Pattern 2: Append-Only Event Log with Materialized Checkpoints

**What:** write intent before work, write outcome after work, and derive current state from durable events plus periodic checkpoints.
**When to use:** every long-running workflow step, especially destructive or expensive ones.
**Trade-offs:** more persistence code, but much stronger recovery and auditability.

**Example:**
```typescript
await events.append({ type: "step_started", step: "interface_inventory", at: now });
const result = await inventoryInterfaces(repo);
await checkpoints.save({ step: "interface_inventory", result });
await events.append({ type: "step_finished", step: "interface_inventory", at: now });
```

### Pattern 3: Thin Adapter Boundary for Agent Ecosystems

**What:** Codex, future Claude/OpenCode/Cursor integrations, and GSD itself live behind adapters with a shared orchestration contract.
**When to use:** whenever runtime-specific install paths, config writes, or command invocation differ.
**Trade-offs:** a bit of indirection, but avoids runtime-specific conditionals everywhere.

## Data Flow

### Request Flow

```text
[User invokes yolo-port]
    ↓
[CLI parse + repo detection]
    ↓
[Load persisted metadata / choose mode]
    ↓
[Interface inventory + parity plan]
    ↓
[Estimate duration/token/USD]
    ↓
[Persist approved workflow intent]
    ↓
[Install/verify GSD + standards]
    ↓
[Invoke execution flow]
    ↓
[Stream checkpoints and final report]
```

### State Management

```text
[SQLite event store]
    ↓ (load current workflow state)
[Domain workflow service]
    ↓
[Checkpoint writer] → [Markdown / JSON exports]
    ↓
[Resume / audit / update entry commands]
```

### Key Data Flows

1. **Bootstrap flow:** repo inspection -> mode selection -> parity inventory -> estimate generation -> persisted plan.
2. **Execution flow:** orchestration decision -> GSD/adapter actions -> checkpoint updates -> final report synthesis.
3. **Resume flow:** read checkpoint -> confirm next step -> continue from last durable boundary instead of re-running everything.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Small repo (single service) | One process and one SQLite state store is enough. Favor simple file walkers and synchronous SQLite operations. |
| Medium repo (multi-package/monorepo) | Add scoped repo scanners, per-package interface inventories, and cached file metadata to avoid repeated full-tree analysis. |
| Large legacy codebase | Add chunked analysis, resumable subtasks, and explicit source/reference snapshots so the workflow survives long runs and huge token budgets. |

### Scaling Priorities

1. **First bottleneck:** repeated full-repo scans during planning. Fix with cached inventories and explicit file manifests.
2. **Second bottleneck:** oversized AI context loads. Fix by summarizing interfaces and planning artifacts rather than reloading raw trees.

## Anti-Patterns

### Anti-Pattern 1: Mixing workflow policy with runtime-specific code

**What people do:** scatter Codex/GSD/Git conditionals through the main workflow logic.
**Why it's wrong:** every new runtime or upstream change forces edits across the core orchestration path.
**Do this instead:** keep the domain state machine ignorant of runtime/platform specifics and route through adapters.

### Anti-Pattern 2: Declaring parity from generated code alone

**What people do:** assume a successful build or test pass proves the port matches the original surface.
**Why it's wrong:** many externally visible mismatches live in routes, flags, schemas, env vars, data formats, or operational behavior.
**Do this instead:** explicitly inventory interfaces up front and compare delivered behavior against that inventory.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| get-shit-done | Verify/install, then invoke through documented commands and installed assets | Treat upstream behavior as versioned external contract |
| Bright Builds downstream installer | Shell wrapper around `status`, `install`, and `update` | Respect blocked states instead of forcing writes |
| Git / GitHub | Clone, inspect remotes, diff upstream vs port, preserve reference snapshots | Must handle local repos and remote URLs consistently |
| Provider pricing pages | Snapshot official prices and model aliases into local catalogs | Store timestamped provenance with every snapshot |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI -> domain | Typed request objects | No raw shell/process logic in the CLI layer |
| Domain -> adapters | Ports/interfaces | Makes adapters mockable and replaceable |
| Domain -> persistence | Repository abstraction | Keeps workflow logic testable without a real database |
| Persistence -> reporting | Read models / summaries | Reporting should not reconstruct workflow state from scratch |

## Sources

- https://bun.com/docs/installation
- https://bun.com/docs/runtime/shell
- https://bun.com/docs/runtime/sqlite
- https://bun.com/docs/test
- https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/README.md
- https://raw.githubusercontent.com/bright-builds-llc/coding-and-architecture-requirements/main/AI-ADOPTION.md
- `.planning/PROJECT.md`

---
*Architecture research for: AI-assisted codebase porting CLI layered over get-shit-done*
*Researched: 2026-03-22*

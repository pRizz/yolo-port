# Stack Research

**Domain:** AI-assisted codebase porting CLI layered over get-shit-done
**Researched:** 2026-03-22
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bun | 1.3.11 | Runtime, package manager, test runner, build tooling | Bun ships as a single executable, supports npm installation paths, includes a cross-platform shell API, and has built-in SQLite and test tooling. That keeps the CLI lean while still matching the user's Bun-first requirement. |
| TypeScript | 5.9.3 | Implementation language for CLI, orchestration, state, and estimators | Strong typing matters here because workflow state, parity findings, model pricing snapshots, and resume checkpoints all need explicit domain shapes. |
| get-shit-done-cc | 1.28.0 | Underlying planning/execution engine and install surface | Upstream GSD already supports Codex and other runtimes, uses skills-first installation for Codex, and provides the planning/execution verbs this project should wrap rather than reimplement. |
| Bright Builds coding and architecture requirements | `main` pin with exact commit recorded at install time | Standards bootstrap for downstream target repos | The official downstream installer already provides `status`, `install`, and `update` flows plus an audit trail, which is a better fit than inventing a second standards bootstrap mechanism. |
| SQLite via `bun:sqlite` | Built into Bun 1.3.11 | Durable workflow state, checkpoints, event log, pricing snapshot metadata | Resume and audit behavior need transactional state. Bun's native SQLite driver is fast, built in, and explicitly recommends WAL mode for typical apps. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Validate config, state snapshots, parity findings, and pricing catalogs | Use for all boundary data loaded from JSON, CLI options, repo manifests, and persisted resume state. |
| @clack/prompts | 1.1.0 | Interactive onboarding, mode selection, and resume confirmation | Use for the initial wizard and resume/audit decisions; skip in fully automated YOLO continuations. |
| semver | 7.7.4 | Compare Bun, GSD, and adapter/tool versions | Use when checking whether the local environment meets minimum versions or when evaluating upgrade/update eligibility. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `bun test` | Unit and integration testing | Built-in, Jest-compatible, and TypeScript-aware. |
| `bun build` | Package CLI entrypoints for publish/install flows | Prefer normal npm package bins first; reserve `bun build --compile` for optional standalone distribution experiments. |
| `node:util.parseArgs` | CLI argument parsing without framework overhead | Bun supports Node APIs, so this keeps v1 lean and avoids committing early to a heavy CLI framework. |
| Git CLI | Clone, branch, snapshot, and compare repositories | Shell out through Bun Shell rather than wrapping Git with a separate abstraction too early. |

## Installation

```bash
# Core
bun add get-shit-done-cc zod @clack/prompts semver

# Dev dependencies
bun add -d typescript @types/bun
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Bun 1.3.11 | Node.js LTS + npm/pnpm | Use Node if future enterprise environments block Bun adoption. For this project, Bun's built-ins remove enough dependencies that Bun remains the better v1 choice. |
| `node:util.parseArgs` + Clack | Commander or oclif | Use a dedicated framework only if the command surface grows large enough that subcommand/plugin ergonomics outweigh added ceremony. |
| SQLite event store | JSON-only state files | JSON files are acceptable for tiny prototypes, but not for resumable multi-step workflows where partial writes and concurrent reads matter. |
| Upstream GSD install/invoke flows | Reimplementing GSD features locally | Only replace upstream behavior if GSD exposes a hard blocker. Default to wrapping and orchestrating it. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Heavy CLI frameworks as the v1 foundation | They add ceremony, plugin assumptions, and extra surface area before the workflow model is stable. | Bun + `node:util.parseArgs` + Clack |
| Raw `bash -c` strings for orchestration | Stringly shell composition is brittle and increases shell-injection risk when handling repo URLs and file paths. | Bun Shell template literals with explicit error handling |
| Markdown-only resume state | Human-readable logs are useful, but they are not sufficient for transactional resume/recovery. | SQLite event log plus exported markdown/json summaries |
| Replacing GSD prompts wholesale | The product goal is interoperability and extension, not a forked duplicate of upstream workflows. | Add layered prompt packs and orchestration rules on top of GSD |

## Stack Patterns by Variant

**If the user installs globally with npm and Bun is missing:**
- Verify Bun first and offer to install it via the official Bun installation flow.
- Because the public npm experience should not silently fail on a Bun-first runtime requirement.

**If the user is on Codex in v1:**
- Install yolo-port assets into the Codex skills/config surface first, then ensure GSD is installed in the same ecosystem.
- Because Codex is the must-have runtime and GSD already treats Codex as a skills-first install target.

**If later runtime adapters are added:**
- Keep orchestration/state/reporting in core, and add thin adapter modules for each agent platform.
- Because adapter churn should not leak into the port workflow domain model.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `bun@1.3.11` | `@types/bun@1.3.11` | Keep these aligned to avoid drift in Bun-specific typings. |
| `bun@1.3.x` | `typescript@5.9.3` | Bun runs TypeScript directly, but explicit TS version pinning keeps editor/tooling behavior deterministic. |
| `get-shit-done-cc@1.28.0` | Codex skills install flow | Treat GSD invocation as an external dependency boundary so upstream install changes are easier to absorb. |

## Sources

- https://bun.com/docs/installation — verified Bun installation modes and single-executable positioning
- https://bun.com/docs/runtime/shell — verified cross-platform Bun Shell behavior and safe interpolation model
- https://bun.com/docs/runtime/sqlite — verified built-in SQLite driver and WAL recommendation
- https://bun.com/docs/test — verified built-in test runner behavior
- https://nodejs.org/api/util.html#utilparseargsconfig — verified standard-library argument parsing option
- https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/README.md — verified GSD install modes, Codex skills note, and workflow positioning
- https://www.npmjs.com/package/get-shit-done-cc — verified published package version
- https://raw.githubusercontent.com/bright-builds-llc/coding-and-architecture-requirements/main/AI-ADOPTION.md — verified downstream standards installation flow
- https://www.npmjs.com/package/typescript — verified TypeScript version
- https://www.npmjs.com/package/zod — verified Zod version
- https://www.npmjs.com/package/@clack/prompts — verified Clack version
- https://www.npmjs.com/package/semver — verified semver version

---
*Stack research for: AI-assisted codebase porting CLI layered over get-shit-done*
*Researched: 2026-03-22*

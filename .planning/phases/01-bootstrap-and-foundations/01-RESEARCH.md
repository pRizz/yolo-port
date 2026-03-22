# Phase 1: Bootstrap and Foundations - Research

**Researched:** 2026-03-22
**Confidence:** HIGH
**Goal:** Ship an npm-installable public CLI that can start from a clean environment, verify or install Bun, verify or install GSD for Codex, apply Bright Builds standards, and create the `.planning` scaffold for a yolo-port managed repo.

## Key Decisions To Lock

- The npm `bin` must be a Node-based launcher, not a Bun shebang, so `yolo-port` can start on machines that do not already have Bun.
- `npm install -g yolo-port` should stay side-effect free. Real environment or repo mutation should happen only after the user runs the CLI.
- `.planning/yolo-port/` should be the only machine-readable marker that a repo is yolo-port managed.
- Codex/GSD asset installation should default to the target repo during managed-port bootstrap, with an explicit global override if needed later.
- Phase 1 should establish a small durable state boundary now rather than deferring all persistence shape decisions.

## Recommended Plan Decomposition

| Plan | Scope | Main deliverables | Must prove |
| --- | --- | --- | --- |
| `01-01` | Published CLI shell | `package.json`, npm `bin`, Node launcher, Bun entrypoint, `--help`, visible subcommands, publishable tarball | `npm pack` install works and `yolo-port --help` launches without Bun preinstalled |
| `01-02` | Tool verification and install flow | Bun detect/install/re-detect, GSD detect/refresh for Codex, guided vs YOLO execution, clear action logging | Missing-Bun and existing-Bun paths both work; GSD install is idempotent |
| `01-03` | Repo onboarding and scaffold | Bright Builds `status/install/update/force` wrapper, `.planning` scaffold writer, `.planning/yolo-port/` state files, success summary | Bright Builds `installable/installed/blocked` cases are handled correctly; rerun is idempotent |

## Order-Sensitive Dependencies

- The first executable must run under Node because npm implies Node is present, but Bun may not be.
- Bun verification or installation must complete before any Bun-only code, Bun Shell usage, or `bun:sqlite` access.
- Repo root and Codex install scope must be decided before GSD installation, because local Codex setup mutates the repo.
- Bright Builds `status` must run before any repo-local writes. If it reports `blocked`, stop before writing local `.codex` assets or `.planning` scaffolding unless the user explicitly chooses force.
- `.planning/yolo-port/` should be written last among repo-local bootstrap artifacts so a blocked standards step does not leave a false managed marker behind.

## Likely Module Boundaries

| Boundary | Responsibility |
| --- | --- |
| `bin/yolo-port.js` | Node launcher only: parse minimal args, check Bun, install Bun if approved, hand off to Bun |
| `src/cli/` | Command routing, prompts, summaries, verbosity, next-step guidance |
| `src/domain/bootstrap/` | Pure bootstrap decisions: what to do, in what order, based on detected state and flags |
| `src/adapters/system/bun.ts` | Detect Bun, install Bun, re-check version |
| `src/adapters/system/gsd.ts` | Detect Codex GSD assets, run install or refresh, surface version or unknown state |
| `src/adapters/system/brightBuilds.ts` | Run official downstream installer commands and parse stable `status` output |
| `src/adapters/fs/planning.ts` | Create or merge `.planning` human docs and `.planning/yolo-port/` machine state |
| `src/persistence/` | Small Phase 1 schema and migrations for bootstrap runs, selected mode, written artifacts |
| `src/ui/` | Prompt copy, progress rendering, action log formatting, recovery messages |

## What To Prove Early

- A clean-machine smoke test: `npm pack`, install the tarball, run `yolo-port --help`, and launch bootstrap without Bun already installed.
- The Bun install path works using an officially supported method and re-detects Bun before continuing.
- Codex-facing GSD install works through the upstream installer and is safe to rerun.
- Bright Builds parsing is reliable for `installable`, `installed`, and `blocked`, including blocked README cases.
- Scaffold writing is idempotent and does not overwrite existing human-authored `.planning` docs unnecessarily.
- The success summary includes tools verified or installed, files written, selected mode, warnings, and the exact next command.

## Common Traps

- Pointing npm `bin` at `#!/usr/bin/env bun` or a Bun-only file.
- Doing setup work in `postinstall`; it hides actions and breaks the required interactive first-run contract.
- Comparing GSD versions without a machine-readable source of truth; the safe fallback may be rerunning the upstream installer.
- Calling Bright Builds `install` blindly instead of checking `status` first.
- Letting multiple modules shell out to GSD independently instead of keeping one adapter boundary.
- Using top-level `.planning/` as the managed marker instead of `.planning/yolo-port/`.
- Storing bootstrap state only in markdown or ad hoc JSON instead of establishing a durable store boundary now.
- Interpolating repo paths or URLs into raw shell strings instead of using structured process execution or Bun Shell templates.
- Overwriting existing `.planning` docs instead of creating stubs only when absent and merging conservatively.

## Safe Deferrals

- Full execution checkpointing and resume across later porting phases; Phase 1 only needs the initial state spine.
- Remote repo intake and repo classification.
- Parity inventory, pricing snapshots, and estimate generation.
- Non-Codex runtime adapters.
- Standalone compiled binaries and multi-platform native distribution.
- AI-agent fault takeover and automatic upstream issue creation.

## Highest-Risk Planning Points

- Lock the Node launcher plus Bun handoff strategy first; Phase 1 fails if `npm install -g yolo-port` cannot launch on a Bun-less machine.
- Confirm the GSD freshness-check strategy before building detailed version logic; the safe fallback may be presence detection plus rerunning the upstream installer.
- Define the Bright Builds blocked-state gate precisely so repo-local `.codex` and `.planning` writes do not happen before a blocked repo is resolved.
- Decide whether Phase 1 creates a small SQLite bootstrap ledger now or only scaffolds the location; delaying that decision increases migration risk later.

## Sources

- [Bun installation](https://bun.com/docs/installation)
- [Bun standalone executables](https://bun.com/docs/bundler/executables)
- [Bun SQLite](https://bun.com/docs/runtime/sqlite)
- [Bun test runner](https://bun.com/docs/guides/test/run-tests)
- [npm package.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
- [GSD README](https://raw.githubusercontent.com/gsd-build/get-shit-done/main/README.md)
- [Bright Builds AI adoption guide](https://raw.githubusercontent.com/bright-builds-llc/coding-and-architecture-requirements/main/AI-ADOPTION.md)

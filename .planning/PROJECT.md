# yolo-port

## What This Is

yolo-port is a public CLI framework that layers on top of get-shit-done to automate codebase porting with minimal user input. Users install it via npm, run `yolo-port` against a GitHub repository or from inside an existing repo, choose how involved they want to be, and let the system bootstrap planning, execution, auditing, resumability, and final reporting for ports such as C/C++ to Rust or Zig and Node/Express to Rust/Axum. The framework is Codex-first in v1, but it is designed to interoperate with GSD and evolve toward broader agent-platform support over time.

## Core Value

A developer can start a high-confidence port, see credible time and token cost estimates up front, walk away, and return to a resumable or completed result with 1:1 interface parity gaps clearly called out.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can install `yolo-port` via npm and bootstrap the required CLI, prompts, templates, and automation assets with Bun-based tooling.
- [ ] User can run `yolo-port <repo-url>` to start a new port from a remote GitHub repository.
- [ ] User can run `yolo-port` inside an existing repository and have the tool detect whether the codebase is unported, in-progress, or already ported enough to audit, resume, or update.
- [ ] User can choose an involvement mode ranging from guided setup to fully automated YOLO execution, and that preference is persisted in project metadata.
- [ ] User receives up-front duration, token, and USD estimates for the proposed port based on the selected AI model and reasoning profile, using versioned model pricing snapshots stored in this codebase.
- [ ] System performs a high-level audit of external APIs and interfaces before major execution so parity expectations are explicit in the plan.
- [ ] System targets 1:1 parity for external APIs and interfaces, with rare exceptions surfaced early and highlighted again in the final summary.
- [ ] System records durable write-ahead and write-after execution state so interrupted runs can resume from the last reliable checkpoint.
- [ ] System installs and interoperates with get-shit-done rather than replacing it, using GSD as the inner planning/execution engine.
- [ ] System bootstraps Bright Builds coding and architecture standards into the target codebase during onboarding.
- [ ] System produces a comprehensive end summary that explains what changed, parity status, estimate-versus-actual execution data, unresolved risks, and next steps.

### Out of Scope

- GUI or hosted SaaS experience — v1 stays CLI-first so the automation layer can ship lean and fast.
- Monolith-to-service extraction as a first-class workflow — defer until language and framework porting workflows are robust.
- Equal day-one support for every AI agent platform — prioritize Codex first, then expand adapter coverage deliberately.

## Context

This project exists to remove the manual overhead of porting legacy or incumbent codebases into newer languages and frameworks. The initial focus is on serious ports that normally require repeated human coordination, such as C/C++ to Rust or Zig and Node/Express to Rust/Axum.

The product is an outer shell around get-shit-done, not a replacement for it. yolo-port should guide setup, gather port-specific context, install or verify required dependencies, shape prompts and planning artifacts, and then hand off well-formed work to GSD-compatible workflows. Prompt assets analogous to the GSD codebase are a major part of the product, but they refine or extend upstream prompts rather than superseding them.

The CLI should support multiple entry modes: starting from a remote repository URL, running inside an unported local repo, and resuming or auditing a previously ported codebase. The system needs durable breadcrumbs, audit trails, and resumable state so interruption is a normal, recoverable event rather than a failure mode.

The installation experience should feel public-ready from day one. `npm install -g yolo-port` should provide the CLI and install the relevant prompt/skill assets into supported agent directories, with Codex treated as the initial must-have ecosystem. If GSD is not present, yolo-port should install it using upstream installation flows so users do not need to understand GSD internals to succeed.

## Constraints

- **Packaging**: Public npm install flow — the tool must be easy for developers to adopt without a custom setup ritual.
- **Runtime**: Bun-first implementation — use Bun for the project and its scripts, while allowing bash/sh for portable glue where appropriate.
- **Interoperability**: Build as a layer over GSD — upstream GSD remains the underlying engine and dependency.
- **Autonomy controls**: User-selectable involvement modes — users must be able to choose guided, standard, or YOLO-style execution and persist that preference.
- **Estimation**: Model-aware cost reporting — pre-execution estimates must consider model choice, reasoning level, price snapshots, and uncertainty ranges.
- **Parity**: 1:1 external interface parity as the default expectation — exceptions should be rare and explicitly disclosed before and after execution.
- **Resumability**: Durable execution logs and checkpoints — interrupted work must be restartable with confidence.
- **Standards bootstrap**: Install Bright Builds coding and architecture requirements into target repositories during onboarding.
- **Platform scope**: Codex-first support in v1 — broader agent-platform integration comes later.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build yolo-port as an outer shell over get-shit-done | Users should benefit from GSD rather than learn or reimplement it | - Pending |
| Make the product npm-installable and Bun-first | Public adoption and fast local scripting matter more than bespoke setup | - Pending |
| Treat Codex as the initial must-have agent ecosystem | Focus is required for a credible v1 install and workflow story | - Pending |
| Target 1:1 external API/interface parity by default | Porting value collapses if externally visible behavior drifts without explicit consent | - Pending |
| Provide model-based time/token/USD estimates before major execution | Users need confidence about operational cost before launching large ports | - Pending |
| Persist resume state, audit logs, and port breadcrumbs in project metadata | Long-running automation must survive interruptions and support audits or updates later | - Pending |

---
*Last updated: 2026-03-22 after initialization*

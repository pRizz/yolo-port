# Phase 2: Repository Intake and Workflow Control - Research

**Researched:** 2026-03-22
**Confidence:** HIGH
**Goal:** Let users begin from a GitHub URL or an existing local checkout, classify the repo state correctly, and persist involvement preferences and optional taste answers for reruns.

## Key Decisions To Lock

- Common intake flows should work without a subcommand, but explicit subcommands must remain visible in help and routing.
- Remote URL intake should inspect first, ask questions, show a summary, and only then clone.
- The default clone destination for a remote URL should be the current directory as `./<repo-name>`, with an explicit override path and conflict handling.
- Local intake should lead with repo status and detected state, and it should stop on dirty repos rather than continuing with warnings.
- Dirty local repos should offer an agent-friendly autocommit handoff rather than silently mutating the user's worktree.
- Repo classification must be conservative: `.planning/yolo-port/` marks management, not completion.
- `already ported` requires strong evidence such as a managed marker, a source reference, and a completed-run artifact; ambiguous evidence should recommend a state and ask for confirmation.
- The full intake profile should persist under `.planning/yolo-port/`, but current CLI flags and current interactive answers must override saved metadata.

## Recommended Plan Decomposition

| Plan | Scope | Main deliverables | Must prove |
| --- | --- | --- | --- |
| `02-01` | Intake entry normalization | shared intake descriptor model, local/remote repo inspection, dirty-repo stop, commandless or URL-based entry routing | `yolo-port`, `yolo-port bootstrap`, and `yolo-port <github-url>` all reach one normalized intake path without breaking visible subcommands |
| `02-02` | Repo classification and managed-state reading | breadcrumb readers, conservative classifier, recommended-state confirmation UI, already-ported action menu | fresh, in-progress, and already-ported repos are distinguished by evidence thresholds rather than by marker presence alone |
| `02-03` | Preference persistence and reruns | versioned intake profile schema, mode and taste persistence, reuse summary, override precedence, yolo escalation | reruns reuse saved preferences by default, infer skipped taste answers sensibly, and still let the current invocation win |

## Order-Sensitive Dependencies

- The Node launcher in `bin/yolo-port.js` must remain responsible for help/version and Bun handoff; Phase 2 should not move Bun-only work back into the Node path.
- Intake must resolve the target repo before repo-local Bright Builds, GSD, or `.planning` mutation happens.
- For remote URLs, no clone should happen before the user sees the summary and destination choice.
- For local repos, cleanliness detection must happen before any write or autocommit suggestion is executed.
- Classification should read `.planning/yolo-port/manifest.json` and `bootstrap-state.json` first, but it must not equate them with port completion.
- Persisted intake profile data should live under `.planning/yolo-port/` so the human-facing planning docs stay focused on shared project artifacts.

## Likely Module Boundaries

| Boundary | Responsibility |
| --- | --- |
| `src/domain/intake/` | Pure request normalization, repo classification, preference merging, taste-default inference |
| `src/adapters/system/git.ts` | Local repo inspection, cleanliness checks, GitHub URL parsing, remote inspection through structured process execution |
| `src/adapters/fs/managedRepo.ts` | Read machine-owned yolo-port markers, previous summaries, and future-proof completion evidence |
| `src/adapters/fs/intakeProfile.ts` | Read and write the persisted intake profile under `.planning/yolo-port/` |
| `src/persistence/` | Versioned schemas for intake profile and managed-state evidence |
| `src/cli/main.ts` + `src/cli/router.ts` | Keep explicit subcommands visible while normalizing commandless and URL-driven entry into the intake flow |
| `src/cli/commands/bootstrap.ts` | Orchestrate the intake UX without embedding raw git or filesystem logic |
| `src/ui/` | Repo-status screen, classification explanation, reuse summary, and yolo-escalation guidance |

## What To Prove Early

- `yolo-port https://github.com/example/service --dry-run` reaches intake, inspects the repo, and produces a summary before any clone.
- `yolo-port` inside a clean local git repo shows repo cleanliness and detected state before later prompts.
- A dirty local repo stops intake and presents an agent-friendly autocommit path without mutating the repo.
- A repo with only Phase 1 bootstrap markers classifies as `in-progress`, not `already ported`.
- Saved mode, target-stack, and taste preferences are reused with a summary-first flow, and flags or new answers override the saved profile.
- Guided, standard, and yolo behaviors remain observably different during intake and reruns.

## Common Traps

- Treating any first positional argument as a remote URL without validating that it is a supported GitHub repository reference.
- Cloning before the user sees the planned destination or before path-conflict handling runs.
- Treating `.planning/yolo-port/` or `bootstrap-state.json` as proof of a completed port.
- Saving preferences only in markdown or log text instead of a versioned machine-readable profile.
- Letting stale saved metadata override explicit CLI flags or fresh answers.
- Coupling repo classification to Phase 5 report artifacts so tightly that current repos cannot classify safely during earlier phases.
- Hiding later-phase actions behind fake implementations instead of surfacing honest placeholders or routing hints.

## Safe Deferrals

- Source-reference preservation before destructive structural work; that begins in Phase 3.
- Real parity audit and upstream-update execution; Phase 2 only needs classification-driven action surfaces.
- Full checkpointed resume and interruption recovery; that lands in Phase 4.
- Multi-provider or non-GitHub remote intake; v1 Phase 2 can stay GitHub-first.
- Deep AI-agent fault takeover beyond agent-friendly prompts and autocommit handoff surfaces.

## Highest-Risk Planning Points

- Preserve the Phase 1 launcher boundary while making commandless intake feel natural.
- Define classification in a way that works both with the Phase 1 machine-state files that exist today and with richer completion artifacts that will land later.
- Keep the dirty-repo gate strict enough to protect the user's worktree while still making the recovery path feel helpful rather than dead-ended.
- Choose an intake-profile schema that can absorb later planning, estimation, and execution metadata without forcing a migration of the entire `.planning/yolo-port/` layout.

## Sources

- `bin/yolo-port.js`
- `src/cli/main.ts`
- `src/cli/router.ts`
- `src/cli/commands/bootstrap.ts`
- `src/cli/flags.ts`
- `src/adapters/fs/planning.ts`
- `src/adapters/system/brightBuilds.ts`
- `src/adapters/system/gsd.ts`
- `src/domain/bootstrap/planBootstrap.ts`
- `src/persistence/bootstrapState.ts`
- `.planning/phases/02-repository-intake-and-workflow-control/02-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`

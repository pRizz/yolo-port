# Phase 1: Bootstrap and Foundations - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the initial yolo-port bootstrap experience: public CLI install and first-run flow, Bun and GSD verification or installation for Codex, Bright Builds standards onboarding, and creation of the baseline `.planning` scaffold for a yolo-port managed repository.

</domain>

<decisions>
## Implementation Decisions

### Bootstrap flow
- Default to an interactive onboarding flow for now.
- Provide flags or options that preselect choices so repeat users can streamline bootstrap.
- In YOLO mode, Bun setup, GSD setup, and Bright Builds application should run automatically.
- Automatic actions must be clearly printed to the user as they happen.
- The preferred first-run order is: checks -> questions -> summary -> execute.
- Each major bootstrap step should end with clear next-step guidance when useful.
- The bootstrap success screen should emphasize what changed, what happens next, and the current project state/files created, in that order.

### Conflict handling
- If Bun is missing, offer to install it and continue.
- If GSD is already present for Codex, verify version and upgrade if it is behind.
- If Bright Builds reports a blocked state, stop and explain the blocking files rather than silently continuing.
- When Bright Builds is blocked, offer an interactive force path rather than requiring the user to discover it elsewhere.
- Unsupported or awkward Bright Builds blocked cases should suggest filing a detailed upstream issue with enough context to be actionable.
- Setup visibility should combine progress indication, a concise action log, and the reason for each automatic action.
- CLI verbosity should be configurable so the user can quiet the output later.

### Scaffold output
- Phase 1 should create the durable resume and audit state spine immediately rather than postponing it.
- yolo-port-owned machine state should live under `.planning/yolo-port/`.
- Top-level `.planning` should stay focused on shared human-facing planning docs.
- yolo-port-specific breadcrumbs, resume state, pricing snapshot metadata, and audit scaffolding should start inside `.planning/yolo-port/`.
- The presence of `.planning/yolo-port/` should act as the machine-readable marker that a repository is yolo-port managed.
- Root-level repo changes should stay as small as possible.

### CLI behavior
- Explicit subcommands should be visible from day one, even though normal flows should usually work without needing them.
- Default CLI tone should be guided, explanatory, and pragmatic rather than terse or opaque.
- Quietness and verbosity should be configurable.
- Default progress output should combine section banners, current-step/progress indication, and a concise action log.
- Bootstrap summaries should always include installed tools, files written, repo status, selected mode, warnings, the exact follow-up command, and next steps.
- Error and fault output should provide clear, actionable recovery guidance that is easy to hand to an AI agent.

### Claude's Discretion
- Exact subcommand naming beyond the required visible command surface
- Exact verbosity levels and flag names
- Exact banner wording, spacing, and progress presentation
- Exact format of the concise action log and recovery message layout

</decisions>

<specifics>
## Specific Ideas

- Keep the bootstrap experience understandable enough that an engineer can see exactly what is happening and why.
- Avoid a black-box feel; default output should explain actions rather than merely announce success or failure.
- Make recovery output easy to paste into or hand off to an AI agent when the user wants help resolving a problem.

</specifics>

<deferred>
## Deferred Ideas

- Offer a true AI-agent recovery handoff where yolo-port asks permission to let an agent handle a fault and continue.
- Offer autonomous upstream issue creation or issue-ready handoff for Bright Builds blocked states with preassembled context.

</deferred>

---
*Phase: 01-bootstrap-and-foundations*
*Context gathered: 2026-03-22*

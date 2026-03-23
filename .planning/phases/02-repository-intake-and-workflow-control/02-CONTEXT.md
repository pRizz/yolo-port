# Phase 2: Repository Intake and Workflow Control - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the repository intake experience for yolo-port: starting from a GitHub URL or an existing local checkout, classifying the repository as fresh, in-progress, or already ported, and persisting the user's involvement mode and intake preferences for reruns.

</domain>

<decisions>
## Implementation Decisions

### Repository entry flow
- For remote URLs, the preferred flow is: inspect remote -> ask intake questions -> show a summary -> clone -> execute.
- Running inside an existing local repo should lead with repo status and detected state rather than generic onboarding copy.
- The default remote clone destination should be the current directory as `./<repo-name>`.
- The CLI should support an override for clone destination and only prompt when there is a path conflict or the user explicitly wants a different location.
- Intake should stop on a dirty local repo rather than continuing with warnings.
- When a local repo is dirty, yolo-port should offer an agent-assisted autocommit path using the user's existing agent CLI tooling.

### Repo state classification
- Treat `already ported` as a strong-completion state, not merely the presence of yolo-port breadcrumbs.
- Classifying a repo as `already ported` should require a yolo-port managed marker, a recorded source/original repo reference, and a completed-run artifact such as a final summary, parity baseline, or explicit completed state.
- Repositories with partial metadata, bootstrap files, saved preferences, or incomplete checkpoints should classify as `in-progress` rather than `already ported`.
- If signals are incomplete or inconsistent, the CLI should recommend a likely state and ask the user to confirm it.
- Ambiguous cases should default to recommending `in-progress`.
- For already ported repos, the first offered actions should be: view previous run summary, audit parity against source, update the port from upstream, and inspect managed artifacts/state.
- Classification should be conservative when signals conflict; prefer a confirmation gate over silently picking a state.

### Involvement modes
- `yolo` mode should ask as few questions as possible and run with the highest practical level of automation.
- `standard` mode should stay streamlined but still ask some questions at each major step.
- `guided` mode should behave more like the full checkpointed GSD flow, pausing at major step boundaries such as discuss, plan, and execute.
- The selected mode should be reused on reruns but remain configurable later.
- The user should be able to escalate to `yolo` at any time with a confirmation.
- Non-`yolo` flows should hint early that escalation to `yolo` is available.
- Even in `yolo`, the CLI should keep a short confirmation gate for high-impact workspace-shaping actions such as cloning into an existing destination, reorganizing repo layout, or agent-assisted autocommit.

### Preference persistence and reruns
- yolo-port should remember the full intake profile by default: mode, source repo, target stack, clone destination, involvement/taste answers, and preferred agent/provider.
- When saved preferences exist, the CLI should show a summary and continue unless the user objects.
- If optional taste/design answers were skipped earlier, yolo-port should infer sensible defaults until those preferences become relevant.
- Those inferred defaults should align with Bright Builds standards and a yolo-port house style in the same spirit.
- Preference precedence should be: current CLI flags -> current interactive answers -> saved metadata.

### Claude's Discretion
- Exact subcommand names and flag names for intake-related flows
- Exact wording of the state-detection screen and reuse summary
- Exact clone-destination override UX beyond the required default behavior
- Exact presentation of already-ported action menus and confirmation prompts

</decisions>

<specifics>
## Specific Ideas

- Keep the local-repo intake screen immediately informative by surfacing repo cleanliness and detected state first.
- Avoid making repository classification feel magical; show the recommended interpretation when evidence is mixed.
- Treat saved preferences as continuity helpers, not as hard locks against current user intent.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---
*Phase: 02-repository-intake-and-workflow-control*
*Context gathered: 2026-03-22*

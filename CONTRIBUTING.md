# Contributing

Use this guide when contributing to `yolo-port`.

## Default contribution expectations

- Follow the local `AGENTS.md`.
- Use the pinned version of the central standards repository as the canonical reference.
- Prefer simple, root-cause fixes over broad rewrites.
- Document repo-specific exceptions in `standards-overrides.md`.

## Code expectations

- Use Bun for repository scripts and local verification.
- Keep business logic in a functional core when practical.
- Prefer early returns and shallow control flow.
- Split oversized functions and files into sensible units.
- Keep workflow and automation config thin; extract non-trivial inline scripts into repo-owned files in sensible locations, make them rerunnable when sensible, and have them leave breadcrumb-heavy logs and summaries in a repo-defined gitignored location.
- Parse boundary input into domain types when that removes repeated validation.
- Apply any relevant language-specific guidance from the pinned canonical standards.
- Preserve the repository's current structure: `src/domain` for pure logic, `src/adapters` for effects, `src/cli` for command orchestration, and `src/ui` for user-facing rendering.

## Test expectations

- Unit test pure code and business logic.
- Keep each unit test focused on one concept.
- Use explicit Arrange, Act, Assert sections unless the structure is truly obvious.
- Run `bun x tsc --noEmit`, `bun test`, and any affected `scripts/smoke/*.sh` coverage before opening a pull request.

## Pull request expectations

- Explain the behavior change, not just the code movement.
- Call out any new exceptions to the standards.
- Include verification evidence for the changed paths.
- Note any residual risks or follow-up work.

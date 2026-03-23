<!-- coding-and-architecture-requirements-managed:begin -->
# Bright Builds Standards

- Study `AGENTS.bright-builds.md` as part of the repository instructions.
- Study `standards-overrides.md` for repo-specific exceptions and local decisions.
- If instructions elsewhere in `AGENTS.md` conflict with `AGENTS.bright-builds.md`, follow the repo-local instructions and treat them as an explicit local exception.
<!-- coding-and-architecture-requirements-managed:end -->

## Repo-Local Guidance

- This repository is Bun-first TypeScript. Use Bun for local scripts and verification.
- Preserve the current layering: pure decision logic belongs in `src/domain`, filesystem or system boundaries belong in `src/adapters`, CLI orchestration belongs in `src/cli`, and presentation helpers belong in `src/ui`.
- For behavior changes, run `bun x tsc --noEmit`, `bun test`, and any affected `scripts/smoke/*.sh` coverage before handing work off.
- Record deliberate exceptions in `standards-overrides.md` instead of editing `AGENTS.bright-builds.md`.

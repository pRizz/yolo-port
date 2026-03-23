# Coding and Architecture Requirements Audit Trail

This file records that this repository is using the Bright Builds coding and architecture requirements and shows where the managed adoption files came from.

## Current installation

- Source repository: `https://github.com/bright-builds-llc/coding-and-architecture-requirements`
- Version pin: `main`
- Exact commit: `a561a9b94df43cbfc5b6ada38856edc85054d089`
- Canonical entrypoint: `https://github.com/bright-builds-llc/coding-and-architecture-requirements/blob/main/standards/index.md`
- Managed sidecar path: `AGENTS.bright-builds.md`
- AGENTS integration mode: `append-only managed block`
- Audit manifest path: `coding-and-architecture-requirements.audit.md`
- Auto-update: `enabled`
- Auto-update reason: `trusted repo owner pRizz`
- Last operation: `update`
- Last updated (UTC): `2026-03-23T02:46:32Z`

## Managed files

- `AGENTS.md (managed block)`
- `AGENTS.bright-builds.md`
- `CONTRIBUTING.md`
- `.github/pull_request_template.md`
- `coding-and-architecture-requirements.audit.md`
- `README.md (managed badges block)`
- `scripts/bright-builds-auto-update.sh`
- `.github/workflows/bright-builds-auto-update.yml`

## Why this exists

- It provides a visible paper trail for install, update, and uninstall operations.
- The installer manages a bounded block inside `AGENTS.md` and the full `AGENTS.bright-builds.md` sidecar.
- `standards-overrides.md` remains repo-local and is preserved during update and uninstall.
- It helps humans and tools debug which standards revision a repository is pinned to.

import type { BrightBuildsStatus } from "../adapters/system/brightBuilds.js";

export function renderBrightBuildsBlockedRecovery(status: BrightBuildsStatus): string[] {
  const lines = [
    `Bright Builds blocked bootstrap in ${status.repoRoot}.`
  ];

  for (const blocker of status.blockers) {
    lines.push(`- blocked: ${blocker}`);
  }

  lines.push("Re-run with --force to replace the blocked managed files if that is intentional.");
  lines.push(
    "If this looks like an installer gap, consider filing an issue at https://github.com/bright-builds-llc/coding-and-architecture-requirements/issues with the repo state and blocked files."
  );
  lines.push(
    "You can hand this recovery output to your preferred AI agent if you want help preparing or filing that issue."
  );

  return lines;
}

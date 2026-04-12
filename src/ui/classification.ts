import type { ManagedRepoState } from "../persistence/managedRepoState.js";
import type { RepoClassificationAction, RepoClassificationResult } from "../domain/intake/types.js";

function renderActionLabel(action: RepoClassificationAction): string {
  switch (action) {
    case "audit-parity":
      return "Audit parity against source";
    case "continue-bootstrap":
      return "Continue managed bootstrap";
    case "inspect-managed-state":
      return "Inspect managed artifacts/state";
    case "update-from-upstream":
      return "Update the port from upstream (planned)";
    case "view-previous-summary":
      return "View previous run summary";
    case "view-recovery-guidance":
      return "Review recovery guidance";
  }
}

export function renderRepoClassification(input: {
  managedState: ManagedRepoState;
  result: RepoClassificationResult;
}): string[] {
  const lines = [
    `Detected state: ${input.result.state}`,
    input.result.needsConfirmation
      ? `Recommendation: ${input.result.recommendedState} (confirmation required)`
      : `Recommendation: ${input.result.recommendedState}`
  ];

  if (input.result.evidence.length > 0) {
    lines.push("Evidence:");
    for (const entry of input.result.evidence) {
      lines.push(`- ${entry}`);
    }
  }

  if (input.result.actions.length > 0) {
    lines.push("Available actions:");
    for (const [index, action] of input.result.actions.entries()) {
      lines.push(`${index + 1}. ${renderActionLabel(action)}`);
    }
  }

  if (
    input.result.actions.includes("view-previous-summary") &&
    input.managedState.recentSummaryPaths.length > 0
  ) {
    lines.push(`Latest summary: ${input.managedState.recentSummaryPaths[0]}`);
  }

  return lines;
}

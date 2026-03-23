import type { ManagedRepoState } from "../../persistence/managedRepoState.js";
import type { RepoClassificationResult } from "./types.js";

export function classifyRepoState(input: {
  managedState: ManagedRepoState;
}): RepoClassificationResult {
  const evidence: string[] = [];

  const hasManagedMarker = input.managedState.manifest !== null;
  const hasBootstrapState = input.managedState.bootstrapState !== null;
  const hasSourceReference = input.managedState.sourceReferencePaths.length > 0;
  const hasCompletionArtifacts =
    input.managedState.explicitCompletedStatePath !== null ||
    input.managedState.finalReportPaths.length > 0 ||
    input.managedState.parityArtifactPaths.length > 0;
  const hasAnyManagedEvidence =
    hasManagedMarker ||
    hasBootstrapState ||
    hasSourceReference ||
    hasCompletionArtifacts ||
    (input.managedState.yoloPortDir !== null && input.managedState.recentSummaryPaths.length > 0);

  if (hasManagedMarker) {
    evidence.push("yolo-port managed marker is present.");
  }

  if (hasBootstrapState) {
    evidence.push("Bootstrap state exists under `.planning/yolo-port/`.");
  }

  if (hasSourceReference) {
    evidence.push("Source reference artifacts were found.");
  } else if (hasManagedMarker) {
    evidence.push("Source reference artifacts are still missing.");
  }

  if (hasCompletionArtifacts) {
    evidence.push("Completion-oriented report or parity artifacts were found.");
  }

  if (!hasAnyManagedEvidence) {
    return {
      actions: ["continue-bootstrap"],
      evidence: ["No yolo-port managed evidence was found in this repository."],
      needsConfirmation: false,
      recommendedState: "fresh",
      state: "fresh"
    };
  }

  const isAlreadyPorted = hasManagedMarker && hasSourceReference && hasCompletionArtifacts;
  const needsConfirmation =
    (!hasManagedMarker && (hasBootstrapState || hasSourceReference || hasCompletionArtifacts)) ||
    (hasManagedMarker && hasCompletionArtifacts && !hasSourceReference);

  if (isAlreadyPorted) {
    return {
      actions: [
        "view-previous-summary",
        "audit-parity",
        "update-from-upstream",
        "inspect-managed-state"
      ],
      evidence,
      needsConfirmation,
      recommendedState: "already-ported",
      state: "already-ported"
    };
  }

  return {
    actions: ["continue-bootstrap", "inspect-managed-state", "view-recovery-guidance"],
    evidence,
    needsConfirmation,
    recommendedState: "in-progress",
    state: "in-progress"
  };
}

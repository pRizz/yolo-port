import type {
  ManagedExecutionStateRecord,
  ManagedExecutionStep
} from "../persistence/executionState.js";

function labelForStep(step: ManagedExecutionStep): string {
  switch (step) {
    case "prepare-handoff":
      return "Prepare execution handoff";
    case "invoke-runner":
      return "Invoke Codex/GSD runner";
    case "verify-runner-output":
      return "Verify runner output";
    case "complete-managed-run":
      return "Mark managed run complete";
  }
}

export function renderManagedExecutionStatus(input: {
  state: ManagedExecutionStateRecord;
}): string[] {
  return [
    `Execution status: ${input.state.status}`,
    `Current step: ${input.state.currentStep ? labelForStep(input.state.currentStep) : "none"}`,
    `Completed steps: ${input.state.completedSteps.length > 0 ? input.state.completedSteps.map(labelForStep).join(" | ") : "none yet"}`,
    `Resume command: ${input.state.resumeCommand}`
  ];
}

export function renderManagedExecutionStep(step: ManagedExecutionStep): string[] {
  return [
    `Managed execution step: ${labelForStep(step)}`
  ];
}

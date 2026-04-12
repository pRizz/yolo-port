import type { BootstrapMode } from "../domain/bootstrap/types.js";

export const MANAGED_EXECUTION_STEPS = [
  "prepare-handoff",
  "invoke-runner",
  "verify-runner-output",
  "complete-managed-run"
] as const;

export type ManagedExecutionRunner = "codex-exec" | "configured-script";
export type ManagedExecutionStatus = "completed" | "failed" | "ready" | "running";
export type ManagedExecutionStep = (typeof MANAGED_EXECUTION_STEPS)[number];

export type ManagedExecutionEventRecord = {
  at: string;
  details: string;
  runner: ManagedExecutionRunner | null;
  schemaVersion: number;
  status: ManagedExecutionStatus;
  step: ManagedExecutionStep | null;
  type: "run-completed" | "run-started" | "step-failed" | "step-finished" | "step-started";
};

export type ManagedExecutionHandoffRecord = {
  artifactPaths: {
    interfaceInventory: string;
    parityChecklist: string;
    planApproval: string;
    portPlan: string;
    pricingSnapshot: string;
    sourceReference: string;
  };
  createdAt: string;
  mode: BootstrapMode;
  promptPath: string;
  repoRoot: string;
  resumeCommand: string;
  runnerHint: ManagedExecutionRunner;
  schemaVersion: number;
};

export type ManagedExecutionStateRecord = {
  completedSteps: ManagedExecutionStep[];
  currentStep: ManagedExecutionStep | null;
  handoffPath: string | null;
  lastError: string | null;
  lastRunner: ManagedExecutionRunner | null;
  mode: BootstrapMode;
  outputPath: string | null;
  repoRoot: string;
  resumeCommand: string;
  schemaVersion: number;
  startedAt: string;
  status: ManagedExecutionStatus;
  summaryPath: string | null;
  updatedAt: string;
};

export function createManagedExecutionEventRecord(input: {
  at: string;
  details: string;
  maybeRunner: ManagedExecutionRunner | null;
  status: ManagedExecutionStatus;
  step: ManagedExecutionStep | null;
  type: ManagedExecutionEventRecord["type"];
}): ManagedExecutionEventRecord {
  return {
    at: input.at,
    details: input.details,
    runner: input.maybeRunner,
    schemaVersion: 1,
    status: input.status,
    step: input.step,
    type: input.type
  };
}

export function createManagedExecutionHandoffRecord(input: Omit<ManagedExecutionHandoffRecord, "schemaVersion">): ManagedExecutionHandoffRecord {
  return {
    ...input,
    schemaVersion: 1
  };
}

export function createManagedExecutionStateRecord(input: {
  completedSteps?: ManagedExecutionStep[];
  currentStep: ManagedExecutionStep | null;
  handoffPath: string | null;
  lastError: string | null;
  lastRunner: ManagedExecutionRunner | null;
  mode: BootstrapMode;
  outputPath: string | null;
  repoRoot: string;
  resumeCommand: string;
  startedAt: string;
  status: ManagedExecutionStatus;
  summaryPath: string | null;
  updatedAt: string;
}): ManagedExecutionStateRecord {
  return {
    completedSteps: input.completedSteps ?? [],
    currentStep: input.currentStep,
    handoffPath: input.handoffPath,
    lastError: input.lastError,
    lastRunner: input.lastRunner,
    mode: input.mode,
    outputPath: input.outputPath,
    repoRoot: input.repoRoot,
    resumeCommand: input.resumeCommand,
    schemaVersion: 1,
    startedAt: input.startedAt,
    status: input.status,
    summaryPath: input.summaryPath,
    updatedAt: input.updatedAt
  };
}

export function getNextManagedExecutionStep(
  completedSteps: ManagedExecutionStep[]
): ManagedExecutionStep | null {
  for (const step of MANAGED_EXECUTION_STEPS) {
    if (!completedSteps.includes(step)) {
      return step;
    }
  }

  return null;
}

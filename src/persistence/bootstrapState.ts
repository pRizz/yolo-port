import type { BootstrapMode } from "../domain/bootstrap/types.js";

export type PlanningManifest = {
  createdAt: string;
  manager: "yolo-port";
  repoRoot: string;
  schemaVersion: number;
};

export type BootstrapStateRecord = {
  executedSteps: string[];
  mode: BootstrapMode;
  schemaVersion: number;
  updatedAt: string;
  warnings: string[];
  writtenArtifacts: string[];
};

export function createPlanningManifest(input: {
  createdAt: string;
  repoRoot: string;
}): PlanningManifest {
  return {
    createdAt: input.createdAt,
    manager: "yolo-port",
    repoRoot: input.repoRoot,
    schemaVersion: 1
  };
}

export function createBootstrapStateRecord(input: {
  executedSteps: string[];
  mode: BootstrapMode;
  updatedAt: string;
  warnings: string[];
  writtenArtifacts: string[];
}): BootstrapStateRecord {
  return {
    executedSteps: input.executedSteps,
    mode: input.mode,
    schemaVersion: 1,
    updatedAt: input.updatedAt,
    warnings: input.warnings,
    writtenArtifacts: input.writtenArtifacts
  };
}

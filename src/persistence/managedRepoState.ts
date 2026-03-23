import type {
  BootstrapStateRecord,
  PlanningManifest
} from "./bootstrapState.js";

export type ManagedRepoState = {
  bootstrapState: BootstrapStateRecord | null;
  explicitCompletedStatePath: string | null;
  finalReportPaths: string[];
  manifest: PlanningManifest | null;
  parityArtifactPaths: string[];
  recentSummaryPaths: string[];
  sourceReferencePaths: string[];
  yoloPortDir: string | null;
};

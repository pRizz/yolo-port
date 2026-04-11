import type { ModelProfile, PricingProvider } from "./pricingCatalog.js";

export type EstimateConfidence = "low" | "medium";
export type EstimateReasoningProfile = "high" | "low" | "medium";
export type InterfaceKind =
  | "cli-entrypoint"
  | "cli-flag"
  | "config-file"
  | "environment-variable"
  | "http-route"
  | "package-export";
export type PlanningApprovalMode = "auto" | "prompt";
export type SourceReferenceStrategy = "filesystem-manifest" | "git-tag";

export type InterfaceInventoryItem = {
  details: string;
  kind: InterfaceKind;
  label: string;
  sourcePath: string;
};

export type InterfaceInventoryRecord = {
  generatedAt: string;
  items: InterfaceInventoryItem[];
  schemaVersion: number;
  summary: {
    byKind: Record<InterfaceKind, number>;
    configFileCount: number;
    dependencyCount: number;
    detectedLanguages: string[];
    sourceFileCount: number;
    totalInterfaces: number;
    totalLines: number;
  };
};

export type ParityChecklistItem = {
  exceptionPolicy: string;
  kind: InterfaceKind;
  parityTarget: string;
  sourcePath: string;
  surface: string;
};

export type PortPlanEstimateRecord = {
  assumptions: string[];
  confidence: EstimateConfidence;
  generatedAt: string;
  pricingCapturedAt: string;
  pricingSourceUrl: string;
  reasoningProfile: EstimateReasoningProfile;
  selectedModel: string;
  selectedProvider: PricingProvider;
  selectedProfile: ModelProfile;
  tokenRange: {
    max: number;
    min: number;
  };
  schemaVersion: number;
  usdRange: {
    max: number;
    min: number;
  };
  durationMinutes: {
    max: number;
    min: number;
  };
};

export type PlanningApprovalRecord = {
  approved: boolean;
  approvedAt: string;
  approvalMode: PlanningApprovalMode;
  schemaVersion: number;
};

export type PortPlanRecord = {
  approval: PlanningApprovalRecord;
  artifactPaths: {
    interfaceInventory: string;
    parityChecklist: string;
    pricingSnapshot: string;
    sourceReference: string;
  };
  estimate: PortPlanEstimateRecord;
  generatedAt: string;
  schemaVersion: number;
  targetStack: string | null;
};

export type SourceReferenceRecord = {
  generatedAt: string;
  git: {
    branch: string | null;
    currentHeadSha: string | null;
    referenceSha: string | null;
    remotes: string[];
    tagName: string | null;
  };
  manifestSamplePaths: string[];
  repoRoot: string;
  schemaVersion: number;
  sourceKind: "local" | "remote";
  strategy: SourceReferenceStrategy;
  structuralIntent: {
    parityGoal: string;
    requiresReferenceBeforeExecution: boolean;
    strategy: "in-place-managed-port";
    targetStack: string | null;
  };
};

export function createInterfaceInventoryRecord(input: {
  generatedAt: string;
  items: InterfaceInventoryItem[];
  summary: InterfaceInventoryRecord["summary"];
}): InterfaceInventoryRecord {
  return {
    generatedAt: input.generatedAt,
    items: input.items,
    schemaVersion: 1,
    summary: input.summary
  };
}

export function createPlanningApprovalRecord(input: {
  approved: boolean;
  approvedAt: string;
  approvalMode: PlanningApprovalMode;
}): PlanningApprovalRecord {
  return {
    approved: input.approved,
    approvedAt: input.approvedAt,
    approvalMode: input.approvalMode,
    schemaVersion: 1
  };
}

export function createPortPlanEstimateRecord(input: Omit<PortPlanEstimateRecord, "schemaVersion">): PortPlanEstimateRecord {
  return {
    ...input,
    schemaVersion: 1
  };
}

export function createPortPlanRecord(input: {
  approval: PlanningApprovalRecord;
  artifactPaths: PortPlanRecord["artifactPaths"];
  estimate: PortPlanEstimateRecord;
  generatedAt: string;
  maybeTargetStack: string | null;
}): PortPlanRecord {
  return {
    approval: input.approval,
    artifactPaths: input.artifactPaths,
    estimate: input.estimate,
    generatedAt: input.generatedAt,
    schemaVersion: 1,
    targetStack: input.maybeTargetStack
  };
}

export function createSourceReferenceRecord(input: Omit<SourceReferenceRecord, "schemaVersion">): SourceReferenceRecord {
  return {
    ...input,
    schemaVersion: 1
  };
}

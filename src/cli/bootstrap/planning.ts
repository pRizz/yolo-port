import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import { buildPortPlanEstimate } from "../../domain/estimates/planEstimate.js";
import { resolveEstimateSelection } from "../../domain/estimates/pricing.js";
import { buildParityChecklist } from "../../domain/parity/checklist.js";
import { buildInterfaceInventory } from "../../domain/parity/inventory.js";
import {
  createPlanningApprovalRecord,
  type InterfaceInventoryRecord,
  type ParityChecklistItem,
  type PortPlanEstimateRecord,
  type PlanningApprovalMode,
  type SourceReferenceRecord
} from "../../persistence/portPlanning.js";
import { scanRepositorySnapshot, type RepositorySnapshot } from "../../adapters/fs/repositorySnapshot.js";
import {
  readPlanningConfig,
  writePortPlanningArtifacts
} from "../../adapters/fs/portPlanning.js";
import { preserveGitSourceReference } from "../../adapters/system/git.js";

export type BootstrapPlanningDraft = {
  estimate: PortPlanEstimateRecord;
  interfaceInventory: InterfaceInventoryRecord;
  parityChecklist: ParityChecklistItem[];
  snapshot: RepositorySnapshot;
  sourceReference: SourceReferenceRecord;
};

export async function buildBootstrapPlanningDraft(input: {
  generatedAt: string;
  maybePreferredAgent: string | null;
  maybeTargetStack: string | null;
  mode: BootstrapMode;
  repoRoot: string;
  sourceKind: "local" | "remote";
}): Promise<BootstrapPlanningDraft> {
  const snapshot = await scanRepositorySnapshot({
    repoRoot: input.repoRoot
  });
  const sourceReference = await preserveGitSourceReference({
    generatedAt: input.generatedAt,
    maybeTargetStack: input.maybeTargetStack,
    repoRoot: input.repoRoot,
    snapshot,
    sourceKind: input.sourceKind
  });
  const interfaceInventory = buildInterfaceInventory({
    generatedAt: input.generatedAt,
    snapshot
  });
  const parityChecklist = buildParityChecklist({
    inventory: interfaceInventory
  });
  const planningConfig = await readPlanningConfig({
    repoRoot: input.repoRoot
  });
  const selection = resolveEstimateSelection({
    maybeModelProfile: planningConfig.maybeModelProfile,
    maybePreferredAgent: input.maybePreferredAgent
  });
  const estimate = buildPortPlanEstimate({
    generatedAt: input.generatedAt,
    inventory: interfaceInventory,
    selection,
    snapshot
  });

  return {
    estimate,
    interfaceInventory,
    parityChecklist,
    snapshot,
    sourceReference
  };
}

export async function persistBootstrapPlanningDraft(input: {
  approvalMode: PlanningApprovalMode;
  approved: boolean;
  approvedAt: string;
  draft: BootstrapPlanningDraft;
  generatedAt: string;
  maybeTargetStack: string | null;
  repoRoot: string;
}): Promise<string[]> {
  const approval = createPlanningApprovalRecord({
    approved: input.approved,
    approvedAt: input.approvedAt,
    approvalMode: input.approvalMode
  });

  return writePortPlanningArtifacts({
    approval,
    estimate: input.draft.estimate,
    generatedAt: input.generatedAt,
    interfaceInventory: input.draft.interfaceInventory,
    maybeTargetStack: input.maybeTargetStack,
    parityChecklist: input.draft.parityChecklist,
    repoRoot: input.repoRoot,
    sourceReference: input.draft.sourceReference
  });
}

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createPortPlanRecord,
  type InterfaceInventoryRecord,
  type ParityChecklistItem,
  type PlanningApprovalRecord,
  type PortPlanRecord,
  type PortPlanEstimateRecord,
  type SourceReferenceRecord
} from "../../persistence/portPlanning.js";
import {
  DEFAULT_PRICING_SNAPSHOT,
  type ModelProfile,
  type PricingSnapshotRecord
} from "../../persistence/pricingCatalog.js";
import {
  renderParityChecklistMarkdown,
  renderPortPlanMarkdown
} from "../../ui/planning.js";

type PlanningFileSet = {
  interfaceInventory: string;
  parityChecklist: string;
  planApproval: string;
  portPlanJson: string;
  portPlanMarkdown: string;
  pricingSnapshot: string;
  sourceReference: string;
};

function artifactDirectory(repoRoot: string): string {
  return path.join(repoRoot, ".planning", "yolo-port");
}

export function planningFiles(repoRoot: string): PlanningFileSet {
  const root = artifactDirectory(repoRoot);

  return {
    interfaceInventory: path.join(root, "interface-inventory.json"),
    parityChecklist: path.join(root, "parity-checklist.md"),
    planApproval: path.join(root, "plan-approval.json"),
    portPlanJson: path.join(root, "port-plan.json"),
    portPlanMarkdown: path.join(root, "port-plan.md"),
    pricingSnapshot: path.join(root, "pricing-snapshot.json"),
    sourceReference: path.join(root, "source-reference.json")
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), {
    recursive: true
  });

  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, content);
  await rename(tempPath, filePath);
}

export async function readPlanningConfig(options: {
  repoRoot: string;
}): Promise<{
  maybeModelProfile: ModelProfile | null;
}> {
  const config = await readJsonFile<{ model_profile?: string }>(
    path.join(options.repoRoot, ".planning", "config.json")
  );

  if (
    config?.model_profile === "budget" ||
    config?.model_profile === "balanced" ||
    config?.model_profile === "quality"
  ) {
    return {
      maybeModelProfile: config.model_profile
    };
  }

  return {
    maybeModelProfile: null
  };
}

export async function readPortPlanningArtifacts(options: {
  repoRoot: string;
}): Promise<{
  interfaceInventory: InterfaceInventoryRecord | null;
  planApproval: PlanningApprovalRecord | null;
  portPlan: PortPlanRecord | null;
  pricingSnapshot: PricingSnapshotRecord | null;
  sourceReference: SourceReferenceRecord | null;
}> {
  const files = planningFiles(options.repoRoot);

  return {
    interfaceInventory: await readJsonFile<InterfaceInventoryRecord>(files.interfaceInventory),
    planApproval: await readJsonFile<PlanningApprovalRecord>(files.planApproval),
    portPlan: await readJsonFile<PortPlanRecord>(files.portPlanJson),
    pricingSnapshot: await readJsonFile<PricingSnapshotRecord>(files.pricingSnapshot),
    sourceReference: await readJsonFile<SourceReferenceRecord>(files.sourceReference)
  };
}

export async function writePortPlanningArtifacts(options: {
  approval: PlanningApprovalRecord;
  estimate: PortPlanEstimateRecord;
  generatedAt: string;
  interfaceInventory: InterfaceInventoryRecord;
  maybeTargetStack: string | null;
  parityChecklist: ParityChecklistItem[];
  repoRoot: string;
  sourceReference: SourceReferenceRecord;
}): Promise<string[]> {
  const files = planningFiles(options.repoRoot);
  const relativeFiles = {
    interfaceInventory: path.relative(options.repoRoot, files.interfaceInventory),
    parityChecklist: path.relative(options.repoRoot, files.parityChecklist),
    pricingSnapshot: path.relative(options.repoRoot, files.pricingSnapshot),
    sourceReference: path.relative(options.repoRoot, files.sourceReference)
  };
  const portPlan = createPortPlanRecord({
    approval: options.approval,
    artifactPaths: relativeFiles,
    estimate: options.estimate,
    generatedAt: options.generatedAt,
    maybeTargetStack: options.maybeTargetStack
  });

  await writeAtomic(files.sourceReference, JSON.stringify(options.sourceReference, null, 2));
  await writeAtomic(files.interfaceInventory, JSON.stringify(options.interfaceInventory, null, 2));
  await writeAtomic(files.pricingSnapshot, JSON.stringify(DEFAULT_PRICING_SNAPSHOT, null, 2));
  await writeAtomic(
    files.parityChecklist,
    `${renderParityChecklistMarkdown({
      checklist: options.parityChecklist,
      generatedAt: options.generatedAt
    })}\n`
  );
  await writeAtomic(files.planApproval, JSON.stringify(options.approval, null, 2));
  await writeAtomic(files.portPlanJson, JSON.stringify(portPlan, null, 2));
  await writeAtomic(
    files.portPlanMarkdown,
    `${renderPortPlanMarkdown({
      approval: options.approval,
      estimate: options.estimate,
      inventory: options.interfaceInventory,
      portPlan,
      sourceReference: options.sourceReference
    })}\n`
  );

  return Object.values(files).map((filePath) => path.relative(options.repoRoot, filePath));
}

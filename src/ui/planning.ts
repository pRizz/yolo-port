import type {
  InterfaceInventoryRecord,
  ParityChecklistItem,
  PlanningApprovalRecord,
  PortPlanEstimateRecord,
  PortPlanRecord,
  SourceReferenceRecord
} from "../persistence/portPlanning.js";

function humanizeKindLabel(kind: keyof InterfaceInventoryRecord["summary"]["byKind"]): string {
  switch (kind) {
    case "cli-entrypoint":
      return "CLI entrypoints";
    case "cli-flag":
      return "CLI flags";
    case "config-file":
      return "config files";
    case "environment-variable":
      return "env vars";
    case "http-route":
      return "HTTP routes";
    case "package-export":
      return "package exports";
  }
}

function formatIntegerRange(minimum: number, maximum: number): string {
  return `${minimum.toLocaleString()}-${maximum.toLocaleString()}`;
}

function formatUsdRange(minimum: number, maximum: number): string {
  return `$${minimum.toFixed(2)}-$${maximum.toFixed(2)}`;
}

export function renderPlanningPreview(input: {
  estimate: PortPlanEstimateRecord;
  inventory: InterfaceInventoryRecord;
  sourceReference: SourceReferenceRecord;
}): string[] {
  const summaryParts = Object.entries(input.inventory.summary.byKind)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} ${humanizeKindLabel(kind as keyof InterfaceInventoryRecord["summary"]["byKind"])}`);

  return [
    input.sourceReference.strategy === "git-tag"
      ? `Source reference: git tag ${input.sourceReference.git.tagName ?? "yolo-port/source-reference"} @ ${input.sourceReference.git.referenceSha ?? "unknown"}`
      : "Source reference: filesystem manifest fallback (git metadata unavailable)",
    `Inventory: ${summaryParts.length > 0 ? summaryParts.join(" | ") : "no high-signal external surfaces detected yet"}`,
    `Parity target: 1:1 across ${input.inventory.summary.totalInterfaces} detected surfaces; exceptions must be flagged before execution.`,
    `Selected model: ${input.estimate.selectedProvider}/${input.estimate.selectedModel} (${input.estimate.selectedProfile}, ${input.estimate.reasoningProfile} reasoning)`,
    `Estimate: ${formatIntegerRange(input.estimate.durationMinutes.min, input.estimate.durationMinutes.max)} min | ${formatIntegerRange(input.estimate.tokenRange.min, input.estimate.tokenRange.max)} tokens | ${formatUsdRange(input.estimate.usdRange.min, input.estimate.usdRange.max)}`,
    `Pricing snapshot: ${input.estimate.pricingCapturedAt} from ${input.estimate.pricingSourceUrl}`
  ];
}

export function renderParityChecklistMarkdown(input: {
  checklist: ParityChecklistItem[];
  generatedAt: string;
}): string {
  const lines = [
    "# Parity Checklist",
    "",
    `**Generated:** ${input.generatedAt}`,
    "",
    "| Surface | Category | Parity target | Exception policy | Source |",
    "|---------|----------|---------------|------------------|--------|"
  ];

  for (const item of input.checklist) {
    lines.push(
      `| \`${item.surface}\` | ${item.kind} | ${item.parityTarget} | ${item.exceptionPolicy} | \`${item.sourcePath}\` |`
    );
  }

  if (input.checklist.length === 0) {
    lines.push("| _No detected surfaces_ | - | Manual review required | Flag unknown interfaces before execution | - |");
  }

  lines.push(
    "",
    "Any intentional divergence must be approved before execution and repeated in the final report."
  );

  return lines.join("\n");
}

export function renderPortPlanMarkdown(input: {
  approval: PlanningApprovalRecord;
  estimate: PortPlanEstimateRecord;
  inventory: InterfaceInventoryRecord;
  portPlan: PortPlanRecord;
  sourceReference: SourceReferenceRecord;
}): string {
  const inventoryLines = Object.entries(input.inventory.summary.byKind)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `- ${count} ${humanizeKindLabel(kind as keyof InterfaceInventoryRecord["summary"]["byKind"])}`);

  return [
    "# Port Planning Preview",
    "",
    `**Generated:** ${input.portPlan.generatedAt}`,
    `**Target stack:** ${input.portPlan.targetStack ?? "not set"}`,
    `**Selected model:** ${input.estimate.selectedProvider}/${input.estimate.selectedModel}`,
    `**Reasoning profile:** ${input.estimate.reasoningProfile}`,
    `**Pricing snapshot:** ${input.estimate.pricingCapturedAt} (${input.estimate.pricingSourceUrl})`,
    "",
    "## Source Reference",
    "",
    input.sourceReference.strategy === "git-tag"
      ? `- Preserved with git tag \`${input.sourceReference.git.tagName ?? "yolo-port/source-reference"}\` at \`${input.sourceReference.git.referenceSha ?? "unknown"}\``
      : "- Preserved through a filesystem manifest fallback because git metadata was unavailable",
    `- Source kind: ${input.sourceReference.sourceKind}`,
    `- Structural intent: ${input.sourceReference.structuralIntent.strategy} with ${input.sourceReference.structuralIntent.parityGoal.toLowerCase()}`,
    "",
    "## Interface Inventory",
    "",
    ...(inventoryLines.length > 0 ? inventoryLines : ["- No high-signal interfaces detected yet; manual review still required before execution."]),
    "",
    "## Estimate Ranges",
    "",
    `- Duration: ${formatIntegerRange(input.estimate.durationMinutes.min, input.estimate.durationMinutes.max)} minutes`,
    `- Tokens: ${formatIntegerRange(input.estimate.tokenRange.min, input.estimate.tokenRange.max)}`,
    `- USD: ${formatUsdRange(input.estimate.usdRange.min, input.estimate.usdRange.max)}`,
    `- Confidence: ${input.estimate.confidence}`,
    "",
    "## Proceed Gate",
    "",
    `- Status: ${input.approval.approved ? "approved" : "deferred"}`,
    `- Mode: ${input.approval.approvalMode}`,
    `- Recorded at: ${input.approval.approvedAt}`,
    "",
    "## Managed Artifacts",
    "",
    `- Source reference: \`${input.portPlan.artifactPaths.sourceReference}\``,
    `- Interface inventory: \`${input.portPlan.artifactPaths.interfaceInventory}\``,
    `- Parity checklist: \`${input.portPlan.artifactPaths.parityChecklist}\``,
    `- Pricing snapshot: \`${input.portPlan.artifactPaths.pricingSnapshot}\``
  ].join("\n");
}

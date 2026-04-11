import type { RepositorySnapshot } from "../../adapters/fs/repositorySnapshot.js";
import {
  createPortPlanEstimateRecord,
  type InterfaceInventoryRecord,
  type PortPlanEstimateRecord
} from "../../persistence/portPlanning.js";
import type { EstimateSelection } from "./pricing.js";

function roundToNiceInteger(value: number): number {
  if (value < 100) {
    return Math.ceil(value / 5) * 5;
  }

  if (value < 1_000) {
    return Math.ceil(value / 25) * 25;
  }

  if (value < 10_000) {
    return Math.ceil(value / 100) * 100;
  }

  return Math.ceil(value / 1_000) * 1_000;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function reasoningMultiplier(reasoningProfile: EstimateSelection["reasoningProfile"]): number {
  switch (reasoningProfile) {
    case "low":
      return 0.8;
    case "medium":
      return 1;
    case "high":
      return 1.25;
  }
}

function calculateUsdRange(
  selection: EstimateSelection,
  tokenRange: PortPlanEstimateRecord["tokenRange"]
): PortPlanEstimateRecord["usdRange"] {
  const outputShare = 0.28;
  const inputShare = 1 - outputShare;
  const cachedInputShare = selection.pricingEntry.cachedInputUsdPerMillion === null ? 0 : 0.3;

  const estimateCost = (totalTokens: number): number => {
    const inputTokens = totalTokens * inputShare;
    const cachedInputTokens = inputTokens * cachedInputShare;
    const uncachedInputTokens = inputTokens - cachedInputTokens;
    const outputTokens = totalTokens * outputShare;
    const cachedInputCost =
      selection.pricingEntry.cachedInputUsdPerMillion === null
        ? 0
        : (cachedInputTokens / 1_000_000) * selection.pricingEntry.cachedInputUsdPerMillion;

    return (
      (uncachedInputTokens / 1_000_000) * selection.pricingEntry.inputUsdPerMillion +
      cachedInputCost +
      (outputTokens / 1_000_000) * selection.pricingEntry.outputUsdPerMillion
    );
  };

  return {
    max: roundUsd(estimateCost(tokenRange.max)),
    min: roundUsd(estimateCost(tokenRange.min))
  };
}

export function buildPortPlanEstimate(input: {
  generatedAt: string;
  inventory: InterfaceInventoryRecord;
  selection: EstimateSelection;
  snapshot: Pick<RepositorySnapshot, "dependencyCount" | "sourceFileCount" | "totalLines">;
}): PortPlanEstimateRecord {
  const multiplier = reasoningMultiplier(input.selection.reasoningProfile);
  const baseInputTokens = Math.max(
    60_000,
    input.snapshot.totalLines * 18 +
      input.snapshot.sourceFileCount * 2_400 +
      input.inventory.summary.totalInterfaces * 8_500 +
      input.snapshot.dependencyCount * 350
  );
  const adjustedInputTokens = baseInputTokens * multiplier;
  const outputTokens = Math.max(20_000, adjustedInputTokens * 0.28);
  const totalTokens = adjustedInputTokens + outputTokens;
  const tokenRange = {
    max: roundToNiceInteger(totalTokens * 1.35),
    min: roundToNiceInteger(totalTokens * 0.72)
  };
  const durationBaseMinutes =
    12 +
    input.snapshot.sourceFileCount * 0.35 +
    input.inventory.summary.totalInterfaces * 1.75 +
    input.snapshot.totalLines / 220;
  const durationMinutes = {
    max: roundToNiceInteger(durationBaseMinutes * multiplier * 1.55),
    min: roundToNiceInteger(Math.max(10, durationBaseMinutes * multiplier * 0.8))
  };

  return createPortPlanEstimateRecord({
    assumptions: [
      "Estimate assumes static planning plus a first-pass parity-focused port, not a full production hardening cycle.",
      "Token range scales with source lines, detected interface count, and dependency count from the scanned repository snapshot.",
      "USD range uses the selected provider snapshot and includes cached-input pricing when the provider publishes it."
    ],
    confidence:
      input.snapshot.sourceFileCount > 0 && input.inventory.summary.totalInterfaces > 0
        ? "medium"
        : "low",
    durationMinutes,
    generatedAt: input.generatedAt,
    pricingCapturedAt: input.selection.pricingCapturedAt,
    pricingSourceUrl: input.selection.pricingSourceUrl,
    reasoningProfile: input.selection.reasoningProfile,
    selectedModel: input.selection.selectedModel,
    selectedProfile: input.selection.selectedProfile,
    selectedProvider: input.selection.selectedProvider,
    tokenRange,
    usdRange: calculateUsdRange(input.selection, tokenRange)
  });
}

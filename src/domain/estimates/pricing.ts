import {
  DEFAULT_PRICING_SNAPSHOT,
  type ModelProfile,
  type PricingModelEntry,
  type PricingProvider,
  type PricingSnapshotRecord
} from "../../persistence/pricingCatalog.js";
import type { EstimateReasoningProfile } from "../../persistence/portPlanning.js";

export type EstimateSelection = {
  pricingCapturedAt: string;
  pricingEntry: PricingModelEntry;
  pricingSourceUrl: string;
  reasoningProfile: EstimateReasoningProfile;
  selectedModel: string;
  selectedProfile: ModelProfile;
  selectedProvider: PricingProvider;
};

function normalizeModelProfile(maybeModelProfile: string | null | undefined): ModelProfile {
  if (
    maybeModelProfile === "budget" ||
    maybeModelProfile === "balanced" ||
    maybeModelProfile === "quality"
  ) {
    return maybeModelProfile;
  }

  return "quality";
}

function resolveProvider(maybePreferredAgent: string | null): PricingProvider {
  const normalized = maybePreferredAgent?.toLowerCase() ?? "";

  if (normalized.includes("anthropic") || normalized.includes("claude")) {
    return "anthropic";
  }

  return "openai";
}

function resolveReasoningProfile(profile: ModelProfile): EstimateReasoningProfile {
  switch (profile) {
    case "budget":
      return "low";
    case "balanced":
      return "medium";
    case "quality":
      return "high";
  }
}

export function resolveEstimateSelection(input: {
  maybeModelProfile: string | null;
  maybePreferredAgent: string | null;
  pricingSnapshot?: PricingSnapshotRecord;
}): EstimateSelection {
  const snapshot = input.pricingSnapshot ?? DEFAULT_PRICING_SNAPSHOT;
  const selectedProfile = normalizeModelProfile(input.maybeModelProfile);
  const selectedProvider = resolveProvider(input.maybePreferredAgent);
  const providerSnapshot = snapshot.providers.find(
    (entry) => entry.provider === selectedProvider
  );

  if (!providerSnapshot) {
    throw new Error(`Missing pricing snapshot for provider: ${selectedProvider}`);
  }

  const pricingEntry =
    providerSnapshot.models.find((entry) => entry.profile === selectedProfile) ??
    providerSnapshot.models[0];

  if (!pricingEntry) {
    throw new Error(`Missing pricing entry for provider/profile: ${selectedProvider}/${selectedProfile}`);
  }

  return {
    pricingCapturedAt: providerSnapshot.capturedAt,
    pricingEntry,
    pricingSourceUrl: providerSnapshot.sourceUrl,
    reasoningProfile: resolveReasoningProfile(selectedProfile),
    selectedModel: pricingEntry.model,
    selectedProfile,
    selectedProvider
  };
}

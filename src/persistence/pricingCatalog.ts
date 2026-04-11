export type ModelProfile = "balanced" | "budget" | "quality";
export type PricingProvider = "anthropic" | "openai";

export type PricingModelEntry = {
  cachedInputUsdPerMillion: number | null;
  inputUsdPerMillion: number;
  model: string;
  outputUsdPerMillion: number;
  profile: ModelProfile;
};

export type ProviderPricingSnapshot = {
  capturedAt: string;
  models: PricingModelEntry[];
  provider: PricingProvider;
  sourceUrl: string;
};

export type PricingSnapshotRecord = {
  providers: ProviderPricingSnapshot[];
  schemaVersion: number;
};

export const DEFAULT_PRICING_SNAPSHOT: PricingSnapshotRecord = {
  providers: [
    {
      capturedAt: "2026-04-11",
      models: [
        {
          cachedInputUsdPerMillion: 0.25,
          inputUsdPerMillion: 2.5,
          model: "gpt-5.4",
          outputUsdPerMillion: 15,
          profile: "quality"
        },
        {
          cachedInputUsdPerMillion: 0.04,
          inputUsdPerMillion: 0.4,
          model: "gpt-5.4-mini",
          outputUsdPerMillion: 3.2,
          profile: "balanced"
        },
        {
          cachedInputUsdPerMillion: 0.01,
          inputUsdPerMillion: 0.1,
          model: "gpt-5.4-nano",
          outputUsdPerMillion: 0.8,
          profile: "budget"
        }
      ],
      provider: "openai",
      sourceUrl: "https://openai.com/api/pricing"
    },
    {
      capturedAt: "2026-04-11",
      models: [
        {
          cachedInputUsdPerMillion: 1.5,
          inputUsdPerMillion: 15,
          model: "claude-opus-4.1",
          outputUsdPerMillion: 75,
          profile: "quality"
        },
        {
          cachedInputUsdPerMillion: 0.3,
          inputUsdPerMillion: 3,
          model: "claude-sonnet-4.6",
          outputUsdPerMillion: 15,
          profile: "balanced"
        },
        {
          cachedInputUsdPerMillion: 0.1,
          inputUsdPerMillion: 1,
          model: "claude-haiku-4.5",
          outputUsdPerMillion: 5,
          profile: "budget"
        }
      ],
      provider: "anthropic",
      sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing"
    }
  ],
  schemaVersion: 1
};

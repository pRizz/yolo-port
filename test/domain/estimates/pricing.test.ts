import { describe, expect, test } from "bun:test";

import { resolveEstimateSelection } from "../../../src/domain/estimates/pricing.js";

describe("estimate pricing selection", () => {
  test("maps codex quality runs onto the OpenAI quality path", () => {
    // Arrange
    const input = {
      maybeModelProfile: "quality",
      maybePreferredAgent: "codex"
    };

    // Act
    const selection = resolveEstimateSelection(input);

    // Assert
    expect(selection.selectedProvider).toBe("openai");
    expect(selection.selectedModel).toBe("gpt-5.4");
    expect(selection.reasoningProfile).toBe("high");
    expect(selection.pricingSourceUrl).toContain("openai.com/api/pricing");
    expect(selection.pricingCapturedAt).toBe("2026-04-11");
  });

  test("maps claude budget runs onto the Anthropic budget path", () => {
    // Arrange
    const input = {
      maybeModelProfile: "budget",
      maybePreferredAgent: "claude"
    };

    // Act
    const selection = resolveEstimateSelection(input);

    // Assert
    expect(selection.selectedProvider).toBe("anthropic");
    expect(selection.selectedModel).toBe("claude-haiku-4.5");
    expect(selection.reasoningProfile).toBe("low");
    expect(selection.pricingSourceUrl).toContain("claude.com/docs");
    expect(selection.pricingCapturedAt).toBe("2026-04-11");
  });
});

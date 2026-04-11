import { describe, expect, test } from "bun:test";

import { buildPortPlanEstimate } from "../../../src/domain/estimates/planEstimate.js";
import { resolveEstimateSelection } from "../../../src/domain/estimates/pricing.js";
import { createInterfaceInventoryRecord } from "../../../src/persistence/portPlanning.js";

describe("port plan estimate", () => {
  test("produces transparent duration, token, and usd ranges from repo complexity", () => {
    // Arrange
    const selection = resolveEstimateSelection({
      maybeModelProfile: "balanced",
      maybePreferredAgent: "codex"
    });
    const inventory = createInterfaceInventoryRecord({
      generatedAt: "2026-04-11T22:15:30.848Z",
      items: [
        {
          details: "package.json bin -> bin/demo.js",
          kind: "cli-entrypoint",
          label: "demo-cli",
          sourcePath: "package.json"
        },
        {
          details: "GET /health",
          kind: "http-route",
          label: "GET /health",
          sourcePath: "src/server.ts"
        },
        {
          details: "Read from source during static analysis",
          kind: "environment-variable",
          label: "PORT",
          sourcePath: "src/server.ts"
        }
      ],
      summary: {
        byKind: {
          "cli-entrypoint": 1,
          "cli-flag": 0,
          "config-file": 1,
          "environment-variable": 1,
          "http-route": 1,
          "package-export": 0
        },
        configFileCount: 1,
        dependencyCount: 4,
        detectedLanguages: ["typescript", "json"],
        sourceFileCount: 3,
        totalInterfaces: 3,
        totalLines: 240
      }
    });

    // Act
    const estimate = buildPortPlanEstimate({
      generatedAt: "2026-04-11T22:15:30.848Z",
      inventory,
      selection,
      snapshot: {
        dependencyCount: 4,
        sourceFileCount: 3,
        totalLines: 240
      }
    });

    // Assert
    expect(estimate.durationMinutes.min > 0).toBeTruthy();
    expect(estimate.durationMinutes.max > estimate.durationMinutes.min).toBeTruthy();
    expect(estimate.tokenRange.min > 0).toBeTruthy();
    expect(estimate.tokenRange.max > estimate.tokenRange.min).toBeTruthy();
    expect(estimate.usdRange.min > 0).toBeTruthy();
    expect(estimate.usdRange.max > estimate.usdRange.min).toBeTruthy();
    expect(estimate.selectedModel).toBe("gpt-5.4-mini");
    expect(estimate.pricingCapturedAt).toBe("2026-04-11");
    expect(estimate.assumptions.length > 0).toBeTruthy();
  });
});

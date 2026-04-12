import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { writeReportingArtifacts } from "../../src/adapters/fs/reporting.js";
import { createPortPlanEstimateRecord } from "../../src/persistence/portPlanning.js";
import { createFinalReportRecord, createParityAuditRecord } from "../../src/persistence/reporting.js";

describe("reporting artifacts", () => {
  test("writes machine-readable and markdown audit/report artifacts", async () => {
    // Arrange
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "yolo-port-reporting-"));
    const audit = createParityAuditRecord({
      diffStats: null,
      generatedAt: "2026-04-12T13:27:55.494Z",
      items: [],
      overallStatus: "passed",
      sourceReference: {
        strategy: "filesystem-manifest",
        tagName: null
      },
      summary: {
        missingCount: 0,
        total: 0,
        verifiedCount: 0
      }
    });
    const report = createFinalReportRecord({
      estimate: createPortPlanEstimateRecord({
        assumptions: ["demo"],
        confidence: "medium",
        durationMinutes: { max: 10, min: 5 },
        generatedAt: "2026-04-12T13:27:55.494Z",
        pricingCapturedAt: "2026-04-11",
        pricingSourceUrl: "https://openai.com/api/pricing",
        reasoningProfile: "high",
        selectedModel: "gpt-5.4",
        selectedProfile: "quality",
        selectedProvider: "openai",
        tokenRange: { max: 100, min: 50 },
        usdRange: { max: 2, min: 1 }
      }),
      estimateComparison: {
        actualDurationMinutes: 7,
        durationWithinEstimate: true,
        note: "within range"
      },
      execution: {
        additions: 1,
        deletions: 0,
        filesChanged: 1,
        runner: "configured-script"
      },
      generatedAt: "2026-04-12T13:40:00.000Z",
      nextSteps: ["ship it"],
      parity: {
        missingCount: 0,
        status: "passed",
        total: 0,
        verifiedCount: 0
      },
      summaryLine: "Parity audit passed.",
      unresolvedRisks: []
    });

    // Act
    const files = await writeReportingArtifacts({
      audit,
      repoRoot,
      report
    });

    // Assert
    expect(files).toContain(".planning/yolo-port/final-report.md");
    expect(files).toContain(".planning/yolo-port/parity-audit.json");
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "final-report.md"), "utf8")
    ).toContain("Parity audit passed.");

    // Cleanup
    rmSync(repoRoot, { force: true, recursive: true });
  });
});

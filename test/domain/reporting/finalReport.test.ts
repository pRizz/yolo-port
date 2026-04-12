import { describe, expect, test } from "bun:test";

import { buildFinalReport } from "../../../src/domain/reporting/finalReport.js";
import { createManagedExecutionStateRecord } from "../../../src/persistence/executionState.js";
import { createPortPlanEstimateRecord } from "../../../src/persistence/portPlanning.js";
import { createParityAuditRecord } from "../../../src/persistence/reporting.js";

describe("buildFinalReport", () => {
  test("combines parity, estimate, and execution data into one report", () => {
    // Arrange
    const audit = createParityAuditRecord({
      diffStats: {
        additions: 20,
        baseRef: "refs/tags/yolo-port/source-reference",
        deletions: 5,
        filesChanged: 3
      },
      generatedAt: "2026-04-12T13:27:55.494Z",
      items: [],
      overallStatus: "passed",
      sourceReference: {
        strategy: "git-tag",
        tagName: "yolo-port/source-reference"
      },
      summary: {
        missingCount: 0,
        total: 4,
        verifiedCount: 4
      }
    });
    const state = createManagedExecutionStateRecord({
      completedSteps: [
        "prepare-handoff",
        "invoke-runner",
        "verify-runner-output",
        "complete-managed-run"
      ],
      currentStep: null,
      handoffPath: ".planning/yolo-port/execution-handoff.md",
      lastError: null,
      lastRunner: "configured-script",
      mode: "yolo",
      outputPath: ".planning/yolo-port/execution-output.log",
      repoRoot: "/tmp/repo",
      resumeCommand: "yolo-port resume --yes",
      startedAt: "2026-04-12T13:00:00.000Z",
      status: "completed",
      summaryPath: ".planning/yolo-port/execution-summary.md",
      updatedAt: "2026-04-12T13:15:00.000Z"
    });

    // Act
    const report = buildFinalReport({
      audit,
      executionState: state,
      generatedAt: "2026-04-12T13:40:00.000Z",
      portPlan: {
        approval: {
          approvalMode: "auto",
          approved: true,
          approvedAt: "2026-04-12T12:59:00.000Z",
          schemaVersion: 1
        },
        artifactPaths: {
          interfaceInventory: ".planning/yolo-port/interface-inventory.json",
          parityChecklist: ".planning/yolo-port/parity-checklist.md",
          pricingSnapshot: ".planning/yolo-port/pricing-snapshot.json",
          sourceReference: ".planning/yolo-port/source-reference.json"
        },
        estimate: createPortPlanEstimateRecord({
          assumptions: ["demo"],
          confidence: "medium",
          durationMinutes: { max: 20, min: 10 },
          generatedAt: "2026-04-12T12:58:00.000Z",
          pricingCapturedAt: "2026-04-11",
          pricingSourceUrl: "https://openai.com/api/pricing",
          reasoningProfile: "high",
          selectedModel: "gpt-5.4",
          selectedProfile: "quality",
          selectedProvider: "openai",
          tokenRange: { max: 100000, min: 60000 },
          usdRange: { max: 12.5, min: 5.5 }
        }),
        generatedAt: "2026-04-12T12:58:00.000Z",
        schemaVersion: 1,
        targetStack: "rust/axum"
      }
    });

    // Assert
    expect(report.parity.status).toBe("passed");
    expect(report.estimateComparison.actualDurationMinutes).toBe(15);
    expect(report.estimateComparison.durationWithinEstimate).toBe(true);
    expect(report.execution.filesChanged).toBe(3);
    expect(report.summaryLine).toContain("Parity audit passed");
  });
});

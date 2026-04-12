import { describe, expect, test } from "bun:test";

import { buildParityAudit } from "../../../src/domain/audit/parity.js";
import {
  createInterfaceInventoryRecord,
  type ParityChecklistItem,
  type SourceReferenceRecord
} from "../../../src/persistence/portPlanning.js";

function createSourceReference(): SourceReferenceRecord {
  return {
    generatedAt: "2026-04-12T13:27:55.494Z",
    git: {
      branch: "main",
      currentHeadSha: "abc",
      referenceSha: "def",
      remotes: ["git@github.com:pRizz/yolo-port.git"],
      tagName: "yolo-port/source-reference"
    },
    manifestSamplePaths: ["package.json"],
    repoRoot: "/tmp/repo",
    schemaVersion: 1,
    sourceKind: "local",
    strategy: "git-tag",
    structuralIntent: {
      parityGoal: "1:1 external interface parity",
      requiresReferenceBeforeExecution: true,
      strategy: "in-place-managed-port",
      targetStack: "rust/axum"
    }
  };
}

describe("buildParityAudit", () => {
  test("marks saved surfaces as verified or missing against the current inventory", () => {
    // Arrange
    const checklist: ParityChecklistItem[] = [
      {
        exceptionPolicy: "flag exceptions",
        kind: "http-route",
        parityTarget: "Preserve route",
        sourcePath: "src/server.ts",
        surface: "GET /health"
      },
      {
        exceptionPolicy: "flag exceptions",
        kind: "environment-variable",
        parityTarget: "Preserve env var",
        sourcePath: ".env.example",
        surface: "PORT"
      }
    ];
    const currentInventory = createInterfaceInventoryRecord({
      generatedAt: "2026-04-12T13:27:55.494Z",
      items: [
        {
          details: "GET /health",
          kind: "http-route",
          label: "GET /health",
          sourcePath: "src/server.ts"
        }
      ],
      summary: {
        byKind: {
          "cli-entrypoint": 0,
          "cli-flag": 0,
          "config-file": 0,
          "environment-variable": 0,
          "http-route": 1,
          "package-export": 0
        },
        configFileCount: 0,
        dependencyCount: 0,
        detectedLanguages: ["typescript"],
        sourceFileCount: 1,
        totalInterfaces: 1,
        totalLines: 20
      }
    });

    // Act
    const audit = buildParityAudit({
      checklist,
      currentInventory,
      diffStats: null,
      generatedAt: "2026-04-12T13:30:00.000Z",
      sourceReference: createSourceReference()
    });

    // Assert
    expect(audit.summary.total).toBe(2);
    expect(audit.summary.verifiedCount).toBe(1);
    expect(audit.summary.missingCount).toBe(1);
    expect(audit.overallStatus).toBe("gaps-found");
    expect(audit.items[0]?.status).toBe("verified");
    expect(audit.items[1]?.status).toBe("missing");
  });
});

import { describe, expect, test } from "bun:test";

import { buildParityChecklist } from "../../../src/domain/parity/checklist.js";
import { buildInterfaceInventory } from "../../../src/domain/parity/inventory.js";
import type { RepositorySnapshot } from "../../../src/adapters/fs/repositorySnapshot.js";

function createSnapshot(): RepositorySnapshot {
  return {
    dependencyCount: 3,
    detectedLanguages: ["json", "typescript"],
    files: [
      {
        content: JSON.stringify({
          bin: {
            "demo-cli": "bin/demo.js"
          },
          exports: {
            "./cli": "./dist/cli.js"
          },
          name: "demo-service"
        }, null, 2),
        language: "json",
        lineCount: 8,
        relativePath: "package.json",
        sizeBytes: 120
      },
      {
        content: "if (token === '--mode' || token === '--verbose') return token;",
        language: "typescript",
        lineCount: 1,
        relativePath: "src/cli/flags.ts",
        sizeBytes: 72
      },
      {
        content: "app.get('/health', handler);\nconst port = process.env.PORT;\nconst apiKey = process.env['API_KEY'];",
        language: "typescript",
        lineCount: 3,
        relativePath: "src/server.ts",
        sizeBytes: 110
      },
      {
        content: "PORT=3000\nAPI_KEY=local\n",
        language: null,
        lineCount: 2,
        relativePath: ".env.example",
        sizeBytes: 24
      }
    ],
    sourceFileCount: 2,
    totalLines: 14
  };
}

describe("interface inventory", () => {
  test("detects high-signal repo surfaces and turns them into a parity checklist", () => {
    // Arrange
    const snapshot = createSnapshot();

    // Act
    const inventory = buildInterfaceInventory({
      generatedAt: "2026-04-11T22:15:30.848Z",
      snapshot
    });
    const checklist = buildParityChecklist({
      inventory
    });

    // Assert
    expect(inventory.summary.byKind["cli-entrypoint"] > 0).toBeTruthy();
    expect(inventory.summary.byKind["cli-flag"] > 0).toBeTruthy();
    expect(inventory.summary.byKind["http-route"] > 0).toBeTruthy();
    expect(inventory.summary.byKind["environment-variable"] > 0).toBeTruthy();
    expect(inventory.summary.byKind["config-file"] > 0).toBeTruthy();
    expect(inventory.summary.byKind["package-export"] > 0).toBeTruthy();
    expect(inventory.items.some((item) => item.label === "demo-cli")).toBeTruthy();
    expect(inventory.items.some((item) => item.label === "--mode")).toBeTruthy();
    expect(inventory.items.some((item) => item.label === "GET /health")).toBeTruthy();
    expect(inventory.items.some((item) => item.label === "PORT")).toBeTruthy();
    expect(checklist.some((item) => item.surface === "GET /health")).toBeTruthy();
    expect(
      checklist.every((item) => item.exceptionPolicy.includes("final report"))
    ).toBeTruthy();
  });
});

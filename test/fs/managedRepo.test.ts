import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { readManagedRepoState } from "../../src/adapters/fs/managedRepo.js";

describe("readManagedRepoState", () => {
  test("reads managed markers and future-proof evidence paths", async () => {
    // Arrange
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "yolo-port-managed-repo-"));
    const yoloPortDir = path.join(repoRoot, ".planning", "yolo-port");
    mkdirSync(yoloPortDir, { recursive: true });
    writeFileSync(
      path.join(yoloPortDir, "manifest.json"),
      JSON.stringify({
        createdAt: "2026-03-22T00:00:00.000Z",
        manager: "yolo-port",
        repoRoot,
        schemaVersion: 1
      })
    );
    writeFileSync(
      path.join(yoloPortDir, "bootstrap-state.json"),
      JSON.stringify({
        executedSteps: ["bright-builds:install"],
        mode: "guided",
        schemaVersion: 1,
        updatedAt: "2026-03-22T00:00:00.000Z",
        warnings: [],
        writtenArtifacts: []
      })
    );
    writeFileSync(path.join(yoloPortDir, "source-reference.json"), "{}");
    writeFileSync(path.join(yoloPortDir, "final-report.md"), "# done\n");

    // Act
    const state = await readManagedRepoState({
      repoRoot
    });

    // Assert
    expect(state.manifest?.manager).toBe("yolo-port");
    expect(state.bootstrapState?.mode).toBe("guided");
    expect(state.sourceReferencePaths).toContain(path.join(yoloPortDir, "source-reference.json"));
    expect(state.finalReportPaths).toContain(path.join(yoloPortDir, "final-report.md"));

    // Cleanup
    rmSync(repoRoot, { force: true, recursive: true });
  });
});

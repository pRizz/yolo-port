import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { writePlanningScaffold } from "../../src/adapters/fs/planning.js";

describe("writePlanningScaffold", () => {
  test("creates the managed planning scaffold and machine state", async () => {
    // Arrange
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "yolo-port-planning-"));

    // Act
    const result = await writePlanningScaffold({
      executedSteps: ["bright-builds:install", "gsd:install"],
      mode: "yolo",
      projectName: "demo-repo",
      repoRoot,
      updatedAt: "2026-03-22T23:00:00.000Z",
      warnings: []
    });

    // Assert
    expect(result.written).toContain(".planning/PROJECT.md");
    expect(result.written).toContain(".planning/yolo-port/manifest.json");
    expect(result.written).toContain(".planning/yolo-port/bootstrap-state.json");

    // Cleanup
    rmSync(repoRoot, { force: true, recursive: true });
  });

  test("preserves existing authored planning docs", async () => {
    // Arrange
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "yolo-port-planning-"));
    const planningDir = path.join(repoRoot, ".planning");
    mkdirSync(planningDir, { recursive: true });
    writeFileSync(path.join(planningDir, "PROJECT.md"), "keep me");

    // Act
    const result = await writePlanningScaffold({
      executedSteps: ["bright-builds:update", "gsd:none"],
      mode: "guided",
      projectName: "demo-repo",
      repoRoot,
      updatedAt: "2026-03-22T23:00:00.000Z",
      warnings: ["existing project doc preserved"]
    });

    // Assert
    expect(result.preserved).toContain(".planning/PROJECT.md");
    expect(readFileSync(path.join(planningDir, "PROJECT.md"), "utf8")).toBe("keep me");

    // Cleanup
    rmSync(repoRoot, { force: true, recursive: true });
  });
});

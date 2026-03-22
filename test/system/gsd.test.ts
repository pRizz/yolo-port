import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { detectGsd, planGsdAction } from "../../src/adapters/system/gsd.js";

describe("detectGsd", () => {
  test("reports a missing installation when no Codex markers exist", () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-gsd-missing-"));

    // Act
    const detection = detectGsd({
      env: {
        ...process.env,
        CODEX_HOME: tempDir
      }
    });

    // Assert
    expect(detection.status).toBe("missing");
    expect(planGsdAction(detection).kind).toBe("install");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("reports unknown when the repo exists without a VERSION file", () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-gsd-unknown-"));
    mkdirSync(path.join(tempDir, "get-shit-done"), { recursive: true });

    // Act
    const detection = detectGsd({
      env: {
        ...process.env,
        CODEX_HOME: tempDir
      }
    });

    // Assert
    expect(detection.status).toBe("unknown");
    expect(planGsdAction(detection).kind).toBe("verify");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("reports installed when the repo and version marker are present", () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-gsd-installed-"));
    const repoPath = path.join(tempDir, "get-shit-done");
    mkdirSync(repoPath, { recursive: true });
    mkdirSync(path.join(tempDir, "skills", "gsd-new-project"), { recursive: true });
    writeFileSync(path.join(repoPath, "VERSION"), "2026.03.22\n");
    writeFileSync(path.join(tempDir, "skills", "gsd-new-project", "SKILL.md"), "# stub\n");

    // Act
    const detection = detectGsd({
      env: {
        ...process.env,
        CODEX_HOME: tempDir
      }
    });

    // Assert
    expect(detection.status).toBe("installed");
    expect(detection.version).toBe("2026.03.22");
    expect(planGsdAction(detection).kind).toBe("none");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

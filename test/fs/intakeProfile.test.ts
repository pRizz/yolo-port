import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readIntakeProfile,
  writeIntakeProfile
} from "../../src/adapters/fs/intakeProfile.js";
import { createIntakeProfileRecord } from "../../src/persistence/intakeProfile.js";

describe("intake profile persistence", () => {
  test("writes and reads the intake profile record", async () => {
    // Arrange
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "yolo-port-intake-profile-"));
    const profile = createIntakeProfileRecord({
      askTasteQuestions: true,
      maybeCloneDestination: "./service",
      mode: "standard",
      maybePreferredAgent: "codex",
      maybeSourceRepo: "https://github.com/example/service",
      maybeTargetStack: "rust/axum",
      tasteAnswers: {
        profile: "defaults"
      },
      tasteDefaults: ["Prefer Bright Builds defaults."],
      updatedAt: "2026-03-22T00:00:00.000Z"
    });

    // Act
    const relativePath = await writeIntakeProfile({
      profile,
      repoRoot
    });
    const saved = await readIntakeProfile({
      repoRoot
    });

    // Assert
    expect(relativePath).toBe(".planning/yolo-port/intake-profile.json");
    expect(readFileSync(path.join(repoRoot, relativePath), "utf8")).toContain("\"mode\": \"standard\"");
    expect(saved?.targetStack).toBe("rust/axum");

    // Cleanup
    rmSync(repoRoot, { force: true, recursive: true });
  });
});

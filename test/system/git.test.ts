import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  inspectLocalRepository,
  inspectRemoteRepository,
  readGitDiffStats
} from "../../src/adapters/system/git.js";

describe("inspectLocalRepository", () => {
  test("reports not-a-repo when the directory is outside git", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-local-inspect-"));

    // Act
    const inspection = await inspectLocalRepository({
      cwd: tempDir
    });

    // Assert
    expect(inspection.cleanliness).toBe("not-a-repo");
    expect(inspection.isGitRepo).toBeFalsy();

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("reports dirty repositories with tracked and untracked counts", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-local-inspect-"));
    spawnSync("git", ["init"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    writeFileSync(path.join(tempDir, "tracked.txt"), "tracked\n");
    spawnSync("git", ["add", "tracked.txt"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    spawnSync("git", ["commit", "-m", "init"], {
      cwd: tempDir,
      env: {
        ...process.env,
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_AUTHOR_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "Test"
      },
      stdio: "ignore"
    });
    writeFileSync(path.join(tempDir, "tracked.txt"), "changed\n");
    writeFileSync(path.join(tempDir, "untracked.txt"), "new\n");

    // Act
    const inspection = await inspectLocalRepository({
      cwd: tempDir
    });

    // Assert
    expect(inspection.cleanliness).toBe("dirty");
    expect(inspection.repoName).toBe(path.basename(tempDir));
    expect(inspection.trackedChangeCount > 0).toBeTruthy();
    expect(inspection.untrackedCount).toBe(1);

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

describe("inspectRemoteRepository", () => {
  test("derives the default clone destination and remote metadata", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-remote-inspect-"));
    const originDir = path.join(tempDir, "origin.git");
    mkdirSync(originDir, { recursive: true });
    spawnSync("git", ["init", "--bare"], {
      cwd: originDir,
      stdio: "ignore"
    });

    // Act
    const inspection = await inspectRemoteRepository({
      cwd: tempDir,
      repoUrl: `file://${originDir}`
    });

    // Assert
    expect(inspection.repoName).toBe("origin");
    expect(inspection.cloneDestination).toBe(path.join(tempDir, "origin"));
    expect(inspection.existingPathKind).toBe("missing");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

describe("readGitDiffStats", () => {
  test("returns diff stats against a valid base ref", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-git-diff-"));
    spawnSync("git", ["init"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    spawnSync("git", ["config", "user.name", "Test"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    spawnSync("git", ["config", "user.email", "test@example.com"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    writeFileSync(path.join(tempDir, "file.txt"), "before\n");
    spawnSync("git", ["add", "file.txt"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    spawnSync("git", ["commit", "-m", "init"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    spawnSync("git", ["tag", "base"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    writeFileSync(path.join(tempDir, "file.txt"), "before\nafter\n");
    spawnSync("git", ["add", "file.txt"], {
      cwd: tempDir,
      stdio: "ignore"
    });
    spawnSync("git", ["commit", "-m", "change"], {
      cwd: tempDir,
      stdio: "ignore"
    });

    // Act
    const stats = await readGitDiffStats({
      baseRef: "refs/tags/base",
      repoRoot: tempDir
    });

    // Assert
    expect(stats?.filesChanged).toBe(1);
    expect((stats?.additions ?? 0) > 0).toBeTruthy();

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

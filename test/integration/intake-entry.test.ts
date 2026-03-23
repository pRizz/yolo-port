import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function writeBrightBuildsStub(tempDir: string): string {
  const scriptPath = path.join(tempDir, "bright-builds-stub.sh");
  const script = `#!/usr/bin/env bash
set -euo pipefail
command="$1"
shift
case "$command" in
  status)
    cat <<'EOF'
Target repository: repo
Repo state: installable
Recommended action: install
EOF
    ;;
  install)
    exit 0
    ;;
  update)
    exit 0
    ;;
esac
`;
  writeFileSync(scriptPath, script);
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

function initGitRepo(repoRoot: string): void {
  spawnSync("git", ["init"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  writeFileSync(path.join(repoRoot, "README.md"), "demo\n");
  spawnSync("git", ["add", "README.md"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  spawnSync("git", ["commit", "-m", "init"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_AUTHOR_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test"
    },
    stdio: "ignore"
  });
}

describe("intake entry", () => {
  test("routes commandless local execution into bootstrap intake", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-intake-local-"));
    const repoRoot = path.join(tempDir, "repo");
    const codexHome = path.join(tempDir, ".codex");
    mkdirSync(repoRoot, { recursive: true });
    initGitRepo(repoRoot);
    const brightBuildsScript = writeBrightBuildsStub(tempDir);

    // Act
    const result = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "--dry-run", "--mode", "yolo", "--yes"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript
        }
      }
    );

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Repository: repo (clean)");
    expect(result.stdout).toContain("Selected mode: yolo");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("inspects a remote repository before clone and leaves dry-run destinations untouched", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-intake-remote-"));
    const originDir = path.join(tempDir, "origin.git");
    mkdirSync(originDir, { recursive: true });
    spawnSync("git", ["init", "--bare"], {
      cwd: originDir,
      stdio: "ignore"
    });
    const cloneDestination = path.join(realpathSync(tempDir), "origin");

    // Act
    const result = spawnSync(
      process.execPath,
      [
        path.join(workspaceRoot, "bin", "yolo-port.js"),
        `file://${originDir}`,
        "--dry-run",
        "--mode",
        "yolo",
        "--yes"
      ],
      {
        cwd: tempDir,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: path.join(tempDir, ".codex")
        }
      }
    );

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Remote repository:");
    expect(result.stdout).toContain(`Clone destination: ${cloneDestination}`);
    expect(existsSync(cloneDestination)).toBeFalsy();

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("stops on dirty local repositories and prints agent-friendly recovery guidance", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-intake-dirty-"));
    const repoRoot = path.join(tempDir, "repo");
    mkdirSync(repoRoot, { recursive: true });
    initGitRepo(repoRoot);
    writeFileSync(path.join(repoRoot, "dirty.txt"), "pending\n");

    // Act
    const result = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "--dry-run", "--mode", "yolo", "--yes"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: path.join(tempDir, ".codex")
        }
      }
    );

    // Assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Repository status: dirty");
    expect(result.stdout).toContain("Agent-ready prompt");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

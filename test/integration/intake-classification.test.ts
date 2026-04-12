import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
  install|update)
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

function commitAll(repoRoot: string, message: string): void {
  spawnSync("git", ["add", "."], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  spawnSync("git", ["commit", "-m", message], {
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

function seedManagedRepo(repoRoot: string, options: {
  includeFinalReport?: boolean;
  includeSourceReference?: boolean;
} = {}): void {
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

  if (options.includeSourceReference) {
    writeFileSync(path.join(yoloPortDir, "source-reference.json"), "{}");
  }

  if (options.includeFinalReport) {
    writeFileSync(path.join(yoloPortDir, "final-report.md"), "# done\n");
  }

  commitAll(repoRoot, "seed managed state");
}

describe("intake classification", () => {
  test("treats unmanaged repos as fresh", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-classify-fresh-"));
    const repoRoot = path.join(tempDir, "repo");
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
          CODEX_HOME: path.join(tempDir, ".codex"),
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript
        }
      }
    );

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Detected state: fresh");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("treats managed repos without completion evidence as in-progress", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-classify-progress-"));
    const repoRoot = path.join(tempDir, "repo");
    mkdirSync(repoRoot, { recursive: true });
    initGitRepo(repoRoot);
    seedManagedRepo(repoRoot);
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
          CODEX_HOME: path.join(tempDir, ".codex"),
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript
        }
      }
    );

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Detected state: in-progress");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("surfaces already-ported actions in the agreed order", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-classify-ported-"));
    const repoRoot = path.join(tempDir, "repo");
    mkdirSync(repoRoot, { recursive: true });
    initGitRepo(repoRoot);
    seedManagedRepo(repoRoot, {
      includeFinalReport: true,
      includeSourceReference: true
    });

    // Act
    const result = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "--mode", "yolo", "--yes"],
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
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Detected state: already-ported");
    expect(result.stdout).toContain("1. View previous run summary");
    expect(result.stdout).toContain("2. Audit parity against source");
    expect(result.stdout).toContain("3. Update the port from upstream (planned)");
    expect(result.stdout).toContain("4. Inspect managed artifacts/state");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

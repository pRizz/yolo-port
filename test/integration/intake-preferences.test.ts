import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function writeGsdInstaller(tempDir: string): string {
  const scriptPath = path.join(tempDir, "install-gsd.sh");
  const script = `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$CODEX_HOME/get-shit-done"
mkdir -p "$CODEX_HOME/skills/gsd-new-project"
printf '2026.03.22\\n' > "$CODEX_HOME/get-shit-done/VERSION"
printf '# stub\\n' > "$CODEX_HOME/skills/gsd-new-project/SKILL.md"
`;
  writeFileSync(scriptPath, script);
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

describe("intake preferences", () => {
  test("persists a live intake profile and reuses it on rerun", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-intake-profile-live-"));
    const repoRoot = path.join(tempDir, "repo");
    const codexHome = path.join(tempDir, ".codex");
    mkdirSync(repoRoot, { recursive: true });
    const brightBuildsScript = writeBrightBuildsStub(tempDir);
    const gsdInstaller = writeGsdInstaller(tempDir);

    // Act
    const initial = spawnSync(
      process.execPath,
      [
        path.join(workspaceRoot, "bin", "yolo-port.js"),
        "bootstrap",
        "--mode",
        "standard",
        "--target-stack",
        "rust/axum",
        "--agent",
        "codex",
        "--ask-taste",
        "--yes"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript,
          YOLO_PORT_GSD_INSTALLER: gsdInstaller
        }
      }
    );
    const rerun = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "--dry-run", "--yes"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript,
          YOLO_PORT_GSD_INSTALLER: gsdInstaller
        }
      }
    );

    // Assert
    expect(initial.status).toBe(0);
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "intake-profile.json"), "utf8")
    ).toContain("\"targetStack\": \"rust/axum\"");
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toContain("Saved preferences were found");
    expect(rerun.stdout).toContain("Target stack: rust/axum");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("lets flags override saved intake metadata on rerun", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-intake-profile-override-"));
    const repoRoot = path.join(tempDir, "repo");
    mkdirSync(path.join(repoRoot, ".planning", "yolo-port"), { recursive: true });
    writeFileSync(
      path.join(repoRoot, ".planning", "yolo-port", "intake-profile.json"),
      JSON.stringify({
        askTasteQuestions: false,
        cloneDestination: null,
        mode: "guided",
        preferredAgent: "claude",
        schemaVersion: 1,
        sourceRepo: "/tmp/old-repo",
        targetStack: "go/chi",
        tasteAnswers: {},
        tasteDefaults: [],
        updatedAt: "2026-03-22T00:00:00.000Z"
      })
    );
    const brightBuildsScript = writeBrightBuildsStub(tempDir);

    // Act
    const result = spawnSync(
      process.execPath,
      [
        path.join(workspaceRoot, "bin", "yolo-port.js"),
        "--dry-run",
        "--mode",
        "yolo",
        "--target-stack",
        "zig/http",
        "--agent",
        "codex",
        "--yes"
      ],
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
    expect(result.stdout).toContain("Selected mode: yolo");
    expect(result.stdout).toContain("Target stack: zig/http");
    expect(result.stdout).toContain("Preferred agent: codex");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

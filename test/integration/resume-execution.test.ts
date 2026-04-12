import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
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
printf '2026.03.22\n' > "$CODEX_HOME/get-shit-done/VERSION"
`;
  writeFileSync(scriptPath, script);
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

function writeFlakyExecutor(tempDir: string): string {
  const scriptPath = path.join(tempDir, "executor.sh");
  const stateFile = path.join(tempDir, "executor-state.txt");
  writeFileSync(
    scriptPath,
    `#!/usr/bin/env bash
set -euo pipefail
repo_root="$1"
prompt_path="$2"
mode="$3"
state="$(cat "${stateFile}" 2>/dev/null || printf 'fail')"
if [[ "$state" == "fail" ]]; then
  printf 'ok' > "${stateFile}"
  printf 'simulated failure for %s %s %s\\n' "$repo_root" "$prompt_path" "$mode" >&2
  exit 1
fi
mkdir -p "$repo_root/.planning/yolo-port"
printf 'runner success\\n' > "$repo_root/.planning/yolo-port/executor-marker.txt"
printf 'success for %s %s %s\\n' "$repo_root" "$prompt_path" "$mode"
`
  );
  chmodSync(scriptPath, 0o755);
  writeFileSync(stateFile, "fail");
  return scriptPath;
}

function initGitRepo(repoRoot: string): void {
  spawnSync("git", ["init"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  spawnSync("git", ["config", "user.name", "Test"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  spawnSync("git", ["config", "user.email", "test@example.com"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
}

describe("resume execution", () => {
  test("resumes from a failed managed execution and completes on retry", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-resume-"));
    const repoRoot = path.join(tempDir, "repo");
    const codexHome = path.join(tempDir, ".codex");
    mkdirSync(repoRoot, { recursive: true });
    initGitRepo(repoRoot);
    mkdirSync(path.join(repoRoot, "src", "cli"), { recursive: true });
    mkdirSync(path.join(repoRoot, "bin"), { recursive: true });
    writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({
      bin: {
        "demo-cli": "bin/demo.js"
      },
      name: "demo-service"
    }, null, 2));
    writeFileSync(path.join(repoRoot, "bin", "demo.js"), "#!/usr/bin/env node\n");
    writeFileSync(path.join(repoRoot, "src", "cli", "flags.ts"), "export const flags = ['--mode'];\n");
    writeFileSync(path.join(repoRoot, "src", "server.ts"), "app.get('/health', handler);\n");
    spawnSync("git", ["add", "."], {
      cwd: repoRoot,
      stdio: "ignore"
    });
    spawnSync("git", ["commit", "-m", "init"], {
      cwd: repoRoot,
      stdio: "ignore"
    });
    const brightBuildsScript = writeBrightBuildsStub(tempDir);
    const gsdInstaller = writeGsdInstaller(tempDir);
    const executor = writeFlakyExecutor(tempDir);

    // Act
    const firstRun = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "bootstrap", "--mode", "yolo", "--yes"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? "/usr/bin:/bin"}`,
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript,
          YOLO_PORT_GSD_EXECUTOR: executor,
          YOLO_PORT_GSD_INSTALLER: gsdInstaller
        }
      }
    );
    const stateAfterFirstRun = readFileSync(
      path.join(repoRoot, ".planning", "yolo-port", "execution-state.json"),
      "utf8"
    );
    const secondRun = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "resume", "--yes"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? "/usr/bin:/bin"}`,
          YOLO_PORT_BRIGHT_BUILDS_SCRIPT: brightBuildsScript,
          YOLO_PORT_GSD_EXECUTOR: executor,
          YOLO_PORT_GSD_INSTALLER: gsdInstaller
        }
      }
    );

    // Assert
    expect(firstRun.status).toBe(1);
    expect(stateAfterFirstRun).toContain("\"status\": \"failed\"");
    expect(secondRun.status).toBe(0);
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "execution-state.json"), "utf8")
    ).toContain("\"status\": \"completed\"");
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "execution-summary.md"), "utf8")
    ).toContain("Managed execution completed");
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "executor-marker.txt"), "utf8")
    ).toContain("runner success");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

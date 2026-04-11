import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function writeBrightBuildsStub(tempDir: string): string {
  const scriptPath = path.join(tempDir, "bright-builds-stub.sh");
  const stateFile = path.join(tempDir, "bright-builds-state.txt");
  const script = `#!/usr/bin/env bash
set -euo pipefail
command="$1"
shift
state="$(cat "${stateFile}")"
case "$command" in
  status)
    if [[ "$state" == "blocked" ]]; then
      cat <<'EOF'
Target repository: repo
Repo state: blocked
Recommended action: install
[blocked] AGENTS.md
EOF
    elif [[ "$state" == "installed" ]]; then
      cat <<'EOF'
Target repository: repo
Repo state: installed
Recommended action: none
EOF
    else
      cat <<'EOF'
Target repository: repo
Repo state: installable
Recommended action: install
EOF
    fi
    ;;
  install)
    printf 'installed' > "${stateFile}"
    mkdir -p "$PWD/.bright-builds"
    printf 'ok\n' > "$PWD/.bright-builds/installed.txt"
    ;;
  update)
    printf 'installed' > "${stateFile}"
    ;;
esac
`;
  writeFileSync(scriptPath, script);
  chmodSync(scriptPath, 0o755);
  writeFileSync(stateFile, "installable");
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

describe("bootstrap managed repo", () => {
  test("bootstraps an installable repo and creates managed planning state", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-managed-"));
    const repoRoot = path.join(tempDir, "repo");
    const codexHome = path.join(tempDir, ".codex");
    mkdirSync(repoRoot, { recursive: true });
    const brightBuildsScript = writeBrightBuildsStub(tempDir);
    const gsdInstaller = writeGsdInstaller(tempDir);

    // Act
    const result = spawnSync(
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
          YOLO_PORT_GSD_INSTALLER: gsdInstaller
        }
      }
    );

    // Assert
    expect(result.status).toBe(0);
    expect(readFileSync(path.join(repoRoot, ".planning", "yolo-port", "manifest.json"), "utf8")).toContain("\"manager\": \"yolo-port\"");
    expect(readFileSync(path.join(repoRoot, ".planning", "yolo-port", "port-plan.md"), "utf8")).toContain("Proceed Gate");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

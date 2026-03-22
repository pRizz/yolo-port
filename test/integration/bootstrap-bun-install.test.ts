import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

describe("bootstrap Bun installation handoff", () => {
  test("installs Bun and continues into a Bun-managed command", () => {
    // Arrange
    const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-bun-install-"));
    const bunHome = path.join(tempDir, "bun-home");
    const markerPath = path.join(tempDir, "bun-invocation.txt");
    const installerPath = path.join(tempDir, "install-bun.sh");
    const installerScript = `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "${bunHome}/bin"
cat > "${bunHome}/bin/bun" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "--version" ]]; then
  printf '1.9.9-test\\n'
  exit 0
fi
printf '%s\\n' "$@" > "${markerPath}"
EOF
chmod +x "${bunHome}/bin/bun"
`;

    writeFileSync(installerPath, installerScript);
    chmodSync(installerPath, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        "bin/yolo-port.js",
        "bootstrap",
        "--dry-run",
        "--mode",
        "yolo",
        "--yes"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          BUN_INSTALL: bunHome,
          CODEX_HOME: path.join(tempDir, ".codex"),
          HOME: tempDir,
          PATH: "/usr/bin:/bin",
          YOLO_PORT_BUN_INSTALLER: installerPath
        }
      }
    );

    // Assert
    expect(result.status).toBe(0);
    expect(readFileSync(markerPath, "utf8")).toContain("src/cli/main.ts");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

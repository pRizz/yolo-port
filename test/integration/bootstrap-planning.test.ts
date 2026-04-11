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

describe("bootstrap planning", () => {
  test("creates parity-planning artifacts for a representative repo", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-planning-"));
    const repoRoot = path.join(tempDir, "repo");
    const codexHome = path.join(tempDir, ".codex");
    mkdirSync(repoRoot, {
      recursive: true
    });
    initGitRepo(repoRoot);
    mkdirSync(path.join(repoRoot, "src", "cli"), {
      recursive: true
    });
    mkdirSync(path.join(repoRoot, "bin"), {
      recursive: true
    });
    writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({
      bin: {
        "demo-cli": "bin/demo.js"
      },
      name: "demo-service"
    }, null, 2));
    writeFileSync(path.join(repoRoot, "bin", "demo.js"), "#!/usr/bin/env node\n");
    writeFileSync(
      path.join(repoRoot, "src", "cli", "flags.ts"),
      "export const flags = ['--mode', '--verbose'];\n"
    );
    writeFileSync(
      path.join(repoRoot, "src", "server.ts"),
      "app.get('/health', handler);\nconst port = process.env.PORT;\n"
    );
    writeFileSync(path.join(repoRoot, ".env.example"), "PORT=3000\n");
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
    expect(result.stdout).toContain("yolo-port ► Plan Preview");
    expect(result.stdout).toContain("Pricing snapshot:");
    const parityChecklist = readFileSync(
      path.join(repoRoot, ".planning", "yolo-port", "parity-checklist.md"),
      "utf8"
    );
    const portPlan = readFileSync(
      path.join(repoRoot, ".planning", "yolo-port", "port-plan.md"),
      "utf8"
    );
    const sourceReference = readFileSync(
      path.join(repoRoot, ".planning", "yolo-port", "source-reference.json"),
      "utf8"
    );
    expect(parityChecklist).toContain("GET /health");
    expect(parityChecklist).toContain("PORT");
    expect(portPlan).toContain("Selected model:");
    expect(portPlan).toContain("Proceed Gate");
    expect(sourceReference).toContain("yolo-port/source-reference");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

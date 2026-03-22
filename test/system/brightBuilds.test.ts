import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readBrightBuildsStatus,
  runBrightBuildsAction
} from "../../src/adapters/system/brightBuilds.js";

function writeBrightBuildsStub(tempDir: string): string {
  const scriptPath = path.join(tempDir, "bright-builds-stub.sh");
  const script = `#!/usr/bin/env bash
set -euo pipefail
state_file="${tempDir}/state.txt"
args_file="${tempDir}/args.txt"
printf '%s\\n' "$@" > "$args_file"
command="$1"
shift
state="$(cat "$state_file")"
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
Recommended action: update
Auto-update: enabled
Auto-update reason: trusted repo owner pRizz
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
    printf 'installed' > "$state_file"
    ;;
  update)
    printf 'installed' > "$state_file"
    ;;
esac
`;
  writeFileSync(scriptPath, script);
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

describe("brightBuilds adapter", () => {
  test("parses blocked status and blocked files", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-bright-builds-"));
    const scriptPath = writeBrightBuildsStub(tempDir);
    writeFileSync(path.join(tempDir, "state.txt"), "blocked");

    // Act
    const status = await readBrightBuildsStatus({
      env: {
        ...process.env,
        YOLO_PORT_BRIGHT_BUILDS_SCRIPT: scriptPath
      },
      repoRoot: tempDir
    });

    // Assert
    expect(status.repoState).toBe("blocked");
    expect(status.blockers).toContain("AGENTS.md");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });

  test("runs install or update and returns the refreshed status", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-bright-builds-"));
    const scriptPath = writeBrightBuildsStub(tempDir);
    writeFileSync(path.join(tempDir, "state.txt"), "installable");

    // Act
    const result = await runBrightBuildsAction({
      action: "install",
      env: {
        ...process.env,
        YOLO_PORT_BRIGHT_BUILDS_SCRIPT: scriptPath
      },
      force: true,
      repoRoot: tempDir
    });

    // Assert
    expect(result.status.repoState).toBe("installed");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

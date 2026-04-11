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

import {
  buildBootstrapPlanningDraft,
  persistBootstrapPlanningDraft
} from "../../src/cli/bootstrap/planning.js";

function initGitRepo(repoRoot: string): void {
  spawnSync("git", ["init"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({
    bin: {
      demo: "bin/demo.js"
    },
    name: "demo"
  }, null, 2));
  mkdirSync(path.join(repoRoot, "bin"), {
    recursive: true
  });
  writeFileSync(path.join(repoRoot, "bin", "demo.js"), "#!/usr/bin/env node\n");
  spawnSync("git", ["add", "."], {
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

describe("bootstrap planning persistence", () => {
  test("preserves a git source reference and writes phase-3 planning artifacts", async () => {
    // Arrange
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-port-plan-"));
    const repoRoot = path.join(tempDir, "repo");
    mkdirSync(repoRoot, {
      recursive: true
    });
    initGitRepo(repoRoot);
    mkdirSync(path.join(repoRoot, ".planning"), {
      recursive: true
    });
    writeFileSync(path.join(repoRoot, ".planning", "config.json"), JSON.stringify({
      model_profile: "quality"
    }, null, 2));

    // Act
    const draft = await buildBootstrapPlanningDraft({
      generatedAt: "2026-04-11T22:15:30.848Z",
      maybePreferredAgent: "codex",
      maybeTargetStack: "rust/axum",
      mode: "yolo",
      repoRoot,
      sourceKind: "local"
    });
    const filesWritten = await persistBootstrapPlanningDraft({
      approvalMode: "auto",
      approved: true,
      approvedAt: "2026-04-11T22:16:00.000Z",
      draft,
      generatedAt: "2026-04-11T22:15:30.848Z",
      maybeTargetStack: "rust/axum",
      repoRoot
    });

    // Assert
    expect(filesWritten).toContain(".planning/yolo-port/source-reference.json");
    expect(filesWritten).toContain(".planning/yolo-port/port-plan.md");
    const sourceReference = JSON.parse(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "source-reference.json"), "utf8")
    ) as {
      git: {
        referenceSha: string | null;
        tagName: string | null;
      };
      strategy: string;
    };
    expect(sourceReference.strategy).toBe("git-tag");
    expect(sourceReference.git.tagName).toBe("yolo-port/source-reference");
    expect(sourceReference.git.referenceSha).toBeTruthy();
    const tagResult = spawnSync("git", ["rev-parse", "refs/tags/yolo-port/source-reference"], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    expect(tagResult.status).toBe(0);

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

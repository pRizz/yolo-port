import { describe, expect, test } from "bun:test";
import {
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

function seedManagedAuditRepo(repoRoot: string): void {
  mkdirSync(path.join(repoRoot, ".planning", "yolo-port"), { recursive: true });
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "manifest.json"),
    JSON.stringify({
      createdAt: "2026-04-12T12:00:00.000Z",
      manager: "yolo-port",
      repoRoot,
      schemaVersion: 1
    }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "source-reference.json"),
    JSON.stringify({
      generatedAt: "2026-04-12T12:00:00.000Z",
      git: {
        branch: "main",
        currentHeadSha: "head",
        referenceSha: "head",
        remotes: [],
        tagName: "yolo-port/source-reference"
      },
      manifestSamplePaths: ["src/server.ts"],
      repoRoot,
      schemaVersion: 1,
      sourceKind: "local",
      strategy: "git-tag",
      structuralIntent: {
        parityGoal: "1:1 external interface parity",
        requiresReferenceBeforeExecution: true,
        strategy: "in-place-managed-port",
        targetStack: "rust/axum"
      }
    }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "interface-inventory.json"),
    JSON.stringify({
      generatedAt: "2026-04-12T12:00:00.000Z",
      items: [
        {
          details: "GET /health",
          kind: "http-route",
          label: "GET /health",
          sourcePath: "src/server.ts"
        }
      ],
      schemaVersion: 1,
      summary: {
        byKind: {
          "cli-entrypoint": 0,
          "cli-flag": 0,
          "config-file": 0,
          "environment-variable": 0,
          "http-route": 1,
          "package-export": 0
        },
        configFileCount: 0,
        dependencyCount: 0,
        detectedLanguages: ["typescript"],
        sourceFileCount: 1,
        totalInterfaces: 1,
        totalLines: 10
      }
    }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "plan-approval.json"),
    JSON.stringify({
      approvalMode: "auto",
      approved: true,
      approvedAt: "2026-04-12T12:05:00.000Z",
      schemaVersion: 1
    }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "port-plan.json"),
    JSON.stringify({
      approval: {
        approvalMode: "auto",
        approved: true,
        approvedAt: "2026-04-12T12:05:00.000Z",
        schemaVersion: 1
      },
      artifactPaths: {
        interfaceInventory: ".planning/yolo-port/interface-inventory.json",
        parityChecklist: ".planning/yolo-port/parity-checklist.md",
        pricingSnapshot: ".planning/yolo-port/pricing-snapshot.json",
        sourceReference: ".planning/yolo-port/source-reference.json"
      },
      estimate: {
        assumptions: ["demo"],
        confidence: "medium",
        durationMinutes: { max: 10, min: 5 },
        generatedAt: "2026-04-12T12:00:00.000Z",
        pricingCapturedAt: "2026-04-11",
        pricingSourceUrl: "https://openai.com/api/pricing",
        reasoningProfile: "high",
        schemaVersion: 1,
        selectedModel: "gpt-5.4",
        selectedProfile: "quality",
        selectedProvider: "openai",
        tokenRange: { max: 100, min: 50 },
        usdRange: { max: 2, min: 1 }
      },
      generatedAt: "2026-04-12T12:00:00.000Z",
      schemaVersion: 1,
      targetStack: "rust/axum"
    }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "parity-checklist.md"),
    "# Parity Checklist\n\n| Surface | Category |\n|---|---|\n| `GET /health` | http-route |\n"
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "pricing-snapshot.json"),
    JSON.stringify({ providers: [], schemaVersion: 1 }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "execution-state.json"),
    JSON.stringify({
      completedSteps: [
        "prepare-handoff",
        "invoke-runner",
        "verify-runner-output",
        "complete-managed-run"
      ],
      currentStep: null,
      handoffPath: ".planning/yolo-port/execution-handoff.md",
      lastError: null,
      lastRunner: "configured-script",
      mode: "yolo",
      outputPath: ".planning/yolo-port/execution-output.log",
      repoRoot,
      resumeCommand: "yolo-port resume --yes",
      schemaVersion: 1,
      startedAt: "2026-04-12T12:00:00.000Z",
      status: "completed",
      summaryPath: ".planning/yolo-port/execution-summary.md",
      updatedAt: "2026-04-12T12:10:00.000Z"
    }, null, 2)
  );
  writeFileSync(
    path.join(repoRoot, ".planning", "yolo-port", "execution-summary.md"),
    "# Managed Execution Summary\n\nManaged execution completed.\n"
  );
  spawnSync("git", ["add", "."], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  spawnSync("git", ["commit", "-m", "seed managed audit repo"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  spawnSync("git", ["tag", "yolo-port/source-reference"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
}

describe("audit command", () => {
  test("writes parity-audit and final-report artifacts for a managed repo", () => {
    // Arrange
    const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-audit-"));
    const repoRoot = path.join(tempDir, "repo");
    mkdirSync(repoRoot, { recursive: true });
    initGitRepo(repoRoot);
    mkdirSync(path.join(repoRoot, "src"), { recursive: true });
    writeFileSync(path.join(repoRoot, "src", "server.ts"), "app.get('/health', handler);\n");
    seedManagedAuditRepo(repoRoot);

    // Act
    const result = spawnSync(
      process.execPath,
      [path.join(workspaceRoot, "bin", "yolo-port.js"), "audit", "--verbose"],
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
    expect(result.stdout).toContain("Audit status: passed");
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "parity-audit.json"), "utf8")
    ).toContain("\"overallStatus\": \"passed\"");
    expect(
      readFileSync(path.join(repoRoot, ".planning", "yolo-port", "final-report.md"), "utf8")
    ).toContain("Parity audit passed");

    // Cleanup
    rmSync(tempDir, { force: true, recursive: true });
  });
});

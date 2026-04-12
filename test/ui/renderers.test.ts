import { describe, expect, test } from "bun:test";

import type { BrightBuildsStatus } from "../../src/adapters/system/brightBuilds.js";
import type { BootstrapAction } from "../../src/domain/bootstrap/types.js";
import type { RepoClassificationResult } from "../../src/domain/intake/types.js";
import type { ManagedRepoState } from "../../src/persistence/managedRepoState.js";
import { renderActionLog } from "../../src/ui/actionLog.js";
import { renderRepoClassification } from "../../src/ui/classification.js";
import { renderSectionBanner } from "../../src/ui/progress.js";
import { renderBrightBuildsBlockedRecovery } from "../../src/ui/recovery.js";
import { renderBootstrapSummary } from "../../src/ui/summary.js";

function createAction(overrides: Partial<BootstrapAction> = {}): BootstrapAction {
  return {
    automatic: true,
    kind: "verify-bun",
    label: "Check whether Bun is available",
    phase: "checks",
    reason: "Bun gates every Bun-managed command path.",
    ...overrides
  };
}

function createManagedState(
  overrides: Partial<ManagedRepoState> = {}
): ManagedRepoState {
  return {
    bootstrapState: null,
    explicitCompletedStatePath: null,
    finalReportPaths: [],
    manifest: null,
    parityArtifactPaths: [],
    recentSummaryPaths: [".planning/runs/summary.md"],
    sourceReferencePaths: [],
    yoloPortDir: ".planning/yolo-port",
    ...overrides
  };
}

function createClassification(
  overrides: Partial<RepoClassificationResult> = {}
): RepoClassificationResult {
  return {
    actions: ["continue-bootstrap"],
    evidence: ["planning manifest present"],
    needsConfirmation: false,
    recommendedState: "in-progress",
    state: "in-progress",
    ...overrides
  };
}

function createBrightBuildsStatus(
  overrides: Partial<BrightBuildsStatus> = {}
): BrightBuildsStatus {
  return {
    autoUpdate: "enabled",
    autoUpdateReason: "trusted owner",
    blockers: ["AGENTS.md"],
    output: "Repo state: blocked",
    recommendedAction: "inspect",
    repoRoot: "/tmp/yolo-port",
    repoState: "blocked",
    ...overrides
  };
}

describe("shared ui renderers", () => {
  test("renderActionLog keeps quiet mode terse", () => {
    // Arrange
    const actions = [
      createAction({
        automatic: false,
        kind: "select-mode",
        label: "Resolve involvement mode and defaults",
        phase: "questions"
      })
    ];

    // Act
    const lines = renderActionLog(actions, "quiet");

    // Assert
    expect(lines).toEqual(["- Resolve involvement mode and defaults"]);
  });

  test("renderActionLog includes actor and reason when verbosity is enabled", () => {
    // Arrange
    const actions = [createAction()];

    // Act
    const lines = renderActionLog(actions, "normal");

    // Assert
    expect(lines).toEqual([
      "- [auto] Check whether Bun is available — Bun gates every Bun-managed command path."
    ]);
  });

  test("renderRepoClassification includes evidence, actions, and the latest summary", () => {
    // Arrange
    const managedState = createManagedState();
    const result = createClassification({
      actions: ["continue-bootstrap", "view-previous-summary"],
      evidence: ["bootstrap state exists", "summary directory exists"]
    });

    // Act
    const lines = renderRepoClassification({
      managedState,
      result
    });

    // Assert
    expect(lines).toEqual([
      "Detected state: in-progress",
      "Recommendation: in-progress",
      "Evidence:",
      "- bootstrap state exists",
      "- summary directory exists",
      "Available actions:",
      "1. Continue managed bootstrap",
      "2. View previous run summary",
      "Latest summary: .planning/runs/summary.md"
    ]);
  });

  test("renderRepoClassification shows the real audit label for already-ported repos", () => {
    // Arrange
    const managedState = createManagedState({
      recentSummaryPaths: [".planning/yolo-port/final-report.md"]
    });
    const result = createClassification({
      actions: ["view-previous-summary", "audit-parity"],
      recommendedState: "already-ported",
      state: "already-ported"
    });

    // Act
    const lines = renderRepoClassification({
      managedState,
      result
    });

    // Assert
    expect(lines).toContain("2. Audit parity against source");
    expect(lines).toContain("Latest summary: .planning/yolo-port/final-report.md");
  });

  test("renderBrightBuildsBlockedRecovery reports blockers and recovery guidance", () => {
    // Arrange
    const status = createBrightBuildsStatus({
      blockers: ["AGENTS.md", ".github/pull_request_template.md"]
    });

    // Act
    const lines = renderBrightBuildsBlockedRecovery(status);

    // Assert
    expect(lines).toEqual([
      "Bright Builds blocked bootstrap in /tmp/yolo-port.",
      "- blocked: AGENTS.md",
      "- blocked: .github/pull_request_template.md",
      "Re-run with --force to replace the blocked managed files if that is intentional.",
      "If this looks like an installer gap, consider filing an issue at https://github.com/bright-builds-llc/coding-and-architecture-requirements/issues with the repo state and blocked files.",
      "You can hand this recovery output to your preferred AI agent if you want help preparing or filing that issue."
    ]);
  });

  test("renderBootstrapSummary emits files, preferences, warnings, and next command", () => {
    // Arrange
    const input = {
      filesWritten: [".planning/PROJECT.md", ".planning/ROADMAP.md"],
      mode: "guided" as const,
      nextCommand: "yolo-port",
      preferenceLines: ["Target stack: rust/axum"],
      repoState: "installed",
      toolLines: ["Bun 1.3.9", "Bright Builds installed"],
      warnings: ["Missing VERSION marker"]
    };

    // Act
    const lines = renderBootstrapSummary(input);

    // Assert
    expect(lines).toEqual([
      "Selected mode: guided",
      "Repo state: installed",
      "Tools:",
      "- Bun 1.3.9",
      "- Bright Builds installed",
      "Files written:",
      "- .planning/PROJECT.md",
      "- .planning/ROADMAP.md",
      "Saved preferences:",
      "- Target stack: rust/axum",
      "Warnings:",
      "- Missing VERSION marker",
      "Next command: yolo-port",
      "Next steps: review the scaffold, then continue with repository intake and planning."
    ]);
  });

  test("renderSectionBanner wraps the title in dividers", () => {
    // Arrange
    const title = "yolo-port ► Summary";

    // Act
    const output = renderSectionBanner(title);

    // Assert
    expect(output).toContain(title);
    expect(output.split("\n").length).toBe(3);
  });
});

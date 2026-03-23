import { describe, expect, test } from "bun:test";

import { classifyRepoState } from "../../../src/domain/intake/classifyRepoState.js";
import type { ManagedRepoState } from "../../../src/persistence/managedRepoState.js";

function createManagedState(overrides: Partial<ManagedRepoState> = {}): ManagedRepoState {
  return {
    bootstrapState: null,
    explicitCompletedStatePath: null,
    finalReportPaths: [],
    manifest: null,
    parityArtifactPaths: [],
    recentSummaryPaths: [],
    sourceReferencePaths: [],
    yoloPortDir: null,
    ...overrides
  };
}

describe("classifyRepoState", () => {
  test("treats repos with no managed evidence as fresh", () => {
    // Act
    const result = classifyRepoState({
      managedState: createManagedState()
    });

    // Assert
    expect(result.state).toBe("fresh");
    expect(result.actions).toEqual(["continue-bootstrap"]);
  });

  test("treats phase-1-style markers as in-progress, not already ported", () => {
    // Act
    const result = classifyRepoState({
      managedState: createManagedState({
        bootstrapState: {
          executedSteps: ["bright-builds:install"],
          mode: "guided",
          schemaVersion: 1,
          updatedAt: "2026-03-22T00:00:00.000Z",
          warnings: [],
          writtenArtifacts: [".planning/PROJECT.md"]
        },
        manifest: {
          createdAt: "2026-03-22T00:00:00.000Z",
          manager: "yolo-port",
          repoRoot: "/tmp/repo",
          schemaVersion: 1
        }
      })
    });

    // Assert
    expect(result.state).toBe("in-progress");
    expect(result.needsConfirmation).toBeFalsy();
  });

  test("requires strong completion evidence before classifying as already ported", () => {
    // Act
    const result = classifyRepoState({
      managedState: createManagedState({
        explicitCompletedStatePath: ".planning/yolo-port/port-state.json",
        finalReportPaths: [".planning/yolo-port/final-report.md"],
        manifest: {
          createdAt: "2026-03-22T00:00:00.000Z",
          manager: "yolo-port",
          repoRoot: "/tmp/repo",
          schemaVersion: 1
        },
        sourceReferencePaths: [".planning/yolo-port/source-reference.json"]
      })
    });

    // Assert
    expect(result.state).toBe("already-ported");
    expect(result.actions[0]).toBe("view-previous-summary");
    expect(result.actions[1]).toBe("audit-parity");
  });

  test("flags conflicting evidence for confirmation", () => {
    // Act
    const result = classifyRepoState({
      managedState: createManagedState({
        finalReportPaths: [".planning/yolo-port/final-report.md"]
      })
    });

    // Assert
    expect(result.state).toBe("in-progress");
    expect(result.needsConfirmation).toBeTruthy();
  });
});

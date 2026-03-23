import { describe, expect, test } from "bun:test";

import { planBootstrap } from "../../../src/domain/bootstrap/planBootstrap.js";
import type { BootstrapPlanningInput } from "../../../src/domain/bootstrap/types.js";

function createInput(overrides: Partial<BootstrapPlanningInput> = {}): BootstrapPlanningInput {
  return {
    bun: {
      path: "/tmp/bun",
      status: "present",
      version: "1.3.9"
    },
    gsd: {
      codexHome: "/tmp/.codex",
      reasons: [],
      repoPath: "/tmp/.codex/get-shit-done",
      status: "installed",
      version: "2026.03.22"
    },
    intent: {
      allowRepoMutation: false,
      assumeYes: false,
      dryRun: false,
      forceBrightBuilds: false,
      maybeRepoUrl: null,
      mode: "guided",
      verbosity: "normal"
    },
    ...overrides
  };
}

describe("planBootstrap", () => {
  test("keeps the bootstrap flow in checks/questions/summary/execute order", () => {
    // Arrange
    const input = createInput({
      bun: { path: null, status: "missing", version: null },
      gsd: {
        codexHome: "/tmp/.codex",
        reasons: ["GSD repo missing"],
        repoPath: "/tmp/.codex/get-shit-done",
        status: "missing",
        version: null
      }
    });

    // Act
    const plan = planBootstrap(input);

    // Assert
    expect(plan.steps.map((step) => step.phase)).toEqual([
      "checks",
      "questions",
      "summary",
      "execute"
    ]);
    expect(plan.steps[3]?.actions.map((action) => action.kind)).toEqual([
      "install-bun",
      "defer-gsd-mutation"
    ]);
  });

  test("makes guided mode keep the question step interactive", () => {
    // Arrange
    const input = createInput({
      intent: {
        allowRepoMutation: false,
        assumeYes: false,
        dryRun: false,
        forceBrightBuilds: false,
        maybeRepoUrl: null,
        mode: "guided",
        verbosity: "normal"
      }
    });

    // Act
    const plan = planBootstrap(input);

    // Assert
    expect(plan.steps[1]?.actions[0]?.automatic).toBeFalsy();
    expect(plan.steps[2]?.actions[0]?.automatic).toBeFalsy();
  });

  test("lets yolo mode auto-advance while keeping GSD mutation deferred", () => {
    // Arrange
    const input = createInput({
      gsd: {
        codexHome: "/tmp/.codex",
        reasons: ["Missing VERSION marker"],
        repoPath: "/tmp/.codex/get-shit-done",
        status: "stale",
        version: "2025.12.01"
      },
      intent: {
        allowRepoMutation: false,
        assumeYes: true,
        dryRun: false,
        forceBrightBuilds: false,
        maybeRepoUrl: "https://github.com/example/service",
        mode: "yolo",
        verbosity: "verbose"
      }
    });

    // Act
    const plan = planBootstrap(input);

    // Assert
    expect(plan.steps[1]?.actions[0]?.automatic).toBeTruthy();
    expect(plan.steps[2]?.actions[0]?.automatic).toBeTruthy();
    expect(plan.steps[3]?.actions[0]?.kind).toBe("defer-gsd-mutation");
    expect(plan.summaryLines).toContain("Mode: yolo");
  });
});

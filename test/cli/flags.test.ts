import { describe, expect, test } from "bun:test";

import { parseBootstrapArgs } from "../../src/cli/flags.js";

describe("parseBootstrapArgs", () => {
  test("parses value-based bootstrap flags and a repo url", () => {
    // Arrange
    const argv = [
      "https://github.com/example/service",
      "--mode",
      "yolo",
      "--target-stack",
      "rust/axum",
      "--agent",
      "codex",
      "--dest",
      "./service",
      "--ask-taste",
      "--yes",
      "--verbose"
    ];

    // Act
    const flags = parseBootstrapArgs(argv);

    // Assert
    expect(flags).toEqual({
      maybeAskTasteQuestions: true,
      assumeYes: true,
      maybeCloneDestination: "./service",
      dryRun: false,
      forceBrightBuilds: false,
      maybeMode: "yolo",
      maybePreferredAgent: "codex",
      maybeRepoUrl: "https://github.com/example/service",
      maybeTargetStack: "rust/axum",
      verbosity: "verbose"
    });
  });

  test("parses equals-style flags and quiet mode", () => {
    // Arrange
    const argv = [
      "--mode=standard",
      "--target-stack=zig/http",
      "--agent=claude",
      "--dest=./workspace",
      "--quiet",
      "-y"
    ];

    // Act
    const flags = parseBootstrapArgs(argv);

    // Assert
    expect(flags).toEqual({
      maybeAskTasteQuestions: null,
      assumeYes: true,
      maybeCloneDestination: "./workspace",
      dryRun: false,
      forceBrightBuilds: false,
      maybeMode: "standard",
      maybePreferredAgent: "claude",
      maybeRepoUrl: null,
      maybeTargetStack: "zig/http",
      verbosity: "quiet"
    });
  });

  test("parses explicit no-taste and dry-run flags", () => {
    // Arrange
    const argv = ["--no-taste-questions", "--dry-run", "--force"];

    // Act
    const flags = parseBootstrapArgs(argv);

    // Assert
    expect(flags.maybeAskTasteQuestions).toBe(false);
    expect(flags.dryRun).toBe(true);
    expect(flags.forceBrightBuilds).toBe(true);
  });

  test("throws when a required flag value is missing", () => {
    // Arrange
    const argv = ["--mode"];
    let error: unknown = null;

    // Act
    try {
      parseBootstrapArgs(argv);
    } catch (caughtError) {
      error = caughtError;
    }

    // Assert
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toBe("Expected a value after --mode");
  });

  test("throws on unsupported bootstrap arguments", () => {
    // Arrange
    const argv = ["--unknown"];
    let error: unknown = null;

    // Act
    try {
      parseBootstrapArgs(argv);
    } catch (caughtError) {
      error = caughtError;
    }

    // Assert
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toBe("Unsupported bootstrap argument: --unknown");
  });
});

import { describe, expect, test } from "bun:test";

import {
  inferTasteDefaults,
  mergeIntakePreferences
} from "../../../src/domain/intake/preferences.js";

describe("mergeIntakePreferences", () => {
  test("applies flags over current answers over saved metadata", () => {
    // Act
    const merged = mergeIntakePreferences({
      answers: {
        askTasteQuestions: false,
        maybeMode: "standard",
        maybePreferredAgent: "saved-agent",
        maybeTargetStack: "zig/http",
        tasteAnswers: {
          profile: "pragmatic"
        }
      },
      flags: {
        maybeAskTasteQuestions: true,
        maybeCloneDestination: "./override",
        maybeMode: "yolo",
        maybePreferredAgent: "codex",
        maybeRepoUrl: "https://github.com/example/service",
        maybeTargetStack: "rust/axum",
        verbosity: "normal"
      },
      savedProfile: {
        askTasteQuestions: false,
        cloneDestination: "./saved",
        mode: "guided",
        preferredAgent: "claude",
        schemaVersion: 1,
        sourceRepo: "https://github.com/example/old",
        targetStack: "go/chi",
        tasteAnswers: {
          notes: "saved"
        },
        tasteDefaults: [],
        updatedAt: "2026-03-22T00:00:00.000Z"
      },
      maybeSourceRepo: "/tmp/repo"
    });

    // Assert
    expect(merged.mode).toBe("yolo");
    expect(merged.maybeTargetStack).toBe("rust/axum");
    expect(merged.maybePreferredAgent).toBe("codex");
    expect(merged.maybeCloneDestination).toBe("./override");
    expect(merged.askTasteQuestions).toBe(true);
    expect(merged.maybeSourceRepo).toBe("https://github.com/example/service");
    expect(merged.tasteAnswers).toEqual({
      notes: "saved",
      profile: "pragmatic"
    });
  });
});

describe("inferTasteDefaults", () => {
  test("includes Bright Builds bias and current stack context", () => {
    // Act
    const defaults = inferTasteDefaults({
      maybePreferredAgent: "codex",
      maybeTargetStack: "rust/axum",
      tasteAnswers: {
        profile: "strict"
      }
    });

    // Assert
    expect(defaults[0]).toContain("Bright Builds");
    expect(defaults.join(" ")).toContain("rust/axum");
    expect(defaults.join(" ")).toContain("strict");
  });
});

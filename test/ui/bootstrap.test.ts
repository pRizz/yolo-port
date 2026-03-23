import { describe, expect, test } from "bun:test";

import type {
  LocalRepositoryInspection,
  RemoteRepositoryInspection
} from "../../src/domain/intake/types.js";
import {
  renderDirtyRepositoryRecovery,
  renderLocalRepositoryChecks,
  renderRemoteRepositoryChecks,
  renderResolvedPreferenceSummary,
  renderSavedPreferenceSummary
} from "../../src/ui/bootstrap.js";

function createLocalInspection(
  overrides: Partial<LocalRepositoryInspection> = {}
): LocalRepositoryInspection {
  return {
    cleanliness: "clean",
    dirtyEntries: [],
    isGitRepo: true,
    repoName: "yolo-port",
    repoRoot: "/tmp/work/yolo-port",
    trackedChangeCount: 0,
    untrackedCount: 0,
    ...overrides
  };
}

function createRemoteInspection(
  overrides: Partial<RemoteRepositoryInspection> = {}
): RemoteRepositoryInspection {
  return {
    cloneDestination: "/tmp/service",
    defaultBranch: "main",
    existingPathKind: "missing",
    normalizedUrl: "https://github.com/example/service",
    originalUrl: "https://github.com/example/service",
    owner: "example",
    provider: "github",
    repoName: "service",
    warnings: [],
    ...overrides
  };
}

describe("bootstrap ui renderers", () => {
  test("renderLocalRepositoryChecks explains non-repo bootstrap clearly", () => {
    // Arrange
    const inspection = createLocalInspection({
      cleanliness: "not-a-repo",
      isGitRepo: false,
      repoName: null,
      repoRoot: null
    });

    // Act
    const lines = renderLocalRepositoryChecks(inspection);

    // Assert
    expect(lines).toEqual([
      "Repository: current directory is not a git repo; bootstrap will use this directory."
    ]);
  });

  test("renderLocalRepositoryChecks falls back to the repo-root basename", () => {
    // Arrange
    const inspection = createLocalInspection({
      cleanliness: "dirty",
      repoName: null,
      repoRoot: "/tmp/work/example-repo"
    });

    // Act
    const lines = renderLocalRepositoryChecks(inspection);

    // Assert
    expect(lines).toEqual([
      "Repository: example-repo (dirty)",
      "Repo root: /tmp/work/example-repo"
    ]);
  });

  test("renderRemoteRepositoryChecks includes branch and warnings when present", () => {
    // Arrange
    const inspection = createRemoteInspection({
      warnings: ["using fallback branch detection", "destination already exists"]
    });

    // Act
    const lines = renderRemoteRepositoryChecks(inspection);

    // Assert
    expect(lines).toEqual([
      "Remote repository: https://github.com/example/service",
      "Clone destination: /tmp/service",
      "Remote default branch: main",
      "- warning: using fallback branch detection",
      "- warning: destination already exists"
    ]);
  });

  test("renderDirtyRepositoryRecovery caps the listed dirty entries", () => {
    // Arrange
    const inspection = createLocalInspection({
      cleanliness: "dirty",
      dirtyEntries: Array.from({ length: 12 }, (_, index) => `M file-${index + 1}.ts`)
    });

    // Act
    const lines = renderDirtyRepositoryRecovery(inspection);

    // Assert
    expect(lines).toContain("Repository status: dirty");
    expect(lines).toContain("Detected changes:");
    expect(lines).toContain("- M file-1.ts");
    expect(lines).toContain("- M file-10.ts");
    expect(lines.includes("- M file-11.ts")).toBe(false);
    expect(lines.at(-1)).toContain("Agent-ready prompt:");
  });

  test("renderSavedPreferenceSummary shows saved defaults and fallback labels", () => {
    // Arrange
    const profile = {
      askTasteQuestions: false,
      mode: "guided" as const,
      preferredAgent: null,
      targetStack: null
    };

    // Act
    const lines = renderSavedPreferenceSummary(profile);

    // Assert
    expect(lines).toEqual([
      "Mode: guided",
      "Target stack: not set",
      "Preferred agent: codex",
      "Taste questions: inferred defaults"
    ]);
  });

  test("renderResolvedPreferenceSummary shows taste defaults when available", () => {
    // Arrange
    const profile = {
      askTasteQuestions: true,
      preferredAgent: "codex",
      targetStack: "rust/axum",
      tasteDefaults: [
        "Favor Bright Builds-aligned coding and architecture defaults.",
        "Bias toward the selected target stack: rust/axum."
      ]
    };

    // Act
    const lines = renderResolvedPreferenceSummary(profile);

    // Assert
    expect(lines).toEqual([
      "Target stack: rust/axum",
      "Preferred agent: codex",
      "Taste handling: custom answers allowed",
      "Taste defaults: Favor Bright Builds-aligned coding and architecture defaults. | Bias toward the selected target stack: rust/axum."
    ]);
  });
});

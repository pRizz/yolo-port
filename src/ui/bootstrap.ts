import path from "node:path";

import type {
  LocalRepositoryInspection,
  RemoteRepositoryInspection
} from "../domain/intake/types.js";
import type { BootstrapMode } from "../domain/bootstrap/types.js";

export type SavedPreferenceSummary = {
  askTasteQuestions: boolean;
  maybePreferredAgent: string | null;
  maybeTargetStack: string | null;
  mode: BootstrapMode;
};

export type ResolvedPreferenceSummary = {
  askTasteQuestions: boolean;
  maybePreferredAgent: string | null;
  maybeTargetStack: string | null;
  tasteDefaults: string[];
};

export function renderLocalRepositoryChecks(inspection: LocalRepositoryInspection): string[] {
  if (!inspection.isGitRepo) {
    return ["Repository: current directory is not a git repo; bootstrap will use this directory."];
  }

  return [
    `Repository: ${inspection.repoName ?? path.basename(inspection.repoRoot ?? ".")} (${inspection.cleanliness})`,
    `Repo root: ${inspection.repoRoot ?? "unknown"}`
  ];
}

export function renderRemoteRepositoryChecks(inspection: RemoteRepositoryInspection): string[] {
  const lines = [
    `Remote repository: ${inspection.normalizedUrl}`,
    `Clone destination: ${inspection.cloneDestination}`
  ];

  if (inspection.defaultBranch) {
    lines.push(`Remote default branch: ${inspection.defaultBranch}`);
  }

  if (inspection.warnings.length > 0) {
    for (const warning of inspection.warnings) {
      lines.push(`- warning: ${warning}`);
    }
  }

  return lines;
}

export function renderDirtyRepositoryRecovery(inspection: LocalRepositoryInspection): string[] {
  const lines = [
    "Repository status: dirty",
    "yolo-port stops intake before any repo mutation when uncommitted changes are present.",
    "Suggested recovery:",
    "- commit or stash the current work",
    "- or hand this to your preferred AI agent to create an autocommit with clear context"
  ];

  if (inspection.dirtyEntries.length > 0) {
    lines.push("Detected changes:");
    for (const entry of inspection.dirtyEntries.slice(0, 10)) {
      lines.push(`- ${entry}`);
    }
  }

  lines.push(
    "Agent-ready prompt: create a safe checkpoint commit for the current repository state, then re-run `yolo-port`."
  );

  return lines;
}

export function renderSavedPreferenceSummary(profile: SavedPreferenceSummary): string[] {
  return [
    `Mode: ${profile.mode}`,
    `Target stack: ${profile.maybeTargetStack ?? "not set"}`,
    `Preferred agent: ${profile.maybePreferredAgent ?? "codex"}`,
    `Taste questions: ${profile.askTasteQuestions ? "saved answers/defaults enabled" : "inferred defaults"}`
  ];
}

export function renderResolvedPreferenceSummary(profile: ResolvedPreferenceSummary): string[] {
  const lines = [
    `Target stack: ${profile.maybeTargetStack ?? "not set"}`,
    `Preferred agent: ${profile.maybePreferredAgent ?? "codex"}`,
    `Taste handling: ${profile.askTasteQuestions ? "custom answers allowed" : "Bright Builds-aligned defaults"}`
  ];

  if (profile.tasteDefaults.length > 0) {
    lines.push(`Taste defaults: ${profile.tasteDefaults.join(" | ")}`);
  }

  return lines;
}

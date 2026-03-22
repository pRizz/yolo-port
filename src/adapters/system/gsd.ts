import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { GsdToolState } from "../../domain/bootstrap/types.js";

export type PlannedGsdAction = {
  kind: "install" | "none" | "update" | "verify";
  reason: string;
};

function resolveCodexHome(env: NodeJS.ProcessEnv): string {
  if (env.CODEX_HOME) {
    return env.CODEX_HOME;
  }

  return path.join(os.homedir(), ".codex");
}

export function detectGsd(options: { env?: NodeJS.ProcessEnv } = {}): GsdToolState {
  const env = options.env ?? process.env;
  const codexHome = resolveCodexHome(env);
  const repoPath = path.join(codexHome, "get-shit-done");
  const versionPath = path.join(repoPath, "VERSION");
  const primarySkillPath = path.join(codexHome, "skills", "gsd-new-project", "SKILL.md");

  const hasRepo = existsSync(repoPath);
  const hasVersion = existsSync(versionPath);
  const hasPrimarySkill = existsSync(primarySkillPath);
  const reasons: string[] = [];

  let status: GsdToolState["status"] = "missing";
  let version: string | null = null;

  if (hasRepo && hasVersion) {
    status = "installed";
    version = readFileSync(versionPath, "utf8").trim() || null;
    if (!hasPrimarySkill) {
      reasons.push("Repo exists, but Codex skill markers are missing.");
    }
  } else if (hasRepo || hasPrimarySkill) {
    status = "unknown";
    if (!hasRepo) {
      reasons.push("Found Codex GSD skill markers without the get-shit-done repo.");
    }
    if (hasRepo && !hasVersion) {
      reasons.push("Found get-shit-done repo without a VERSION marker.");
    }
  } else {
    reasons.push("No get-shit-done repo or Codex skill markers were found.");
  }

  return {
    codexHome,
    reasons,
    repoPath,
    status,
    version
  };
}

export function planGsdAction(detection: GsdToolState): PlannedGsdAction {
  if (detection.status === "missing") {
    return {
      kind: "install",
      reason: `Install get-shit-done into ${detection.codexHome} so yolo-port can hand off downstream work.`
    };
  }

  if (detection.status === "stale") {
    return {
      kind: "update",
      reason: "A stale get-shit-done installation was detected."
    };
  }

  if (detection.status === "unknown") {
    return {
      kind: "verify",
      reason: detection.reasons.join(" ")
    };
  }

  return {
    kind: "none",
    reason: detection.version
      ? `Detected get-shit-done ${detection.version} in the active Codex home.`
      : "Detected get-shit-done in the active Codex home."
  };
}

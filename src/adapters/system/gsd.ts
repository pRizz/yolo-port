import { existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import type { GsdToolState } from "../../domain/bootstrap/types.js";
import type { ManagedExecutionRunner } from "../../persistence/executionState.js";

export type PlannedGsdAction = {
  kind: "install" | "none" | "update" | "verify";
  reason: string;
};

export type GsdActionResult = {
  kind: PlannedGsdAction["kind"];
  output: string;
};

export type ManagedExecutionResult = {
  output: string;
  runner: ManagedExecutionRunner;
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

async function runProcess(
  file: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  options: {
    cwd?: string;
    input?: string;
  } = {}
): Promise<{ code: number; output: string }> {
  const child = spawn(file, args, {
    cwd: options.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"]
  });

  let output = "";
  if (options.input) {
    child.stdin.write(options.input);
  }
  child.stdin.end();
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const code = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (value) => resolve(value ?? 1));
  });

  return {
    code,
    output
  };
}

export async function runGsdAction(options: {
  action: PlannedGsdAction;
  detection: GsdToolState;
  env?: NodeJS.ProcessEnv;
}): Promise<GsdActionResult> {
  const env = options.env ?? process.env;

  if (options.action.kind === "none" || options.action.kind === "verify") {
    return {
      kind: options.action.kind,
      output: options.action.reason
    };
  }

  if (env.YOLO_PORT_GSD_INSTALLER && options.action.kind === "install") {
    const result = await runProcess(env.YOLO_PORT_GSD_INSTALLER, [], env);
    if (result.code !== 0) {
      throw new Error(result.output.trim() || "Configured GSD installer failed.");
    }

    return {
      kind: "install",
      output: result.output
    };
  }

  if (env.YOLO_PORT_GSD_UPDATER && options.action.kind === "update") {
    const result = await runProcess(env.YOLO_PORT_GSD_UPDATER, [], env);
    if (result.code !== 0) {
      throw new Error(result.output.trim() || "Configured GSD updater failed.");
    }

    return {
      kind: "update",
      output: result.output
    };
  }

  if (options.action.kind === "install") {
    mkdirSync(path.dirname(options.detection.repoPath), { recursive: true });
    const sourceRepo =
      env.YOLO_PORT_GSD_SOURCE_REPO ?? "https://github.com/gsd-build/get-shit-done.git";
    const result = await runProcess(
      "git",
      ["clone", "--depth", "1", sourceRepo, options.detection.repoPath],
      env
    );
    if (result.code !== 0) {
      throw new Error(result.output.trim() || "Failed to install get-shit-done.");
    }

    return {
      kind: "install",
      output: result.output
    };
  }

  const result = await runProcess(
    "git",
    ["-C", options.detection.repoPath, "pull", "--ff-only"],
    env
  );
  if (result.code !== 0) {
    throw new Error(result.output.trim() || "Failed to update get-shit-done.");
  }

  return {
    kind: "update",
    output: result.output
  };
}

export async function runManagedExecution(options: {
  env?: NodeJS.ProcessEnv;
  mode: BootstrapMode;
  prompt: string;
  promptPath: string;
  repoRoot: string;
}): Promise<ManagedExecutionResult> {
  const env = options.env ?? process.env;

  if (env.YOLO_PORT_GSD_EXECUTOR) {
    const result = await runProcess(
      env.YOLO_PORT_GSD_EXECUTOR,
      [options.repoRoot, options.promptPath, options.mode],
      {
        ...env,
        YOLO_PORT_EXEC_MODE: options.mode,
        YOLO_PORT_EXEC_PROMPT_PATH: options.promptPath,
        YOLO_PORT_EXEC_REPO_ROOT: options.repoRoot
      },
      {
        cwd: options.repoRoot
      }
    );

    if (result.code !== 0) {
      throw new Error(result.output.trim() || "Configured managed execution runner failed.");
    }

    return {
      output: result.output,
      runner: "configured-script"
    };
  }

  const result = await runProcess(
    "codex",
    [
      "exec",
      "--full-auto",
      "--skip-git-repo-check",
      "-C",
      options.repoRoot,
      "-"
    ],
    env,
    {
      cwd: options.repoRoot,
      input: options.prompt
    }
  );

  if (result.code !== 0) {
    throw new Error(result.output.trim() || "Codex managed execution failed.");
  }

  return {
    output: result.output,
    runner: "codex-exec"
  };
}

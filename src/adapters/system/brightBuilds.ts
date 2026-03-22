import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export type BrightBuildsStatus = {
  autoUpdate: string | null;
  autoUpdateReason: string | null;
  blockers: string[];
  output: string;
  recommendedAction: "inspect" | "install" | "none" | "update";
  repoRoot: string;
  repoState: "blocked" | "installable" | "installed" | "unknown";
};

export type BrightBuildsActionResult = {
  output: string;
  status: BrightBuildsStatus;
};

type BrightBuildsCommand = "install" | "status" | "update";

const DEFAULT_BRIGHT_BUILDS_REPO =
  "bright-builds-llc/coding-and-architecture-requirements";
const DEFAULT_BRIGHT_BUILDS_REF = "main";

async function runProcess(
  file: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<{ code: number; output: string }> {
  const child = spawn(file, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";

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

async function resolveScriptPath(env: NodeJS.ProcessEnv): Promise<string> {
  if (env.YOLO_PORT_BRIGHT_BUILDS_SCRIPT) {
    return env.YOLO_PORT_BRIGHT_BUILDS_SCRIPT;
  }

  const repo = env.YOLO_PORT_BRIGHT_BUILDS_REPO ?? DEFAULT_BRIGHT_BUILDS_REPO;
  const ref = env.YOLO_PORT_BRIGHT_BUILDS_REF ?? DEFAULT_BRIGHT_BUILDS_REF;
  const scriptUrl = `https://raw.githubusercontent.com/${repo}/${ref}/scripts/manage-downstream.sh`;
  const response = await fetch(scriptUrl);

  if (!response.ok) {
    throw new Error(`Failed to download Bright Builds installer (${response.status}).`);
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "yolo-port-bright-builds-"));
  const scriptPath = path.join(tempDir, "manage-downstream.sh");
  writeFileSync(scriptPath, await response.text());
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

function parseStatusOutput(repoRoot: string, output: string): BrightBuildsStatus {
  const repoState =
    output.match(/^Repo state:\s+(.+)$/m)?.[1]?.trim() ?? "unknown";
  const recommendedAction =
    output.match(/^Recommended action:\s+(.+)$/m)?.[1]?.trim() ?? "inspect";
  const autoUpdate = output.match(/^Auto-update:\s+(.+)$/m)?.[1]?.trim() ?? null;
  const autoUpdateReason =
    output.match(/^Auto-update reason:\s+(.+)$/m)?.[1]?.trim() ?? null;
  const blockers = output
    .split("\n")
    .filter((line) => line.startsWith("[blocked] "))
    .map((line) => line.replace("[blocked] ", "").trim());

  return {
    autoUpdate,
    autoUpdateReason,
    blockers,
    output,
    recommendedAction:
      recommendedAction === "install" || recommendedAction === "update" || recommendedAction === "none"
        ? recommendedAction
        : "inspect",
    repoRoot,
    repoState:
      repoState === "blocked" || repoState === "installable" || repoState === "installed"
        ? repoState
        : "unknown"
  };
}

async function runBrightBuildsCommand(input: {
  command: BrightBuildsCommand;
  env: NodeJS.ProcessEnv;
  force?: boolean;
  repoRoot: string;
}): Promise<string> {
  const scriptPath = await resolveScriptPath(input.env);
  const args = [input.command, "--repo-root", input.repoRoot];

  if (input.force) {
    args.push("--force");
  }

  const result = await runProcess("bash", [scriptPath, ...args], input.env);
  if (result.code !== 0) {
    throw new Error(result.output.trim() || `Bright Builds ${input.command} failed.`);
  }

  return result.output;
}

export async function readBrightBuildsStatus(options: {
  env?: NodeJS.ProcessEnv;
  repoRoot: string;
}): Promise<BrightBuildsStatus> {
  const env = options.env ?? process.env;
  const output = await runBrightBuildsCommand({
    command: "status",
    env,
    repoRoot: options.repoRoot
  });

  return parseStatusOutput(options.repoRoot, output);
}

export async function runBrightBuildsAction(options: {
  action: "install" | "update";
  env?: NodeJS.ProcessEnv;
  force?: boolean;
  repoRoot: string;
}): Promise<BrightBuildsActionResult> {
  const env = options.env ?? process.env;
  const output = await runBrightBuildsCommand({
    command: options.action,
    env,
    force: options.force,
    repoRoot: options.repoRoot
  });

  return {
    output,
    status: await readBrightBuildsStatus({
      env,
      repoRoot: options.repoRoot
    })
  };
}

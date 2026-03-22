#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ensureBun } from "./lib/ensure-bun.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(packageRoot, "package.json");
const mainEntrypoint = path.join(packageRoot, "src", "cli", "main.ts");
const packageVersion = JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
const args = process.argv.slice(2);

function renderHelp() {
  return [
    "yolo-port",
    "",
    "Lean port automation on top of get-shit-done.",
    "",
    "Usage:",
    "  yolo-port bootstrap [options]",
    "  yolo-port <command> [options]",
    "",
    "Commands:",
    "  bootstrap   Guided bootstrap for the current repository or a repo URL",
    "  resume      Resume a managed run (planned)",
    "  audit       Audit an existing port for parity (planned)",
    "  doctor      Inspect environment and dependency readiness (planned)",
    "  help        Show this help output",
    "  version     Show the current version",
    "",
    "Run `yolo-port bootstrap` to start the guided setup flow."
  ].join("\n");
}

function isHelpRequest(currentArgs) {
  if (currentArgs.length === 0) {
    return false;
  }

  const firstArg = currentArgs[0];
  return firstArg === "--help" || firstArg === "-h" || firstArg === "help";
}

function isVersionRequest(currentArgs) {
  if (currentArgs.length === 0) {
    return false;
  }

  const firstArg = currentArgs[0];
  return firstArg === "--version" || firstArg === "-v" || firstArg === "version";
}

function runMain(bunPath) {
  const result = spawnSync(bunPath, [mainEntrypoint, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });

  if (result.error) {
    console.error(`Failed to launch Bun entrypoint: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

if (isHelpRequest(args)) {
  console.log(renderHelp());
  process.exit(0);
}

if (isVersionRequest(args)) {
  console.log(packageVersion);
  process.exit(0);
}

const ensuredBun = await ensureBun({
  assumeYes: args.includes("--yes") || args.includes("-y")
});

if (!ensuredBun.ok) {
  process.exit(1);
}

runMain(ensuredBun.bunPath);

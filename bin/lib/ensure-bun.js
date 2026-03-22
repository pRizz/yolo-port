import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";

function candidateBunPaths(env) {
  const maybeBunInstall = env.BUN_INSTALL;
  const candidates = [];

  if (maybeBunInstall) {
    candidates.push(path.join(maybeBunInstall, "bin", "bun"));
  }

  candidates.push(path.join(os.homedir(), ".bun", "bin", "bun"));
  return candidates;
}

function detectBun(env) {
  const fromPath = spawnSync("bun", ["--version"], {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "ignore"]
  });

  if (fromPath.status === 0) {
    return {
      path: "bun",
      version: fromPath.stdout.trim()
    };
  }

  for (const candidate of candidateBunPaths(env)) {
    if (!existsSync(candidate)) {
      continue;
    }

    const result = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "ignore"]
    });

    if (result.status === 0) {
      return {
        path: candidate,
        version: result.stdout.trim()
      };
    }
  }

  return null;
}

async function promptToInstall(stdin, stdout) {
  if (!stdin.isTTY || !stdout.isTTY) {
    return false;
  }

  const prompt = readline.createInterface({
    input: stdin,
    output: stdout
  });

  const answer = await prompt.question("Bun is missing. Install it now with the official Bun script? [Y/n] ");
  prompt.close();

  return answer.trim() === "" || answer.trim().toLowerCase() === "y";
}

async function runDefaultInstaller({ env, stderr, stdout }) {
  if (env.YOLO_PORT_BUN_INSTALLER) {
    const child = spawn(env.YOLO_PORT_BUN_INSTALLER, {
      env,
      stdio: "inherit"
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });

    if (exitCode !== 0) {
      stderr.write("The configured Bun installer exited with a non-zero status.\n");
      return false;
    }

    stdout.write("Configured Bun installer completed. Re-checking availability...\n");
    return true;
  }

  if (process.platform === "win32") {
    stderr.write("Automatic Bun installation is not implemented on Windows yet.\n");
    return false;
  }

  const response = await fetch("https://bun.com/install");
  if (!response.ok) {
    stderr.write(`Failed to download the Bun installer: ${response.status}\n`);
    return false;
  }

  const script = await response.text();
  const child = spawn("bash", ["-s", "--"], {
    env,
    stdio: ["pipe", "inherit", "inherit"]
  });

  child.stdin.write(script);
  child.stdin.end();

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (exitCode !== 0) {
    stderr.write("The Bun installer exited with a non-zero status.\n");
    return false;
  }

  stdout.write("Bun installation completed. Re-checking availability...\n");
  return true;
}

export async function ensureBun(options = {}) {
  const {
    assumeYes = false,
    env = { ...process.env },
    runInstaller = runDefaultInstaller,
    stderr = process.stderr,
    stdin = process.stdin,
    stdout = process.stdout
  } = options;

  const current = detectBun(env);
  if (current) {
    return {
      bunPath: current.path,
      installed: false,
      ok: true,
      version: current.version
    };
  }

  const approved = assumeYes || (await promptToInstall(stdin, stdout));
  if (!approved) {
    stderr.write("Cannot continue without Bun. Re-run with --yes to auto-install.\n");
    return {
      ok: false,
      reason: "declined"
    };
  }

  stdout.write("Installing Bun before continuing...\n");
  const installed = await runInstaller({ env, stderr, stdout });
  if (!installed) {
    return {
      ok: false,
      reason: "install-failed"
    };
  }

  const detected = detectBun(env);
  if (!detected) {
    stderr.write("Bun was not found after installation completed.\n");
    return {
      ok: false,
      reason: "missing-after-install"
    };
  }

  return {
    bunPath: detected.path,
    installed: true,
    ok: true,
    version: detected.version
  };
}

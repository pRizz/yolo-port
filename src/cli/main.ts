import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildCommandRegistry, findCommand, type CommandContext } from "./router.js";
import { renderHelp } from "../ui/help.js";

async function readVersion(): Promise<string> {
  const packageJsonUrl = new URL("../../package.json", import.meta.url);
  const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8")) as {
    version?: string;
  };

  return packageJson.version ?? "0.0.0";
}

function buildContext(version: string): CommandContext {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

  return {
    args: [],
    cwd: process.cwd(),
    packageRoot,
    stderr: process.stderr,
    stdout: process.stdout,
    version
  };
}

function isHelpRequest(args: string[]): boolean {
  return args[0] === "--help" || args[0] === "-h" || args[0] === "help";
}

function isVersionRequest(args: string[]): boolean {
  return args[0] === "--version" || args[0] === "-v" || args[0] === "version";
}

export async function run(argv: string[]): Promise<number> {
  const version = await readVersion();
  const registry = buildCommandRegistry();
  const context = buildContext(version);

  if (argv.length === 0 || isHelpRequest(argv)) {
    context.stdout.write(`${renderHelp(registry)}\n`);
    return 0;
  }

  if (isVersionRequest(argv)) {
    context.stdout.write(`${version}\n`);
    return 0;
  }

  const commandName = argv[0] ?? "bootstrap";
  const command = findCommand(registry, commandName);

  if (!command) {
    context.stderr.write(`Unknown command: ${commandName}\n\n`);
    context.stdout.write(`${renderHelp(registry)}\n`);
    return 1;
  }

  return command.run({
    ...context,
    args: argv.slice(1)
  });
}

const exitCode = await run(process.argv.slice(2));
process.exit(exitCode);

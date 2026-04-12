import { createBootstrapCommand } from "./commands/bootstrap.js";
import { createResumeCommand } from "./commands/resume.js";

export type CommandContext = {
  args: string[];
  cwd: string;
  packageRoot: string;
  stderr: NodeJS.WriteStream;
  stdout: NodeJS.WriteStream;
  version: string;
};

export type CommandDefinition = {
  name: string;
  description: string;
  run: (context: CommandContext) => Promise<number>;
};

function createPlannedCommand(name: string, description: string): CommandDefinition {
  return {
    description,
    name,
    async run(context) {
      context.stdout.write(
        `${name} is visible from day one, but the underlying workflow lands in a later phase.\n`
      );
      return 0;
    }
  };
}

export function buildCommandRegistry(): CommandDefinition[] {
  return [
    createBootstrapCommand(),
    createResumeCommand(),
    createPlannedCommand("audit", "Audit an existing port for parity"),
    createPlannedCommand("doctor", "Inspect environment and dependency readiness")
  ];
}

export function findCommand(
  registry: CommandDefinition[],
  commandName: string
): CommandDefinition | undefined {
  return registry.find((command) => command.name === commandName);
}

import { inspectLocalRepository } from "../../adapters/system/git.js";
import { resumeManagedExecution } from "../resume/run.js";
import type { CommandDefinition } from "../router.js";

type ParsedResumeFlags = {
  assumeYes: boolean;
};

function parseResumeArgs(argv: string[]): ParsedResumeFlags {
  let assumeYes = false;

  for (const token of argv) {
    if (token === "--yes" || token === "-y") {
      assumeYes = true;
      continue;
    }

    throw new Error(`Unsupported resume argument: ${token}`);
  }

  return {
    assumeYes
  };
}

export function createResumeCommand(): CommandDefinition {
  return {
    description: "Resume an interrupted or execution-ready managed run",
    name: "resume",
    async run(context) {
      try {
        parseResumeArgs(context.args);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid resume arguments.";
        context.stderr.write(`${message}\n`);
        return 1;
      }

      const inspection = await inspectLocalRepository({
        cwd: context.cwd
      });
      const repoRoot = inspection.repoRoot ?? context.cwd;
      const result = await resumeManagedExecution({
        io: {
          output: context.stdout
        },
        repoRoot
      });

      return result.exitCode;
    }
  };
}

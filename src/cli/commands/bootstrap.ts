import process from "node:process";
import readline from "node:readline/promises";

import { detectBun } from "../../adapters/system/bun.js";
import { detectGsd, planGsdAction } from "../../adapters/system/gsd.js";
import { planBootstrap } from "../../domain/bootstrap/planBootstrap.js";
import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import { renderActionLog } from "../../ui/actionLog.js";
import { writeSectionBanner } from "../../ui/progress.js";
import { parseBootstrapArgs } from "../flags.js";
import type { CommandDefinition } from "../router.js";

async function resolveMode(
  initialMode: BootstrapMode | null,
  assumeYes: boolean,
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream
): Promise<BootstrapMode> {
  if (initialMode) {
    return initialMode;
  }

  if (assumeYes || !input.isTTY || !output.isTTY) {
    return "guided";
  }

  const prompt = readline.createInterface({
    input,
    output
  });

  const answer = await prompt.question(
    "How involved do you want to be? [guided/standard/yolo] (guided): "
  );
  prompt.close();

  const normalized = answer.trim().toLowerCase();
  if (normalized === "standard" || normalized === "yolo") {
    return normalized;
  }

  return "guided";
}

async function confirmExecution(
  mode: BootstrapMode,
  assumeYes: boolean,
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream
): Promise<boolean> {
  if (assumeYes || mode === "yolo") {
    return true;
  }

  if (!input.isTTY || !output.isTTY) {
    return false;
  }

  const prompt = readline.createInterface({
    input,
    output
  });

  const answer = await prompt.question("Proceed with the planned bootstrap actions? [Y/n] ");
  prompt.close();

  return answer.trim() === "" || answer.trim().toLowerCase() === "y";
}

function writeLines(output: NodeJS.WriteStream, lines: string[]): void {
  for (const line of lines) {
    output.write(`${line}\n`);
  }
}

export function createBootstrapCommand(): CommandDefinition {
  return {
    description: "Guided bootstrap for the current repository or a repo URL",
    name: "bootstrap",
    async run(context) {
      let flags;
      try {
        flags = parseBootstrapArgs(context.args);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid bootstrap arguments.";
        context.stderr.write(`${message}\n`);
        return 1;
      }

      const bunState = detectBun();
      const gsdState = detectGsd();

      writeSectionBanner(context.stdout, "yolo-port ► Checks");
      context.stdout.write(
        `Bun: ${bunState.status}${bunState.version ? ` (${bunState.version})` : ""}\n`
      );
      context.stdout.write(
        `get-shit-done: ${gsdState.status}${gsdState.version ? ` (${gsdState.version})` : ""}\n`
      );
      if (gsdState.reasons.length > 0 && flags.verbosity !== "quiet") {
        writeLines(context.stdout, gsdState.reasons.map((reason) => `- ${reason}`));
      }

      writeSectionBanner(context.stdout, "yolo-port ► Questions");
      const mode = await resolveMode(
        flags.maybeMode,
        flags.assumeYes,
        process.stdin,
        context.stdout
      );
      context.stdout.write(`Selected mode: ${mode}\n`);

      const plan = planBootstrap({
        bun: bunState,
        gsd: gsdState,
        intent: {
          allowRepoMutation: false,
          assumeYes: flags.assumeYes,
          dryRun: flags.dryRun,
          forceBrightBuilds: flags.forceBrightBuilds,
          mode,
          repoUrl: flags.repoUrl,
          verbosity: flags.verbosity
        }
      });

      writeSectionBanner(context.stdout, "yolo-port ► Summary");
      writeLines(context.stdout, plan.summaryLines);
      writeLines(context.stdout, renderActionLog(plan.steps[3]?.actions ?? [], flags.verbosity));
      context.stdout.write(`Planned next command: ${plan.nextCommand}\n`);

      if (flags.dryRun) {
        context.stdout.write("Dry run complete. No changes were applied.\n");
        return 0;
      }

      const approved = await confirmExecution(
        mode,
        flags.assumeYes,
        process.stdin,
        context.stdout
      );

      if (!approved) {
        context.stdout.write("Bootstrap stopped before execution.\n");
        return 0;
      }

      writeSectionBanner(context.stdout, "yolo-port ► Execute");
      const gsdAction = planGsdAction(gsdState);
      context.stdout.write(`${gsdAction.kind}: ${gsdAction.reason}\n`);
      context.stdout.write(
        "Phase 1 preflight is complete. Repo-local GSD mutation stays deferred until the Bright Builds gate is active.\n"
      );
      return 0;
    }
  };
}

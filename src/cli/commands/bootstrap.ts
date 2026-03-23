import process from "node:process";
import readline from "node:readline/promises";
import path from "node:path";

import {
  cloneRemoteRepository,
  inspectLocalRepository,
  inspectRemoteRepository
} from "../../adapters/system/git.js";
import { detectBun } from "../../adapters/system/bun.js";
import {
  readBrightBuildsStatus,
  runBrightBuildsAction
} from "../../adapters/system/brightBuilds.js";
import { writePlanningScaffold } from "../../adapters/fs/planning.js";
import {
  detectGsd,
  planGsdAction,
  runGsdAction
} from "../../adapters/system/gsd.js";
import type {
  LocalRepositoryInspection,
  RemoteRepositoryInspection
} from "../../domain/intake/types.js";
import { planBootstrap } from "../../domain/bootstrap/planBootstrap.js";
import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import { renderActionLog } from "../../ui/actionLog.js";
import { writeSectionBanner } from "../../ui/progress.js";
import { renderBrightBuildsBlockedRecovery } from "../../ui/recovery.js";
import { renderBootstrapSummary } from "../../ui/summary.js";
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

function renderLocalRepositoryChecks(inspection: LocalRepositoryInspection): string[] {
  if (!inspection.isGitRepo) {
    return ["Repository: current directory is not a git repo; bootstrap will use this directory."];
  }

  return [
    `Repository: ${inspection.repoName ?? path.basename(inspection.repoRoot ?? ".")} (${inspection.cleanliness})`,
    `Repo root: ${inspection.repoRoot ?? "unknown"}`
  ];
}

function renderRemoteRepositoryChecks(inspection: RemoteRepositoryInspection): string[] {
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

function renderDirtyRepositoryRecovery(inspection: LocalRepositoryInspection): string[] {
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

async function confirmCloneIntoExistingDestination(
  inspection: RemoteRepositoryInspection,
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream
): Promise<boolean> {
  if (inspection.existingPathKind === "missing") {
    return true;
  }

  if (inspection.existingPathKind === "file") {
    output.write(
      `Clone destination exists as a file: ${inspection.cloneDestination}. Re-run with --dest to choose another path.\n`
    );
    return false;
  }

  if (inspection.existingPathKind === "non-empty-directory") {
    output.write(
      `Clone destination already exists and is not empty: ${inspection.cloneDestination}. Re-run with --dest to choose another path.\n`
    );
    return false;
  }

  if (!input.isTTY || !output.isTTY) {
    output.write(
      `Clone destination already exists: ${inspection.cloneDestination}. Re-run interactively or with --dest to confirm a different location.\n`
    );
    return false;
  }

  const prompt = readline.createInterface({
    input,
    output
  });
  const answer = await prompt.question(
    `Clone destination already exists and is empty. Use ${inspection.cloneDestination}? [y/N] `
  );
  prompt.close();

  return answer.trim().toLowerCase() === "y";
}

async function confirmForce(
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream
): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) {
    return false;
  }

  const prompt = readline.createInterface({
    input,
    output
  });

  const answer = await prompt.question(
    "Bright Builds reported a blocked repo. Continue with --force replacement? [y/N] "
  );
  prompt.close();

  return answer.trim().toLowerCase() === "y";
}

type ResolvedBootstrapTarget =
  | {
      inspection: LocalRepositoryInspection;
      kind: "local";
      repoRoot: string;
    }
  | {
      inspection: RemoteRepositoryInspection;
      kind: "remote";
    };

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

      const resolvedTarget: ResolvedBootstrapTarget = flags.repoUrl
        ? {
            inspection: await inspectRemoteRepository({
              cwd: context.cwd,
              maybeCloneDestination: flags.cloneDestination,
              repoUrl: flags.repoUrl
            }),
            kind: "remote"
          }
        : await (async () => {
            const inspection = await inspectLocalRepository({
              cwd: context.cwd
            });

            return {
              inspection,
              kind: "local" as const,
              repoRoot: inspection.repoRoot ?? context.cwd
            };
          })();
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
      writeLines(
        context.stdout,
        resolvedTarget.kind === "local"
          ? renderLocalRepositoryChecks(resolvedTarget.inspection)
          : renderRemoteRepositoryChecks(resolvedTarget.inspection)
      );

      if (
        resolvedTarget.kind === "local" &&
        resolvedTarget.inspection.cleanliness === "dirty"
      ) {
        writeLines(context.stdout, renderDirtyRepositoryRecovery(resolvedTarget.inspection));
        return 1;
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
          allowRepoMutation: true,
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
      if (resolvedTarget.kind === "remote") {
        context.stdout.write(`Clone destination: ${resolvedTarget.inspection.cloneDestination}\n`);
        context.stdout.write("Bright Builds action: inspect after clone\n");
      } else {
        const brightBuildsStatus = await readBrightBuildsStatus({
          repoRoot: resolvedTarget.repoRoot
        });
        context.stdout.write(
          `Bright Builds action: ${brightBuildsStatus.recommendedAction}\n`
        );
      }
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
      const repoRoot =
        resolvedTarget.kind === "remote"
          ? (() => {
              return resolvedTarget.inspection.cloneDestination;
            })()
          : resolvedTarget.repoRoot;

      if (resolvedTarget.kind === "remote") {
        const approvedDestination = await confirmCloneIntoExistingDestination(
          resolvedTarget.inspection,
          process.stdin,
          context.stdout
        );

        if (!approvedDestination) {
          return 1;
        }

        const cloneResult = await cloneRemoteRepository({
          destination: resolvedTarget.inspection.cloneDestination,
          repoUrl: resolvedTarget.inspection.normalizedUrl
        });
        if (flags.verbosity !== "quiet" && cloneResult.output.trim() !== "") {
          context.stdout.write(`${cloneResult.output.trim()}\n`);
        }
      }

      const brightBuildsStatus = await readBrightBuildsStatus({
        repoRoot
      });
      const gsdAction = planGsdAction(gsdState);
      let shouldForce = flags.forceBrightBuilds;
      if (brightBuildsStatus.repoState === "blocked" && !shouldForce) {
        shouldForce = await confirmForce(process.stdin, context.stdout);
      }

      if (brightBuildsStatus.repoState === "blocked" && !shouldForce) {
        writeLines(context.stdout, renderBrightBuildsBlockedRecovery(brightBuildsStatus));
        return 1;
      }

      let currentBrightBuildsStatus = brightBuildsStatus;
      if (brightBuildsStatus.recommendedAction === "install" || brightBuildsStatus.recommendedAction === "update") {
        const brightBuildsResult = await runBrightBuildsAction({
          action: brightBuildsStatus.recommendedAction,
          force: shouldForce,
          repoRoot
        });
        currentBrightBuildsStatus = brightBuildsResult.status;
        context.stdout.write(brightBuildsResult.output);
      }

      const gsdResult = await runGsdAction({
        action: gsdAction,
        detection: gsdState
      });
      context.stdout.write(`${gsdResult.kind}: ${gsdResult.output}\n`);

      const updatedAt = new Date().toISOString();
      const scaffoldResult = await writePlanningScaffold({
        executedSteps: [
          `bright-builds:${currentBrightBuildsStatus.recommendedAction}`,
          `gsd:${gsdResult.kind}`
        ],
        mode,
        projectName: path.basename(repoRoot),
        repoRoot,
        updatedAt,
        warnings: gsdState.reasons
      });

      writeSectionBanner(context.stdout, "yolo-port ► Complete");
      writeLines(
        context.stdout,
        renderBootstrapSummary({
          filesWritten: scaffoldResult.written,
          mode,
          nextCommand: "yolo-port",
          repoState: currentBrightBuildsStatus.repoState,
          toolLines: [
            `Bun ${bunState.version ?? "available"}`,
            `Bright Builds ${currentBrightBuildsStatus.repoState}`,
            `get-shit-done action ${gsdResult.kind}`
          ],
          warnings: gsdState.reasons
        })
      );
      return 0;
    }
  };
}

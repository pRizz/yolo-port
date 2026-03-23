import process from "node:process";
import readline from "node:readline/promises";
import path from "node:path";

import { readIntakeProfile, writeIntakeProfile } from "../../adapters/fs/intakeProfile.js";
import { readManagedRepoState } from "../../adapters/fs/managedRepo.js";
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
import { mergeIntakePreferences } from "../../domain/intake/preferences.js";
import type {
  IntakeAnswers,
  LocalRepositoryInspection,
  RemoteRepositoryInspection
} from "../../domain/intake/types.js";
import { classifyRepoState } from "../../domain/intake/classifyRepoState.js";
import { planBootstrap } from "../../domain/bootstrap/planBootstrap.js";
import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import { createIntakeProfileRecord } from "../../persistence/intakeProfile.js";
import { renderActionLog } from "../../ui/actionLog.js";
import { renderRepoClassification } from "../../ui/classification.js";
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

async function promptText(
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream,
  question: string
): Promise<string | null> {
  if (!input.isTTY || !output.isTTY) {
    return null;
  }

  const prompt = readline.createInterface({
    input,
    output
  });
  const answer = await prompt.question(question);
  prompt.close();

  const trimmed = answer.trim();
  return trimmed === "" ? null : trimmed;
}

async function promptBoolean(
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream,
  question: string,
  defaultValue: boolean
): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) {
    return defaultValue;
  }

  const prompt = readline.createInterface({
    input,
    output
  });
  const answer = await prompt.question(question);
  prompt.close();

  const normalized = answer.trim().toLowerCase();
  if (normalized === "") {
    return defaultValue;
  }

  return normalized === "y" || normalized === "yes";
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

function renderSavedPreferenceSummary(profile: {
  askTasteQuestions: boolean;
  mode: BootstrapMode;
  preferredAgent: string | null;
  targetStack: string | null;
}): string[] {
  return [
    `Mode: ${profile.mode}`,
    `Target stack: ${profile.targetStack ?? "not set"}`,
    `Preferred agent: ${profile.preferredAgent ?? "codex"}`,
    `Taste questions: ${profile.askTasteQuestions ? "saved answers/defaults enabled" : "inferred defaults"}`
  ];
}

function renderResolvedPreferenceSummary(profile: {
  askTasteQuestions: boolean;
  preferredAgent: string | null;
  targetStack: string | null;
  tasteDefaults: string[];
}): string[] {
  const lines = [
    `Target stack: ${profile.targetStack ?? "not set"}`,
    `Preferred agent: ${profile.preferredAgent ?? "codex"}`,
    `Taste handling: ${profile.askTasteQuestions ? "custom answers allowed" : "Bright Builds-aligned defaults"}`
  ];

  if (profile.tasteDefaults.length > 0) {
    lines.push(`Taste defaults: ${profile.tasteDefaults.join(" | ")}`);
  }

  return lines;
}

async function confirmDetectedRepoState(
  state: string,
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream
): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) {
    output.write(
      `Repository state needs confirmation before yolo-port continues. Re-run interactively to confirm the detected state (${state}).\n`
    );
    return false;
  }

  const prompt = readline.createInterface({
    input,
    output
  });
  const answer = await prompt.question(`Proceed using the detected state "${state}"? [Y/n] `);
  prompt.close();

  return answer.trim() === "" || answer.trim().toLowerCase() === "y";
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
      const managedState =
        resolvedTarget.kind === "local"
          ? await readManagedRepoState({
              repoRoot: resolvedTarget.repoRoot
            })
          : null;
      const savedProfile =
        resolvedTarget.kind === "local"
          ? await readIntakeProfile({
              repoRoot: resolvedTarget.repoRoot
            })
          : null;
      const classification =
        managedState === null
          ? null
          : classifyRepoState({
              managedState
            });

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
      if (classification && managedState) {
        writeLines(
          context.stdout,
          renderRepoClassification({
            managedState,
            result: classification
          })
        );
      }

      if (
        resolvedTarget.kind === "local" &&
        resolvedTarget.inspection.cleanliness === "dirty"
      ) {
        writeLines(context.stdout, renderDirtyRepositoryRecovery(resolvedTarget.inspection));
        return 1;
      }

      if (classification?.needsConfirmation) {
        const confirmedState = await confirmDetectedRepoState(
          classification.recommendedState,
          process.stdin,
          context.stdout
        );

        if (!confirmedState) {
          return 1;
        }
      }

      if (classification?.state === "already-ported") {
        context.stdout.write(
          "This repository already looks ported. The actions above are the current next steps for this state.\n"
        );
        return 0;
      }

      writeSectionBanner(context.stdout, "yolo-port ► Questions");
      const mode = await resolveMode(
        flags.maybeMode ?? savedProfile?.mode ?? null,
        flags.assumeYes,
        process.stdin,
        context.stdout
      );
      context.stdout.write(`Selected mode: ${mode}\n`);
      if (savedProfile) {
        context.stdout.write("Saved preferences were found and will be reused unless you override them.\n");
        writeLines(context.stdout, renderSavedPreferenceSummary(savedProfile));
      }
      if (mode !== "yolo") {
        context.stdout.write("Tip: you can switch to yolo later with --mode yolo.\n");
      }

      const currentAnswers: Partial<IntakeAnswers> & {
        maybeMode?: BootstrapMode | null;
      } = {
        maybeMode: mode,
        tasteAnswers: {}
      };

      if (!flags.targetStack && !savedProfile?.targetStack && mode !== "yolo") {
        currentAnswers.targetStack = await promptText(
          process.stdin,
          context.stdout,
          "Target stack (optional, e.g. rust/axum): "
        );
      }

      if (!flags.preferredAgent && !savedProfile?.preferredAgent && mode !== "yolo") {
        currentAnswers.preferredAgent =
          (await promptText(
            process.stdin,
            context.stdout,
            "Preferred agent/provider (codex): "
          )) ?? "codex";
      }

      if (flags.askTasteQuestions !== null) {
        currentAnswers.askTasteQuestions = flags.askTasteQuestions;
      } else if (savedProfile) {
        currentAnswers.askTasteQuestions = savedProfile.askTasteQuestions;
      } else if (mode === "yolo" || flags.assumeYes) {
        currentAnswers.askTasteQuestions = false;
      } else {
        currentAnswers.askTasteQuestions = await promptBoolean(
          process.stdin,
          context.stdout,
          "Answer a few design/taste questions now? [y/N] ",
          false
        );
      }

      if (currentAnswers.askTasteQuestions && mode !== "yolo") {
        const profileAnswer = await promptText(
          process.stdin,
          context.stdout,
          "Taste profile (defaults/strict/pragmatic) [defaults]: "
        );
        const notesAnswer = await promptText(
          process.stdin,
          context.stdout,
          "Additional taste notes (optional): "
        );

        currentAnswers.tasteAnswers = {
          ...(profileAnswer ? { profile: profileAnswer } : { profile: "defaults" }),
          ...(notesAnswer ? { notes: notesAnswer } : {})
        };
      }

      const resolvedPreferences = mergeIntakePreferences({
        answers: currentAnswers,
        flags,
        savedProfile,
        sourceRepo:
          resolvedTarget.kind === "remote"
            ? resolvedTarget.inspection.normalizedUrl
            : resolvedTarget.repoRoot
      });

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
      writeLines(context.stdout, renderResolvedPreferenceSummary(resolvedPreferences));
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
      const intakeProfilePath = await writeIntakeProfile({
        profile: createIntakeProfileRecord({
          askTasteQuestions: resolvedPreferences.askTasteQuestions,
          cloneDestination:
            resolvedTarget.kind === "remote"
              ? resolvedTarget.inspection.cloneDestination
              : resolvedPreferences.cloneDestination,
          mode: resolvedPreferences.mode,
          preferredAgent: resolvedPreferences.preferredAgent,
          sourceRepo: resolvedPreferences.sourceRepo,
          targetStack: resolvedPreferences.targetStack,
          tasteAnswers: resolvedPreferences.tasteAnswers,
          tasteDefaults: resolvedPreferences.tasteDefaults,
          updatedAt
        }),
        repoRoot
      });
      const filesWritten = scaffoldResult.written.includes(intakeProfilePath)
        ? scaffoldResult.written
        : [...scaffoldResult.written, intakeProfilePath];

      writeSectionBanner(context.stdout, "yolo-port ► Complete");
      writeLines(
        context.stdout,
        renderBootstrapSummary({
          filesWritten,
          mode,
          nextCommand: "yolo-port",
          preferenceLines: renderResolvedPreferenceSummary(resolvedPreferences),
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

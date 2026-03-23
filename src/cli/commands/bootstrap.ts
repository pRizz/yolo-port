import process from "node:process";
import path from "node:path";

import { readIntakeProfile, writeIntakeProfile } from "../../adapters/fs/intakeProfile.js";
import { readManagedRepoState } from "../../adapters/fs/managedRepo.js";
import { cloneRemoteRepository } from "../../adapters/system/git.js";
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
import { classifyRepoState } from "../../domain/intake/classifyRepoState.js";
import { planBootstrap } from "../../domain/bootstrap/planBootstrap.js";
import { createIntakeProfileRecord } from "../../persistence/intakeProfile.js";
import { renderActionLog } from "../../ui/actionLog.js";
import {
  renderDirtyRepositoryRecovery,
  renderLocalRepositoryChecks,
  renderRemoteRepositoryChecks,
  renderResolvedPreferenceSummary,
  renderSavedPreferenceSummary
} from "../../ui/bootstrap.js";
import { renderRepoClassification } from "../../ui/classification.js";
import { writeSectionBanner } from "../../ui/progress.js";
import { renderBrightBuildsBlockedRecovery } from "../../ui/recovery.js";
import { renderBootstrapSummary } from "../../ui/summary.js";
import {
  collectBootstrapPreferenceAnswers,
  confirmCloneIntoExistingDestination,
  confirmDetectedRepoState,
  confirmExecution,
  confirmForce,
  resolveMode
} from "../bootstrap/interaction.js";
import { resolveBootstrapTarget } from "../bootstrap/target.js";
import { parseBootstrapArgs } from "../flags.js";
import type { CommandDefinition } from "../router.js";

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

      const resolvedTarget = await resolveBootstrapTarget({
        cwd: context.cwd,
        flags
      });
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
          {
            io: {
              input: process.stdin,
              output: context.stdout
            },
            state: classification.recommendedState
          }
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
      const mode = await resolveMode({
        assumeYes: flags.assumeYes,
        initialMode: flags.maybeMode ?? savedProfile?.mode ?? null,
        io: {
          input: process.stdin,
          output: context.stdout
        }
      });
      context.stdout.write(`Selected mode: ${mode}\n`);
      if (savedProfile) {
        context.stdout.write("Saved preferences were found and will be reused unless you override them.\n");
        writeLines(context.stdout, renderSavedPreferenceSummary(savedProfile));
      }
      if (mode !== "yolo") {
        context.stdout.write("Tip: you can switch to yolo later with --mode yolo.\n");
      }

      const currentAnswers = await collectBootstrapPreferenceAnswers({
        assumeYes: flags.assumeYes,
        flags,
        io: {
          input: process.stdin,
          output: context.stdout
        },
        mode,
        savedProfile
      });

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

      const approved = await confirmExecution({
        assumeYes: flags.assumeYes,
        io: {
          input: process.stdin,
          output: context.stdout
        },
        mode
      });

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
          {
            inspection: resolvedTarget.inspection,
            io: {
              input: process.stdin,
              output: context.stdout
            }
          }
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
        shouldForce = await confirmForce({
          input: process.stdin,
          output: context.stdout
        });
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

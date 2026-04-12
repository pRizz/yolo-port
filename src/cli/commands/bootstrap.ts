import process from "node:process";

import { readIntakeProfile, writeIntakeProfile } from "../../adapters/fs/intakeProfile.js";
import { readManagedRepoState } from "../../adapters/fs/managedRepo.js";
import { readManagedExecutionState } from "../../adapters/fs/executionState.js";
import { detectBun } from "../../adapters/system/bun.js";
import { readBrightBuildsStatus } from "../../adapters/system/brightBuilds.js";
import { detectGsd } from "../../adapters/system/gsd.js";
import { mergeIntakePreferences } from "../../domain/intake/preferences.js";
import { classifyRepoState } from "../../domain/intake/classifyRepoState.js";
import { planBootstrap } from "../../domain/bootstrap/planBootstrap.js";
import { renderActionLog } from "../../ui/actionLog.js";
import {
  renderDirtyRepositoryRecovery,
  renderLocalRepositoryChecks,
  renderRemoteRepositoryChecks,
  renderResolvedPreferenceSummary,
  renderSavedPreferenceSummary
} from "../../ui/bootstrap.js";
import { renderRepoClassification } from "../../ui/classification.js";
import { renderManagedExecutionStatus } from "../../ui/execution.js";
import { renderPlanningPreview } from "../../ui/planning.js";
import { writeSectionBanner } from "../../ui/progress.js";
import { renderBootstrapSummary } from "../../ui/summary.js";
import { executeBootstrap } from "../bootstrap/execute.js";
import {
  buildBootstrapPlanningDraft,
  persistBootstrapPlanningDraft
} from "../bootstrap/planning.js";
import {
  collectBootstrapPreferenceAnswers,
  confirmDetectedRepoState,
  confirmExecution,
  confirmPlanningApproval,
  confirmResumeExecution,
  resolveMode
} from "../bootstrap/interaction.js";
import { resolveBootstrapTarget } from "../bootstrap/target.js";
import { parseBootstrapArgs } from "../flags.js";
import { resumeManagedExecution } from "../resume/run.js";
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
      const executionState =
        resolvedTarget.kind === "local"
          ? await readManagedExecutionState({
              repoRoot: resolvedTarget.repoRoot
            })
          : null;

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

      if (
        resolvedTarget.kind === "local" &&
        executionState !== null &&
        executionState.status !== "completed"
      ) {
        writeSectionBanner(context.stdout, "yolo-port ► Resume");
        writeLines(context.stdout, renderManagedExecutionStatus({
          state: executionState
        }));
        const shouldAutoResume =
          flags.assumeYes ||
          flags.maybeMode === "yolo" ||
          savedProfile?.mode === "yolo";
        const shouldResume =
          shouldAutoResume ||
          (await confirmResumeExecution({
            io: {
              input: process.stdin,
              output: context.stdout
            },
            stepLabel: executionState.currentStep ?? "the next checkpoint"
          }));

        if (shouldResume) {
          const resumeOutcome = await resumeManagedExecution({
            io: {
              output: context.stdout
            },
            repoRoot: resolvedTarget.repoRoot
          });

          return resumeOutcome.exitCode;
        }
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
          "This repository already looks ported. Run `yolo-port audit` to refresh parity and final-report artifacts.\n"
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
        writeLines(
          context.stdout,
          renderSavedPreferenceSummary({
            askTasteQuestions: savedProfile.askTasteQuestions,
            maybePreferredAgent: savedProfile.preferredAgent,
            maybeTargetStack: savedProfile.targetStack,
            mode: savedProfile.mode
          })
        );
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
        maybeSourceRepo:
          resolvedTarget.kind === "remote"
            ? resolvedTarget.inspection.normalizedUrl
            : resolvedTarget.repoRoot,
        savedProfile,
      });

      const plan = planBootstrap({
        bun: bunState,
        gsd: gsdState,
        intent: {
          allowRepoMutation: true,
          assumeYes: flags.assumeYes,
          dryRun: flags.dryRun,
          forceBrightBuilds: flags.forceBrightBuilds,
          maybeRepoUrl: flags.maybeRepoUrl,
          mode,
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
      const executionOutcome = await executeBootstrap({
        flags,
        gsdState,
        io: {
          input: process.stdin,
          output: context.stdout
        },
        mode,
        resolvedPreferences,
        resolvedTarget
      });

      if (executionOutcome.kind === "stopped") {
        return executionOutcome.exitCode;
      }

      const planningGeneratedAt = new Date().toISOString();
      const planningDraft = await buildBootstrapPlanningDraft({
        generatedAt: planningGeneratedAt,
        maybePreferredAgent: resolvedPreferences.maybePreferredAgent,
        maybeTargetStack: resolvedPreferences.maybeTargetStack,
        mode,
        repoRoot: executionOutcome.result.repoRoot,
        sourceKind: resolvedTarget.kind
      });

      writeSectionBanner(context.stdout, "yolo-port ► Plan Preview");
      writeLines(
        context.stdout,
        renderPlanningPreview({
          estimate: planningDraft.estimate,
          inventory: planningDraft.interfaceInventory,
          sourceReference: planningDraft.sourceReference
        })
      );

      const planningApproved = await confirmPlanningApproval({
        assumeYes: flags.assumeYes,
        io: {
          input: process.stdin,
          output: context.stdout
        },
        mode
      });
      const planningFiles = await persistBootstrapPlanningDraft({
        approvalMode: flags.assumeYes || mode === "yolo" ? "auto" : "prompt",
        approved: planningApproved,
        approvedAt: new Date().toISOString(),
        draft: planningDraft,
        generatedAt: planningGeneratedAt,
        maybeTargetStack: resolvedPreferences.maybeTargetStack,
        repoRoot: executionOutcome.result.repoRoot
      });
      let filesWritten = Array.from(
        new Set([...executionOutcome.result.filesWritten, ...planningFiles])
      );
      let nextStepsLine = planningApproved
        ? "Next steps: run yolo-port resume to start managed execution."
        : "Next steps: review the parity plan artifacts and approve the saved plan before later execution.";
      let executionToolLine = "Managed execution ready";

      if (planningApproved && mode === "yolo") {
        writeSectionBanner(context.stdout, "yolo-port ► Managed Execution");
        const resumeOutcome = await resumeManagedExecution({
          io: {
            output: context.stdout
          },
          repoRoot: executionOutcome.result.repoRoot
        });
        filesWritten = Array.from(
          new Set([...filesWritten, ...resumeOutcome.filesWritten])
        );

        if (resumeOutcome.exitCode !== 0) {
          return resumeOutcome.exitCode;
        }

        nextStepsLine =
          "Next steps: review the managed execution summary and continue with audit/reporting work.";
        executionToolLine = "Managed execution completed";
      }

      writeSectionBanner(context.stdout, "yolo-port ► Complete");
      writeLines(
        context.stdout,
        renderBootstrapSummary({
          filesWritten,
          mode,
          nextCommand: "yolo-port",
          nextStepsLine,
          preferenceLines: renderResolvedPreferenceSummary(resolvedPreferences),
          repoState: executionOutcome.result.brightBuildsStatus.repoState,
          toolLines: [
            `Bun ${bunState.version ?? "available"}`,
            `Bright Builds ${executionOutcome.result.brightBuildsStatus.repoState}`,
            `get-shit-done action ${executionOutcome.result.gsdResult.kind}`,
            `Planning ${planningDraft.estimate.selectedProvider}/${planningDraft.estimate.selectedModel}`,
            executionToolLine
          ],
          warnings: gsdState.reasons
        })
      );
      return 0;
    }
  };
}

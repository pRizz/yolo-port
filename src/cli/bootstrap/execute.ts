import path from "node:path";

import { writeIntakeProfile } from "../../adapters/fs/intakeProfile.js";
import { writePlanningScaffold } from "../../adapters/fs/planning.js";
import {
  readBrightBuildsStatus,
  runBrightBuildsAction,
  type BrightBuildsStatus
} from "../../adapters/system/brightBuilds.js";
import {
  runGsdAction,
  planGsdAction,
  type GsdActionResult
} from "../../adapters/system/gsd.js";
import { cloneRemoteRepository } from "../../adapters/system/git.js";
import type {
  BootstrapMode,
  GsdToolState
} from "../../domain/bootstrap/types.js";
import type { ResolvedIntakePreferences } from "../../domain/intake/preferences.js";
import { createIntakeProfileRecord } from "../../persistence/intakeProfile.js";
import { renderBrightBuildsBlockedRecovery } from "../../ui/recovery.js";
import type { ParsedBootstrapFlags } from "../flags.js";
import {
  confirmCloneIntoExistingDestination,
  confirmForce,
  type PromptIO
} from "./interaction.js";
import type { ResolvedBootstrapTarget } from "./target.js";

export type BootstrapExecutionResult = {
  brightBuildsStatus: BrightBuildsStatus;
  filesWritten: string[];
  gsdResult: GsdActionResult;
};

export type BootstrapExecutionOutcome =
  | {
      exitCode: number;
      kind: "stopped";
    }
  | {
      kind: "success";
      result: BootstrapExecutionResult;
    };

function writeLines(output: NodeJS.WriteStream, lines: string[]): void {
  for (const line of lines) {
    output.write(`${line}\n`);
  }
}

function resolveExecutionRepoRoot(resolvedTarget: ResolvedBootstrapTarget): string {
  return resolvedTarget.kind === "remote"
    ? resolvedTarget.inspection.cloneDestination
    : resolvedTarget.repoRoot;
}

export async function executeBootstrap(input: {
  flags: ParsedBootstrapFlags;
  gsdState: GsdToolState;
  io: PromptIO;
  mode: BootstrapMode;
  resolvedPreferences: ResolvedIntakePreferences;
  resolvedTarget: ResolvedBootstrapTarget;
}): Promise<BootstrapExecutionOutcome> {
  const repoRoot = resolveExecutionRepoRoot(input.resolvedTarget);

  if (input.resolvedTarget.kind === "remote") {
    const approvedDestination = await confirmCloneIntoExistingDestination({
      inspection: input.resolvedTarget.inspection,
      io: input.io
    });

    if (!approvedDestination) {
      return {
        exitCode: 1,
        kind: "stopped"
      };
    }

    const cloneResult = await cloneRemoteRepository({
      destination: input.resolvedTarget.inspection.cloneDestination,
      repoUrl: input.resolvedTarget.inspection.normalizedUrl
    });
    if (input.flags.verbosity !== "quiet" && cloneResult.output.trim() !== "") {
      input.io.output.write(`${cloneResult.output.trim()}\n`);
    }
  }

  const brightBuildsStatus = await readBrightBuildsStatus({
    repoRoot
  });
  let shouldForce = input.flags.forceBrightBuilds;

  if (brightBuildsStatus.repoState === "blocked" && !shouldForce) {
    shouldForce = await confirmForce(input.io);
  }

  if (brightBuildsStatus.repoState === "blocked" && !shouldForce) {
    writeLines(input.io.output, renderBrightBuildsBlockedRecovery(brightBuildsStatus));
    return {
      exitCode: 1,
      kind: "stopped"
    };
  }

  let currentBrightBuildsStatus = brightBuildsStatus;
  if (
    brightBuildsStatus.recommendedAction === "install" ||
    brightBuildsStatus.recommendedAction === "update"
  ) {
    const brightBuildsResult = await runBrightBuildsAction({
      action: brightBuildsStatus.recommendedAction,
      force: shouldForce,
      repoRoot
    });
    currentBrightBuildsStatus = brightBuildsResult.status;
    input.io.output.write(brightBuildsResult.output);
  }

  const gsdAction = planGsdAction(input.gsdState);
  const gsdResult = await runGsdAction({
    action: gsdAction,
    detection: input.gsdState
  });
  input.io.output.write(`${gsdResult.kind}: ${gsdResult.output}\n`);

  const updatedAt = new Date().toISOString();
  const scaffoldResult = await writePlanningScaffold({
    executedSteps: [
      `bright-builds:${currentBrightBuildsStatus.recommendedAction}`,
      `gsd:${gsdResult.kind}`
    ],
    mode: input.mode,
    projectName: path.basename(repoRoot),
    repoRoot,
    updatedAt,
    warnings: input.gsdState.reasons
  });
  const intakeProfilePath = await writeIntakeProfile({
    profile: createIntakeProfileRecord({
      askTasteQuestions: input.resolvedPreferences.askTasteQuestions,
      maybeCloneDestination:
        input.resolvedTarget.kind === "remote"
          ? input.resolvedTarget.inspection.cloneDestination
          : input.resolvedPreferences.maybeCloneDestination,
      mode: input.resolvedPreferences.mode,
      maybePreferredAgent: input.resolvedPreferences.maybePreferredAgent,
      maybeSourceRepo: input.resolvedPreferences.maybeSourceRepo,
      maybeTargetStack: input.resolvedPreferences.maybeTargetStack,
      tasteAnswers: input.resolvedPreferences.tasteAnswers,
      tasteDefaults: input.resolvedPreferences.tasteDefaults,
      updatedAt
    }),
    repoRoot
  });
  const filesWritten = scaffoldResult.written.includes(intakeProfilePath)
    ? scaffoldResult.written
    : [...scaffoldResult.written, intakeProfilePath];

  return {
    kind: "success",
    result: {
      brightBuildsStatus: currentBrightBuildsStatus,
      filesWritten,
      gsdResult
    }
  };
}

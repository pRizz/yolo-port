import { inspectLocalRepository } from "../../adapters/system/git.js";
import { readIntakeProfile } from "../../adapters/fs/intakeProfile.js";
import {
  appendManagedExecutionEvent,
  managedExecutionPaths,
  readManagedExecutionPrompt,
  readManagedExecutionState,
  writeManagedExecutionHandoff,
  writeManagedExecutionOutput,
  writeManagedExecutionState,
  writeManagedExecutionSummary
} from "../../adapters/fs/executionState.js";
import {
  planningFiles,
  readPortPlanningArtifacts
} from "../../adapters/fs/portPlanning.js";
import { runManagedExecution } from "../../adapters/system/gsd.js";
import { buildManagedExecutionHandoff } from "../../domain/execution/handoff.js";
import {
  createManagedExecutionEventRecord,
  createManagedExecutionStateRecord,
  getNextManagedExecutionStep,
  type ManagedExecutionRunner,
  type ManagedExecutionStateRecord,
  type ManagedExecutionStep
} from "../../persistence/executionState.js";
import { renderManagedExecutionStatus, renderManagedExecutionStep } from "../../ui/execution.js";

type ManagedExecutionOutcome = {
  exitCode: number;
  filesWritten: string[];
  state: ManagedExecutionStateRecord;
};

type PromptIO = {
  output: NodeJS.WriteStream;
};

function writeLines(output: NodeJS.WriteStream, lines: string[]): void {
  for (const line of lines) {
    output.write(`${line}\n`);
  }
}

function buildExecutionSummary(input: {
  outputPath: string | null;
  repoRoot: string;
  runner: ManagedExecutionRunner | null;
  state: ManagedExecutionStateRecord;
  workingTree: Awaited<ReturnType<typeof inspectLocalRepository>>;
}): string {
  return [
    "# Managed Execution Summary",
    "",
    `**Status:** ${input.state.status}`,
    `**Runner:** ${input.runner ?? "unknown"}`,
    `**Repo root:** ${input.repoRoot}`,
    `**Resume command:** ${input.state.resumeCommand}`,
    "",
    "## Working Tree",
    "",
    `- Cleanliness: ${input.workingTree.cleanliness}`,
    `- Tracked changes: ${input.workingTree.trackedChangeCount}`,
    `- Untracked files: ${input.workingTree.untrackedCount}`,
    "",
    "## Artifacts",
    "",
    `- Handoff prompt: ${input.state.handoffPath ?? "not written"}`,
    `- Runner output: ${input.outputPath ?? "not written"}`,
    "",
    "## Next Step",
    "",
    input.state.status === "completed"
      ? "Managed execution completed. Review the repo changes and continue with audit/reporting work."
      : `Managed execution can resume with \`${input.state.resumeCommand}\`.`
  ].join("\n");
}

async function persistState(input: {
  filesWritten: Set<string>;
  repoRoot: string;
  state: ManagedExecutionStateRecord;
}): Promise<void> {
  input.filesWritten.add(
    await writeManagedExecutionState({
      repoRoot: input.repoRoot,
      state: input.state
    })
  );
}

async function recordEvent(input: {
  details: string;
  filesWritten: Set<string>;
  maybeRunner: ManagedExecutionRunner | null;
  repoRoot: string;
  state: ManagedExecutionStateRecord;
  step: ManagedExecutionStep | null;
  timestamp: string;
  type: "run-completed" | "run-started" | "step-failed" | "step-finished" | "step-started";
}): Promise<void> {
  input.filesWritten.add(
    await appendManagedExecutionEvent({
      event: createManagedExecutionEventRecord({
        at: input.timestamp,
        details: input.details,
        maybeRunner: input.maybeRunner,
        status: input.state.status,
        step: input.step,
        type: input.type
      }),
      repoRoot: input.repoRoot
    })
  );
}

function resolveExecutionMode(options: {
  maybeExistingState: ManagedExecutionStateRecord | null;
  repoRoot: string;
}): Promise<"guided" | "standard" | "yolo"> {
  return (async () => {
    if (options.maybeExistingState) {
      return options.maybeExistingState.mode;
    }

    const savedProfile = await readIntakeProfile({
      repoRoot: options.repoRoot
    });

    return savedProfile?.mode ?? "guided";
  })();
}

async function loadOrInitializeState(input: {
  repoRoot: string;
}): Promise<ManagedExecutionStateRecord> {
  const maybeExistingState = await readManagedExecutionState({
    repoRoot: input.repoRoot
  });

  if (maybeExistingState) {
    return maybeExistingState;
  }

  const now = new Date().toISOString();

  return createManagedExecutionStateRecord({
    currentStep: null,
    handoffPath: null,
    lastError: null,
    lastRunner: null,
    mode: await resolveExecutionMode({
      maybeExistingState,
      repoRoot: input.repoRoot
    }),
    outputPath: null,
    repoRoot: input.repoRoot,
    resumeCommand: "yolo-port resume --yes",
    startedAt: now,
    status: "ready",
    summaryPath: null,
    updatedAt: now
  });
}

export async function resumeManagedExecution(input: {
  io: PromptIO;
  repoRoot: string;
}): Promise<ManagedExecutionOutcome> {
  const filesWritten = new Set<string>();
  const planning = await readPortPlanningArtifacts({
    repoRoot: input.repoRoot
  });

  if (!planning.planApproval?.approved || planning.portPlan === null) {
    input.io.output.write(
      "No approved managed port plan was found. Complete bootstrap planning first before starting execution.\n"
    );

    const state = await loadOrInitializeState({
      repoRoot: input.repoRoot
    });

    return {
      exitCode: 1,
      filesWritten: [],
      state
    };
  }

  let state = await loadOrInitializeState({
    repoRoot: input.repoRoot
  });

  if (state.status === "completed") {
    writeLines(input.io.output, renderManagedExecutionStatus({ state }));
    input.io.output.write("Managed execution is already complete.\n");
    return {
      exitCode: 0,
      filesWritten: [],
      state
    };
  }

  if (state.status === "ready") {
    state = {
      ...state,
      status: "running",
      updatedAt: new Date().toISOString()
    };
    await persistState({
      filesWritten,
      repoRoot: input.repoRoot,
      state
    });
    await recordEvent({
      details: "Managed execution started.",
      filesWritten,
      maybeRunner: null,
      repoRoot: input.repoRoot,
      state,
      step: null,
      timestamp: state.updatedAt,
      type: "run-started"
    });
  }

  let maybeNextStep = getNextManagedExecutionStep(state.completedSteps);

  while (maybeNextStep !== null) {
    const step = maybeNextStep;
    writeLines(input.io.output, renderManagedExecutionStep(step));

    state = {
      ...state,
      currentStep: step,
      lastError: null,
      status: "running",
      updatedAt: new Date().toISOString()
    };
    await persistState({
      filesWritten,
      repoRoot: input.repoRoot,
      state
    });
    await recordEvent({
      details: `Starting ${step}.`,
      filesWritten,
      maybeRunner: state.lastRunner,
      repoRoot: input.repoRoot,
      state,
      step,
      timestamp: state.updatedAt,
      type: "step-started"
    });

    try {
      if (step === "prepare-handoff") {
        const files = planningFiles(input.repoRoot);
        const { prompt, record } = buildManagedExecutionHandoff({
          artifactPaths: {
            interfaceInventory: " .planning/yolo-port/interface-inventory.json".trim(),
            parityChecklist: " .planning/yolo-port/parity-checklist.md".trim(),
            planApproval: " .planning/yolo-port/plan-approval.json".trim(),
            portPlan: " .planning/yolo-port/port-plan.md".trim(),
            pricingSnapshot: " .planning/yolo-port/pricing-snapshot.json".trim(),
            sourceReference: " .planning/yolo-port/source-reference.json".trim()
          },
          createdAt: state.updatedAt,
          mode: state.mode,
          promptPath: ".planning/yolo-port/execution-handoff.md",
          repoRoot: input.repoRoot,
          resumeCommand: state.resumeCommand,
          runnerHint: process.env.YOLO_PORT_GSD_EXECUTOR ? "configured-script" : "codex-exec"
        });
        for (const filePath of await writeManagedExecutionHandoff({
          handoff: record,
          prompt,
          repoRoot: input.repoRoot
        })) {
          filesWritten.add(filePath);
        }
        state = {
          ...state,
          completedSteps: [...state.completedSteps, step],
          currentStep: null,
          handoffPath: ".planning/yolo-port/execution-handoff.md",
          updatedAt: new Date().toISOString()
        };
      } else if (step === "invoke-runner") {
        const prompt = await readManagedExecutionPrompt({
          repoRoot: input.repoRoot
        });
        if (!prompt) {
          throw new Error("Managed execution handoff prompt is missing.");
        }
        const result = await runManagedExecution({
          mode: state.mode,
          prompt,
          promptPath: ".planning/yolo-port/execution-handoff.md",
          repoRoot: input.repoRoot
        });
        filesWritten.add(
          await writeManagedExecutionOutput({
            output: result.output,
            repoRoot: input.repoRoot
          })
        );
        state = {
          ...state,
          completedSteps: [...state.completedSteps, step],
          currentStep: null,
          lastRunner: result.runner,
          outputPath: ".planning/yolo-port/execution-output.log",
          updatedAt: new Date().toISOString()
        };
      } else if (step === "verify-runner-output") {
        const workingTree = await inspectLocalRepository({
          cwd: input.repoRoot
        });
        filesWritten.add(
          await writeManagedExecutionSummary({
            repoRoot: input.repoRoot,
            summary: buildExecutionSummary({
              outputPath: state.outputPath,
              repoRoot: input.repoRoot,
              runner: state.lastRunner,
              state,
              workingTree
            })
          })
        );
        state = {
          ...state,
          completedSteps: [...state.completedSteps, step],
          currentStep: null,
          summaryPath: ".planning/yolo-port/execution-summary.md",
          updatedAt: new Date().toISOString()
        };
      } else {
        state = {
          ...state,
          completedSteps: [...state.completedSteps, step],
          currentStep: null,
          status: "completed",
          updatedAt: new Date().toISOString()
        };
        const workingTree = await inspectLocalRepository({
          cwd: input.repoRoot
        });
        filesWritten.add(
          await writeManagedExecutionSummary({
            repoRoot: input.repoRoot,
            summary: buildExecutionSummary({
              outputPath: state.outputPath,
              repoRoot: input.repoRoot,
              runner: state.lastRunner,
              state,
              workingTree
            })
          })
        );
      }

      await persistState({
        filesWritten,
        repoRoot: input.repoRoot,
        state
      });
      await recordEvent({
        details: `${step} completed.`,
        filesWritten,
        maybeRunner: state.lastRunner,
        repoRoot: input.repoRoot,
        state,
        step,
        timestamp: state.updatedAt,
        type: "step-finished"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Managed execution failed.";
      state = {
        ...state,
        lastError: message,
        status: "failed",
        updatedAt: new Date().toISOString()
      };
      await persistState({
        filesWritten,
        repoRoot: input.repoRoot,
        state
      });
      await recordEvent({
        details: message,
        filesWritten,
        maybeRunner: state.lastRunner,
        repoRoot: input.repoRoot,
        state,
        step,
        timestamp: state.updatedAt,
        type: "step-failed"
      });
      input.io.output.write(`${message}\n`);
      writeLines(input.io.output, renderManagedExecutionStatus({ state }));

      return {
        exitCode: 1,
        filesWritten: Array.from(filesWritten),
        state
      };
    }

    maybeNextStep = getNextManagedExecutionStep(state.completedSteps);
  }

  await recordEvent({
    details: "Managed execution completed.",
    filesWritten,
    maybeRunner: state.lastRunner,
    repoRoot: input.repoRoot,
    state,
    step: null,
    timestamp: state.updatedAt,
    type: "run-completed"
  });
  writeLines(input.io.output, renderManagedExecutionStatus({ state }));

  return {
    exitCode: 0,
    filesWritten: Array.from(filesWritten),
    state
  };
}

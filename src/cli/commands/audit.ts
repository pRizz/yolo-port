import { readFile } from "node:fs/promises";
import path from "node:path";

import { readManagedExecutionState } from "../../adapters/fs/executionState.js";
import { readManagedRepoState } from "../../adapters/fs/managedRepo.js";
import { readPortPlanningArtifacts } from "../../adapters/fs/portPlanning.js";
import { writeReportingArtifacts } from "../../adapters/fs/reporting.js";
import { scanRepositorySnapshot } from "../../adapters/fs/repositorySnapshot.js";
import { inspectLocalRepository, readGitDiffStats } from "../../adapters/system/git.js";
import { buildParityAudit } from "../../domain/audit/parity.js";
import { buildFinalReport } from "../../domain/reporting/finalReport.js";
import { buildParityChecklist } from "../../domain/parity/checklist.js";
import { buildInterfaceInventory } from "../../domain/parity/inventory.js";
import { renderAuditSummary } from "../../ui/audit.js";
import type { CommandDefinition } from "../router.js";

type ParsedAuditArgs = {
  verbose: boolean;
};

function parseAuditArgs(argv: string[]): ParsedAuditArgs {
  let verbose = false;

  for (const token of argv) {
    if (token === "--verbose") {
      verbose = true;
      continue;
    }

    throw new Error(`Unsupported audit argument: ${token}`);
  }

  return {
    verbose
  };
}

function writeLines(output: NodeJS.WriteStream, lines: string[]): void {
  for (const line of lines) {
    output.write(`${line}\n`);
  }
}

export function createAuditCommand(): CommandDefinition {
  return {
    description: "Audit an existing port for parity and generate the final report",
    name: "audit",
    async run(context) {
      let flags: ParsedAuditArgs;
      try {
        flags = parseAuditArgs(context.args);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid audit arguments.";
        context.stderr.write(`${message}\n`);
        return 1;
      }

      const inspection = await inspectLocalRepository({
        cwd: context.cwd
      });
      const repoRoot = inspection.repoRoot ?? context.cwd;
      const managedState = await readManagedRepoState({
        repoRoot
      });
      const planning = await readPortPlanningArtifacts({
        repoRoot
      });

      if (
        managedState.yoloPortDir === null ||
        planning.interfaceInventory === null ||
        planning.portPlan === null ||
        planning.sourceReference === null
      ) {
        context.stderr.write(
          "No managed audit context was found. Run yolo-port bootstrap and managed execution first.\n"
        );
        return 1;
      }

      const snapshot = await scanRepositorySnapshot({
        repoRoot
      });
      const currentInventory = buildInterfaceInventory({
        generatedAt: new Date().toISOString(),
        snapshot
      });
      const checklist = buildParityChecklist({
        inventory: planning.interfaceInventory
      });
      const diffStats = await readGitDiffStats({
        baseRef:
          planning.sourceReference.git.tagName === null
            ? null
            : `refs/tags/${planning.sourceReference.git.tagName}`,
        repoRoot
      });
      const audit = buildParityAudit({
        checklist,
        currentInventory,
        diffStats,
        generatedAt: new Date().toISOString(),
        sourceReference: planning.sourceReference
      });
      const executionState = await readManagedExecutionState({
        repoRoot
      });
      const report = buildFinalReport({
        audit,
        executionState,
        generatedAt: new Date().toISOString(),
        portPlan: planning.portPlan
      });
      const filesWritten = await writeReportingArtifacts({
        audit,
        repoRoot,
        report
      });

      writeLines(
        context.stdout,
        renderAuditSummary({
          audit,
          report,
          verbose: flags.verbose
        })
      );
      context.stdout.write(`Files written: ${filesWritten.join(", ")}\n`);

      const executionSummaryPath = executionState?.summaryPath
        ? path.join(repoRoot, executionState.summaryPath)
        : null;
      if (flags.verbose && executionSummaryPath) {
        try {
          const summary = await readFile(executionSummaryPath, "utf8");
          context.stdout.write(`\nExecution summary:\n${summary.trim()}\n`);
        } catch {
          // Ignore missing summary during verbose output.
        }
      }

      return audit.overallStatus === "passed" ? 0 : 1;
    }
  };
}

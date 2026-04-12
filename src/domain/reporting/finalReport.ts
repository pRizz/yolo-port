import type { ManagedExecutionStateRecord } from "../../persistence/executionState.js";
import type { PortPlanRecord } from "../../persistence/portPlanning.js";
import {
  createFinalReportRecord,
  type FinalReportRecord,
  type ParityAuditRecord
} from "../../persistence/reporting.js";

function calculateActualDurationMinutes(state: ManagedExecutionStateRecord | null): number | null {
  if (!state) {
    return null;
  }

  const startedAt = Date.parse(state.startedAt);
  const updatedAt = Date.parse(state.updatedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(updatedAt)) {
    return null;
  }

  return Math.max(0, Math.ceil((updatedAt - startedAt) / 60_000));
}

export function buildFinalReport(input: {
  audit: ParityAuditRecord;
  executionState: ManagedExecutionStateRecord | null;
  generatedAt: string;
  portPlan: PortPlanRecord;
}): FinalReportRecord {
  const actualDurationMinutes = calculateActualDurationMinutes(input.executionState);
  const durationWithinEstimate =
    actualDurationMinutes === null
      ? null
      : actualDurationMinutes >= input.portPlan.estimate.durationMinutes.min &&
        actualDurationMinutes <= input.portPlan.estimate.durationMinutes.max;
  const unresolvedRisks: string[] = [];

  if (input.audit.summary.missingCount > 0) {
    unresolvedRisks.push(
      `${input.audit.summary.missingCount} saved parity surfaces are missing from the current repository snapshot.`
    );
  }

  if (input.audit.diffStats === null) {
    unresolvedRisks.push(
      "Git diff statistics against the preserved source reference were unavailable."
    );
  }

  if (actualDurationMinutes === null) {
    unresolvedRisks.push(
      "Actual managed execution duration could not be derived from the saved execution state."
    );
  }

  const nextSteps =
    input.audit.overallStatus === "passed"
      ? [
          "Review the final report and share it as the canonical port summary.",
          "If the port is ready, proceed with release or stakeholder review."
        ]
      : [
          "Review the missing parity surfaces and fix the gaps.",
          "Re-run `yolo-port audit` after the fixes to refresh the final report."
        ];

  return createFinalReportRecord({
    estimate: input.portPlan.estimate,
    estimateComparison: {
      actualDurationMinutes,
      durationWithinEstimate,
      note:
        actualDurationMinutes === null
          ? "Actual duration is unavailable from the saved execution state."
          : durationWithinEstimate
            ? "Actual managed execution duration stayed within the estimated range."
            : "Actual managed execution duration fell outside the original estimate range."
    },
    execution: {
      additions: input.audit.diffStats?.additions ?? null,
      deletions: input.audit.diffStats?.deletions ?? null,
      filesChanged: input.audit.diffStats?.filesChanged ?? null,
      runner: input.executionState?.lastRunner ?? null
    },
    generatedAt: input.generatedAt,
    nextSteps,
    parity: {
      missingCount: input.audit.summary.missingCount,
      status: input.audit.overallStatus,
      total: input.audit.summary.total,
      verifiedCount: input.audit.summary.verifiedCount
    },
    summaryLine:
      input.audit.overallStatus === "passed"
        ? `Parity audit passed across ${input.audit.summary.total} saved surfaces.`
        : `Parity audit found ${input.audit.summary.missingCount} missing surfaces out of ${input.audit.summary.total}.`,
    unresolvedRisks
  });
}

import type { FinalReportRecord, ParityAuditRecord } from "../persistence/reporting.js";

export function renderAuditSummary(input: {
  audit: ParityAuditRecord;
  report: FinalReportRecord;
  verbose: boolean;
}): string[] {
  const lines = [
    `Audit status: ${input.audit.overallStatus}`,
    `Parity: ${input.audit.summary.verifiedCount}/${input.audit.summary.total} verified`,
    `Final report: .planning/yolo-port/final-report.md`
  ];

  if (input.report.estimateComparison.actualDurationMinutes !== null) {
    lines.push(
      `Duration: estimated ${input.report.estimate.durationMinutes.min}-${input.report.estimate.durationMinutes.max} min vs actual ${input.report.estimateComparison.actualDurationMinutes} min`
    );
  }

  if (input.audit.diffStats) {
    lines.push(
      `Diff stats: ${input.audit.diffStats.filesChanged} files, +${input.audit.diffStats.additions}/-${input.audit.diffStats.deletions}`
    );
  }

  if (input.report.unresolvedRisks.length > 0) {
    lines.push("Risks:");
    for (const risk of input.report.unresolvedRisks) {
      lines.push(`- ${risk}`);
    }
  }

  if (input.verbose && input.audit.summary.missingCount > 0) {
    lines.push("Missing parity surfaces:");
    for (const item of input.audit.items.filter((entry) => entry.status === "missing")) {
      lines.push(`- [${item.kind}] ${item.surface} (${item.sourcePath})`);
    }
  }

  return lines;
}

export function renderParityAuditMarkdown(input: {
  audit: ParityAuditRecord;
}): string {
  const lines = [
    "# Parity Audit",
    "",
    `**Generated:** ${input.audit.generatedAt}`,
    `**Status:** ${input.audit.overallStatus}`,
    "",
    "| Surface | Category | Status | Source | Details |",
    "|---------|----------|--------|--------|---------|"
  ];

  for (const item of input.audit.items) {
    lines.push(
      `| \`${item.surface}\` | ${item.kind} | ${item.status} | \`${item.sourcePath}\` | ${item.details} |`
    );
  }

  return lines.join("\n");
}

export function renderFinalReportMarkdown(input: {
  report: FinalReportRecord;
}): string {
  const lines = [
    "# Final Report",
    "",
    `**Generated:** ${input.report.generatedAt}`,
    "",
    "## Summary",
    "",
    input.report.summaryLine,
    "",
    "## Parity Status",
    "",
    `- Status: ${input.report.parity.status}`,
    `- Verified surfaces: ${input.report.parity.verifiedCount}/${input.report.parity.total}`,
    `- Missing surfaces: ${input.report.parity.missingCount}`,
    "",
    "## Estimate vs Actual",
    "",
    `- Selected model: ${input.report.estimate.selectedProvider}/${input.report.estimate.selectedModel}`,
    `- Estimated duration: ${input.report.estimate.durationMinutes.min}-${input.report.estimate.durationMinutes.max} min`,
    `- Estimated tokens: ${input.report.estimate.tokenRange.min}-${input.report.estimate.tokenRange.max}`,
    `- Estimated USD: ${input.report.estimate.usdRange.min.toFixed(2)}-${input.report.estimate.usdRange.max.toFixed(2)}`,
    `- Actual duration: ${input.report.estimateComparison.actualDurationMinutes ?? "unknown"} min`,
    `- Comparison: ${input.report.estimateComparison.note}`,
    "",
    "## Execution Data",
    "",
    `- Runner: ${input.report.execution.runner ?? "unknown"}`,
    `- Files changed: ${input.report.execution.filesChanged ?? "unknown"}`,
    `- Additions: ${input.report.execution.additions ?? "unknown"}`,
    `- Deletions: ${input.report.execution.deletions ?? "unknown"}`,
    "",
    "## Unresolved Risks",
    ""
  ];

  if (input.report.unresolvedRisks.length === 0) {
    lines.push("- None");
  } else {
    for (const risk of input.report.unresolvedRisks) {
      lines.push(`- ${risk}`);
    }
  }

  lines.push("", "## Next Steps", "");
  for (const step of input.report.nextSteps) {
    lines.push(`- ${step}`);
  }

  return lines.join("\n");
}

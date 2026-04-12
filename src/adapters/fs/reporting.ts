import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FinalReportRecord, ParityAuditRecord } from "../../persistence/reporting.js";
import { renderFinalReportMarkdown, renderParityAuditMarkdown } from "../../ui/audit.js";

export type ReportingPaths = {
  finalReportJson: string;
  finalReportMarkdown: string;
  parityAuditJson: string;
  parityAuditMarkdown: string;
};

function reportingRoot(repoRoot: string): string {
  return path.join(repoRoot, ".planning", "yolo-port");
}

export function reportingPaths(repoRoot: string): ReportingPaths {
  const root = reportingRoot(repoRoot);

  return {
    finalReportJson: path.join(root, "final-report.json"),
    finalReportMarkdown: path.join(root, "final-report.md"),
    parityAuditJson: path.join(root, "parity-audit.json"),
    parityAuditMarkdown: path.join(root, "parity-audit.md")
  };
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), {
    recursive: true
  });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, content);
  await rename(tempPath, filePath);
}

export async function readFinalReport(options: {
  repoRoot: string;
}): Promise<FinalReportRecord | null> {
  try {
    return JSON.parse(
      await readFile(reportingPaths(options.repoRoot).finalReportJson, "utf8")
    ) as FinalReportRecord;
  } catch {
    return null;
  }
}

export async function writeReportingArtifacts(input: {
  audit: ParityAuditRecord;
  repoRoot: string;
  report: FinalReportRecord;
}): Promise<string[]> {
  const paths = reportingPaths(input.repoRoot);

  await writeAtomic(paths.parityAuditJson, JSON.stringify(input.audit, null, 2));
  await writeAtomic(paths.finalReportJson, JSON.stringify(input.report, null, 2));
  await writeAtomic(
    paths.parityAuditMarkdown,
    `${renderParityAuditMarkdown({ audit: input.audit })}\n`
  );
  await writeAtomic(
    paths.finalReportMarkdown,
    `${renderFinalReportMarkdown({ report: input.report })}\n`
  );

  return Object.values(paths).map((filePath) => path.relative(input.repoRoot, filePath));
}

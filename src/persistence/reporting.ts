import type { InterfaceKind, PortPlanEstimateRecord, SourceReferenceRecord } from "./portPlanning.js";

export type GitDiffStatsRecord = {
  additions: number;
  baseRef: string;
  deletions: number;
  filesChanged: number;
};

export type ParityAuditItemStatus = "missing" | "verified";
export type ParityAuditStatus = "gaps-found" | "passed";

export type ParityAuditItemRecord = {
  details: string;
  kind: InterfaceKind;
  sourcePath: string;
  status: ParityAuditItemStatus;
  surface: string;
};

export type ParityAuditRecord = {
  generatedAt: string;
  items: ParityAuditItemRecord[];
  overallStatus: ParityAuditStatus;
  schemaVersion: number;
  sourceReference: {
    strategy: SourceReferenceRecord["strategy"];
    tagName: string | null;
  };
  summary: {
    missingCount: number;
    total: number;
    verifiedCount: number;
  };
  diffStats: GitDiffStatsRecord | null;
};

export type FinalReportRecord = {
  estimate: PortPlanEstimateRecord;
  estimateComparison: {
    actualDurationMinutes: number | null;
    durationWithinEstimate: boolean | null;
    note: string;
  };
  execution: {
    additions: number | null;
    deletions: number | null;
    filesChanged: number | null;
    runner: string | null;
  };
  generatedAt: string;
  nextSteps: string[];
  parity: {
    missingCount: number;
    status: ParityAuditStatus;
    total: number;
    verifiedCount: number;
  };
  reportVersion: number;
  summaryLine: string;
  unresolvedRisks: string[];
};

export function createParityAuditRecord(input: Omit<ParityAuditRecord, "schemaVersion">): ParityAuditRecord {
  return {
    ...input,
    schemaVersion: 1
  };
}

export function createFinalReportRecord(input: Omit<FinalReportRecord, "reportVersion">): FinalReportRecord {
  return {
    ...input,
    reportVersion: 1
  };
}

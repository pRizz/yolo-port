import type { InterfaceInventoryRecord, ParityChecklistItem } from "../../persistence/portPlanning.js";
import {
  createParityAuditRecord,
  type GitDiffStatsRecord,
  type ParityAuditItemRecord,
  type ParityAuditRecord
} from "../../persistence/reporting.js";
import type { SourceReferenceRecord } from "../../persistence/portPlanning.js";

export function buildParityAudit(input: {
  checklist: ParityChecklistItem[];
  currentInventory: InterfaceInventoryRecord;
  diffStats: GitDiffStatsRecord | null;
  generatedAt: string;
  sourceReference: SourceReferenceRecord;
}): ParityAuditRecord {
  const currentSurfaceKeys = new Set(
    input.currentInventory.items.map((item) => `${item.kind}:${item.label}`)
  );

  const items: ParityAuditItemRecord[] = input.checklist.map((item) => {
    const isPresent = currentSurfaceKeys.has(`${item.kind}:${item.surface}`);

    return {
      details: isPresent
        ? "Detected in the current repository snapshot."
        : "Missing from the current repository snapshot.",
      kind: item.kind,
      sourcePath: item.sourcePath,
      status: isPresent ? "verified" : "missing",
      surface: item.surface
    };
  });
  const verifiedCount = items.filter((item) => item.status === "verified").length;
  const missingCount = items.length - verifiedCount;

  return createParityAuditRecord({
    diffStats: input.diffStats,
    generatedAt: input.generatedAt,
    items,
    overallStatus: missingCount === 0 ? "passed" : "gaps-found",
    sourceReference: {
      strategy: input.sourceReference.strategy,
      tagName: input.sourceReference.git.tagName
    },
    summary: {
      missingCount,
      total: items.length,
      verifiedCount
    }
  });
}

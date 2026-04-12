import type { BootstrapMode } from "../bootstrap/types.js";
import {
  createManagedExecutionHandoffRecord,
  type ManagedExecutionHandoffRecord
} from "../../persistence/executionState.js";

export function buildManagedExecutionHandoff(input: {
  artifactPaths: ManagedExecutionHandoffRecord["artifactPaths"];
  createdAt: string;
  mode: BootstrapMode;
  promptPath: string;
  repoRoot: string;
  resumeCommand: string;
  runnerHint: ManagedExecutionHandoffRecord["runnerHint"];
}): {
  prompt: string;
  record: ManagedExecutionHandoffRecord;
} {
  const record = createManagedExecutionHandoffRecord({
    artifactPaths: input.artifactPaths,
    createdAt: input.createdAt,
    mode: input.mode,
    promptPath: input.promptPath,
    repoRoot: input.repoRoot,
    resumeCommand: input.resumeCommand,
    runnerHint: input.runnerHint
  });

  const prompt = [
    "Continue this yolo-port managed execution in the current repository.",
    "",
    "Read these artifacts first:",
    `- ${input.artifactPaths.portPlan}`,
    `- ${input.artifactPaths.planApproval}`,
    `- ${input.artifactPaths.sourceReference}`,
    `- ${input.artifactPaths.interfaceInventory}`,
    `- ${input.artifactPaths.parityChecklist}`,
    `- ${input.artifactPaths.pricingSnapshot}`,
    "",
    "Execution rules:",
    "- Treat the saved port plan and parity checklist as the source of truth.",
    "- Preserve 1:1 external parity by default and surface any exceptions explicitly.",
    "- Use GSD-compatible planning and execution behavior where appropriate; do not bypass the managed workflow intent.",
    "- Persist any important human-readable outputs back into the repository.",
    "- Leave the repository in a verifiable state with code, tests, and commits when successful.",
    "",
    "yolo-port-owned artifacts:",
    `- Resume command: ${input.resumeCommand}`,
    "- Write or update a concise execution summary under .planning/yolo-port/execution-summary.md.",
    "- Assume yolo-port owns checkpointing around your run; you do not need to invent a second checkpoint layer."
  ].join("\n");

  return {
    prompt,
    record
  };
}

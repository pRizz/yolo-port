import type { BootstrapMode } from "../domain/bootstrap/types.js";

export function renderBootstrapSummary(input: {
  filesWritten: string[];
  mode: BootstrapMode;
  nextCommand: string;
  repoState: string;
  toolLines: string[];
  warnings: string[];
}): string[] {
  const lines = [
    `Selected mode: ${input.mode}`,
    `Repo state: ${input.repoState}`,
    "Tools:"
  ];

  for (const toolLine of input.toolLines) {
    lines.push(`- ${toolLine}`);
  }

  lines.push("Files written:");
  for (const filePath of input.filesWritten) {
    lines.push(`- ${filePath}`);
  }

  if (input.warnings.length > 0) {
    lines.push("Warnings:");
    for (const warning of input.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push(`Next command: ${input.nextCommand}`);
  lines.push("Next steps: review the scaffold, then continue with repository intake and planning.");
  return lines;
}

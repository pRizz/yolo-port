import type { CommandDefinition } from "../cli/router.js";

export function renderHelp(registry: CommandDefinition[]): string {
  const commandLines = registry
    .map((command) => `  ${command.name.padEnd(10, " ")} ${command.description}`)
    .join("\n");

  return [
    "yolo-port",
    "",
    "Lean port automation on top of get-shit-done.",
    "",
    "Usage:",
    "  yolo-port bootstrap [options]",
    "  yolo-port <command> [options]",
    "",
    "Commands:",
    commandLines,
    "  help       Show help output",
    "  version    Show the current version",
    "",
    "Default flow:",
    "  Use `yolo-port bootstrap` to start the guided setup flow.",
    "",
    "Examples:",
    "  yolo-port bootstrap",
    "  yolo-port bootstrap --dry-run"
  ].join("\n");
}

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
    "  yolo-port [options]",
    "  yolo-port <repo-url> [options]",
    "  yolo-port bootstrap [options]",
    "  yolo-port <command> [options]",
    "",
    "Commands:",
    commandLines,
    "  help       Show help output",
    "  version    Show the current version",
    "",
    "Default flow:",
    "  Run `yolo-port` inside a repo or `yolo-port <repo-url>` to start intake.",
    "  Use `yolo-port bootstrap` when you want the explicit setup command.",
    "",
    "Examples:",
    "  yolo-port",
    "  yolo-port https://github.com/example/service --dry-run",
    "  yolo-port --mode yolo --target-stack rust/axum",
    "  yolo-port audit --verbose",
    "  yolo-port bootstrap --dry-run",
    "  yolo-port resume --yes"
  ].join("\n");
}

import type { CommandDefinition } from "../router.js";

export function createBootstrapCommand(): CommandDefinition {
  return {
    description: "Guided bootstrap for the current repository or a repo URL",
    name: "bootstrap",
    async run(context) {
      const modeLine = context.args.includes("--dry-run")
        ? "Bootstrap dry-run wiring is ready; environment and scaffold automation land next."
        : "Bootstrap command wiring is ready; environment and scaffold automation land next.";

      context.stdout.write("yolo-port bootstrap\n");
      context.stdout.write(`${modeLine}\n`);
      return 0;
    }
  };
}

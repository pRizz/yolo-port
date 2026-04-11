import type {
  InterfaceInventoryRecord,
  InterfaceKind,
  ParityChecklistItem
} from "../../persistence/portPlanning.js";

function parityTarget(kind: InterfaceKind): string {
  switch (kind) {
    case "cli-entrypoint":
      return "Preserve command names, invocation contract, and top-level behavior 1:1.";
    case "cli-flag":
      return "Preserve flag spelling, defaults, and observable behavior 1:1.";
    case "http-route":
      return "Preserve route path, method, and request/response contract 1:1.";
    case "environment-variable":
      return "Preserve environment variable names, requiredness, and runtime effect 1:1.";
    case "package-export":
      return "Preserve exported entrypoints and public package surface 1:1.";
    case "config-file":
      return "Preserve config file location and supported schema shape 1:1.";
  }
}

export function buildParityChecklist(input: {
  inventory: InterfaceInventoryRecord;
}): ParityChecklistItem[] {
  return input.inventory.items.map((item) => ({
    exceptionPolicy:
      "Any intentional divergence must be called out before execution and repeated in the final report.",
    kind: item.kind,
    parityTarget: parityTarget(item.kind),
    sourcePath: item.sourcePath,
    surface: item.label
  }));
}

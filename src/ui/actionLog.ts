import type { BootstrapAction, Verbosity } from "../domain/bootstrap/types.js";

function renderPrefix(action: BootstrapAction): string {
  return action.automatic ? "[auto]" : "[user]";
}

export function renderActionLog(
  actions: BootstrapAction[],
  verbosity: Verbosity
): string[] {
  if (verbosity === "quiet") {
    return actions.map((action) => `- ${action.label}`);
  }

  return actions.map(
    (action) => `- ${renderPrefix(action)} ${action.label} — ${action.reason}`
  );
}

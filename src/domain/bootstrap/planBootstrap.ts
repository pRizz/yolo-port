import type {
  BootstrapAction,
  BootstrapPlan,
  BootstrapPlanStep,
  BootstrapPlanningInput
} from "./types.js";

function createAction(action: BootstrapAction): BootstrapAction {
  return action;
}

function buildExecuteActions(input: BootstrapPlanningInput): BootstrapAction[] {
  const automaticMutation = input.intent.mode === "yolo" || input.intent.assumeYes;
  const actions: BootstrapAction[] = [];

  if (input.bun.status === "missing") {
    actions.push(
      createAction({
        automatic: automaticMutation,
        kind: "install-bun",
        label: "Install Bun before Bun-managed commands run",
        phase: "execute",
        reason: "Bootstrap cannot continue into the Bun runtime until Bun is available."
      })
    );
  }

  if (input.gsd.status === "missing") {
    actions.push(
      createAction({
        automatic: automaticMutation,
        kind: input.intent.allowRepoMutation ? "install-gsd" : "defer-gsd-mutation",
        label: input.intent.allowRepoMutation
          ? "Install get-shit-done for Codex"
          : "Defer get-shit-done installation until the standards gate is clear",
        phase: "execute",
        reason: input.intent.allowRepoMutation
          ? "Codex-facing GSD assets are required for downstream orchestration."
          : "Bright Builds must gate repo-local mutation before GSD installation executes."
      })
    );
  }

  if (input.gsd.status === "unknown") {
    actions.push(
      createAction({
        automatic: true,
        kind: "verify-gsd",
        label: "Verify the partial get-shit-done installation",
        phase: "execute",
        reason: "A partial GSD footprint was detected, so the bootstrap flow should clarify it before relying on it."
      })
    );
  }

  if (input.gsd.status === "stale") {
    actions.push(
      createAction({
        automatic: automaticMutation,
        kind: input.intent.allowRepoMutation ? "update-gsd" : "defer-gsd-mutation",
        label: input.intent.allowRepoMutation
          ? "Update get-shit-done for Codex"
          : "Defer get-shit-done update until the standards gate is clear",
        phase: "execute",
        reason: input.intent.allowRepoMutation
          ? "The detected GSD installation is behind the expected baseline."
          : "The update is planned, but repo-local mutation is deferred until Bright Builds runs first."
      })
    );
  }

  if (input.gsd.status === "installed") {
    actions.push(
      createAction({
        automatic: true,
        kind: "verify-gsd",
        label: "Use the detected get-shit-done installation",
        phase: "execute",
        reason: input.gsd.version
          ? `Detected get-shit-done ${input.gsd.version} under ${input.gsd.codexHome}.`
          : "Detected get-shit-done under the active Codex home."
      })
    );
  }

  return actions;
}

export function planBootstrap(input: BootstrapPlanningInput): BootstrapPlan {
  const checks: BootstrapPlanStep = {
    actions: [
      createAction({
        automatic: true,
        kind: "verify-bun",
        label: "Check whether Bun is available",
        phase: "checks",
        reason: "Bun gates every Bun-managed command path."
      }),
      createAction({
        automatic: true,
        kind: "detect-gsd",
        label: "Inspect the Codex get-shit-done installation",
        phase: "checks",
        reason: "Bootstrap needs a reliable GSD state before it can plan downstream work."
      })
    ],
    phase: "checks",
    title: "Checks"
  };

  const questions: BootstrapPlanStep = {
    actions: [
      createAction({
        automatic: input.intent.mode !== "guided" || input.intent.assumeYes,
        kind: "select-mode",
        label: "Resolve involvement mode and defaults",
        phase: "questions",
        reason:
          input.intent.mode === "guided"
            ? "Guided mode keeps the user involved in the high-level setup decisions."
            : `Mode was preselected as ${input.intent.mode}, so the bootstrap flow can skip that question.`
      })
    ],
    phase: "questions",
    title: "Questions"
  };

  const summary: BootstrapPlanStep = {
    actions: [
      createAction({
        automatic: input.intent.dryRun || input.intent.mode === "yolo" || input.intent.assumeYes,
        kind: "confirm-execute",
        label: "Review the planned actions before execution",
        phase: "summary",
        reason: input.intent.dryRun
          ? "Dry-run mode stops after the summary."
          : input.intent.mode === "yolo" || input.intent.assumeYes
            ? "YOLO/assume-yes mode can auto-advance after showing the summary."
            : "Guided and standard flows pause for a final confirmation."
      })
    ],
    phase: "summary",
    title: "Summary"
  };

  const execute: BootstrapPlanStep = {
    actions: buildExecuteActions(input),
    phase: "execute",
    title: "Execute"
  };

  return {
    nextCommand: input.intent.repoUrl
      ? `yolo-port bootstrap ${input.intent.repoUrl}`
      : "yolo-port bootstrap",
    steps: [checks, questions, summary, execute],
    summaryLines: [
      `Mode: ${input.intent.mode}`,
      `Bun: ${input.bun.status}${input.bun.version ? ` (${input.bun.version})` : ""}`,
      `get-shit-done: ${input.gsd.status}${input.gsd.version ? ` (${input.gsd.version})` : ""}`,
      input.intent.dryRun ? "Execution: dry-run" : "Execution: live"
    ]
  };
}

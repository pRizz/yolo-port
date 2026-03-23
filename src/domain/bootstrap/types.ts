export type BootstrapMode = "guided" | "standard" | "yolo";
export type Verbosity = "quiet" | "normal" | "verbose";
export type BootstrapPhase = "checks" | "questions" | "summary" | "execute";
export type BootstrapActionKind =
  | "verify-bun"
  | "install-bun"
  | "detect-gsd"
  | "install-gsd"
  | "update-gsd"
  | "verify-gsd"
  | "select-mode"
  | "confirm-execute"
  | "defer-gsd-mutation";

export type BunToolState = {
  path: string | null;
  status: "missing" | "present";
  version: string | null;
};

export type GsdToolState = {
  codexHome: string;
  reasons: string[];
  repoPath: string;
  status: "installed" | "missing" | "stale" | "unknown";
  version: string | null;
};

export type BootstrapIntent = {
  allowRepoMutation: boolean;
  assumeYes: boolean;
  dryRun: boolean;
  forceBrightBuilds: boolean;
  maybeRepoUrl: string | null;
  mode: BootstrapMode;
  verbosity: Verbosity;
};

export type BootstrapPlanningInput = {
  bun: BunToolState;
  gsd: GsdToolState;
  intent: BootstrapIntent;
};

export type BootstrapAction = {
  automatic: boolean;
  kind: BootstrapActionKind;
  label: string;
  phase: BootstrapPhase;
  reason: string;
};

export type BootstrapPlanStep = {
  actions: BootstrapAction[];
  phase: BootstrapPhase;
  title: string;
};

export type BootstrapPlan = {
  nextCommand: string;
  steps: BootstrapPlanStep[];
  summaryLines: string[];
};

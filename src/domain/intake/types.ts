import type { BootstrapMode, Verbosity } from "../bootstrap/types.js";

export type IntakeEntrySource = "explicit-bootstrap" | "implicit-default" | "remote-url";

export type NormalizedIntakeRequest =
  | {
      forwardedArgs: string[];
      kind: "bootstrap";
      source: IntakeEntrySource;
    }
  | {
      commandName: string;
      forwardedArgs: string[];
      kind: "command";
    };

export type LocalRepositoryInspection = {
  cleanliness: "clean" | "dirty" | "not-a-repo";
  dirtyEntries: string[];
  isGitRepo: boolean;
  repoName: string | null;
  repoRoot: string | null;
  trackedChangeCount: number;
  untrackedCount: number;
};

export type RemoteRepositoryInspection = {
  cloneDestination: string;
  defaultBranch: string | null;
  existingPathKind: "empty-directory" | "file" | "missing" | "non-empty-directory";
  normalizedUrl: string;
  originalUrl: string;
  owner: string | null;
  provider: "generic" | "github";
  repoName: string;
  warnings: string[];
};

export type RepoClassification = "already-ported" | "fresh" | "in-progress";

export type RepoClassificationAction =
  | "audit-parity"
  | "continue-bootstrap"
  | "inspect-managed-state"
  | "update-from-upstream"
  | "view-previous-summary"
  | "view-recovery-guidance";

export type RepoClassificationResult = {
  actions: RepoClassificationAction[];
  evidence: string[];
  needsConfirmation: boolean;
  recommendedState: RepoClassification;
  state: RepoClassification;
};

export type IntakeAnswers = {
  askTasteQuestions: boolean;
  preferredAgent: string | null;
  targetStack: string | null;
  tasteAnswers: Record<string, string>;
};

export type IntakePreferenceInput = {
  answers: Partial<IntakeAnswers> & {
    maybeMode?: BootstrapMode | null;
  };
  flags: {
    askTasteQuestions: boolean | null;
    cloneDestination: string | null;
    preferredAgent: string | null;
    repoUrl: string | null;
    targetStack: string | null;
    verbosity: Verbosity;
  } & {
    maybeMode: BootstrapMode | null;
  };
};

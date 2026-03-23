import type { BootstrapMode } from "../domain/bootstrap/types.js";

export type IntakeProfileRecord = {
  askTasteQuestions: boolean;
  cloneDestination: string | null;
  mode: BootstrapMode;
  preferredAgent: string | null;
  schemaVersion: number;
  sourceRepo: string | null;
  targetStack: string | null;
  tasteAnswers: Record<string, string>;
  tasteDefaults: string[];
  updatedAt: string;
};

export function createIntakeProfileRecord(input: {
  askTasteQuestions: boolean;
  maybeCloneDestination: string | null;
  mode: BootstrapMode;
  maybePreferredAgent: string | null;
  maybeSourceRepo: string | null;
  maybeTargetStack: string | null;
  tasteAnswers: Record<string, string>;
  tasteDefaults: string[];
  updatedAt: string;
}): IntakeProfileRecord {
  return {
    askTasteQuestions: input.askTasteQuestions,
    cloneDestination: input.maybeCloneDestination,
    mode: input.mode,
    preferredAgent: input.maybePreferredAgent,
    schemaVersion: 1,
    sourceRepo: input.maybeSourceRepo,
    targetStack: input.maybeTargetStack,
    tasteAnswers: input.tasteAnswers,
    tasteDefaults: input.tasteDefaults,
    updatedAt: input.updatedAt
  };
}

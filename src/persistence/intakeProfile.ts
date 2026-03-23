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
  cloneDestination: string | null;
  mode: BootstrapMode;
  preferredAgent: string | null;
  sourceRepo: string | null;
  targetStack: string | null;
  tasteAnswers: Record<string, string>;
  tasteDefaults: string[];
  updatedAt: string;
}): IntakeProfileRecord {
  return {
    askTasteQuestions: input.askTasteQuestions,
    cloneDestination: input.cloneDestination,
    mode: input.mode,
    preferredAgent: input.preferredAgent,
    schemaVersion: 1,
    sourceRepo: input.sourceRepo,
    targetStack: input.targetStack,
    tasteAnswers: input.tasteAnswers,
    tasteDefaults: input.tasteDefaults,
    updatedAt: input.updatedAt
  };
}

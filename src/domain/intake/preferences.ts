import type { IntakeProfileRecord } from "../../persistence/intakeProfile.js";
import type { IntakeAnswers, IntakePreferenceInput } from "./types.js";

export type ResolvedIntakePreferences = IntakeAnswers & {
  cloneDestination: string | null;
  mode: NonNullable<IntakePreferenceInput["answers"]["maybeMode"]>;
  sourceRepo: string | null;
  tasteDefaults: string[];
};

export function inferTasteDefaults(input: {
  preferredAgent: string | null;
  targetStack: string | null;
  tasteAnswers: Record<string, string>;
}): string[] {
  const notes = [
    "Favor Bright Builds-aligned coding and architecture defaults.",
    "Prefer transparent, pragmatic automation over black-box behavior."
  ];

  if (input.targetStack) {
    notes.push(`Bias toward the selected target stack: ${input.targetStack}.`);
  }

  if (input.preferredAgent) {
    notes.push(`Prefer workflows that fit ${input.preferredAgent}.`);
  }

  if (input.tasteAnswers.profile) {
    notes.push(`Use the requested taste profile: ${input.tasteAnswers.profile}.`);
  }

  return notes;
}

function mergeTasteAnswers(
  savedProfile: IntakeProfileRecord | null,
  currentAnswers: Partial<IntakeAnswers>
): Record<string, string> {
  return {
    ...(savedProfile?.tasteAnswers ?? {}),
    ...(currentAnswers.tasteAnswers ?? {})
  };
}

export function mergeIntakePreferences(input: IntakePreferenceInput & {
  savedProfile: IntakeProfileRecord | null;
  sourceRepo: string | null;
}): ResolvedIntakePreferences {
  const mode = input.flags.maybeMode ?? input.answers.maybeMode ?? input.savedProfile?.mode ?? "guided";
  const targetStack =
    input.flags.targetStack ?? input.answers.targetStack ?? input.savedProfile?.targetStack ?? null;
  const preferredAgent =
    input.flags.preferredAgent ??
    input.answers.preferredAgent ??
    input.savedProfile?.preferredAgent ??
    "codex";
  const askTasteQuestions =
    input.flags.askTasteQuestions ??
    input.answers.askTasteQuestions ??
    input.savedProfile?.askTasteQuestions ??
    false;
  const tasteAnswers = mergeTasteAnswers(input.savedProfile, input.answers);
  const cloneDestination =
    input.flags.cloneDestination ?? input.savedProfile?.cloneDestination ?? null;
  const sourceRepo = input.flags.repoUrl ?? input.sourceRepo ?? input.savedProfile?.sourceRepo ?? null;

  return {
    askTasteQuestions,
    cloneDestination,
    mode,
    preferredAgent,
    sourceRepo,
    targetStack,
    tasteAnswers,
    tasteDefaults: inferTasteDefaults({
      preferredAgent,
      targetStack,
      tasteAnswers
    })
  };
}

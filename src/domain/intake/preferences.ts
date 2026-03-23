import type { IntakeProfileRecord } from "../../persistence/intakeProfile.js";
import type { IntakeAnswers, IntakePreferenceInput } from "./types.js";

export type ResolvedIntakePreferences = {
  askTasteQuestions: boolean;
  maybeCloneDestination: string | null;
  mode: NonNullable<IntakePreferenceInput["answers"]["maybeMode"]>;
  maybePreferredAgent: string | null;
  maybeSourceRepo: string | null;
  maybeTargetStack: string | null;
  tasteAnswers: Record<string, string>;
  tasteDefaults: string[];
};

export function inferTasteDefaults(input: {
  maybePreferredAgent: string | null;
  maybeTargetStack: string | null;
  tasteAnswers: Record<string, string>;
}): string[] {
  const notes = [
    "Favor Bright Builds-aligned coding and architecture defaults.",
    "Prefer transparent, pragmatic automation over black-box behavior."
  ];

  if (input.maybeTargetStack) {
    notes.push(`Bias toward the selected target stack: ${input.maybeTargetStack}.`);
  }

  if (input.maybePreferredAgent) {
    notes.push(`Prefer workflows that fit ${input.maybePreferredAgent}.`);
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
  maybeSourceRepo: string | null;
  savedProfile: IntakeProfileRecord | null;
}): ResolvedIntakePreferences {
  const mode = input.flags.maybeMode ?? input.answers.maybeMode ?? input.savedProfile?.mode ?? "guided";
  const maybeTargetStack =
    input.flags.maybeTargetStack ??
    input.answers.maybeTargetStack ??
    input.savedProfile?.targetStack ??
    null;
  const maybePreferredAgent =
    input.flags.maybePreferredAgent ??
    input.answers.maybePreferredAgent ??
    input.savedProfile?.preferredAgent ??
    "codex";
  const askTasteQuestions =
    input.flags.maybeAskTasteQuestions ??
    input.answers.askTasteQuestions ??
    input.savedProfile?.askTasteQuestions ??
    false;
  const tasteAnswers = mergeTasteAnswers(input.savedProfile, input.answers);
  const maybeCloneDestination =
    input.flags.maybeCloneDestination ?? input.savedProfile?.cloneDestination ?? null;
  const maybeSourceRepo =
    input.flags.maybeRepoUrl ?? input.maybeSourceRepo ?? input.savedProfile?.sourceRepo ?? null;

  return {
    askTasteQuestions,
    maybeCloneDestination,
    mode,
    maybePreferredAgent,
    maybeSourceRepo,
    maybeTargetStack,
    tasteAnswers,
    tasteDefaults: inferTasteDefaults({
      maybePreferredAgent,
      maybeTargetStack,
      tasteAnswers
    })
  };
}
